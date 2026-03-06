<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { DiagnosisType } from '@/types'

const router = useRouter()
const authStore = useAuthStore()

const step = ref(1)
const totalSteps = 4
const loading = ref(false)

const onboardingData = ref({
  diagnosis: null as DiagnosisType | null,
  preferencias: {
    communicationStyle: 'direct' as 'direct' | 'clear' | 'detailed',
    taskBreakdown: 'small' as 'very_small' | 'small' | 'medium',
    useVisuals: true,
    celebrateMilestones: true
  }
})

const diagnosticos = [
  { value: 'TEA' as DiagnosisType, label: 'TEA', description: 'Trastorno del Espectro Autista', emoji: '🧩' },
  { value: 'TDHA' as DiagnosisType, label: 'TDHA', description: 'Trastorno por Déficit de Atención', emoji: '🎯' },
  { value: 'TEA_TDHA' as DiagnosisType, label: 'TEA + TDHA', description: 'Ambos diagnósticos', emoji: '🧩🎯' },
  { value: 'DISLEXIA' as DiagnosisType, label: 'Dislexia', description: 'Dificultad en la lectura', emoji: '📚' },
  { value: 'TDA' as DiagnosisType, label: 'TDA', description: 'Trastorno del Desarrollo de la Coordinación', emoji: '🤸' },
  { value: 'NONE' as DiagnosisType, label: 'Ninguno', description: 'No tengo diagnóstico', emoji: '✨' },
  { value: 'OTHER' as DiagnosisType, label: 'Otro', description: 'Otro diagnóstico', emoji: '🔍' },
]

const progress = computed(() => (step.value / totalSteps) * 100)

async function nextStep() {
  if (step.value < totalSteps) {
    step.value++
  } else {
    await completeOnboarding()
  }
}

function prevStep() {
  if (step.value > 1) {
    step.value--
  }
}

function selectDiagnostico(diagnosis: DiagnosisType) {
  onboardingData.value.diagnosis = diagnosis

  // Aplicar preferencias predefinidas según el diagnóstico
  switch (diagnosis) {
    case 'TEA':
    case 'TEA_TDHA':
      onboardingData.value.preferencias.communicationStyle = 'clear'
      onboardingData.value.preferencias.taskBreakdown = 'very_small'
      onboardingData.value.preferencias.useVisuals = true
      break
    case 'TDHA':
      onboardingData.value.preferencias.taskBreakdown = 'very_small'
      onboardingData.value.preferencias.communicationStyle = 'direct'
      break
    case 'NONE':
    case 'OTHER':
    default:
      onboardingData.value.preferencias.communicationStyle = 'direct'
      onboardingData.value.preferencias.taskBreakdown = 'small'
  }
}

async function completeOnboarding() {
  loading.value = true
  try {
    await authStore.completeOnboarding()
    // Redirigir a settings para configurar LLM
    router.push('/settings?onboarding=true')
  } catch (error) {
    console.error('Error completando onboarding:', error)
  } finally {
    loading.value = false
  }
}

function goToSettings() {
  // Completar onboarding y redirigir a settings
  completeOnboarding()
}

function skipOnboarding() {
  onboardingData.value.diagnosis = 'NONE'
  completeOnboarding()
}
</script>

<template>
  <div class="onboarding-container">
    <div class="onboarding-card">
      <!-- Progress Bar -->
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progress}%` }" />
        </div>
        <span class="step-indicator">Paso {{ step }} de {{ totalSteps }}</span>
      </div>

      <!-- Step 1: Bienvenida -->
      <div v-if="step === 1" class="step-content">
        <div class="step-emoji">👋</div>
        <h1>¡Bienvenido a Papas App!</h1>
        <p class="step-description">
          Esta aplicación está diseñada para ayudarte a gestionar tus proyectos dividiéndolos en pequeñas tareas,
          una papa a la vez.
        </p>

        <div class="info-box">
          <h3>¿Por qué estas preguntas?</h3>
          <p>
            Conocer un poco sobre ti nos permite personalizar la aplicación para que se adapte a tu forma de pensar y trabajar.
            Esto ayuda a la IA a generar mejores tareas y explicaciones.
          </p>
        </div>

        <div class="actions">
          <button @click="nextStep" class="btn-primary">
            Comenzar →
          </button>
        </div>
      </div>

      <!-- Step 2: Diagnóstico -->
      <div v-if="step === 2" class="step-content">
        <div class="step-emoji">🧠</div>
        <h1>¿Cuál es tu situación?</h1>
        <p class="step-description">
          Selecciona la opción que mejor describa tu situación. Esto es opcional y nos ayuda a adaptar la aplicación.
        </p>

        <div class="diagnostico-grid">
          <div
            v-for="diag in diagnosticos"
            :key="diag.value"
            :class="['diagnostico-card', { selected: onboardingData.diagnosis === diag.value }]"
            @click="selectDiagnostico(diag.value)"
          >
            <span class="diagnostico-emoji">{{ diag.emoji }}</span>
            <div class="diagnostico-label">{{ diag.label }}</div>
            <div class="diagnostico-description">{{ diag.description }}</div>
          </div>
        </div>

        <div class="note">
          <p>💡 Esta información es privada y solo se usa para personalizar tu experiencia.</p>
        </div>

        <div class="actions">
          <button @click="prevStep" class="btn-secondary">Atrás</button>
          <button @click="nextStep" :disabled="!onboardingData.diagnosis" class="btn-primary">
            Siguiente →
          </button>
        </div>
      </div>

      <!-- Step 3: Preferencias -->
      <div v-if="step === 3" class="step-content">
        <div class="step-emoji">⚙️</div>
        <h1>Tus preferencias</h1>
        <p class="step-description">
          Hemos ajustado algunas preferencias basadas en tu selección. Puedes cambiarlas en cualquier momento.
        </p>

        <div class="preferences-summary">
          <div class="pref-item">
            <div class="pref-icon">💬</div>
            <div class="pref-content">
              <h4>Estilo de comunicación</h4>
              <p>
                <span v-if="onboardingData.preferencias.communicationStyle === 'clear'">Claro y directo, sin dobles sentidos</span>
                <span v-else-if="onboardingData.preferencias.communicationStyle === 'detailed'">Detallado con explicaciones completas</span>
                <span v-else>Directo y al grano</span>
              </p>
            </div>
          </div>

          <div class="pref-item">
            <div class="pref-icon">📋</div>
            <div class="pref-content">
              <h4>Tamaño de las tareas</h4>
              <p>
                <span v-if="onboardingData.preferencias.taskBreakdown === 'very_small'">Muy pequeñas (15-30 min cada una)</span>
                <span v-else-if="onboardingData.preferencias.taskBreakdown === 'small'">Pequeñas (30-60 min cada una)</span>
                <span v-else>Medianas (1-2 horas cada una)</span>
              </p>
            </div>
          </div>

          <div class="pref-item">
            <div class="pref-icon">🎨</div>
            <div class="pref-content">
              <h4>Usar elementos visuales</h4>
              <p>{{ onboardingData.preferencias.useVisuals ? 'Sí, usar emojis y elementos visuales' : 'No, solo texto' }}</p>
            </div>
          </div>

          <div class="pref-item">
            <div class="pref-icon">🎉</div>
            <div class="pref-content">
              <h4>Celebrar logros</h4>
              <p>{{ onboardingData.preferencias.celebrateMilestones ? 'Sí, mostrar celebraciones' : 'No, sin celebraciones' }}</p>
            </div>
          </div>
        </div>

        <div class="actions">
          <button @click="prevStep" class="btn-secondary">Atrás</button>
          <button @click="completeOnboarding" :disabled="loading" class="btn-primary">
            {{ loading ? 'Guardando...' : '¡Comenzar! 🥔' }}
          </button>
        </div>

        <button @click="skipOnboarding" class="skip-link">
          Omitir y configurar después
        </button>
      </div>

      <!-- Step 4: Configuración de LLM -->
      <div v-if="step === 4" class="step-content">
        <div class="step-emoji">🤖</div>
        <h1>Configura tu Asistente IA</h1>
        <p class="step-description">
          Para descomponer tus proyectos en papitas manejables, necesitamos conectar una Inteligencia Artificial.
        </p>

        <div class="info-box llm-box">
          <h3>¿Por qué necesito esto?</h3>
          <p>
            La IA analiza tu proyecto y lo divide en pequeñas tareas, una por una,
            para que no te abrumes. Solo necesitas configurarlo una vez.
          </p>
        </div>

        <div class="providers-grid">
          <div class="provider-card">
            <div class="provider-emoji">🦙</div>
            <div class="provider-name">Ollama Cloud</div>
            <div class="provider-desc">Modelos open source</div>
          </div>
          <div class="provider-card">
            <div class="provider-emoji">🧠</div>
            <div class="provider-name">Z.ai</div>
            <div class="provider-desc">Modelos GLM potentes</div>
          </div>
          <div class="provider-card">
            <div class="provider-emoji">⚡</div>
            <div class="provider-name">MiniMax</div>
            <div class="provider-desc">Rápido y eficiente</div>
          </div>
        </div>

        <div class="note">
          <p>💡 Tus credenciales se guardan de forma segura y encriptada. No las compartimos con nadie.</p>
        </div>

        <div class="actions">
          <button @click="prevStep" class="btn-secondary">Atrás</button>
          <button @click="goToSettings" :disabled="loading" class="btn-primary">
            {{ loading ? 'Guardando...' : 'Configurar ahora 🚀' }}
          </button>
        </div>

        <button @click="skipOnboarding" class="skip-link">
          Omitir por ahora (no podré crear proyectos)
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.onboarding-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: var(--color-bg);
}

.onboarding-card {
  background: var(--color-bg-card);
  border-radius: 2rem;
  padding: 2rem;
  width: 100%;
  max-width: 600px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid var(--border-color);
}

.progress-container {
  margin-bottom: 2rem;
}

.progress-bar {
  height: 8px;
  background: var(--color-bg-input);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  transition: width 0.3s ease;
}

.step-indicator {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  font-weight: 600;
}

.step-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.step-emoji {
  font-size: 5rem;
  margin-bottom: 1rem;
}

.step-content > h1 {
  font-size: 2rem;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.step-description {
  color: var(--color-text-secondary);
  font-size: 1.125rem;
  margin-bottom: 2rem;
  max-width: 450px;
}

.info-box {
  background: rgba(59, 130, 246, 0.1);
  padding: 1.5rem;
  border-radius: 1rem;
  text-align: left;
  margin-bottom: 2rem;
  border-left: 4px solid var(--color-info);
}

.info-box.llm-box {
  background: rgba(139, 92, 246, 0.1);
  border-left-color: var(--color-primary);
}

.info-box h3 {
  color: var(--color-info);
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.info-box.llm-box h3 {
  color: var(--color-primary);
}

.info-box p {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

.providers-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
  width: 100%;
}

.provider-card {
  background: var(--color-bg-input);
  border: 2px solid var(--border-color);
  border-radius: 1rem;
  padding: 1.5rem 1rem;
  text-align: center;
}

.provider-emoji {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.provider-name {
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
}

.provider-desc {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.diagnostico-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
  width: 100%;
}

.diagnostico-card {
  background: var(--color-bg-input);
  border: 2px solid var(--border-color);
  border-radius: 1rem;
  padding: 1.5rem 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.diagnostico-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

.diagnostico-card.selected {
  border-color: var(--color-primary);
  background: rgba(139, 92, 246, 0.1);
}

.diagnostico-emoji {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
}

.diagnostico-label {
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.diagnostico-description {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.note {
  margin-bottom: 1.5rem;
}

.note p {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.preferences-summary {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  margin-bottom: 2rem;
}

.pref-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-bg-input);
  border-radius: 1rem;
  text-align: left;
}

.pref-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.pref-content h4 {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.25rem;
}

.pref-content p {
  font-size: 1rem;
  color: var(--color-text);
  margin: 0;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: white;
  border: none;
  padding: 0.875rem 2rem;
  border-radius: 1rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s, opacity 0.2s;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:active:not(:disabled) {
  transform: scale(0.98);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  border: 1px solid var(--border-color);
  padding: 0.875rem 2rem;
  border-radius: 1rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary:hover {
  background: var(--color-bg-input);
}

.skip-link {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.875rem;
  cursor: pointer;
  margin-top: 1rem;
  text-decoration: underline;
}

.skip-link:hover {
  color: var(--color-text-secondary);
}
</style>
