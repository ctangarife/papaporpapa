/**
 * Papas App - Gentle Nudges Service
 * Handles push notification permissions and service worker registration
 */

import { api } from '@/api'

export interface NotificationPreferences {
  enabled: boolean
  frequencyHours: number
  quietHoursStart: string
  quietHoursEnd: string
}

class NotificationsService {
  private swRegistration: ServiceWorkerRegistration | null = null
  private permission: NotificationPermission = 'default'

  /**
   * Initialize notifications service
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        console.log('[Notifications] Service workers not supported')
        return false
      }

      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.log('[Notifications] Notifications API not supported')
        return false
      }

      // Register service worker
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })
      console.log('[Notifications] Service Worker registered')

      // Get current permission
      this.permission = Notification.permission

      return true
    } catch (error) {
      console.error('[Notifications] Initialization error:', error)
      return false
    }
  }

  /**
   * Request notification permission with friendly messaging
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false
    }

    if (this.permission === 'granted') {
      return true
    }

    if (this.permission === 'denied') {
      // User previously denied - guide them to enable
      console.log('[Notifications] Permission previously denied')
      return false
    }

    try {
      this.permission = await Notification.requestPermission()
      console.log('[Notifications] Permission:', this.permission)

      if (this.permission === 'granted') {
        // Track that user granted permission
        this.trackInteraction()
        return true
      }

      return false
    } catch (error) {
      console.error('[Notifications] Permission request error:', error)
      return false
    }
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled(): boolean {
    return this.permission === 'granted'
  }

  /**
   * Get notification preferences from server
   */
  async getPreferences(): Promise<NotificationPreferences> {
    const response = await api.get('/notifications/preferences')
    return response.data
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const response = await api.put('/notifications/preferences', preferences)
    return response.data
  }

  /**
   * Track user interaction (last activity)
   */
  async trackInteraction(): Promise<void> {
    try {
      await api.post('/notifications/track-interaction')
    } catch (error) {
      console.error('[Notifications] Error tracking interaction:', error)
    }
  }

  /**
   * Show a local notification (for testing)
   */
  showLocalNotification(title: string, body: string): void {
    if (this.permission !== 'granted') {
      return
    }

    const options: NotificationOptions = {
      body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      vibrate: [200, 100, 200],
      tag: 'local-notification',
      requireInteraction: false,
    }

    if (this.swRegistration) {
      this.swRegistration.showNotification(title, options)
    } else {
      new Notification(title, options)
    }
  }

  /**
   * Get subscription status for push notifications (future use)
   */
  async getPushSubscription(): Promise<PushSubscription | null> {
    if (!this.swRegistration) {
      return null
    }

    return await this.swRegistration.pushManager.getSubscription()
  }

  /**
   * Subscribe to push notifications (future use - requires VAPID keys)
   */
  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.swRegistration) {
      return null
    }

    try {
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.VITE_VAPID_PUBLIC_KEY || '',
        ),
      })

      // Send subscription to server for future use
      await api.post('/notifications/subscribe', subscription.toJSON())

      return subscription
    } catch (error) {
      console.error('[Notifications] Push subscription error:', error)
      return null
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray
  }

  /**
   * Get friendly permission status message
   */
  getPermissionStatus(): { status: string; message: string } {
    switch (this.permission) {
      case 'granted':
        return { status: 'granted', message: 'Notificaciones activadas' }
      case 'denied':
        return {
          status: 'denied',
          message: 'Notificaciones bloqueadas. Revisa la configuración de tu navegador.',
        }
      case 'default':
        return {
          status: 'prompt',
          message: '¿Te aviso si me pierdo de vista?',
        }
      default:
        return { status: 'unknown', message: 'Estado desconocido' }
    }
  }
}

// Export singleton instance
export const notificationsService = new NotificationsService()

// Auto-initialize when loaded
if (typeof window !== 'undefined') {
  notificationsService.initialize().catch((error) => {
    console.error('[Notifications] Auto-initialization failed:', error)
  })
}
