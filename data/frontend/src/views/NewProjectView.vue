<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectsStore } from '@/stores/projects'
import { projectsApi, tasksApi } from '@/api'
import type { CreateProjectDto, GenerateTasksResponse } from '@/types'

const router = useRouter()
const projectsStore = useProjectsStore()

const step = ref<'goal' | 'tasks'>('goal')
const goal = ref('')
const provider = ref<'ollama' | 'zai' | 'minimax'>('ollama')
const projectName = ref('')
const loading = ref(false)
const generating = ref(false)
const error = ref<string | null>(null)
const generatedTasks = ref<GenerateTasksResponse | null>(null)

async function generateTasks() {
  if (!goal.value.trim()) {
    error.value = 'Por favor describe tu objetivo'
    return
  }

  generating.value = true
  error.value = null

  try {
    const response = await projectsApi.generateTasks({
      goal: goal.value,
      provider: provider.value
    })

    // Normalizar tareas: difficulty → coinValue
    const coinValues: Record<string, number> = { easy: 5, medium: 10, hard: 20 }

    const normalizedTasks = response.data.tasks.map((task: any) => ({
      description: task.description,
      order: task.order,
      difficulty: task.difficulty,
      coinValue: coinValues[task.difficulty] || 10, // Mapear difficulty a coins
      dependsOn: task.dependsOn || []
    }))

    generatedTasks.value = {
      tasks: normalizedTasks,
      summary: response.data.summary
    }

    console.log('[NewProject] Tareas generadas y normalizadas:', generatedTasks.value)

    // Sugerir nombre basado en el objetivo
    projectName.value = goal.value.slice(0, 50)

    step.value = 'tasks'
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Error generando tareas'
  } finally {
    generating.value = false
  }
}

async function createProject() {
  if (!projectName.value.trim()) {
    error.value = 'Por favor dale un nombre a tu proyecto'
    return
  }

  loading.value = true
  error.value = null

  try {
    console.log('[NewProject] Creando proyecto...')

    // Crear el proyecto
    const project = await projectsStore.createProject({
      name: projectName.value,
      description: generatedTasks.value?.summary
    })

    console.log('[NewProject] Proyecto creado:', project)
    console.log('[NewProject] Proyecto ID:', project.id)

    // Crear las tareas generadas
    if (generatedTasks.value?.tasks) {
      console.log('[NewProject] Creando', generatedTasks.value.tasks.length, 'tareas')

      // Primero creamos todas las tareas sin dependencias
      const taskIndexToId: Record<number, string> = {}

      for (const task of generatedTasks.value.tasks) {
        console.log('[NewProject] Creando tarea:', task.description)
        const createdTask = await tasksApi.create({
          projectId: project.id,
          description: task.description,
          sortOrder: task.order,
          coinValue: task.coin_value,
          dependsOn: [] // Temporalmente vacío
        })
        taskIndexToId[task.order] = createdTask.data.id
        console.log('[NewProject] Tarea creada - ID:', createdTask.data.id, 'Response:', createdTask.data)
      }

      // Ahora actualizamos las dependencias con los IDs correctos
      for (const task of generatedTasks.value.tasks) {
        if (task.depends_on && task.depends_on.length > 0) {
          const dependsOnIds = task.depends_on.map(idx => taskIndexToId[idx])
          console.log('[NewProject] Actualizando dependencias - Tarea:', taskIndexToId[task.order], 'DependsOn:', dependsOnIds)
          const updated = await tasksApi.update(taskIndexToId[task.order], { dependsOn: dependsOnIds })
          console.log('[NewProject] Dependencias actualizadas:', updated.data)
        }
      }
    }

    console.log('[NewProject] Todas las tareas creadas. Redirigiendo...')

    // Pequeño delay para asegurar que todo se guarde
    await new Promise(resolve => setTimeout(resolve, 500))

    console.log('[NewProject] Navegando a /project/' + project.id)
    await router.push(`/project/${project.id}`)
    console.log('[NewProject] Navegación completada')
  } catch (e: any) {
    console.error('[NewProject] Error:', e)
    console.error('[NewProject] Error response:', e.response?.data)
    error.value = e.response?.data?.message || e.message || 'Error creando proyecto'
  } finally {
    loading.value = false
  }
}

function goBack() {
  step.value = 'goal'
}

function cancel() {
  router.push('/dashboard')
}
</script>

<template>
  <div class="new-project-container">
    <div class="new-project-card">
      <header class="card-header">
        <h1>🥔 Nuevo Proyecto</h1>
        <button @click="cancel" class="btn-close">✕</button>
      </header>

      <!-- Paso 1: Definir objetivo -->
      <div v-if="step === 'goal'" class="step-content">
        <div class="step-indicator">
          <div class="step active">1</div>
          <div class="step-divider"></div>
          <div class="step">2</div>
        </div>

        <h2>¿Qué hay en tu olla hoy?</h2>
        <p class="step-description">
          Describe tu objetivo y la IA desglosará el proyecto en pequeñas papas
        </p>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <div class="form-group">
          <textarea
            v-model="goal"
            placeholder="Ej: Tengo que refactorizar el sistema de login, migrar la base de datos a PostgreSQL y agregar autenticación con JWT"
            rows="5"
            :disabled="generating"
          />
        </div>

        <div class="provider-selector">
          <label>Proveedor LLM:</label>
          <div class="provider-options">
            <button
              type="button"
              :class="['provider-btn', { active: provider === 'ollama' }]"
              @click="provider = 'ollama'"
              :disabled="generating"
            >
              Ollama
            </button>
            <button
              type="button"
              :class="['provider-btn', { active: provider === 'zai' }]"
              @click="provider = 'zai'"
              :disabled="generating"
            >
              Z.ai
            </button>
            <button
              type="button"
              :class="['provider-btn', { active: provider === 'minimax' }]"
              @click="provider = 'minimax'"
              :disabled="generating"
            >
              MiniMax
            </button>
          </div>
        </div>

        <div class="actions">
          <button @click="cancel" class="btn-secondary" :disabled="generating">
            Cancelar
          </button>
          <button
            @click="generateTasks"
            class="btn-primary"
            :disabled="generating || !goal.trim()"
          >
            {{ generating ? 'Generando papas...' : 'Generar Papas 🥔' }}
          </button>
        </div>
      </div>

      <!-- Paso 2: Revisar tareas -->
      <div v-else class="step-content">
        <div class="step-indicator">
          <div class="step completed">✓</div>
          <div class="step-divider completed"></div>
          <div class="step active">2</div>
        </div>

        <h2>Estas son tus papas</h2>
        <p v-if="generatedTasks?.summary" class="summary">
          {{ generatedTasks.summary }}
        </p>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <div class="tasks-preview">
          <div
            v-for="(task, index) in generatedTasks?.tasks"
            :key="index"
            class="task-item"
          >
            <div class="task-number">{{ index + 1 }}</div>
            <div class="task-content">
              <p class="task-description">{{ task.description }}</p>
              <div class="task-meta">
                <span class="task-coins">💰 {{ task.coinValue }}</span>
                <span v-if="task.dependsOn.length > 0" class="task-deps">
                  Depende de: {{ task.dependsOn.join(', ') }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="projectName">Nombre del proyecto</label>
          <input
            id="projectName"
            v-model="projectName"
            type="text"
            placeholder="Mi proyecto"
            :disabled="loading"
          />
        </div>

        <div class="actions">
          <button @click="goBack" class="btn-secondary" :disabled="loading">
            Atrás
          </button>
          <button
            @click="createProject"
            class="btn-primary"
            :disabled="loading || !projectName.trim()"
          >
            {{ loading ? 'Creando...' : 'Crear Proyecto' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.new-project-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.new-project-card {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.card-header h1 {
  color: #333;
  font-size: 1.5rem;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
}

.btn-close:hover {
  background: #f5f5f5;
  color: #333;
}

.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.step {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  background: #e8e8e8;
  color: #999;
}

.step.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.step.completed {
  background: #4caf50;
  color: white;
}

.step-divider {
  flex: 1;
  height: 2px;
  background: #e8e8e8;
  max-width: 3rem;
}

.step-divider.completed {
  background: #4caf50;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.step-content > h2 {
  color: #333;
  text-align: center;
  margin: 0;
}

.step-description {
  color: #666;
  text-align: center;
}

.summary {
  background: #f0f8ff;
  padding: 1rem;
  border-radius: 0.5rem;
  color: #333;
  border-left: 4px solid #667eea;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
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

textarea,
input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-family: inherit;
}

textarea:focus,
input:focus {
  outline: none;
  border-color: #667eea;
}

textarea:disabled,
input:disabled {
  background: #f5f5f5;
}

.provider-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.provider-selector label {
  font-weight: 500;
  color: #555;
}

.provider-options {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.provider-btn {
  padding: 0.5rem 1rem;
  border: 2px solid #ddd;
  background: white;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.provider-btn:hover:not(:disabled) {
  border-color: #667eea;
  color: #667eea;
}

.provider-btn.active {
  border-color: #667eea;
  background: #667eea;
  color: white;
}

.provider-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tasks-preview {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 300px;
  overflow-y: auto;
}

.task-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #f8f8f8;
  border-radius: 0.5rem;
}

.task-number {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.task-content {
  flex: 1;
}

.task-description {
  color: #333;
  margin-bottom: 0.25rem;
}

.task-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: #666;
}

.task-coins {
  font-weight: 600;
}

.task-deps {
  color: #999;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.875rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #666;
  border: 1px solid #ddd;
  padding: 0.875rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
