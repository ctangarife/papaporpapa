<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { notificationsService } from '@/services/notifications.service'
import type { NotificationPreferences } from '@/services/notifications.service'

const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const success = ref(false)

const preferences = ref<NotificationPreferences>({
  enabled: true,
  frequencyHours: 4,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
})

const permissionStatus = computed(() => notificationsService.getPermissionStatus())

const frequencyOptions = [
  { value: 1, label: 'Cada 1 hora' },
  { value: 2, label: 'Cada 2 horas' },
  { value: 4, label: 'Cada 4 horas' },
  { value: 6, label: 'Cada 6 horas' },
  { value: 12, label: 'Cada 12 horas' },
  { value: 24, label: 'Cada 24 horas' },
]

onMounted(async () => {
  await loadPreferences()
})

async function loadPreferences() {
  loading.value = true
  error.value = null
  try {
    const prefs = await notificationsService.getPreferences()
    preferences.value = prefs
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Error cargando preferencias'
  } finally {
    loading.value = false
  }
}

async function requestPermission() {
  const granted = await notificationsService.requestPermission()
  if (!granted) {
    error.value = 'No se pudieron activar las notificaciones. Revisa la configuración de tu navegador.'
    setTimeout(() => error.value = null, 5000)
  }
}

async function savePreferences() {
  saving.value = true
  error.value = null
  success.value = false

  try {
    await notificationsService.updatePreferences(preferences.value)
    success.value = true
    setTimeout(() => success.value = false, 3000)
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Error guardando preferencias'
  } finally {
    saving.value = false
  }
}

function testNotification() {
  notificationsService.showLocalNotification(
    '🥔 Notificación de prueba',
    preferences.value.enabled
      ? '¡Las notificaciones están activadas! Este es un mensaje de ejemplo.'
      : 'Las notificaciones están desactivadas. Actívalas para recibir recordatorios.',
  )
}
</script>

<template>
  <div class="notifications-settings">
    <div class="settings-section">
      <div class="section-header">
        <div class="section-icon">🔔</div>
        <div class="section-info">
          <h2>Recordatorios Suaves</h2>
          <p>Avisos amigables para que no me olvides. Sin prisas.</p>
        </div>
      </div>

      <div v-if="loading" class="loading">
        Cargando configuración...
      </div>

      <div v-else class="settings-content">
        <!-- Permission Status -->
        <div class="permission-status" :class="permissionStatus.status">
          <div class="status-icon">
            {{ permissionStatus.status === 'granted' ? '✅' : permissionStatus.status === 'denied' ? '🚫' : '🔔' }}
          </div>
          <div class="status-content">
            <p class="status-message">{{ permissionStatus.message }}</p>
            <button
              v-if="permissionStatus.status !== 'granted'"
              @click="requestPermission"
              class="btn-enable"
            >
              Activar notificaciones
            </button>
            <button
              v-else
              @click="testNotification"
              class="btn-test"
            >
              Probar notificación
            </button>
          </div>
        </div>

        <!-- Notification Toggle -->
        <div class="setting-row">
          <div class="setting-info">
            <label>Recordatorios activados</label>
            <small>Avisos suaves para que no te olvides de mí</small>
          </div>
          <label class="toggle-switch">
            <input
              v-model="preferences.enabled"
              type="checkbox"
              :disabled="saving"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <!-- Frequency -->
        <div v-if="preferences.enabled" class="setting-row">
          <div class="setting-info">
            <label>Frecuencia de avisos</label>
            <small>¿Cada cuánto te dejo un recordatorio?</small>
          </div>
          <select
            v-model="preferences.frequencyHours"
            :disabled="saving"
            class="frequency-select"
          >
            <option v-for="opt in frequencyOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- Quiet Hours -->
        <div v-if="preferences.enabled" class="setting-row quiet-hours">
          <div class="setting-info">
            <label>Horas de descanso</label>
            <small>No te molesto mientras duermes</small>
          </div>
          <div class="time-inputs">
            <input
              v-model="preferences.quietHoursStart"
              type="time"
              :disabled="saving"
              class="time-input"
            />
            <span class="time-separator">→</span>
            <input
              v-model="preferences.quietHoursEnd"
              type="time"
              :disabled="saving"
              class="time-input"
            />
          </div>
        </div>

        <!-- Save Button -->
        <div class="settings-actions">
          <button
            @click="savePreferences"
            class="btn-save"
            :disabled="saving"
          >
            {{ saving ? 'Guardando...' : 'Guardar cambios' }}
          </button>
          <transition name="fade">
            <span v-if="success" class="success-hint">✓ Guardado</span>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notifications-settings {
  width: 100%;
}

.settings-section {
  /* Removed background, border, padding - now in a tab */
}

.section-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.section-icon {
  font-size: 2rem;
}

.section-info h2 {
  color: var(--color-text);
  font-size: 1.25rem;
  margin: 0 0 0.25rem 0;
}

.section-info p {
  color: var(--color-text-secondary);
  margin: 0;
  font-size: 0.875rem;
}

.loading {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 2rem;
}

.permission-status {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-radius: 1rem;
  margin-bottom: 1.5rem;
  align-items: center;
}

.permission-status.granted {
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.permission-status.denied {
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.permission-status.prompt {
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.3);
}

.status-icon {
  font-size: 1.5rem;
}

.status-content {
  flex: 1;
}

.status-message {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
}

.btn-enable,
.btn-test {
  background: var(--color-bg-input);
  border: 1px solid var(--border-color);
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-enable:hover,
.btn-test:hover {
  background: var(--color-bg-card);
  border-color: var(--color-primary);
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color);
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-info {
  flex: 1;
}

.setting-info label {
  display: block;
  color: var(--color-text);
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.setting-info small {
  display: block;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-bg-input);
  border: 1px solid var(--border-color);
  transition: 0.3s;
  border-radius: 26px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: var(--color-text-secondary);
  transition: 0.3s;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(24px);
  background-color: white;
}

.toggle-switch input:disabled + .toggle-slider {
  opacity: 0.5;
  cursor: not-allowed;
}

.frequency-select {
  background: var(--color-bg-input);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  color: var(--color-text);
  cursor: pointer;
}

.frequency-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.time-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.time-input {
  background: var(--color-bg-input);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 0.5rem;
  color: var(--color-text);
  width: 100px;
}

.time-separator {
  color: var(--color-text-secondary);
}

.settings-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.btn-save {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s, opacity 0.2s;
}

.btn-save:hover:not(:disabled) {
  transform: scale(1.02);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success-hint {
  color: #4caf50;
  font-weight: 600;
  font-size: 0.875rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
