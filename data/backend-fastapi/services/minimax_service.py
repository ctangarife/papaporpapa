import json
import logging
from typing import List, Dict, Any, Optional
import httpx
from services.base_llm import BaseLLMService
from schemas.llm import Message
from core.config import settings

logger = logging.getLogger(__name__)


class MiniMaxService(BaseLLMService):
    """Servicio LLM usando MiniMax (API Anthropic-compatible)"""

    def __init__(self):
        self.default_api_key = settings.MINIMAX_API_KEY
        self.default_api_url = settings.MINIMAX_API_ENDPOINT
        self.default_model = settings.DEFAULT_LLM_MODEL if settings.DEFAULT_LLM_PROVIDER == "minimax" else "MiniMax-M2.5"

    async def _call_minimax(
        self,
        messages: List[Message],
        model: Optional[str] = None,
        credentials: Optional[Dict[str, Any]] = None
    ) -> str:
        """Realiza una llamada a MiniMax API usando formato Anthropic Messages API

        Documentación: https://platform.minimaxi.com/docs/api-reference/text-anthropic-api
        """
        # Usar credenciales dinámicas si se proporcionan, sino las default
        api_key = credentials.get("apiKey") if credentials and credentials.get("apiKey") else self.default_api_key
        api_url = credentials.get("apiEndpoint") if credentials and credentials.get("apiEndpoint") else self.default_api_url

        if not api_key:
            raise ValueError("MINIMAX_API_KEY no está configurada (ni en credenciales ni en variables de entorno)")

        model = model or self.default_model

        # Headers formato Anthropic
        headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01"
        }

        # Separar system message de user/assistant messages
        system_message = None
        anthropic_messages = []

        for msg in messages:
            if msg.role == "system":
                system_message = msg.content
            else:
                anthropic_messages.append({
                    "role": msg.role,
                    "content": msg.content
                })

        # Payload formato Anthropic Messages API
        payload = {
            "model": model,
            "max_tokens": 4096,
            "messages": anthropic_messages
        }

        if system_message:
            payload["system"] = system_message

        try:
            logger.info(f"=== MiniMax API Call ===")
            logger.info(f"URL: {api_url}")
            logger.info(f"Model: {model}")
            logger.info(f"Headers: {{'x-api-key': '***{api_key[-4:] if len(api_key) > 4 else 'N/A'}'}}")
            logger.info(f"Payload: {json.dumps(payload)[:500]}")

            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(api_url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()

                logger.info(f"=== MiniMax Response Debug ===")
                logger.info(f"Response status: {response.status_code}")
                logger.info(f"Response type: {type(data)}")
                logger.info(f"Response keys: {list(data.keys()) if isinstance(data, dict) else 'not a dict'}")
                logger.info(f"Content array length: {len(data.get('content', []))}")
                logger.info(f"Full content array: {json.dumps(data.get('content', []))[:2000]}")
                logger.info(f"Full response: {json.dumps(data)[:2000]}")

                # Respuesta formato Anthropic: content[0].text o content[0].thinking
                if "content" in data and len(data["content"]) > 0:
                    # Buscar el primer item con 'text', si no hay, usar 'thinking'
                    text = None
                    for item in data["content"]:
                        if "text" in item:
                            text = item["text"]
                            break

                    # Si no hay 'text', usar el primer thinking como fallback
                    if text is None:
                        text = data["content"][0].get("thinking", "")

                    logger.info(f"Extracted text length: {len(text)}")
                    logger.info(f"Text preview: {text[:500]}")
                    return text

                raise ValueError(f"Respuesta inesperada de MiniMax: {data}")

        except httpx.HTTPError as e:
            logger.error(f"Error calling MiniMax: {e}")
            raise

    async def generate_tasks(
        self,
        goal: str,
        context: Optional[str] = None,
        model: Optional[str] = None,
        credentials: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Genera tareas usando MiniMax"""
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(goal, context)

        messages = [
            Message(role="system", content=system_prompt),
            Message(role="user", content=user_prompt)
        ]

        try:
            response = await self._call_minimax(messages, model, credentials=credentials)
            result = json.loads(response)

            # Validar respuesta
            if "tasks" not in result:
                raise ValueError("Respuesta inválida: falta 'tasks'")

            return result

        except json.JSONDecodeError as e:
            logger.error(f"Error parsing MiniMax response: {e}")
            return self._extract_json_fallback(response)

    async def chat_completion(
        self,
        messages: List[Message],
        model: Optional[str] = None,
        credentials: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> str:
        """Chat completion usando MiniMax"""
        return await self._call_minimax(messages, model, credentials=credentials)

    def _extract_json_fallback(self, text: str) -> Dict[str, Any]:
        """Intenta extraer JSON válido de una respuesta de texto"""
        import re
        json_match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(1))

        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(0))

        logger.warning("Could not extract JSON from response, using fallback")
        return {
            "tasks": [
                {
                    "description": text[:200] if len(text) > 200 else text,
                    "order": 1,
                    "coin_value": 10,
                    "depends_on": []
                }
            ],
            "summary": "Requiere revisión manual"
        }

    async def get_available_models(
        self,
        credentials: Optional[Dict[str, Any]] = None
    ) -> List[str]:
        """Retorna la lista de modelos disponibles de MiniMax

        NOTA: MiniMax NO tiene un endpoint /v1/models. Los modelos son estáticos
        según su documentación oficial.
        Documentación: https://platform.minimaxi.com/docs
        """
        api_key = credentials.get("apiKey") if credentials and credentials.get("apiKey") else self.default_api_key

        logger.info(f"=== MiniMax get_available_models ===")
        logger.info(f"api_key provided: {bool(api_key)}")

        if not api_key:
            logger.error("No API key provided")
            raise ValueError("API Key es requerida para obtener modelos")

        # MiniMax no tiene endpoint para listar modelos.
        # Estos son los modelos documentados oficialmente (2026):
        # Fuente: https://platform.minimaxi.com/docs/api-reference/api-overview
        models = [
            "MiniMax-M2.5",           # Top performance, 204K context, ~60 TPS
            "MiniMax-M2.5-highspeed", # M2.5 high-speed version, ~100 TPS
            "MiniMax-M2.1",           # Multilingual coding, 204K context, ~60 TPS
            "MiniMax-M2.1-highspeed", # M2.1 high-speed version, ~100 TPS
            "MiniMax-M2",             # Coding & Agent workflows
        ]

        logger.info(f"Models found for MiniMax: {models}")
        return models
