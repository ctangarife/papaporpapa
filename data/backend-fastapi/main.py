from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from core.config import settings
from api.v1 import router as api_v1_router

# Configurar logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Papas App - Backend FastAPI starting...")
    logger.info(f"Default LLM Provider: {settings.DEFAULT_LLM_PROVIDER}")
    logger.info(f"Default LLM Model: {settings.DEFAULT_LLM_MODEL}")
    yield
    # Shutdown
    logger.info("Papas App - Backend FastAPI shutting down...")


# Crear aplicación FastAPI
app = FastAPI(
    title="Papas App - LLM Backend",
    description="Backend para manejo de modelos LLM (Ollama, z.ai, MiniMax)",
    version="1.0.0",
    lifespan=lifespan
)

# Configurar CORS
cors_origins = settings.CORS_ORIGINS.split(",") if settings.CORS_ORIGINS else ["http://localhost"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(api_v1_router)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "papas-llm-backend"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Papas App - LLM Backend",
        "version": "1.0.0",
        "providers": ["ollama", "zai", "minimax"]
    }
