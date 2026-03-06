<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'

const router = useRouter()
const authStore = useAuthStore()
const projectsStore = useProjectsStore()

const loading = ref(true)
const showNewProjectModal = ref(false)

onMounted(async () => {
  try {
    await projectsStore.fetchProjects()
  } finally {
    loading.value = false
  }
})

function goToProject(id: string) {
  router.push(`/project/${id}`)
}

function goToNewProject() {
  router.push('/project/new')
}

function logout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="dashboard">
    <header class="dashboard-header">
      <div class="header-content">
        <div class="logo">
          <span class="logo-emoji">🥔</span>
          <span class="logo-text">Papas App</span>
        </div>
        <div class="header-actions">
          <div class="coins-display">
            <span class="coin-emoji">💰</span>
            <span class="coins-count">{{ authStore.coinsBalance }}</span>
          </div>
          <RouterLink to="/settings" class="btn-settings" title="Configuración LLM">
            ⚙️
          </RouterLink>
          <RouterLink to="/profile" class="btn-profile">
            {{ authStore.user?.name }}
          </RouterLink>
          <button @click="logout" class="btn-logout">Salir</button>
        </div>
      </div>
    </header>

    <main class="dashboard-main">
      <div class="welcome-section">
        <h1>¡Hola, {{ authStore.user?.name }}! 👋</h1>
        <p>¿Qué hay en tu olla hoy?</p>
      </div>

      <div v-if="loading" class="loading">
        Cargando tus proyectos...
      </div>

      <div v-else-if="projectsStore.activeProjects.length === 0" class="empty-state">
        <div class="empty-emoji">🍲</div>
        <h2>Tu olla está vacía</h2>
        <p>Crea tu primer proyecto para empezar a papasificar</p>
        <button @click="goToNewProject" class="btn-primary">
          Crear Primer Proyecto
        </button>
      </div>

      <div v-else class="projects-section">
        <div class="section-header">
          <h2>Proyectos Activos</h2>
          <button @click="goToNewProject" class="btn-secondary">
            + Nuevo Proyecto
          </button>
        </div>

        <div class="projects-grid">
          <div
            v-for="project in projectsStore.activeProjects"
            :key="project.id"
            class="project-card"
            @click="goToProject(project.id)"
          >
            <div class="project-header">
              <h3>{{ project.name }}</h3>
              <span class="project-tasks">
                {{ project.tasks?.filter(t => t.status === 'completed').length || 0 }} /
                {{ project.tasks?.length || 0 }}
              </span>
            </div>
            <p v-if="project.description" class="project-description">
              {{ project.description }}
            </p>
            <div class="project-progress">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{
                    width: `${(project.tasks?.filter(t => t.status === 'completed').length || 0) / (project.tasks?.length || 1) * 100}%`
                  }"
                />
              </div>
            </div>
          </div>
        </div>

        <div v-if="projectsStore.completedProjects.length > 0" class="completed-section">
          <h3>Completados 🎉</h3>
          <div class="completed-list">
            <div
              v-for="project in projectsStore.completedProjects"
              :key="project.id"
              class="completed-item"
            >
              <span class="completed-name">{{ project.name }}</span>
              <span class="completed-date">
                {{ new Date(project.completedAt || '').toLocaleDateString() }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard {
  min-height: 100vh;
  background: var(--color-bg);
}

.dashboard-header {
  background: var(--color-bg-card);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
}

.logo-emoji {
  font-size: 1.5rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
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

.btn-profile {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  text-decoration: none;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.btn-profile:hover {
  background: var(--color-bg);
}

.btn-settings {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  text-decoration: none;
  color: var(--color-text-secondary);
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-settings:hover {
  background: var(--color-bg);
}

.btn-logout {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  background: #450a0a;
  color: #fca5a5;
  font-weight: 500;
  cursor: pointer;
}

.btn-logout:hover {
  background: #7f1d1d;
}

.dashboard-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.welcome-section {
  margin-bottom: 2rem;
}

.welcome-section h1 {
  font-size: 2rem;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.welcome-section p {
  color: var(--color-text-secondary);
  font-size: 1.125rem;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-secondary);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background: var(--color-bg-card);
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty-emoji {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h2 {
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
}

.projects-section {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h2 {
  color: var(--color-text);
  font-size: 1.5rem;
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

.btn-secondary {
  background: var(--color-bg-card);
  color: #667eea;
  border: 2px solid #667eea;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #2a2a2a;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.project-card {
  background: var(--color-bg-card);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.project-header h3 {
  color: var(--color-text);
  font-size: 1.125rem;
}

.project-tasks {
  background: #2a2a4a;
  color: #8b5cf6;
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.project-description {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.project-progress {
  margin-top: 1rem;
}

.progress-bar {
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

.completed-section {
  background: var(--color-bg-card);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.completed-section h3 {
  color: var(--color-text);
  margin-bottom: 1rem;
}

.completed-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.completed-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  background: #1a2e1a;
  border-radius: 0.5rem;
}

.completed-name {
  color: var(--color-text);
  font-weight: 500;
}

.completed-date {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}
</style>
