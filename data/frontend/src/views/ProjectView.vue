<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectsStore } from '@/stores/projects'
import { useAuthStore } from '@/stores/auth'
import { tasksApi } from '@/api'

const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()
const authStore = useAuthStore()

const loading = ref(true)
const completing = ref(false)
const skipping = ref(false)
const showAllTasks = ref(false)

const projectId = computed(() => route.params.id as string)

onMounted(async () => {
  console.log('[ProjectView] Montando vista. Project ID:', projectId.value)
  try {
    console.log('[ProjectView] Obteniendo proyecto...')
    await projectsStore.fetchProject(projectId.value)
    console.log('[ProjectView] Proyecto obtenido:', projectsStore.currentProject)
    console.log('[ProjectView] Tareas:', projectsStore.currentProject?.tasks?.length || 0)
  } catch (e) {
    console.error('[ProjectView] Error:', e)
    router.push('/dashboard')
  } finally {
    loading.value = false
  }
})

const currentTask = computed(() => projectsStore.nextPendingTask)

const progress = computed(() => {
  const project = projectsStore.currentProject
  if (!project?.tasks?.length) return 0
  const completedOrSkipped = project.tasks.filter(t => t.status === 'completed' || t.status === 'skipped').length
  return Math.round((completedOrSkipped / project.tasks.length) * 100)
})

const skippedTasks = computed(() => {
  const project = projectsStore.currentProject
  if (!project?.tasks) return []
  return project.tasks.filter(t => t.status === 'skipped').sort((a, b) => a.sortOrder - b.sortOrder)
})

async function completeTask() {
  if (!currentTask.value || completing.value) return

  completing.value = true

  try {
    console.log('[ProjectView] Completando tarea:', currentTask.value.id)
    await tasksApi.complete(currentTask.value.id)

    // Recargar proyecto y usuario
    await projectsStore.fetchProject(projectId.value)
    await authStore.fetchProfile()

    console.log('[ProjectView] Tarea completada')
  } catch (e) {
    console.error('[ProjectView] Error completando tarea:', e)
  } finally {
    completing.value = false
  }
}

async function skipTask() {
  if (!currentTask.value || skipping.value) return

  skipping.value = true

  try {
    console.log('[ProjectView] Saltando tarea:', currentTask.value.id)
    await tasksApi.skip(currentTask.value.id)

    // Recargar proyecto
    await projectsStore.fetchProject(projectId.value)

    console.log('[ProjectView] Tarea saltada')
  } catch (e) {
    console.error('[ProjectView] Error saltando tarea:', e)
  } finally {
    skipping.value = false
  }
}

async function resetTask(taskId: string) {
  try {
    console.log('[ProjectView] Reactivando tarea:', taskId)
    await tasksApi.reset(taskId)

    // Recargar proyecto
    await projectsStore.fetchProject(projectId.value)

    // Si hay tareas pendientes ahora, volver al modo focus automáticamente
    if (projectsStore.nextPendingTask) {
      showAllTasks.value = false
    }

    console.log('[ProjectView] Tarea reactivada')
  } catch (e) {
    console.error('[ProjectView] Error reactivando tarea:', e)
  }
}

function toggleShowAll() {
  showAllTasks.value = !showAllTasks.value
}

function goBack() {
  router.push('/dashboard')
}
</script>

<template>
  <div class="project-view">
    <!-- Header -->
    <header class="project-header">
      <button @click="goBack" class="btn-back">← Volver</button>
      <div class="project-info">
        <h1>{{ projectsStore.currentProject?.name }}</h1>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progress}%` }" />
        </div>
        <span class="progress-text">{{ progress }}%</span>
      </div>
      <div class="coins-display">
        <span class="coin-emoji">💰</span>
        <span class="coins-count">{{ authStore.coinsBalance }}</span>
      </div>
    </header>

    <!-- Loading state -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Cargando papas...</p>
    </div>

    <!-- No tasks state -->
    <div v-else-if="!currentTask && !showAllTasks && skippedTasks.length === 0" class="completed-state">
      <div class="completed-emoji">🎉</div>
      <h2>¡Proyecto Completado!</h2>
      <p>Has terminado todas las papas de este proyecto</p>
      <button @click="goBack" class="btn-primary">Volver al Dashboard</button>
    </div>

    <!-- Has skipped tasks but no pending -->
    <div v-else-if="!currentTask && !showAllTasks && skippedTasks.length > 0" class="completed-state">
      <div class="completed-emoji">⏭️</div>
      <h2>Hay tareas saltadas</h2>
      <p>Tienes {{ skippedTasks.length }} tarea(s) pendiente(s)</p>
      <button @click="toggleShowAll" class="btn-primary">Ver tareas</button>
    </div>

    <!-- Focus Mode (una tarea a la vez) -->
    <div v-else-if="currentTask && !showAllTasks" class="focus-mode">
      <div class="task-focus">
        <div class="task-emoji">🥔</div>
        <div class="task-label">Papa #{{ currentTask.sortOrder }}</div>
        <h2 class="task-description">{{ currentTask.description }}</h2>
        <div class="task-reward">
          <span class="reward-emoji">💰</span>
          <span>+{{ currentTask.coinValue }} monedas</span>
        </div>

        <div class="action-buttons">
          <button
            @click="skipTask"
            class="btn-skip"
            :disabled="skipping"
          >
            <span v-if="skipping">Saltando...</span>
            <span v-else>⏭ SALTAR</span>
          </button>

          <button
            @click="completeTask"
            class="btn-complete"
            :disabled="completing"
          >
            <span v-if="completing">Completando...</span>
            <span v-else>✓ COMPLETADO</span>
          </button>
        </div>

        <button @click="toggleShowAll" class="btn-show-all">
          Ver todas las tareas
        </button>
      </div>
    </div>

    <!-- All Tasks View -->
    <div v-else class="all-tasks-view">
      <div class="view-header">
        <h2>Todas las Papas</h2>
        <button @click="toggleShowAll" class="btn-focus">
          Modo Focus
        </button>
      </div>

      <!-- Skipped tasks section -->
      <div v-if="skippedTasks.length > 0" class="skipped-section">
        <h3>⏭ Tareas Saltadas</h3>
        <div class="tasks-list">
          <div
            v-for="task in skippedTasks"
            :key="task.id"
            class="task-card skipped"
          >
            <div class="task-number">{{ task.sortOrder }}</div>
            <div class="task-content">
              <p class="task-description">{{ task.description }}</p>
              <div class="task-meta">
                <span class="task-coins">💰 {{ task.coinValue }}</span>
                <span class="task-status skipped">Saltada</span>
                <button @click="resetTask(task.id)" class="btn-reset">
                  Reanudar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h3>Tareas Pendientes y Completadas</h3>
      <div class="tasks-list">
        <div
          v-for="task in projectsStore.currentProject?.tasks.filter(t => t.status !== 'skipped')"
          :key="task.id"
          :class="['task-card', {
            completed: task.status === 'completed',
            pending: task.status === 'pending',
            current: task.id === currentTask?.id
          }]"
        >
          <div class="task-number">{{ task.sortOrder }}</div>
          <div class="task-content">
            <p class="task-description">{{ task.description }}</p>
            <div class="task-meta">
              <span class="task-coins">💰 {{ task.coinValue }}</span>
              <span v-if="task.status === 'completed'" class="task-status completed">
                ✓ Completada
              </span>
              <span v-else-if="task.id === currentTask?.id" class="task-status current">
                → Actual
              </span>
              <span v-else class="task-status pending">
                Pendiente
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-view {
  min-height: 100vh;
  background: #0a0a0a;
}

.project-header {
  background: var(--color-bg-card);
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  gap: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.btn-back {
  background: none;
  border: none;
  font-size: 1rem;
  color: #8b5cf6;
  cursor: pointer;
  font-weight: 600;
}

.btn-back:hover {
  text-decoration: underline;
}

.project-info {
  flex: 1;
}

.project-info h1 {
  color: var(--color-text);
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.progress-bar {
  width: 200px;
  height: 8px;
  background: #262626;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-left: 0.5rem;
}

.coins-display {
  background: linear-gradient(135deg, #ffd700 0%, #ffb900 100%);
  padding: 0.5rem 1rem;
  border-radius: 2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: var(--color-text);
}

.coin-emoji {
  font-size: 1.25rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: white;
}

.loading-spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.completed-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: white;
  text-align: center;
}

.completed-emoji {
  font-size: 5rem;
  margin-bottom: 1rem;
}

.completed-state h2 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.completed-state p {
  font-size: 1.125rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.btn-primary {
  background: var(--color-bg-card);
  color: #8b5cf6;
  border: none;
  padding: 0.875rem 2rem;
  border-radius: 2rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.focus-mode {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 2rem;
}

.task-focus {
  background: var(--color-bg-card);
  border-radius: 2rem;
  padding: 3rem;
  text-align: center;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.task-emoji {
  font-size: 5rem;
  margin-bottom: 1rem;
}

.task-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #8b5cf6;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 1rem;
}

.task-focus .task-description {
  font-size: 1.5rem;
  color: var(--color-text);
  margin-bottom: 2rem;
  line-height: 1.4;
}

.task-reward {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #4a3a1a;
  padding: 0.5rem 1rem;
  border-radius: 2rem;
  margin-bottom: 2rem;
  font-weight: 600;
  color: #f57c00;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 1rem;
}

.btn-complete {
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 2rem;
  font-size: 1.125rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.2s;
}

.btn-complete:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 8px 24px rgba(76, 175, 80, 0.4);
}

.btn-complete:active:not(:disabled) {
  transform: scale(0.98);
}

.btn-complete:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-skip {
  background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 2rem;
  font-size: 1.125rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.2s;
}

.btn-skip:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 8px 24px rgba(255, 152, 0, 0.4);
}

.btn-skip:active:not(:disabled) {
  transform: scale(0.98);
}

.btn-skip:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-show-all {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-show-all:hover {
  color: var(--color-text);
}

.all-tasks-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.view-header h2 {
  color: white;
  font-size: 1.5rem;
}

.btn-focus {
  background: var(--color-bg-card);
  color: #8b5cf6;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.task-card {
  background: var(--color-bg-card);
  border-radius: 1rem;
  padding: 1rem 1.5rem;
  display: flex;
  gap: 1rem;
  transition: transform 0.2s;
}

.task-card.completed {
  opacity: 0.6;
}

.task-card.current {
  border: 2px solid #8b5cf6;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

.task-number {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.task-card.completed .task-number {
  background: #4caf50;
}

.task-content {
  flex: 1;
}

.task-content .task-description {
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.task-card.completed .task-description {
  text-decoration: line-through;
}

.task-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
}

.task-coins {
  font-weight: 600;
  color: #f57c00;
}

.task-status {
  font-weight: 600;
}

.task-status.completed {
  color: #4caf50;
}

.task-status.current {
  color: #8b5cf6;
}

.task-status.pending {
  color: #999;
}

.task-status.skipped {
  color: #ff9800;
}

.task-card.skipped {
  opacity: 0.7;
  border: 1px dashed #ff9800;
}

.task-card.skipped .task-number {
  background: #ff9800;
}

.skipped-section {
  margin-bottom: 2rem;
}

.skipped-section h3 {
  color: white;
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.btn-reset {
  background: none;
  border: 1px solid #ff9800;
  color: #ff9800;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reset:hover {
  background: #ff9800;
  color: white;
}
</style>
