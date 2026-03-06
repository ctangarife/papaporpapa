from fastapi import APIRouter, HTTPException, Query
from schemas.llm import ChatRequest, ChatResponse, LLMProvider, LLMDynamicCredentials
from services.llm_factory import get_llm_service
from typing import Optional, Dict, Any

router = APIRouter(prefix="/llm", tags=["LLM"])


@router.post("/generate-tasks", response_model=ChatResponse)
async def generate_tasks(request: ChatRequest):
    """
    Genera una lista de tareas a partir de un objetivo usando LLM

    Args:
        request: Request con el objetivo y configuración

    Returns:
        Lista de tareas generadas y resumen del proyecto
    """
    try:
        service = get_llm_service(request.provider)

        # Preparar credenciales para el servicio específico
        provider_credentials = None
        if request.credentials:
            creds_dict = request.credentials.model_dump()

            # Extraer credenciales específicas del provider
            if request.provider == LLMProvider.zai and creds_dict.get("zai"):
                provider_credentials = creds_dict["zai"]
            elif request.provider == LLMProvider.minimax and creds_dict.get("minimax"):
                provider_credentials = creds_dict["minimax"]
            elif request.provider == LLMProvider.ollama and creds_dict.get("ollama"):
                provider_credentials = creds_dict["ollama"]

        result = await service.generate_tasks(
            goal=request.goal,
            context=request.context,
            model=request.model,
            credentials=provider_credentials
        )
        return ChatResponse(**result)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando tareas: {str(e)}")


@router.post("/chat")
async def chat(request: ChatRequest):
    """
    Endpoint genérico de chat con el LLM

    Args:
        request: Request con el mensaje y configuración

    Returns:
        Respuesta del modelo
    """
    try:
        from schemas.llm import Message

        service = get_llm_service(request.provider)

        # Preparar credenciales para el servicio específico
        provider_credentials = None
        if request.credentials:
            creds_dict = request.credentials.model_dump()

            # Extraer credenciales específicas del provider
            if request.provider == LLMProvider.zai and creds_dict.get("zai"):
                provider_credentials = creds_dict["zai"]
            elif request.provider == LLMProvider.minimax and creds_dict.get("minimax"):
                provider_credentials = creds_dict["minimax"]
            elif request.provider == LLMProvider.ollama and creds_dict.get("ollama"):
                provider_credentials = creds_dict["ollama"]

        messages = [
            Message(role="system", content="Eres un asistente útil y amable."),
            Message(role="user", content=request.goal)
        ]

        response = await service.chat_completion(
            messages=messages,
            model=request.model,
            credentials=provider_credentials
        )

        return {"response": response}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en chat: {str(e)}")


@router.get("/providers")
async def list_providers():
    """Lista los proveedores LLM disponibles"""
    return {
        "providers": [
            {
                "id": "ollama",
                "name": "Ollama",
                "description": "Local LLM, requiere Ollama instalado",
                "requiresApiKey": False,
                "configurable": ["apiEndpoint"]
            },
            {
                "id": "zai",
                "name": "Z.ai",
                "description": "BigModel (GLM models)",
                "requiresApiKey": True,
                "configurable": ["apiKey", "apiEndpoint", "modelName"]
            },
            {
                "id": "minimax",
                "name": "MiniMax",
                "description": "MiniMax AI",
                "requiresApiKey": True,
                "configurable": ["apiKey", "apiEndpoint", "modelName"]
            }
        ]
    }


@router.post("/models")
async def get_available_models(
    provider: LLMProvider = Query(...),
    credentials: Optional[Dict[str, Any]] = None
):
    """
    Obtiene la lista de modelos disponibles para un proveedor

    Args:
        provider: El proveedor LLM (ollama, zai, minimax) - query parameter
        credentials: Credenciales del usuario (apiKey, apiEndpoint) - body

    Returns:
        Lista de modelos disponibles
    """
    import logging
    logger = logging.getLogger(__name__)

    # Debug logging
    logger.info(f"=== /models endpoint DEBUG ===")
    logger.info(f"Provider: {provider}")
    logger.info(f"Credentials received: {credentials}")
    if credentials:
        for key, value in credentials.items():
            if key == "apiKey" and value:
                logger.info(f"  {key}: ***{value[-4:] if len(value) > 4 else '***'}")
            else:
                logger.info(f"  {key}: {value}")
    logger.info(f"=== END DEBUG ===")

    try:
        service = get_llm_service(provider)

        # Extraer credenciales específicas del provider según el formato esperado
        provider_credentials = None
        if credentials:
            if provider == LLMProvider.zai and credentials.get("zai"):
                provider_credentials = credentials["zai"]
            elif provider == LLMProvider.minimax and credentials.get("minimax"):
                provider_credentials = credentials["minimax"]
            elif provider == LLMProvider.ollama and credentials.get("ollama"):
                provider_credentials = credentials["ollama"]

        logger.info(f"Provider credentials extracted: {bool(provider_credentials)}")
        if provider_credentials:
            logger.info(f"  apiEndpoint: {provider_credentials.get('apiEndpoint')}")
            logger.info(f"  apiKey: {'***' + (provider_credentials.get('apiKey', '')[-4:] if provider_credentials.get('apiKey') else 'N/A')}")

        models = await service.get_available_models(credentials=provider_credentials)

        logger.info(f"Returning {len(models)} models for provider {provider}")
        return {
            "provider": provider,
            "models": models
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo modelos: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check específico del servicio LLM"""
    return {"status": "healthy", "service": "llm-backend"}
