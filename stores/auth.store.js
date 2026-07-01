/**
 * Хранилище аутентификации
 * Текущий пользователь, токен, роль, права доступа
 * Сохранение в localStorage (токен и основные данные)
 * Хранилище аутентификации с mock-режимом для разработки
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import globalApiClient from '@/api/axios.config'
import router from '@/router'
import { emitAuthEvent, clearAuthData as clearAuthDataUtil } from '@/utils/auth.utils'
import { webSocketHandler } from '@/utils/websocket.handler'

export const useAuthStore = defineStore('auth', () => {
  // Состояние
  const user = ref(null)
  const isAuthenticated = computed(() => {
    if(user.value){
      console.log('user есть')
      return true
    }
    else {
      return false
    }
  })
  const userRole = computed(() => roleConversion(user.value.role.name) || null)
  let isInitialized = false

  // Методы
  const roleConversion = (role) => {
    switch (role) {
      case 'Администратор':
        return 'admin'
      case 'Диспетчер':
        return 'dispatcher'
      case 'Инженер':
        return 'engineer'
      case 'Клиент':
        return 'client'
      default:
        return null
    }
  }

  const loginMobile = async (credentials) => {
    try {
      console.log('Отправляю запрос на /login:', credentials)
      const userData = {
    "id": 1,
    "first_name": "Сергей",
    "last_name": "Левченко",
    "middle_name": "Павлович",
    "login": "admin",
    "email": "admin@example.com",
    "email_verified_at": null,
    "created_at": "2026-06-05T17:01:49.000000Z",
    "updated_at": "2026-06-05T17:01:49.000000Z",
    "deleted_at": null,
    "role": {
      "id": 1,
      "name": "Администратор",
      "description": null,
      "created_at": "2026-06-05T17:01:49.000000Z",
      "updated_at": "2026-06-05T17:01:49.000000Z",
      "laravel_through_key": 1
    },
    "organization": {
      "id": 1,
      "name": "Сервис печати",
      "description": null,
      "created_at": "2026-06-05T17:01:49.000000Z",
      "updated_at": "2026-06-05T17:01:49.000000Z",
      "deleted_at": null,
      "laravel_through_key": 1,
      "user_roles": [
        {
          "id": 1,
          "name": "Администратор"
        },
        {
          "id": 2,
          "name": "Диспетчер"
        },
        {
          "id": 3,
          "name": "Инженер"
        }
      ]
    },
    "phone_number": {
      "id": 1,
      "phone_number": "+79200797999",
      "created_at": "2026-06-05T17:01:49.000000Z",
      "updated_at": "2026-06-05T17:01:49.000000Z",
      "laravel_through_key": 1
    },
    "object": null
  }

      if (!userData?.login) {
        console.log(userData)
        throw new Error('Неверный ответ от сервера')
      }
      const role = roleConversion(userData.role.name)
      userData.role.name = role

      // Сохраняем данные пользователя
      user.value = userData

      // Сохраняем в localStorage данные пользователя
      localStorage.setItem('user', JSON.stringify(userData))
      
      console.log('✅ Успешный вход, роль:', userData.role?.name || 'не указана')
      // Редирект по роли
      redirectByRole(userData.role?.name)
      // Вызываем уведомление
      emitAuthEvent('loginSuccess')

      return response.data
    } catch (error) {
      console.error('Ошибка входа:', error)
    
      // Если это уже наша кастомная ошибка (с validator_fails)
      if (error.message && error.message.includes('Учетная запись')) {
        throw error // Просто пробрасываем дальше
      }
    
      // Другие ошибки
      throw new Error('Ошибка подключения к серверу')
    }
  }

  const login = async (credentials) => {
    try {

      await globalApiClient.post('/logout')

      console.log('Отправляю запрос на /login:', credentials)

      const response = await globalApiClient.post('/login', credentials)

      console.log('Ответ от сервера:', response.data)
      console.log('Cтруктура ответа:', JSON.stringify(response.data, null, 2))
      
      // Проверяем, есть ли ошибка валидации
      if (response.data?.validator_fails) {
        throw new Error(response.data.validator_fails)
      }

      const userData = response.data.user

      if (!userData?.login) {
        console.log(userData)
        throw new Error('Неверный ответ от сервера')
      }
      const role = roleConversion(userData.role.name)
      userData.role.name = role

      // Сохраняем данные пользователя
      user.value = userData

      // Сохраняем в localStorage данные пользователя
      localStorage.setItem('user', JSON.stringify(userData))
      
      console.log('✅ Успешный вход, роль:', userData.role?.name || 'не указана')

      // Подключаем WebSocket после успешного входа
      if (!webSocketHandler.isConnected) {
        console.log('🔌 Подключаем WebSocket после логина')
        await webSocketHandler.openConnection()
      }
      // Редирект по роли
      redirectByRole(userData.role?.name)
      // Вызываем уведомление
      emitAuthEvent('loginSuccess')

      return response.data
    } catch (error) {
      console.error('Ошибка входа:', error)
    
      // Если это уже наша кастомная ошибка (с validator_fails)
      if (error.message && error.message.includes('Учетная запись')) {
        throw error // Просто пробрасываем дальше
      }
    
      // Ошибка 422 - неверные учетные данные
      if (error.response?.status === 422) {
        const errorMessage = error.response?.data?.validator_fails || 
                         error.response?.data?.message ||
                         'Учетная запись не найдена'
        throw new Error(errorMessage)
      }
    
      // Другие ошибки
      throw new Error('Ошибка подключения к серверу')
    }
  }

  const redirectByRole = (roleName) => {
    switch (roleName) {
      case 'admin':
        router.push({ name: 'admin-tickets' })
        break
      case 'dispatcher':
        router.push({ name: 'dispatcher-tickets' })
        break
      case 'engineer':
        router.push({ name: 'engineer-tickets' })
        break
      case 'client':
        router.push({ name: 'client-tickets' })
        break
      default:
        router.push({ name: 'login' })
    }
  }

  // Выход пользователя
  const logout = async () => {
    try {
      if (webSocketHandler.isConnected) {
        console.log('🔌 Закрываем WebSocket при выходе')
        webSocketHandler.reset()
      }
      await globalApiClient.post('/logout')
    } catch (error) {
      // Даже если ошибка, все равно очищаем данные
      console.log(error, ' Выход выполнен')
    } finally {
      //clearAuthData()
      router.push({ name: 'login' })
    }
  }

  const clearAuthData = async () => {
    // Вызываем уведомление
    console.log('authStore clearData')
    webSocketHandler.close()
    await logout()
    user.value = null
    clearAuthDataUtil(true)
  }

  const onLogout = async () => {
    // Вызываем уведомление
    console.log('authStore clearData')
    webSocketHandler.close()
    await logout()
    user.value = null
    isAuthenticated.value = false
    localStorage.removeItem('user')
    localStorage.removeItem('currentPath')
  }

  const synchronization = async () => {
    console.log('authStore synchronizated')
    //await logout()
    user.value = null
    //clearAuthDataUtil(true)
  }

  const initialize = () => {
    if (isInitialized) {
      console.log('⚠️ AuthStore уже инициализирован, пропускаем')
      return
    }
    // Восстанавливаем данные из localStorage
    const savedUser = localStorage.getItem('user')
    
    if (savedUser) {
      try {
        user.value = JSON.parse(savedUser)
        isInitialized = true
      } catch (error) {
        console.error('Ошибка инициализации авторизации:', error)
        clearAuthData()
      }
    }
    else {
      isInitialized = true
    }
  }

  return {
    // Состояние
    user,
    isAuthenticated,
    userRole,
    
    // Действия
    login,
    loginMobile,
    logout,
    clearAuthData,
    onLogout,
    synchronization,
    initialize,
    redirectByRole,
  }
})