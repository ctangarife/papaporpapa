// ==============================================================================
// PAPAS APP - Frontend Types
// ==============================================================================

export type DiagnosisType = 'TEA' | 'TDHA' | 'TEA_TDHA' | 'DISLEXIA' | 'TDA' | 'NONE' | 'OTHER';

export interface User {
  id: string
  email: string
  name: string
  lastName?: string
  username?: string
  coinsBalance: number
  birthDate?: string
  diagnosis?: DiagnosisType
  onboardingCompleted: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName?: string
  username?: string
  birthDate?: string
  diagnosis?: DiagnosisType
}

export interface Task {
  id: string
  projectId: string
  description: string
  status: 'pending' | 'completed' | 'blocked' | 'skipped'
  coinValue: number
  sortOrder: number
  dependsOn: string[]
  createdAt: string
  completedAt: string | null
  skippedAt: string | null
}

export interface Project {
  id: string
  userId: string
  name: string
  description: string | null
  status: 'active' | 'paused' | 'completed'
  createdAt: string
  updatedAt: string
  completedAt: string | null
  tasks?: Task[]
}

export interface CreateProjectDto {
  name: string
  description?: string
}

export interface LLMProvider {
  id: 'ollama' | 'zai' | 'minimax'
  name: string
  description: string
}

export interface GenerateTasksRequest {
  goal: string
  provider?: 'ollama' | 'zai' | 'minimax'
  model?: string
  context?: string
}

export interface GeneratedTask {
  description: string
  order: number
  difficulty: 'easy' | 'medium' | 'hard'
  coinValue: number
  dependsOn: number[]
}

export interface GenerateTasksResponse {
  tasks: GeneratedTask[]
  summary: string
}

export interface OnboardingData {
  step: number
  diagnosis?: DiagnosisType
  preferences?: {
    communicationStyle: 'direct' | 'clear' | 'detailed'
    taskBreakdown: 'very_small' | 'small' | 'medium'
    useVisuals: boolean
    celebrateMilestones: boolean
  }
}

export interface UserLLMCredential {
  id: string
  provider: 'ollama' | 'zai' | 'minimax'
  apiEndpoint?: string
  modelName?: string
  isDefault: boolean
  hasApiKey: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateCredentialDto {
  provider: 'ollama' | 'zai' | 'minimax'
  apiKey?: string
  apiEndpoint?: string
  modelName?: string
  isDefault?: boolean
}

export interface CheckCredentialResponse {
  valid: boolean
  models: string[]
  error?: string
}
