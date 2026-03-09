<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { RegisterData } from '@/types'

const router = useRouter()
const authStore = useAuthStore()

const formData = ref<RegisterData>({
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  username: ''
})

const confirmPassword = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

async function handleRegister() {
  error.value = null

  if (formData.value.password !== confirmPassword.value) {
    error.value = 'Las contraseñas no coinciden'
    return
  }

  if (formData.value.password.length < 6) {
    error.value = 'La contraseña debe tener al menos 6 caracteres'
    return
  }

  loading.value = true

  try {
    await authStore.register(formData.value)

    // Redirigir según el estado del usuario
    if (authStore.needsOnboarding) {
      router.push('/onboarding')
    } else {
      router.push('/dashboard')
    }
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Error al registrarse'
  } finally {
    loading.value = false
  }
}

function generateUsername() {
  if (formData.value.firstName) {
    const baseName = formData.value.firstName.toLowerCase().replace(/[^a-z0-9]/g, '')
    formData.value.username = baseName + Math.floor(Math.random() * 1000)
  }
}
</script>

<template>
  <div class="register-container">
    <div class="register-card">
      <h1 class="title">🥔 Crear Cuenta</h1>
      <p class="subtitle">Únete a Papas App</p>

      <form @submit.prevent="handleRegister" class="register-form">
        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <!-- Campos básicos -->
        <div class="form-section">
          <div class="form-row">
            <div class="form-group">
              <label for="firstName">Nombre *</label>
              <input
                id="firstName"
                v-model="formData.firstName"
                type="text"
                required
                placeholder="Tu nombre"
                autocomplete="given-name"
              />
            </div>

            <div class="form-group">
              <label for="lastName">Apellido (opcional)</label>
              <input
                id="lastName"
                v-model="formData.lastName"
                type="text"
                placeholder="Tu apellido"
                autocomplete="family-name"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="username">
              Username *
              <button type="button" @click.prevent="generateUsername" class="btn-generate">
                🎲 Generar
              </button>
            </label>
            <input
              id="username"
              v-model="formData.username"
              type="text"
              required
              placeholder="nombre123"
              autocomplete="username"
            />
            <small>Debes tener un username único. Puedes generar uno automáticamente.</small>
          </div>

          <div class="form-group">
            <label for="email">Email *</label>
            <input
              id="email"
              v-model="formData.email"
              type="email"
              required
              placeholder="tu@email.com"
              autocomplete="email"
            />
          </div>

          <div class="form-group">
            <label for="password">Contraseña *</label>
            <input
              id="password"
              v-model="formData.password"
              type="password"
              required
              placeholder="Mínimo 6 caracteres"
              autocomplete="new-password"
            />
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirmar Contraseña *</label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              required
              placeholder="Repite tu contraseña"
              autocomplete="new-password"
            />
          </div>
        </div>

        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Creando cuenta...' : 'Crear Cuenta' }}
        </button>

        <p class="login-link">
          ¿Ya tienes cuenta? <RouterLink to="/login">Inicia Sesión</RouterLink>
        </p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: #0a0a0a;
}

.register-card {
  background: var(--color-bg-card);
  border-radius: 1rem;
  padding: 2rem;
  width: 100%;
  max-width: 450px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.title {
  font-size: 2rem;
  text-align: center;
  margin-bottom: 0.5rem;
  color: var(--color-text);
}

.subtitle {
  text-align: center;
  color: var(--color-text-secondary);
  margin-bottom: 2rem;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.error-message {
  background: #450a0a;
  color: #fca5a5;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  background: #1a1a1a;
  border-radius: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.btn-generate {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.btn-generate:hover {
  background: #262626;
}

input,
select {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  font-size: 1rem;
  background: var(--color-bg-input);
  color: var(--color-text);
}

input:focus,
select:focus {
  outline: none;
  border-color: #8b5cf6;
}

small {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.btn-primary {
  background: #0a0a0a;
  color: white;
  border: none;
  padding: 0.875rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-link {
  text-align: center;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.login-link a {
  color: #8b5cf6;
  text-decoration: none;
  font-weight: 600;
}

.login-link a:hover {
  text-decoration: underline;
}
</style>
