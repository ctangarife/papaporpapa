<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api } from '@/api'

const router = useRouter()
const route = useRoute()

const credentials = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const checking = ref(false)
const error = ref<string | null>(null)
const success = ref(false)

// Detectar si viene del onboarding
const fromOnboarding = computed(() => route.query.onboarding === 'true')

const showAddModal = ref(false)
const editingCredential = ref<any>(null)

// Modelos disponibles dinámicamente
const availableModels = ref<string[]>([])

const newCredential = ref({
  provider: 'ollama' as 'ollama' | 'zai' | 'minimax',
  apiKey: '',
  modelName: '',
  isDefault: false
})

// Información de proveedores (sin modelos hardcodeados)
const providersInfo: Record<string, {
  name: string
  description: string
  requiresApiKey: boolean
}> = {
  ollama: {
    name: 'Ollama Cloud',
    description: 'Modelos LLM en Ollama Cloud (requiere API key en ollama.com/settings/keys)',
    requiresApiKey: true
  },
  zai: {
    name: 'Z.ai (Zhipu AI)',
    description: 'GLM models (glm-4-plus, glm-4.7, etc.)',
    requiresApiKey: true
  },
  minimax: {
    name: 'MiniMax',
    description: 'Modelos de MiniMax AI',
    requiresApiKey: true
  }
}

const currentProviderInfo = computed(() => providersInfo[newCredential.value.provider])

// Modelos disponibles para el select (incluye el modelo actual al editar)
const modelsForSelect = computed(() => {
  const models = availableModels.value

  // Si estamos editando y hay un modelo actual, asegurarse de que esté en la lista
  if (editingCredential.value && newCredential.modelName && !models.includes(newCredential.modelName)) {
    return [newCredential.modelName, ...models]
  }

  return models
})

onMounted(async () => {
  await fetchCredentials()
})

async function fetchCredentials() {
  loading.value = true
  error.value = null
  try {
    const response = await api.get('/llm-credentials')
    credentials.value = response.data
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Error cargando credenciales'
  } finally {
    loading.value = false
  }
}

function openAddModal() {
  newCredential.value = {
    provider: 'ollama',
    apiKey: '',
    modelName: '',
    isDefault: false
  }
  availableModels.value = [] // Resetear modelos
  showAddModal.value = true
}

async function checkApiKey() {
  const provider = newCredential.value.provider
  const info = providersInfo[provider]

  // Si estamos editando y no se ingresó nueva API key, usar la credencial existente
  if (editingCredential.value && !newCredential.value.apiKey.trim()) {
    await loadModelsForExistingCredential(editingCredential.value.id)
    return
  }

  // Validar que se haya ingresado API Key si es requerida
  if (info.requiresApiKey && !newCredential.value.apiKey.trim()) {
    error.value = `Ingresa la API Key de ${info.name} primero`
    return
  }

  checking.value = true
  error.value = null

  try {
    const response = await api.post('/llm-credentials/check', {
      provider: provider,
      apiKey: newCredential.value.apiKey || undefined
    })

    if (response.data.valid) {
      availableModels.value = response.data.models || []

      if (availableModels.value.length === 0) {
        error.value = 'Credencial válida pero no se encontraron modelos disponibles'
      } else {
        // Seleccionar el primer modelo por defecto si no hay uno seleccionado
        if (!newCredential.value.modelName) {
          newCredential.value.modelName = availableModels.value[0]
        }
      }
    } else {
      availableModels.value = []
      error.value = response.data.error || 'Error verificando credencial'
    }
  } catch (e: any) {
    availableModels.value = []
    error.value = e.response?.data?.message || 'Error verificando credencial'
  } finally {
    checking.value = false
  }
}

function closeModal() {
  showAddModal.value = false
  editingCredential.value = null
  error.value = null
}

async function saveCredential() {
  const provider = newCredential.value.provider
  const info = providersInfo[provider as keyof typeof providersInfo]

  // Validaciones
  // Solo requerir API key para nuevas credenciales, no al editar
  if (!editingCredential.value && info.requiresApiKey && !newCredential.value.apiKey.trim()) {
    error.value = `API Key es requerida para ${info.name}`
    return
  }

  if (!newCredential.value.modelName.trim()) {
    error.value = 'Debes seleccionar un modelo.'
    return
  }

  saving.value = true
  error.value = null
  success.value = false

  try {
    const payload: any = {
      provider: newCredential.value.provider,
      isDefault: newCredential.value.isDefault,
      modelName: newCredential.value.modelName.trim()
    }

    // Solo enviar API key si se ingresó una nueva
    if (newCredential.value.apiKey.trim()) {
      payload.apiKey = newCredential.value.apiKey.trim()
    }

    if (editingCredential.value) {
      await api.put(`/llm-credentials/${editingCredential.value.id}`, payload)
    } else {
      await api.post('/llm-credentials', payload)
    }

    success.value = true
    closeModal()
    await fetchCredentials()
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Error guardando credencial'
  } finally {
    saving.value = false
  }
}

async function deleteCredential(id: string) {
  if (!confirm('¿Estás seguro de eliminar esta credencial?')) return

  try {
    await api.delete(`/llm-credentials/${id}`)
    await fetchCredentials()
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Error eliminando credencial'
  }
}

function setAsDefault(id: string) {
  const cred = credentials.value.find(c => c.id === id)
  if (cred) {
    editCredential(cred)
    newCredential.value.isDefault = true
  }
}

async function editCredential(cred: any) {
  editingCredential.value = cred
  newCredential.value = {
    provider: cred.provider,
    apiKey: '',
    modelName: cred.modelName || '',
    isDefault: cred.isDefault || false
  }
  showAddModal.value = true

  // Cargar modelos disponibles automáticamente al editar
  await loadModelsForExistingCredential(cred.id)
}

async function loadModelsForExistingCredential(credentialId: string) {
  checking.value = true
  error.value = null

  try {
    const response = await api.get(`/llm-credentials/${credentialId}/models`)
    availableModels.value = response.data.models || []

    if (availableModels.value.length === 0) {
      error.value = 'No se encontraron modelos disponibles para esta credencial'
    }
  } catch (e: any) {
    availableModels.value = []
    // No mostrar error si falla, el usuario aún puede cambiar el modelo manualmente
  } finally {
    checking.value = false
  }
}

function goBack() {
  router.push('/dashboard')
}
</script>

<template>
  <div class="settings-container">
    <div class="settings-card">
      <header class="card-header">
        <button @click="goBack" class="btn-back">← Volver</button>
        <h1>⚙️ Configuración LLM</h1>
        <button @click="openAddModal" class="btn-add">
          + Agregar
        </button>
      </header>

      <!-- Mensaje de bienvenida del onboarding -->
      <div v-if="fromOnboarding" class="onboarding-welcome">
        <div class="onboarding-welcome-content">
          <span class="onboarding-emoji">🎉</span>
          <div>
            <h2>¡Bienvenido a Papas App!</h2>
            <p>Para comenzar a crear proyectos, necesitas configurar al menos un proveedor de IA. Agrega tus credenciales y estarás listo para empezar.</p>
          </div>
        </div>
      </div>

      <div class="settings-content">
        <div v-if="success" class="success-message">
          Configuración guardada correctamente
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
          <button @click="error = null" class="btn-close-error">✕</button>
        </div>

        <div class="info-box">
          <p>Configura tus propias credenciales para cada proveedor de LLM. Estas credenciales son privadas y solo las usará tu cuenta.</p>
        </div>

        <div v-if="loading" class="loading">
          Cargando configuración...
        </div>

        <div v-else-if="credentials.length === 0" class="empty-state">
          <div class="empty-emoji">🔑</div>
          <h2>Sin credenciales configuradas</h2>
          <p>Agrega tus credenciales para usar los modelos LLM</p>
          <button @click="openAddModal" class="btn-primary">
            Agregar Credencial
          </button>
        </div>

        <div v-else class="credentials-list">
          <div
            v-for="cred in credentials"
            :key="cred.id"
            class="credential-card"
            :class="{ default: cred.isDefault }"
          >
            <div class="credential-header">
              <div class="provider-info">
                <span class="provider-icon">
                  {{ cred.provider === 'ollama' ? '🦙' : cred.provider === 'zai' ? '🤖' : '🧠' }}
                </span>
                <div>
                  <h3>{{ providersInfo[cred.provider as keyof typeof providersInfo].name }}</h3>
                  <p v-if="cred.isDefault" class="default-badge">Predeterminado</p>
                </div>
              </div>
              <div class="credential-actions">
                <button
                  v-if="!cred.isDefault"
                  @click="setAsDefault(cred.id)"
                  class="btn-default"
                  title="Establecer como predeterminado"
                >
                  ⭐
                </button>
                <button @click="editCredential(cred)" class="btn-edit">✏️</button>
                <button @click="deleteCredential(cred.id)" class="btn-delete">🗑️</button>
              </div>
            </div>

            <div class="credential-details">
              <div v-if="cred.modelName" class="detail-item">
                <span class="detail-label">Modelo:</span>
                <span class="detail-value">{{ cred.modelName }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">API Key:</span>
                <span class="detail-value">{{ cred.hasApiKey ? '✓ Configurada' : 'No configurada' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Agregar/Editar -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <header class="modal-header">
          <h2>{{ editingCredential ? 'Editar' : 'Agregar' }} Credencial</h2>
          <button @click="closeModal" class="btn-close">✕</button>
        </header>

        <form @submit.prevent="saveCredential" class="modal-form">
          <div class="form-group">
            <label>Proveedor</label>
            <div class="provider-selector">
              <button
                v-for="(info, key) in providersInfo"
                :key="key"
                type="button"
                :class="['provider-option', { active: newCredential.provider === key }]"
                @click="newCredential.provider = key"
              >
                <span class="provider-icon">{{ key === 'ollama' ? '🦙' : key === 'zai' ? '🤖' : '🧠' }}</span>
                <span>{{ info.name }}</span>
              </button>
            </div>
          </div>

          <div class="provider-info-box">
            <p>{{ currentProviderInfo.description }}</p>
          </div>

          <div v-if="currentProviderInfo.requiresApiKey" class="form-group">
            <label for="apiKey">API Key *</label>
            <input
              id="apiKey"
              v-model="newCredential.apiKey"
              type="password"
              class="api-key-input"
              :class="{ 'has-existing-key': editingCredential }"
              :placeholder="editingCredential ? '****•••••••••••• (deja vacío para mantener actual)' : 'Tu API Key'"
              :disabled="checking"
            />
            <small v-if="editingCredential" class="input-hint">
              La API Key actual está guardada de forma segura. Solo ingresa una nueva si quieres cambiarla.
            </small>
          </div>

          <div class="form-group">
            <label for="modelName">Modelo preferido *</label>
            <div class="model-input-group">
              <select
                id="modelName"
                v-model="newCredential.modelName"
                :disabled="checking || (modelsForSelect.length === 0 && !editingCredential)"
                :class="{ 'select-empty': !newCredential.modelName }"
              >
                <option value="" disabled selected>
                  {{ modelsForSelect.length === 0
                    ? (editingCredential ? 'Cargando modelos...' : 'Verifica tu API Key primero')
                    : 'Selecciona un modelo'
                  }}
                </option>
                <option v-for="model in modelsForSelect" :key="model" :value="model">
                  {{ model }}
                  {{ model === newCredential.modelName && editingCredential ? ' (actual)' : '' }}
                </option>
              </select>
              <button
                type="button"
                @click="checkApiKey"
                class="btn-check"
                :disabled="checking || (!editingCredential && !newCredential.apiKey)"
                :title="editingCredential ? 'Recargar modelos disponibles' : 'Verificar API Key y cargar modelos disponibles'"
              >
                {{ checking ? 'Cargando...' : (editingCredential ? '🔄 Recargar' : '🔄 Verificar') }}
              </button>
            </div>
            <small v-if="availableModels.length > 0" class="models-count">
              ✓ {{ availableModels.length }} modelos disponibles
            </small>
            <small v-else-if="editingCredential && !checking" class="models-hint">
              Cargando modelos... (puedes seleccionar el actual temporalmente)
            </small>
            <small v-else class="models-hint">
              {{ editingCredential
                ? 'Haz clic en Recargar para actualizar la lista de modelos'
                : 'Ingresa tu API Key y haz clic en Verificar para cargar los modelos'
              }}
            </small>
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input v-model="newCredential.isDefault" type="checkbox" />
              <span>Establecer como proveedor predeterminado</span>
            </label>
          </div>

          <div class="modal-actions">
            <button type="button" @click="closeModal" class="btn-secondary" :disabled="saving">
              Cancelar
            </button>
            <button
              type="submit"
              class="btn-primary"
              :disabled="saving || !newCredential.modelName"
            >
              {{ saving ? 'Guardando...' : (editingCredential ? 'Actualizar' : 'Agregar') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: #f5f5f5;
}

.settings-card {
  background: white;
  border-radius: 1rem;
  width: 100%;
  max-width: 800px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
  gap: 1rem;
}

.btn-back {
  background: none;
  border: none;
  font-size: 1rem;
  color: #667eea;
  cursor: pointer;
  font-weight: 600;
}

.card-header h1 {
  color: #333;
  font-size: 1.25rem;
  text-align: center;
}

.btn-add {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
}

.settings-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.success-message {
  background: #efe;
  color: #4caf50;
  padding: 0.75rem;
  border-radius: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 0.75rem;
  border-radius: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-close-error {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
}

.info-box {
  background: #e3f2fd;
  padding: 1rem;
  border-radius: 0.5rem;
  border-left: 4px solid #2196f3;
}

.info-box p {
  color: #1565c0;
  margin: 0;
}

.onboarding-welcome {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1.5rem;
}

.onboarding-welcome-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: white;
}

.onboarding-emoji {
  font-size: 3rem;
}

.onboarding-welcome h2 {
  color: white;
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
}

.onboarding-welcome p {
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-size: 0.875rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
}

.empty-emoji {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h2 {
  color: #333;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #666;
  margin-bottom: 1.5rem;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.875rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
}

.credentials-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.credential-card {
  border: 1px solid #e0e0e0;
  border-radius: 1rem;
  padding: 1.5rem;
  transition: box-shadow 0.2s;
}

.credential-card.default {
  border-color: #ffd700;
  box-shadow: 0 0 0 1px #ffd700;
}

.credential-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.provider-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.provider-icon {
  font-size: 2rem;
}

.provider-info h3 {
  color: #333;
  font-size: 1.125rem;
  margin: 0;
}

.default-badge {
  color: #f57c00;
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0;
}

.credential-actions {
  display: flex;
  gap: 0.5rem;
}

.credential-actions button {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.5rem;
}

.credential-actions button:hover {
  background: #f5f5f5;
}

.credential-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  font-size: 0.875rem;
}

.detail-label {
  color: #666;
  min-width: 80px;
}

.detail-value {
  color: #333;
  font-family: monospace;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modal-card {
  background: white;
  border-radius: 1rem;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  color: #333;
  font-size: 1.25rem;
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
}

.modal-form {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: #555;
}

.form-group input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  font-size: 1rem;
}

.form-group small {
  color: #666;
  font-size: 0.75rem;
}

.provider-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.provider-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.provider-option:hover {
  border-color: #667eea;
}

.provider-option.active {
  border-color: #667eea;
  background: #f0f0ff;
}

.provider-info-box {
  background: #f5f5f5;
  padding: 0.75rem;
  border-radius: 0.5rem;
}

.provider-info-box p {
  color: #666;
  margin: 0;
  font-size: 0.875rem;
}

.checkbox-group {
  flex-direction: row;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.btn-secondary {
  background: white;
  color: #666;
  border: 1px solid #ddd;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary:disabled,
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Model input group */
.model-input-group {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.model-input-group select,
.model-input-group input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  font-size: 1rem;
  background: white;
}

.model-input-group select:disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

.model-input-group select.select-empty {
  color: #999;
}

.btn-check {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s;
}

.btn-check:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-check:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.models-count {
  color: #4caf50;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.models-hint {
  color: #666;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

/* API Key input con llave existente */
.api-key-input.has-existing-key::placeholder {
  color: #333;
  font-weight: 500;
  opacity: 0.7;
}

.api-key-input.has-existing-key {
  background: #f0f8ff;
  border-color: #4a90d9;
}

.input-hint {
  display: block;
  color: #4a90d9;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}
</style>
