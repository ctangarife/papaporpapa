import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project, CreateProjectDto, Task } from '@/types'
import { api } from '@/api'

export const useProjectsStore = defineStore('projects', () => {
  // State
  const projects = ref<Project[]>([])
  const currentProject = ref<Project | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const activeProjects = computed(() =>
    projects.value.filter((p) => p.status === 'active')
  )

  const completedProjects = computed(() =>
    projects.value.filter((p) => p.status === 'completed')
  )

  const nextPendingTask = computed(() => {
    if (!currentProject.value?.tasks) return null
    return (
      currentProject.value.tasks
        .filter((t) => t.status === 'pending')
        .sort((a, b) => a.sortOrder - b.sortOrder)[0] || null
    )
  })

  // Actions
  async function fetchProjects() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<Project[]>('/projects')
      projects.value = response.data
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Error cargando proyectos'
    } finally {
      loading.value = false
    }
  }

  async function fetchProject(id: string) {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<Project>(`/projects/${id}`)
      currentProject.value = response.data
      return response.data
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Error cargando proyecto'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createProject(data: CreateProjectDto) {
    loading.value = true
    error.value = null
    try {
      const response = await api.post<Project>('/projects', data)
      projects.value.unshift(response.data)
      return response.data
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Error creando proyecto'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function completeProject(id: string) {
    loading.value = true
    error.value = null
    try {
      const response = await api.post<Project>(`/projects/${id}/complete`)
      const index = projects.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        projects.value[index] = response.data
      }
      if (currentProject.value?.id === id) {
        currentProject.value = response.data
      }
      return response.data
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Error completando proyecto'
      throw e
    } finally {
      loading.value = false
    }
  }

  function setCurrentProject(project: Project | null) {
    currentProject.value = project
  }

  function clearCurrentProject() {
    currentProject.value = null
  }

  return {
    projects,
    currentProject,
    loading,
    error,
    activeProjects,
    completedProjects,
    nextPendingTask,
    fetchProjects,
    fetchProject,
    createProject,
    completeProject,
    setCurrentProject,
    clearCurrentProject
  }
})
