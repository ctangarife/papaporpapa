import json
import logging
from typing import List, Dict, Any, Optional
from ollama_client_lib import OllamaClient
from services.base_llm import BaseLLMService
from schemas.llm import Message
from core.config import settings

logger = logging.getLogger(__name__)


class OllamaService(BaseLLMService):
    """Servicio LLM usando ollama-client-lib para Ollama Cloud"""

    def __init__(self):
        # Ollama Cloud configuration
        # Note: ollama-client-lib automatically adds -cloud suffix to model names
        self.default_base_url = settings.OLLAMA_HOST or "https://ollama.com"
        self.default_model = settings.DEFAULT_LLM_MODEL if settings.DEFAULT_LLM_PROVIDER == "ollama" else "kimi-k2:1t"

    def _get_client(self, credentials: Optional[Dict[str, Any]] = None) -> OllamaClient:
        """Crea y retorna un cliente de Ollama Cloud configurado"""
        base_url = credentials.get("apiEndpoint") if credentials and credentials.get("apiEndpoint") else self.default_base_url
        api_key = credentials.get("apiKey") if credentials and credentials.get("apiKey") else None

        return OllamaClient(
            api_key=api_key,
            base_url=base_url
        )

    def _messages_to_prompt(self, messages: List[Message]) -> tuple[str, Optional[str]]:
        """Convierte una lista de mensajes a prompt y system_prompt"""
        system_prompt = None
        user_messages = []

        for msg in messages:
            if msg.role == "system":
                system_prompt = msg.content
            else:
                user_messages.append(f"{msg.role}: {msg.content}")

        prompt = "\n".join(user_messages)
        return prompt, system_prompt

    async def _call_ollama(
        self,
        messages: List[Message],
        model: Optional[str] = None,
        credentials: Optional[Dict[str, Any]] = None
    ) -> str:
        """Realiza una llamada a Ollama Cloud usando ollama-client-lib"""
        client = self._get_client(credentials)
        model = model or self.default_model

        # Convertir mensajes a prompt
        prompt, system_prompt = self._messages_to_prompt(messages)

        try:
            # ollama-client-lib usa generate_response() y es async
            async with client:
                response = await client.generate_response(
                    prompt=prompt,
                    model=model,
                    system_prompt=system_prompt
                )
            return response

        except Exception as e:
            logger.error(f"Error calling Ollama: {e}")
            raise ValueError(f"Error al comunicarse con Ollama: {str(e)}")

    async def generate_tasks(
        self,
        goal: str,
        context: Optional[str] = None,
        model: Optional[str] = None,
        credentials: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Genera tareas usando Ollama Cloud"""
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(goal, context)

        # Crear cliente
        client = self._get_client(credentials)
        model = model or self.default_model

        try:
            async with client:
                response = await client.generate_response(
                    prompt=user_prompt,
                    model=model,
                    system_prompt=system_prompt
                )

            # Intentar parsear como JSON
            try:
                result = json.loads(response)

                # Validar respuesta
                if "tasks" not in result:
                    logger.warning(f"Respuesta sin 'tasks': {response[:200]}")
                    raise ValueError("Respuesta inválida: falta 'tasks'")

                # Validar que tasks sea un array
                if not isinstance(result.get("tasks"), list):
                    raise ValueError("Respuesta inválida: 'tasks' no es un array")

                return result

            except json.JSONDecodeError as e:
                logger.warning(f"Ollama no devolvió JSON válido: {e}")
                # Fallback: intentar extraer JSON del texto
                return self._extract_json_fallback(response)

        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Error in generate_tasks: {e}")
            raise ValueError(f"Error generando tareas: {str(e)}")

    async def chat_completion(
        self,
        messages: List[Message],
        model: Optional[str] = None,
        credentials: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> str:
        """Chat completion usando Ollama Cloud"""
        return await self._call_ollama(messages, model, credentials=credentials)

    def _extract_json_fallback(self, text: str) -> Dict[str, Any]:
        """Intenta extraer JSON válido de una respuesta de texto"""
        import re

        # Intentar extraer JSON entre bloques de código markdown
        json_match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except:
                pass

        # Buscar cualquier estructura JSON completa
        json_match = re.search(r'\{[\s\S]*\}', text)
        if json_match:
            try:
                return json.loads(json_match.group(0))
            except:
                pass

        # Fallback final: retornar estructura por defecto
        logger.warning("Could not extract JSON from response, using fallback")
        return {
            "tasks": [
                {
                    "description": f"Tarea: {text[:150]}...",
                    "order": 1,
                    "coin_value": 10,
                    "depends_on": []
                }
            ],
            "summary": "Generación automática - requiere revisión"
        }

    def _build_system_prompt(self) -> str:
        """Construye el prompt del sistema para generar tareas"""
        return """Eres un asistente especialista en dividir proyectos grandes en micro-tareas simples y alcanzables.

Tu tarea es analizar un objetivo y crear una lista de tareas pequeñas y específicas.

IMPORTANTE - Reglas de formato:
1. Debes responder SOLAMENTE en formato JSON válido, sin texto adicional
2. No uses markdown, ni explicaciones fuera del JSON
3. El JSON debe tener esta estructura exacta (usa camelCase):
{
  "tasks": [
    {
      "description": "tarea específica y accionable",
      "order": 1,
      "difficulty": "easy",
      "dependsOn": []
    }
  ],
  "summary": "breve descripción del proyecto"
}

Reglas para crear tareas:
- Cada tarea debe ser específica y medible (máximo 1-2 horas de trabajo)
- Las tareas deben estar en orden lógico
- Usa "order" para numerar las tareas (1, 2, 3...)
- "difficulty": SOLO usar estos valores: "easy", "medium", "hard"
  * easy: tareas muy simples (< 15 min)
  * medium: tareas normales (15-60 min)
  * hard: tareas complejas (1-2 horas)
- "dependsOn": array de números (order) de tareas que deben completarse antes (ej: [1, 2])
- Máximo 10 tareas
- Usa SIEMPRE camelCase: "description", "order", "difficulty", "dependsOn", "summary"
- Responde EXACTAMENTE el JSON, nada más"""

    async def get_available_models(
        self,
        credentials: Optional[Dict[str, Any]] = None
    ) -> List[str]:
        """Obtiene la lista de modelos disponibles desde Ollama Cloud usando ollama-client-lib"""
        base_url = credentials.get("apiEndpoint") if credentials and credentials.get("apiEndpoint") else self.default_base_url
        api_key = credentials.get("apiKey") if credentials and credentials.get("apiKey") else None

        # Debug logging
        logger.info(f"=== Ollama get_available_models ===")
        logger.info(f"base_url: {base_url}")
        logger.info(f"api_key provided: {bool(api_key)}")
        if api_key:
            logger.info(f"api_key last 4: {api_key[-4:] if len(api_key) > 4 else '***'}")

        try:
            client = OllamaClient(api_key=api_key, base_url=base_url)

            async with client:
                models = await client.list_available_models()

            logger.info(f"Models returned: {models}")
            logger.info(f"Models count: {len(models)}")
            return models

        except Exception as e:
            logger.error(f"Error getting Ollama Cloud models: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return []

    def _build_user_prompt(self, goal: str, context: Optional[str] = None) -> str:
        """Construye el prompt del usuario"""
        prompt = f"""Objetivo: {goal}

Genera las tareas necesarias para completar este objetivo."""
        if context:
            prompt += f"\n\nContexto adicional:\n{context}"
        return prompt
