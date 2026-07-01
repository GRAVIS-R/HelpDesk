import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { sessionHandler } from './utils/session.handler'
import App from './App.vue'
import router from './router'

// Инициализация
async function init() {
  console.log('🚀 Инициализация приложения...')
  
  // Инициализируем sessionHandler
  await sessionHandler.init()
  console.log('✅ SessionHandler инициализирован')

  // Создаем и монтируем приложение
  const app = createApp(App)
  const pinia = createPinia()
  
  app.use(pinia)
  app.use(router)
  app.mount('#app')
  
  console.log('✅ Приложение запущено')
}

// Запускаем инициализацию
init()




