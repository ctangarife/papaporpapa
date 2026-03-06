import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, AuthResponse, LoginCredentials, RegisterData } from '@/types'
import { api } from '@/api'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('papas_token'))
  const initialized = ref(false)

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const coinsBalance = computed(() => user.value?.coinsBalance ?? 0)
  const needsOnboarding = computed(() => user.value && !user.value.onboardingCompleted)

  // Actions
  async function fetchProfile() {
    if (!token.value) return
    try {
      const response = await api.get<User>('/users/profile')
      user.value = response.data
      return response.data
    } catch (error) {
      clearAuth()
    }
  }

  async function initialize() {
    if (token.value && !user.value && !initialized.value) {
      initialized.value = true
      await fetchProfile()
    }
    return !!user.value
  }

  function setAuth(authResponse: AuthResponse) {
    user.value = authResponse.user
    token.value = authResponse.token
    localStorage.setItem('papas_token', authResponse.token)
    api.defaults.headers.common['Authorization'] = `Bearer ${authResponse.token}`
  }

  function clearAuth() {
    user.value = null
    token.value = null
    localStorage.removeItem('papas_token')
    delete api.defaults.headers.common['Authorization']
  }

  async function login(credentials: LoginCredentials) {
    const response = await api.post<AuthResponse>('/auth/login', credentials)
    setAuth(response.data)
    return response.data
  }

  async function register(data: RegisterData) {
    const response = await api.post<AuthResponse>('/auth/register', data)
    setAuth(response.data)
    return response.data
  }

  async function logout() {
    // Por ahora solo limpiamos localmente
    // Si hubiera un endpoint de logout, llamarlo aquí
    clearAuth()
  }

  async function completeOnboarding() {
    const response = await api.post<{ success: boolean; user: any }>('/auth/onboarding/complete')
    if (user.value && response.data.user) {
      user.value.onboardingCompleted = true
    }
  }

  // Inicializar token si existe
  if (token.value) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
  }

  return {
    user,
    token,
    isAuthenticated,
    coinsBalance,
    needsOnboarding,
    initialized,
    setAuth,
    clearAuth,
    login,
    register,
    logout,
    fetchProfile,
    completeOnboarding,
    initialize
  }
})
