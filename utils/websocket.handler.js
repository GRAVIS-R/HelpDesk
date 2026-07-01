/**
 * WebSocket handler для real-time обновлений
 * Синхронизация данных при создании/изменении
 */

import axios from 'axios'

class WebSocketHandler {
  constructor() {
    this.ws = null
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 3
    this.reconnectDelay = 30000
    this.listeners = new Map()
    this.wsToken = null
    this.reconnectTimer = null
    this.wasClosedManually = false
  }

  /**
   * Получение WebSocket токена с сервера
   */
  async getWebSocketToken() {
    try {
      const response = await axios.post('/get_web_socket_token', {}, {
        baseURL: import.meta.env.VITE_API_URL || 'http://service-desk.sov7.ru:3000',
        withCredentials: true
      })
      this.wsToken = response.data.token
      return this.wsToken
    } catch (error) {
      console.error('Ошибка получения токена:', error)
      return null
    }
  }

  /**
   * Формирование URL для WebSocket
   * Формат: ws://host:port/ws/{query_parameters}
   * query_parameters - это токен сокета
   */
  getWebSocketUrl() {
    const wsHost = import.meta.env.VITE_WS_URL || 'ws://service-desk.sov7.ru:3000'
    const token = this.wsToken
    
    // Формат: ws://service-desk.sov7.ru:3000/ws/{token}
    const url = `${wsHost}/ws/token=${token}`
    
    console.log('🔌 URL для WebSocket:', url)
    return url
  }

  /**
   * Открытие WebSocket соединения
   */
  async openConnection() {
    if (this.ws && this.isConnected) {
      console.log('WebSocket уже подключен')
      return
    }

    // Сбрасываем флаг ручного закрытия при новом подключении
    this.wasClosedManually = false

    // Получаем токен если его нет
    this.wsToken = null
    await this.getWebSocketToken()
    console.log('Получили токен: ', this.wsToken)

    const url = this.getWebSocketUrl()
    
    console.log('🔌 Подключение к WebSocket:', url)
    
    this.ws = new WebSocket(url)
    
    // Переопределяем методы
    this.ws.onopen = this.onOpen.bind(this)
    this.ws.onmessage = this.onMessage.bind(this)
    this.ws.onclose = this.onClose.bind(this)
    this.ws.onerror = this.onError.bind(this)
  }

  /**
   * Обработчик открытия соединения
   */
  async onOpen(event) {
    console.log('✅ WebSocket соединение установлено')
    
    this.isConnected = true
    this.reconnectAttempts = 0
  }

  /**
   * Обработчик входящих сообщений
   */
  onMessage(event) {
    try {
      const data = JSON.parse(event.data)
      console.log('📨 Получено WebSocket сообщение:', data)
      
      const { method, ticket_id, ws_token, data: payload } = data
      
      // Уведомляем слушателей о событии
      if (this.listeners.has(method)) {
        const callbacks = this.listeners.get(method)
        callbacks.forEach(callback => {
          callback({
            method,
            ticket_id,
            ws_token,
            ...payload
          })
        })
      }
      
      // Общее событие для всех обновлений
      if (this.listeners.has('*')) {
        const callbacks = this.listeners.get('*')
        callbacks.forEach(callback => callback(data))
      }
      
    } catch (error) {
      console.error('❌ Ошибка парсинга WebSocket сообщения:', error)
    }
  }

  /**
   * Обработчик закрытия соединения
   */
  onClose(event) {
    console.log('🔌 WebSocket соединение закрыто', event.code, event.reason)
    this.isConnected = false
    this.ws = null
    
    // Не переподключаемся, если закрыто вручную
    if (!this.wasClosedManually) {
        console.log('🔄 Инициируем переподключение...')
        this.reconnect()
    } else {
        console.log('🔌 Соединение закрыто вручную, переподключение не требуется')
    }
  }

  /**
   * Обработчик ошибок
   */
  onError(error) {
    console.error('❌ WebSocket ошибка:', error)
  }

  /**
   * Переподключение
   */
  reconnect() {
    // Не переподключаемся, если страница не активна
    if (document.hidden) {
        console.log('Страница не активна, отложено переподключение')
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && !this.isConnected) {
                this.openConnection()
            }
        })
        return
    }
  
    // Проверяем, не закрыто ли соединение намеренно
    if (this.wasClosedManually) {
        console.log('🔌 Соединение закрыто вручную, переподключение не требуется')
        return
    }
  
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Достигнут лимит попыток переподключения')
        return
    }
  
    this.reconnectAttempts++
    console.log(`🔄 Попытка ${this.reconnectAttempts}/${this.maxReconnectAttempts} через ${this.reconnectDelay}мс`)
  
    // Сохраняем таймер для возможности отмены
    if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
    }
  
    this.reconnectTimer = setTimeout(() => {
        this.openConnection()
        this.reconnectTimer = null
    }, this.reconnectDelay)
    }

    /**
    * Очистка таймера при закрытии
    */
    cleanup() {
    if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
    }
    }


  /**
   * Отправка сообщения через WebSocket
   */
  send(method, data = {}) {
    if (!this.isConnected || !this.ws) {
      console.warn('⚠️ WebSocket не подключен, сообщение не отправлено')
      return false
    }
    
    const message = JSON.stringify({
      method,
      ws_token: this.wsToken,
      ...data
    })
    
    this.ws.send(message)
    console.log(`📤 Отправлено WebSocket сообщение (${method}):`, data)
    return true
  }

  /**
   * Подписка на события
   * @param {string} event - событие ('storeTicket', 'updateUser', '*' и т.д.)
   * @param {Function} callback - колбэк
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
  }

  /**
   * Отписка от событий
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return
    
    if (callback) {
      const callbacks = this.listeners.get(event)
      const index = callbacks.indexOf(callback)
      if (index !== -1) callbacks.splice(index, 1)
    } else {
      this.listeners.delete(event)
    }
  }

  /**
   * Закрытие соединения
   */
  close() {
    console.log('🔌 Закрытие WebSocket соединения...')
    this.wasClosedManually = true
    this.cleanup()
    
    if (this.ws) {
      // Убираем обработчики чтобы не вызывались после закрытия
      this.ws.onopen = null
      this.ws.onmessage = null
      this.ws.onclose = null
      this.ws.onerror = null
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
    console.log('✅ WebSocket соединение закрыто')
  }

  /**
   * Сброс состояния
   */
  reset() {
    this.close()
    this.listeners.clear()
    this.wsToken = null
    this.reconnectAttempts = 0
    this.wasClosedManually = false
  }
}

// Создаем синглтон
export const webSocketHandler = new WebSocketHandler()
export default webSocketHandler