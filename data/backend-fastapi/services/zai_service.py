import json
import logging
from typing import List, Dict, Any, Optional
from zai import ZaiClient
from services.base_llm import BaseLLMService
from schemas.llm import Message
from core.config import settings
import asyncio

logger = logging.getLogger(__name__)


class ZaiService(BaseLLMService):
    """Servicio LLM usando Z.ai SDK oficial (zai-sdk)

    Documentación: https://docs.z.ai/guides/develop/python/introduction
    Endpoint: https://api.z.ai/api/paas/v4/
    """

    def __init__(self):
        self.default_api_key = settings.ZAI_API_KEY
        # Para GLM Coding Plan se requiere el endpoint especial /api/coding/paas/v4
        # Documentación: https://docs.z.ai/guides/overview/quick-start
        self.default_base_url = settings.ZAI_API_ENDPOINT or "https://api.z.ai/api/coding/paas/v4/"
        self.default_model = settings.DEFAULT_LLM_MODEL if settings.DEFAULT_LLM_PROVIDER == "zai" else "glm-4.6"

    def _normalize_base_url(self, url: Optional[str]) -> Optional[str]:
        """Normaliza la URL base para que no incluya /chat/completions

        El SDK ZaiClient agrega automáticamente /chat/completions, así que si el
        endpoint ya lo incluye, hay que removerlo.

        También corrige el endpoint /anthropic/ a /paas/v4/ para modelos GLM.
        """
        if url is None:
            return None

        # Corregir endpoint /anthropic/ (para Claude) a /paas/v4/ (para GLM)
        if '/anthropic/' in url:
            logger.warning(f"Endpoint /anthropic/ detectado. Para modelos GLM (glm-4.x) se debe usar /api/paas/v4/")
            url = url.replace('/anthropic/', '/paas/v4/')

        # Remover /chat/completions si está al final
        if url.endswith('/chat/completions'):
            url = url[:-20].rstrip('/')
        elif '/chat/completions/' in url:
            url = url.replace('/chat/completions', '').rstrip('/')

        # Asegurar que termina con /
        if not url.endswith('/'):
            url += '/'

        return url

    def _get_client(self, api_key: str, base_url: Optional[str] = None) -> ZaiClient:
        """Crea y retorna un cliente de Z.ai configurado"""
        normalized_url = self._normalize_base_url(base_url or self.default_base_url)
        logger.debug(f"ZaiClient base_url: {normalized_url}")
        return ZaiClient(api_key=api_key, base_url=normalized_url)

    def _call_zai_sync(
        self,
        messages: List[Message],
        model: str,
        api_key: str,
        base_url: Optional[str] = None
    ) -> str:
        """Llamada síncrona a Z.ai SDK (para ejecutar en thread pool)"""
        client = self._get_client(api_key, base_url)

        # Convertir Message objects a formato del SDK
        sdk_messages = [
            {"role": m.role, "content": m.content}
            for m in messages
        ]

        try:
            logger.info(f"=== Z.ai SDK Call ===")
            logger.info(f"Base URL: {base_url or self.default_base_url}")
            logger.info(f"API Key (last 4): ***{api_key[-4:] if len(api_key) > 4 else 'N/A'}")
            logger.info(f"Model: {model}")
            logger.info(f"Messages: {len(sdk_messages)}")

            response = client.chat.completions.create(
                model=model,
                messages=sdk_messages,
                temperature=0.7,
                max_tokens=4096
            )

            logger.info(f"=== Raw Response Debug ===")
            logger.info(f"Response type: {type(response)}")
            logger.info(f"Response: {response}")
            logger.info(f"Response dir: {[attr for attr in dir(response) if not attr.startswith('_')]}")

            # Verificar que response no sea None
            if response is None:
                raise ValueError("API returned None response")

            # Extraer contenido de la respuesta
            if hasattr(response, 'choices') and response.choices:
                content = response.choices[0].message.content
            else:
                # Si no tiene choices, intentar sacar el contenido directamente
                logger.warning(f"Response doesn't have 'choices'. Response: {response}")
                raise ValueError(f"Unexpected response format: {response}")

            return content

        except Exception as e:
            logger.error(f"Error in Z.ai SDK call: {type(e).__name__}: {e}")
            raise

    async def _call_zai(
        self,
        messages: List[Message],
        model: Optional[str] = None,
        credentials: Optional[Dict[str, Any]] = None
    ) -> str:
        """Realiza una llamada a Z.ai API usando el SDK oficial (async wrapper)"""
        api_key = credentials.get("apiKey") if credentials and credentials.get("apiKey") else self.default_api_key
        base_url = credentials.get("apiEndpoint") if credentials and credentials.get("apiEndpoint") else self.default_base_url

        if not api_key:
            raise ValueError("ZAI_API_KEY no está configurada (ni en credenciales ni en variables de entorno)")

        model = model or self.default_model

        try:
            # Ejecutar llamada síncrona del SDK en thread pool para no bloquear
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                self._call_zai_sync,
                messages,
                model,
                api_key,
                base_url
            )

            logger.info(f"Z.ai SDK response length: {len(response)}")
            logger.info(f"Z.ai SDK response preview: {response[:500]}")

            return response

        except Exception as e:
            logger.error(f"Unexpected error calling Z.ai SDK: {type(e).__name__}: {e}")
            raise

    async def generate_tasks(
        self,
        goal: str,
        context: Optional[str] = None,
        model: Optional[str] = None,
        credentials: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Genera tareas usando Z.ai"""
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(goal, context)

        logger.info(f"=== Z.ai generate_tasks ===")
        logger.info(f"Goal: {goal}")
        logger.info(f"Model: {model or self.default_model}")

        messages = [
            Message(role="system", content=system_prompt),
            Message(role="user", content=user_prompt)
        ]

        try:
            response = await self._call_zai(messages, model, credentials=credentials)

            result = json.loads(response)
            logger.info(f"Z.ai parsed result: {result}")

            # Validar respuesta
            if "tasks" not in result:
                logger.error(f"Z.ai response missing 'tasks': {result}")
                raise ValueError("Respuesta inválida: falta 'tasks'")

            # Normalizar dificultad a coinValue
            coinValues = {"easy": 5, "medium": 10, "hard": 20}
            for task in result.get("tasks", []):
                if "difficulty" in task:
                    task["coinValue"] = coinValues.get(task["difficulty"], 10)
                    # Mantener compatibilidad con camelCase
                    task["coinValue"] = task.pop("difficulty")
                elif "coin_value" in task:
                    # Si devuelve el formato viejo, normalizar
                    task["coinValue"] = task.pop("coin_value")
                # depends_on → dependsOn (camelCase)
                if "depends_on" in task:
                    task["dependsOn"] = task.pop("depends_on")

            logger.info(f"Z.ai normalized result: {result}")
            return result

        except json.JSONDecodeError as e:
            logger.error(f"Error parsing Z.ai response: {e}")
            logger.error(f"Z.ai response was: {response[:1000]}")
            return self._extract_json_fallback(response)

    async def chat_completion(
        self,
        messages: List[Message],
        model: Optional[str] = None,
        credentials: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> str:
        """Chat completion usando Z.ai"""
        return await self._call_zai(messages, model, credentials=credentials)

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
        """Obtiene la lista de modelos disponibles desde Z.ai API

        Usa el endpoint /v1/models que retorna todos los modelos disponibles.
        Documentación: https://docs.z.ai/guides/develop/models
        """
        api_key = credentials.get("apiKey") if credentials and credentials.get("apiKey") else self.default_api_key
        base_url = credentials.get("apiEndpoint") if credentials and credentials.get("apiEndpoint") else self.default_base_url

        logger.info(f"=== Z.ai get_available_models ===")
        logger.info(f"api_key provided: {bool(api_key)}")
        logger.info(f"base_url: {base_url}")

        if not api_key:
            logger.error("No API key provided")
            raise ValueError("API Key es requerida para obtener modelos")

        try:
            client = self._get_client(api_key, base_url)

            # Ejecutar llamada síncrona en thread pool
            loop = asyncio.get_event_loop()
            models_response = await loop.run_in_executor(
                None,
                client.models.list
            )

            # Extraer lista de modelos desde la respuesta
            # La estructura es: {"data": [{"id": "model-name", ...}, ...]}
            if hasattr(models_response, 'data'):
                models = [model.id for model in models_response.data]
            elif isinstance(models_response, dict) and 'data' in models_response:
                models = [model['id'] for model in models_response['data']]
            else:
                logger.warning(f"Unexpected response format: {models_response}")
                models = []

            logger.info(f"Models found for Z.ai: {models}")
            return models

        except Exception as e:
            logger.error(f"Error getting Z.ai models: {type(e).__name__}: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")

            # Si falla el endpoint, retornar lista de modelos comunes conocidos
            logger.warning("Using fallback model list")
            return [
                "glm-5",
                "glm-4.7",
                "glm-4.7-flash",
                "glm-4-plus",
                "glm-4-air",
                "glm-4-flash",
            ]
