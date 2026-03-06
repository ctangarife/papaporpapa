from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Configuración de la aplicación desde variables de entorno"""

    # API
    API_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost"
    LOG_LEVEL: str = "info"

    # Ollama Cloud (requiere API key, NO usar host.docker.internal para local)
    OLLAMA_HOST: str = "https://ollama.com"

    # Z.ai (NOTA: Usar api.z.ai, NO open.bigmodel.cn que está bloqueado fuera de China)
    # El SDK zai ya tiene el endpoint correcto por defecto
    ZAI_API_KEY: Optional[str] = None
    ZAI_API_ENDPOINT: Optional[str] = None

    # MiniMax (Anthropic-compatible API - recomendado)
    MINIMAX_API_KEY: Optional[str] = None
    MINIMAX_API_ENDPOINT: str = "https://api.minimax.io/anthropic/v1/messages"

    # Default LLM
    DEFAULT_LLM_PROVIDER: str = "ollama"
    DEFAULT_LLM_MODEL: str = "llama3.2"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
