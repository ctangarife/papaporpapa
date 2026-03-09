import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'

// Initialize notifications service (service worker)
import { notificationsService } from './services/notifications.service'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// Initialize notifications after app mount
notificationsService.initialize().catch((error) => {
  console.error('[Main] Failed to initialize notifications:', error)
})
