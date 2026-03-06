<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const editing = ref(false)
const name = ref('')
const error = ref<string | null>(null)
const success = ref(false)

onMounted(() => {
  name.value = authStore.user?.name || ''
})

async function saveProfile() {
  if (!name.value.trim()) {
    error.value = 'El nombre no puede estar vacío'
    return
  }

  loading.value = true
  error.value = null
  success.value = false

  try {
    // TODO: Llamar API para actualizar perfil
    // await usersApi.updateProfile({ name: name.value })
    if (authStore.user) {
      authStore.user.name = name.value
    }
    success.value = true
    editing.value = false
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Error actualizando perfil'
  } finally {
    loading.value = false
  }
}

function cancelEdit() {
  name.value = authStore.user?.name || ''
  editing.value = false
  error.value = null
}

function logout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="profile-container">
    <div class="profile-card">
      <header class="card-header">
        <button @click="$router.back()" class="btn-back">← Volver</button>
        <h1>Mi Perfil</h1>
        <div></div>
      </header>

      <div class="profile-content">
        <!-- User info -->
        <div class="user-section">
          <div class="avatar">
            <span class="avatar-emoji">🥔</span>
          </div>
          <div class="user-info">
            <div v-if="!editing" class="user-name">
              {{ authStore.user?.name }}
            </div>
            <input
              v-else
              v-model="name"
              type="text"
              class="name-input"
              placeholder="Tu nombre"
            />
            <div class="user-email">{{ authStore.user?.email }}</div>
          </div>
          <button
            v-if="!editing"
            @click="editing = true"
            class="btn-edit"
          >
            Editar
          </button>
          <div v-else class="edit-actions">
            <button @click="cancelEdit" class="btn-cancel" :disabled="loading">
              Cancelar
            </button>
            <button @click="saveProfile" class="btn-save" :disabled="loading">
              {{ loading ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <div v-if="success" class="success-message">
          Perfil actualizado correctamente
        </div>

        <!-- Stats -->
        <div class="stats-section">
          <h2>Estadísticas</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-emoji">💰</div>
              <div class="stat-value">{{ authStore.coinsBalance }}</div>
              <div class="stat-label">Monedas Totales</div>
            </div>
            <div class="stat-card">
              <div class="stat-emoji">🥔</div>
              <div class="stat-value">0</div>
              <div class="stat-label">Proyectos Completados</div>
            </div>
            <div class="stat-card">
              <div class="stat-emoji">✅</div>
              <div class="stat-value">0</div>
              <div class="stat-label">Papas Completadas</div>
            </div>
          </div>
        </div>

        <!-- Account actions -->
        <div class="account-section">
          <h2>Cuenta</h2>
          <RouterLink to="/settings" class="btn-settings-link">
            ⚙️ Configuración LLM
          </RouterLink>
          <button @click="logout" class="btn-logout">
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: #f5f5f5;
}

.profile-card {
  background: white;
  border-radius: 1rem;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
}

.btn-back {
  background: none;
  border: none;
  font-size: 1rem;
  color: #667eea;
  cursor: pointer;
  font-weight: 600;
}

.btn-back:hover {
  text-decoration: underline;
}

.card-header h1 {
  color: #333;
  font-size: 1.25rem;
  text-align: center;
}

.profile-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.user-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-emoji {
  font-size: 2rem;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.25rem;
}

.name-input {
  font-size: 1.125rem;
  font-weight: 600;
  color: #333;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  width: 100%;
}

.name-input:focus {
  outline: none;
  border-color: #667eea;
}

.user-email {
  font-size: 0.875rem;
  color: #999;
}

.btn-edit {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  background: white;
  border-radius: 0.5rem;
  font-weight: 600;
  color: #555;
  cursor: pointer;
}

.btn-edit:hover {
  background: #f5f5f5;
}

.edit-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-cancel,
.btn-save {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-cancel {
  background: #f5f5f5;
  border: none;
  color: #666;
}

.btn-cancel:hover {
  background: #e8e8e8;
}

.btn-save {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.success-message {
  background: #efe;
  color: #4caf50;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.stats-section h2,
.account-section h2 {
  color: #333;
  font-size: 1rem;
  margin-bottom: 1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-card {
  background: #f8f8f8;
  border-radius: 1rem;
  padding: 1rem;
  text-align: center;
}

.stat-emoji {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: #666;
}

.btn-settings-link {
  display: block;
  width: 100%;
  padding: 0.875rem;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  background: white;
  color: #555;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  margin-bottom: 0.75rem;
}

.btn-settings-link:hover {
  background: #f5f5f5;
}

.btn-logout {
  width: 100%;
  padding: 0.875rem;
  border: none;
  border-radius: 0.5rem;
  background: #fee;
  color: #c33;
  font-weight: 600;
  cursor: pointer;
}

.btn-logout:hover {
  background: #fcc;
}
</style>
