# ==============================================================================
# PAPAS APP - Backend FastAPI (Modelos LLM)
# ==============================================================================

FROM python:3.12-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Exponer puerto
EXPOSE 8000
