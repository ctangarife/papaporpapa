# 🥔 Papas App

> "La Olla de Papas" - Descompón proyectos abrumadores en micro-papas, una a la vez.

Una aplicación de gestión de tareas diseñada para personas con TEA Nivel 1 (anteriormente Síndrome de Asperger), TDAH, y otros desafíos neurodivergentes que causan fatiga ejecutiva y parálisis por análisis.

## 🌟 Filosofía

Un proyecto es una olla llena de papas hirviendo. No puedes comértelas todas de un mordisco - comes **papa por papa**. La aplicación descompone cualquier macro-proyecto en una secuencia lineal de micro-pasos accionables, presentando **solo una a la vez** para mitigar la fatiga ejecutiva.

## ✨ Características

- **Modo Focus**: Solo muestra la tarea actual, sin listas abrumadoras
- **Descomposición LLM**: Usa IA para dividir proyectos grandes en micro-tareas
- **Gamificación**: Sistema de monedas para recompensa inmediata (dopamina artificial)
- **Múltiples Proveedores LLM**: Ollama Cloud, Z.ai (GLM Coding Plan), MiniMax
- **Credenciales por Usuario**: Cada usuario configura sus propias API keys (encriptadas)
- **Tema Oscuro**: Interfaz oscura para reducir fatiga visual

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Nginx (Port 80/8080)                      │
│  Reverse Proxy + Static Files (Vue.js)                          │
└─────────────┬───────────────────────────────────────┬───────────┘
              │                                       │
              ▼                                       ▼
┌─────────────────────────┐           ┌──────────────────────────┐
│  NestJS Backend         │           │  FastAPI Backend         │
│  (Port 3001)            │◄──────────►│  (Port 8000)            │
│  - Auth & Users         │           │  - LLM Integration       │
│  - Projects & Tasks     │           │  - Ollama, Z.ai, MiniMax │
│  - Credentials Mgmt     │           │  - Task Generation       │
└─────────────┬───────────┘           └───────────┬──────────────┘
              │                                   │
              └───────────────┬───────────────────┘
                              ▼
                    ┌──────────────────┐
                    │  PostgreSQL 16   │
                    │  (Port 5432)     │
                    │  - Users         │
                    │  - Projects      │
                    │  - Tasks         │
                    │  - Credentials   │
                    └──────────────────┘
```

## 🚀 Inicio Rápido

### Requisitos Previos

- Docker y Docker Compose
- OpenSSL (para generar secretos)

### 1. Clonar el Repositorio

```bash
git clone <repositorio>
cd papaporpapa
```

### 2. Configurar Variables de Entorno

```bash
cp env.template .env
```

Generar secretos requeridos:

```bash
# OpenSSL (Linux/Mac)
openssl rand -base64 32  # para JWT_SECRET
openssl rand -base64 32  # para LLM_ENCRYPTION_KEY

# PowerShell (Windows)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

Editar `.env` con tus valores:

```env
# JWT Secret (mínimo 32 caracteres)
JWT_SECRET=tu_jwt_secret_aqui

# LLM Encryption Key (mínimo 32 caracteres)
LLM_ENCRYPTION_KEY=tu_encryption_key_aqui

# LLM Providers (opcional - los usuarios configuran sus propias credenciales)
OLLAMA_HOST=https://ollama.com
ZAI_API_KEY=
ZAI_API_ENDPOINT=
MINIMAX_API_KEY=
```

### 3. Iniciar los Servicios

```bash
docker compose up --build
```

La aplicación estará disponible en:
- **Frontend**: http://localhost
- **API (NestJS)**: http://localhost/api
- **API (FastAPI)**: http://localhost/api/llm (vía nginx)

### 4. Primeros Pasos

1. **Crear cuenta** en http://localhost/register
2. **Completar onboarding** (4 pasos):
   - Bienvenida
   - Selección de diagnóstico (opcional)
   - Preferencias de IA
   - Configurar proveedor LLM
3. **Crear proyecto** y dejar que la IA genere las tareas
4. **Completar tareas** una a una con el botón "✓ COMPLETADO"

## 🔧 Configuración de Proveedores LLM

### Ollama Cloud (Requiere API Key)

1. Ve a https://ollama.com
2. Crea una cuenta y obtén tu API key
3. En la app: Configuración → Agregar Credencial
   - Provider: Ollama
   - API Key: tu_key
   - Endpoint: `https://ollama.com`
   - Model: `kimi-k2:1t` u otro

### Z.ai - GLM Coding Plan

1. Ve a https://z.ai/manage-apikey/apikey-list
2. Obtén tu API key (formato: `id.secret`)
3. En la app: Configuración → Agregar Credencial
   - Provider: Z.ai
   - API Key: tu_key
   - Endpoint: `https://api.z.ai/api/coding/paas/v4/`
   - Model: `glm-4.7`, `glm-5`, etc.

### MiniMax

1. Ve a https://platform.minimaxi.com
2. Obtén tu API key
3. En la app: Configuración → Agregar Credencial
   - Provider: MiniMax
   - API Key: tu_key
   - Endpoint: `https://api.minimax.io/anthropic/v1/messages`
   - Model: `MiniMax-M2.5`, `MiniMax-M2.1`, etc.

## 📂 Estructura del Proyecto

```
papaporpapa/
├── build/              # Definiciones de Docker por servicio
│   ├── backend-nestjs/
│   ├── backend-fastapi/
│   ├── frontend/
│   └── server/nginx/
├── data/               # Código de aplicación (montado en contenedores)
│   ├── backend-nestjs/ # NestJS + TypeORM
│   ├── backend-fastapi/ # FastAPI + Python
│   ├── frontend/       # Vue.js + Vite
│   └── server/nginx/   # Configuración nginx
├── db/                 # Scripts de inicialización de BD
│   └── postgres/
├── doc/                # Documentación adicional
├── docker-compose.yml  # Orquestación de servicios
└── env.template        # Plantilla de variables de entorno
```

## 🔐 Seguridad

- **API Keys**: Encriptadas con AES-256-CBC en PostgreSQL
- **JWT**: Tokens firmados para autenticación
- **CORS**: Configurado para orígenes específicos
- **Rate Limiting**: Recomendado para producción

## 🛠️ Comandos Útiles

```bash
# Iniciar todos los servicios
docker compose up --build

# Ver logs
docker compose logs -f <servicio>

# Reiniciar un servicio
docker compose restart <servicio>

# Acceder a la base de datos
docker compose exec postgres psql -U p4p1t4s -d papa_app

# Reconstruir frontend
docker compose up -d --build frontend

# Detener servicios
docker compose down

# Detener y eliminar volúmenes
docker compose down -v
```

## 📊 Base de Datos

### Esquema Principal

**auth.users**: Usuarios de la aplicación
- `id`, `email`, `password_hash`, `username`
- `coins_balance` - Sistema de gamificación
- `diagnosis` - TEA, TDHA, TEA_TDHA, etc.
- `onboarding_completed`

**projects.projects**: Proyectos de usuarios
- `id`, `user_id`, `name`, `description`
- `status`: active, paused, completed
- `created_at`, `completed_at`

**projects.tasks**: Tareas de proyectos
- `id`, `project_id`, `description`
- `status`: pending, completed, blocked, skipped
- `coin_value`, `sort_order`
- `depends_on` - Array de UUIDs

**llm.user_llm_credentials**: Credenciales LLM por usuario
- `id`, `user_id`, `provider`
- `api_key` - Encriptado con AES-256-CBC
- `api_endpoint`, `model_name`
- `is_default`

## 🧠 Personalización por Diagnóstico

La IA ajusta sus respuestas según el diagnóstico del usuario:

- **TEA/TEA_TDHA**: Lenguaje claro, tareas muy pequeñas, elementos visuales
- **TDHA**: Tareas muy pequeñas, instrucciones cortas, plazos urgentes
- **Default**: Comunicación directa, tareas pequeñas

## 🎨 Sistema de Monedas (Gamificación)

- Cada tarea completada otorga monedas (5-20 según dificultad)
- Feedback visual inmediato (animación, contador)
- Sin valor real (actualmente) - solo acumulativo
- Propósito: Crear sentido de progreso tangible

## 🌐 Endpoints API Principales

### Autenticación
- `POST /auth/register` - Registro
- `POST /auth/login` - Inicio de sesión
- `POST /auth/onboarding/complete` - Completar onboarding

### Proyectos
- `GET /api/projects` - Listar proyectos del usuario
- `POST /api/projects` - Crear proyecto (requiere credenciales LLM)
- `GET /api/projects/:id` - Ver detalles del proyecto
- `POST /api/projects/generate-tasks` - Generar tareas con IA
- `POST /api/projects/:id/complete` - Marcar proyecto como completado

### Tareas
- `GET /api/tasks/project/:projectId` - Listar tareas de un proyecto
- `GET /api/tasks/:id/complete` - Completar tarea (otorga monedas)
- `POST /api/tasks/:id/skip` - Saltar tarea
- `POST /api/tasks/:id/reset` - Reanudar tarea saltada

### Credenciales LLM
- `GET /api/llm-credentials` - Listar credenciales del usuario
- `POST /api/llm-credentials` - Agregar credencial
- `PUT /api/llm-credentials/:id` - Actualizar credencial
- `DELETE /api/llm-credentials/:id` - Eliminar credencial
- `POST /api/llm-credentials/check` - Verificar API key y cargar modelos

## 🐛 Solución de Problemas

### El contenedor NestJS usa 89% CPU
**Causa**: Conflicto de volumen con node_modules
**Solución**: Ya está corregido con volumen anónimo para node_modules

### Error 429 de Z.ai "Insufficient balance"
**Causa**: Usando endpoint general con Coding Plan
**Solución**: Usar endpoint `/api/coding/paas/v4/` para GLM Coding Plan

### Tareas no muestran progreso
**Causa**: `findAll()` no incluía relación de tareas
**Solución**: Ya corregido agregando `relations: ['tasks']`

### Monedas no se actualizan
**Causa**: `complete()` no actualizaba balance del usuario
**Solución**: Ya corregido para llamar a `usersService.updateCoins()`

## 📝 Licencia

Este proyecto es de uso personal para el usuario y su comunidad.

## 🙏 Agradecimientos

Diseñado para personas neurodivergentes que necesitan estructurar grandes proyectos en pasos pequeños y manejables.
