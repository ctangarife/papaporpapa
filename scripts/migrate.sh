#!/usr/bin/env bash
# ==============================================================================
# PAPAS APP - Database Migration Script
# ==============================================================================
#
# Compatible con: Linux (Ubuntu/Debian), macOS, Git Bash (Windows)
#
# Usage:
#   ./scripts/migrate.sh              # Apply pending migrations
#   ./scripts/migrate.sh --dry-run    # Show pending migrations without executing
#   ./scripts/migrate.sh --status     # Show current migration status
#   ./scripts/migrate.sh --force      # Re-run all migrations (dangerous!)
#
# Requirements:
#   - Docker o Docker Compose instalado
#   - Contenedores corriendo
#
# Ubuntu/Server notes:
#   - Si Docker no está corriendo: sudo systemctl start docker
#   - Si necesitas permisos: sudo usermod -aG docker $USER (y re-login)
#   - Archivo .env debe estar en el root del proyecto
#
# ==============================================================================

# Exit on error, but handle it gracefully
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$PROJECT_ROOT/db/postgres"

# Load .env file if exists
ENV_FILE="$PROJECT_ROOT/.env"
if [ -f "$ENV_FILE" ]; then
    # Export variables from .env (ignore comments and empty lines)
    export $(grep -v '^#' "$ENV_FILE" | grep -v '^[[:space:]]*$' | xargs)
fi

# Database connection (from .env, env vars, or defaults)
# These match docker-compose.yml environment variables
DB_USER=${POSTGRES_USER:-p4p1t4s}
DB_NAME=${POSTGRES_DB:-papa_app}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

# Docker detection
USE_DOCKER=true
DOCKER_CMD=""

# Detectar si Docker está disponible
if ! command -v docker &> /dev/null; then
    log_error "Docker no está instalado"
    log_info "Instala Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Verificar que Docker esté corriendo
if ! docker info &> /dev/null; then
    log_error "Docker no está corriendo"
    log_info "Inicia Docker: sudo systemctl start docker"
    exit 1
fi

# Detectar docker compose vs docker-compose
if docker compose version &> /dev/null 2>&1; then
    DOCKER_CMD="docker compose"
elif docker-compose --version &> /dev/null 2>&1; then
    DOCKER_CMD="docker-compose"
else
    log_error "Docker Compose no está instalado"
    exit 1
fi

# Verificar que los contenedores estén corriendo
if ! $DOCKER_CMD ps | grep -q "postgres.*Up"; then
    log_error "El contenedor 'postgres' no está corriendo"
    log_info "Inicia los contenedores: $DOCKER_CMD up -d"
    exit 1
fi

# Construir comando de base de datos
DB_CMD="$DOCKER_CMD exec -T postgres psql -U $DB_USER -d $DB_NAME"

# ==============================================================================
# Functions
# ==============================================================================

# Detect operating system
detect_os() {
    case "$(uname -s)" in
        Linux*)
            if [ -f /etc/os-release ]; then
                . /etc/os-release
                echo "$ID"
            else
                echo "linux"
            fi
            ;;
        Darwin*)    echo "macos" ;;
        MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
        *)          echo "unknown" ;;
    esac
}

OS_TYPE=$(detect_os)

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Get applied migrations from database
get_applied_migrations() {
    $DB_CMD -t -c "SELECT schema_name FROM public.schema_migrations ORDER BY schema_name;" 2>/dev/null | tr -d ' ' | grep -v '^?$' || echo ""
}

# Get all migration files
get_migration_files() {
    find "$MIGRATIONS_DIR" -name "*.sql" -type f | sort
}

# Extract migration name from file content
get_migration_name() {
    grep -E "register_migration\(" "$1" 2>/dev/null | sed -n "s/.*register_migration('\([^']*\)'.*/\1/p" | head -1 || echo ""
}

# Check if migration is applied
is_migration_applied() {
    local migration_name="$1"
    echo "$applied_migrations" | grep -q "^${migration_name}$"
}

# Execute migration file
execute_migration() {
    local file="$1"
    local name="$2"

    log_info "Ejecutando migración: $name"
    log_info "  Archivo: $(basename "$file")"

    if [ "$DRY_RUN" = true ]; then
        log_warning "  [DRY RUN] Se ejecutaría pero no se aplica"
        return 0
    fi

    if $DB_CMD < "$file" 2>&1 | tee /tmp/migration_output.log; then
        log_success "  Migración aplicada correctamente"
        return 0
    else
        local exit_code=$?

        # Check if error is "already exists" type
        if grep -qi "already exists\|duplicate column\|relation.*already exists" /tmp/migration_output.log; then
            if [ "$SKIP_ERRORS" = true ]; then
                log_warning "  Migración ya aplicada (marcando como completada)"
                force_register_migration "$name"
                return 0
            else
                log_warning "  La migración parece que ya fue aplicada"
                log_info "  Opciones:"
                log_info "    --skip-errors  : Continuar y marcar como completada"
                log_info "    --force-register <nombre> : Marcar sin ejecutar"
                return 1
            fi
        fi

        log_error "  Error al ejecutar migración (exit code: $exit_code)"
        log_info "  Revisa el log: cat /tmp/migration_output.log"
        return 1
    fi
}

# Force register a migration as applied (without executing)
force_register_migration() {
    local migration_name="$1"

    log_info "Registrando migración como aplicada: $migration_name"

    $DB_CMD -c "INSERT INTO public.schema_migrations (schema_name, version) VALUES ('$migration_name', 1) ON CONFLICT (schema_name) DO UPDATE SET version = EXCLUDED.version, executed_at = CURRENT_TIMESTAMP;" > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        log_success "  Migración registrada correctamente"
        return 0
    else
        log_error "  Error al registrar migración"
        return 1
    fi
}

# Show migration status
show_status() {
    echo ""
    echo "=============================================================================="
    echo "Estado de Migraciones - Papas App"
    echo "=============================================================================="
    echo ""

    echo "Configuración:"
    echo "  - SO: $OS_TYPE"
    echo "  - DB User: $DB_USER"
    echo "  - DB Name: $DB_NAME"
    echo "  - Docker Comando: $DOCKER_CMD"
    echo ""

    echo "Migraciones aplicadas:"
    applied_count=0
    while IFS= read -r migration; do
        if [ -n "$migration" ]; then
            echo "  ✓ $migration"
            applied_count=$((applied_count + 1))
        fi
    done <<< "$applied_migrations"

    if [ "$applied_count" -eq 0 ]; then
        echo "  (Ninguna)"
    fi

    echo ""
    echo "Total: $applied_count migración(es) aplicada(s)"
    echo ""
}

# ==============================================================================
# Main
# ==============================================================================

# Parse arguments
DRY_RUN=false
SHOW_STATUS=false
FORCE=false
FORCE_REGISTER=""
SKIP_ERRORS=false

for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            ;;
        --status)
            SHOW_STATUS=true
            ;;
        --force)
            FORCE=true
            ;;
        --skip-errors)
            SKIP_ERRORS=true
            ;;
        --force-register)
            # Next arg is the migration name
            shift
            FORCE_REGISTER="$1"
            ;;
        -h|--help)
            echo "Uso: $0 [OPTIONS]"
            echo ""
            echo "Opciones:"
            echo "  --dry-run                    Mostrar migraciones pendientes sin ejecutar"
            echo "  --status                     Mostrar estado actual de migraciones"
            echo "  --force                      Re-ejecutar todas las migraciones (peligroso)"
            echo "  --skip-errors                Continuar si la migración ya existe (la marca como completada)"
            echo "  --force-register <nombre>    Marcar migración como aplicada sin ejecutarla"
            echo "  -h, --help                   Mostrar esta ayuda"
            echo ""
            echo "Ejemplos:"
            echo "  $0 --status                                    # Ver estado"
            echo "  $0 --skip-errors                               # Aplicar pendientes, ignorar errores de 'ya existe'"
            echo "  $0 --force-register add_skip_count_to_tasks   # Marcar migración como aplicada"
            exit 0
            ;;
    esac
done

# Get current migrations
applied_migrations=$(get_applied_migrations)

# Show status if requested
if [ "$SHOW_STATUS" = true ]; then
    show_status
    exit 0
fi

# Check database connection
if ! $DB_CMD -c "SELECT 1;" &> /dev/null; then
    log_error "No se puede conectar a la base de datos"

    case "$OS_TYPE" in
        ubuntu|debian)
            log_info "Verifica que los contenedores estén corriendo:"
            log_info "  $DOCKER_CMD ps"
            log_info "Reinicia si es necesario:"
            log_info "  $DOCKER_CMD restart postgres"
            ;;
        *)
            log_info "Verifica que los contenedores estén corriendo: $DOCKER_CMD ps"
            ;;
    esac
    exit 1
fi

# Handle --force-register
if [ -n "$FORCE_REGISTER" ]; then
    echo ""
    log_info "Forzando registro de migración: $FORCE_REGISTER"
    echo ""

    if force_register_migration "$FORCE_REGISTER"; then
        echo ""
        log_success "Migración registrada correctamente"
        exit 0
    else
        echo ""
        log_error "No se pudo registrar la migración"
        exit 1
    fi
fi

echo ""
log_info "Sistema de Migraciones - Papas App"
echo ""

if [ "$FORCE" = true ]; then
    log_warning "MODO FORCE: Re-ejecutando TODAS las migraciones"
    echo ""
    for file in $(get_migration_files); do
        execute_migration "$file" "FORCE"
    done
    log_success "Migraciones forzadas completadas"
    exit 0
fi

# Count pending migrations
pending_count=0
executed_count=0
skipped_count=0

# Process each migration file
for file in $(get_migration_files); do
    migration_name=$(get_migration_name "$file")

    if [ -z "$migration_name" ]; then
        log_warning "Archivo sin nombre de migración: $(basename "$file")"
        continue
    fi

    if is_migration_applied "$migration_name"; then
        skipped_count=$((skipped_count + 1))
    else
        pending_count=$((pending_count + 1))

        if execute_migration "$file" "$migration_name"; then
            executed_count=$((executed_count + 1))
        fi
    fi
done

# Summary
echo ""
echo "=============================================================================="
echo "Resumen"
echo "=============================================================================="
echo "  Aplicadas:     $executed_count"
echo "  Ya existentes: $skipped_count"
echo "  Pendientes:    $pending_count"
echo ""

if [ "$executed_count" -gt 0 ]; then
    log_success "Migraciones completadas exitosamente"
elif [ "$pending_count" -eq 0 ]; then
    log_success "Todas las migraciones están actualizadas"
fi

if [ "$DRY_RUN" = true ] && [ "$pending_count" -gt 0 ]; then
    log_warning "Modo DRY RUN: No se aplicaron cambios"
    log_info "Ejecuta sin --dry-run para aplicar las migraciones pendientes"
fi

echo ""
