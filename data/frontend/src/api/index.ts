import axios from 'axios'

// Crear instancia de axios con configuración base
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor para agregar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('papas_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('papas_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API endpoints
export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  register: (data: { email: string; password: string; firstName: string; lastName?: string; username?: string; birthDate?: string; diagnosis?: string }) =>
    api.post('/auth/register', data)
}

export const usersApi = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: { firstName?: string; lastName?: string; username?: string; diagnosis?: string }) =>
    api.put('/users/profile', data),
  completeOnboarding: () =>
    api.put('/users/onboarding-complete')
}

export const projectsApi = {
  list: () => api.get('/projects'),
  get: (id: string) => api.get(`/projects/${id}`),
  create: (data: { name: string; description?: string }) =>
    api.post('/projects', data),
  update: (id: string, data: { name?: string; description?: string; status?: string }) =>
    api.put(`/projects/${id}`, data),
  complete: (id: string) =>
    api.post(`/projects/${id}/complete`),
  generateTasks: (data: { goal: string; provider?: string; model?: string; context?: string }) =>
    api.post('/projects/generate-tasks', data),
  remove: (id: string) =>
    api.delete(`/projects/${id}`)
}

export const tasksApi = {
  list: (projectId: string) =>
    api.get(`/tasks/project/${projectId}`),
  get: (id: string) =>
    api.get(`/tasks/${id}`),
  create: (data: { projectId: string; description: string; sortOrder: number; coinValue?: number; dependsOn?: string[] }) =>
    api.post('/tasks', data),
  update: (id: string, data: { description?: string; status?: string }) =>
    api.put(`/tasks/${id}`, data),
  complete: (id: string) =>
    api.post(`/tasks/${id}/complete`),
  skip: (id: string) =>
    api.post(`/tasks/${id}/skip`),
  reset: (id: string) =>
    api.post(`/tasks/${id}/reset`)
}

export const llmApi = {
  generateTasks: (data: { goal: string; provider?: string; model?: string; context?: string }) =>
    api.post('/llm/generate-tasks', data),
  getProviders: () =>
    api.get('/llm/providers')
}

export const llmCredentialsApi = {
  list: () => api.get('/llm-credentials'),
  get: (id: string) => api.get(`/llm-credentials/${id}`),
  getDefault: () => api.get('/llm-credentials/default'),
  create: (data: { provider: string; apiKey?: string; apiEndpoint?: string; modelName?: string; isDefault?: boolean }) =>
    api.post('/llm-credentials', data),
  update: (id: string, data: { apiKey?: string; apiEndpoint?: string; modelName?: string; isDefault?: boolean }) =>
    api.put(`/llm-credentials/${id}`, data),
  delete: (id: string) =>
    api.delete(`/llm-credentials/${id}`),
  checkCredentialAndGetModels: (data: { provider: string; apiKey?: string; apiEndpoint?: string }) =>
    api.post('/llm-credentials/check', data),
  getModelsForCredential: (id: string) =>
    api.get(`/llm-credentials/${id}/models`)
}
