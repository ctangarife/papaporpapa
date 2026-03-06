import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('@/views/OnboardingView.vue'),
    meta: { requiresAuth: true, skipOnboardingCheck: true }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/project/new',
    name: 'new-project',
    component: () => import('@/views/NewProjectView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/project/:id',
    name: 'project',
    component: () => import('@/views/ProjectView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// Guard de navegación
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const requiresAuth = to.meta.requiresAuth !== false
  const skipOnboardingCheck = to.meta.skipOnboardingCheck === true

  // Primero intentar inicializar la sesión si hay token
  const hasSession = await authStore.initialize()

  // Si no está autenticado y la ruta requiere auth
  if (requiresAuth && !authStore.isAuthenticated) {
    // Guardar la ruta para redirigir después del login
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  // Si está autenticado y va a login/register, mandar al dashboard
  if (!requiresAuth && authStore.isAuthenticated && (to.name === 'login' || to.name === 'register')) {
    next({ name: 'dashboard' })
    return
  }

  // Verificar onboarding
  if (requiresAuth && authStore.isAuthenticated && !skipOnboardingCheck) {
    // Si necesita onboarding y no va a onboarding, redirigir
    if (authStore.needsOnboarding && to.name !== 'onboarding') {
      next({ name: 'onboarding' })
      return
    }
  }

  // Si ya completó onboarding y va a onboarding, mandar al dashboard
  if (to.name === 'onboarding' && authStore.isAuthenticated && !authStore.needsOnboarding) {
    next({ name: 'dashboard' })
    return
  }

  next()
})

export default router
