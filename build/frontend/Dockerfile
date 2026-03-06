# ==============================================================================
# PAPAS APP - Frontend Vue.js
# ==============================================================================
# Build in-container con volumen de código para hot-reload en desarrollo

FROM node:20-alpine

WORKDIR /app

# Instalar dependencias del sistema
RUN apk add --no-cache wget

# Exponer puerto
EXPOSE 3000

# Set development environment
ENV NODE_ENV=development
