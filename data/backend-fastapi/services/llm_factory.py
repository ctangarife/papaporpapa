from services.base_llm import BaseLLMService
from services.ollama_service import OllamaService
from services.zai_service import ZaiService
from services.minimax_service import MiniMaxService
from schemas.llm import LLMProvider
from core.config import settings


def get_llm_service(provider: LLMProvider) -> BaseLLMService:
    """
    Factory para obtener el servicio LLM correspondiente

    Args:
        provider: Proveedor LLM deseado

    Returns:
        Instancia del servicio LLM correspondiente
    """
    services = {
        LLMProvider.ollama: OllamaService(),
        LLMProvider.zai: ZaiService(),
        LLMProvider.minimax: MiniMaxService(),
    }

    service = services.get(provider)
    if not service:
        raise ValueError(f"Proveedor LLM no soportado: {provider}")

    return service


def get_default_llm_service() -> BaseLLMService:
    """Retorna el servicio LLM configurado por defecto"""
    default_provider = LLMProvider(settings.DEFAULT_LLM_PROVIDER)
    return get_llm_service(default_provider)
