from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict
from enum import Enum


class LLMProvider(str, Enum):
    """Proveedores LLM disponibles"""
    ollama = "ollama"
    zai = "zai"
    minimax = "minimax"


class Message(BaseModel):
    """Mensaje para el chat"""
    role: Literal["system", "user", "assistant"]
    content: str


class LLMDynamicCredentials(BaseModel):
    """Credenciales dinámicas por proveedor (enviadas por el backend NestJS)"""
    zai: Optional[Dict[str, str]] = Field(default=None, description="Credenciales Z.ai: {apiKey, apiEndpoint}")
    minimax: Optional[Dict[str, str]] = Field(default=None, description="Credenciales MiniMax: {apiKey, apiEndpoint}")
    ollama: Optional[Dict[str, str]] = Field(default=None, description="Credenciales Ollama Cloud: {apiKey, apiEndpoint}")

    defaultProvider: LLMProvider = Field(default=LLMProvider.ollama)
    defaultModel: str = Field(default="llama3.2")


class ChatRequest(BaseModel):
    """Request para generar tareas desde un objetivo"""
    goal: str
    provider: LLMProvider = LLMProvider.ollama
    model: Optional[str] = None
    context: Optional[str] = None  # Contexto adicional (ej: usuario atascado)
    credentials: Optional[LLMDynamicCredentials] = Field(
        default=None,
        description="Credenciales dinámicas del usuario (opcional, usa env vars si no se proporciona)"
    )


class TaskGeneration(BaseModel):
    """Tarea generada por el LLM"""
    description: str
    order: int
    coin_value: int = 10
    depends_on: List[int] = []  # Índices de tareas previas (0-indexed)


class ChatResponse(BaseModel):
    """Response con las tareas generadas"""
    tasks: List[TaskGeneration]
    summary: str  # Resumen breve del proyecto


class StreamChunk(BaseModel):
    """Chunk para streaming response"""
    content: str
    done: bool = False
