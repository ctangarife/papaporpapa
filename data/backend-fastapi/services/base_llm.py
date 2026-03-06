from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from schemas.llm import Message, LLMDynamicCredentials


class BaseLLMService(ABC):
    """Clase base para servicios LLM"""

    @abstractmethod
    async def generate_tasks(
        self,
        goal: str,
        context: Optional[str] = None,
        model: Optional[str] = None,
        credentials: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Genera una lista de tareas a partir de un objetivo

        Args:
            goal: El objetivo del proyecto
            context: Contexto adicional (opcional)
            model: Modelo a usar (opcional, usa default si no se especifica)
            credentials: Credenciales dinámicas del usuario (opcional)

        Returns:
            Dict con:
                - tasks: Lista de tareas generadas
                - summary: Resumen del proyecto
        """
        pass

    @abstractmethod
    async def chat_completion(
        self,
        messages: List[Message],
        model: Optional[str] = None,
        credentials: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> str:
        """
        Realiza una petición de chat completion

        Args:
            messages: Lista de mensajes
            model: Modelo a usar
            credentials: Credenciales dinámicas del usuario (opcional)
            **kwargs: Parámetros adicionales

        Returns:
            Respuesta del modelo como string
        """
        pass

    def _build_system_prompt(self) -> str:
        """Construye el prompt del sistema para generación de tareas"""
        return '''Eres un asistente experto en planificación de proyectos. Tu trabajo es desglosar objetivos grandes en tareas pequeñas y específicas.

REGLAS IMPORTANTES:
1. Cada tarea debe ser una acción concreta y medible
2. Las tareas deben estar ordenadas secuencialmente
3. "difficulty": SOLO usar "easy", "medium" o "hard"
   - easy: tareas muy simples (< 15 min)
   - medium: tareas normales (15-60 min)
   - hard: tareas complejas (1-2 horas)
4. Usa lenguaje claro y directo (español neutro o colombiano)
5. Si una tarea depende de otra, indícalo en "dependsOn"

RESPUESTA: Debes responder SOLAMENTE con JSON válido usando camelCase, sin texto adicional:
{
  "tasks": [
    {
      "description": "Descripción breve y accionable de la tarea",
      "order": 1,
      "difficulty": "medium",
      "dependsOn": []
    }
  ],
  "summary": "Resumen de 1-2 líneas del proyecto"
}'''

    def _build_user_prompt(self, goal: str, context: Optional[str] = None) -> str:
        """Construye el prompt del usuario"""
        prompt = f'Objetivo: "{goal}"\n\nGenera las tareas necesarias para completar este objetivo.'
        if context:
            prompt += f'\n\nContexto adicional: {context}'
        return prompt

    @abstractmethod
    async def get_available_models(
        self,
        credentials: Optional[Dict[str, Any]] = None
    ) -> List[str]:
        """
        Obtiene la lista de modelos disponibles del proveedor

        Args:
            credentials: Credenciales dinámicas del usuario (opcional)

        Returns:
            Lista de nombres de modelos disponibles
        """
        pass
