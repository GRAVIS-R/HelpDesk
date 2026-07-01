import { defineStore } from 'pinia'
import { useCache } from '@/utils/cashe.utils'
import globalApiClient from '@/api/axios.config'

export const useProcessesStore = defineStore('processes', {
  state: () => ({
    processes: [],
    loading: false,
    currentProcess: null,
    pagination: null,
    cacheInstance: null,
    lastParams: null,
  }),

  actions: {
    initCache() {
      if (!this.cacheInstance) {
        const {
          getCacheKey,
          isCacheValid,
          getFromCache,
          saveToCache,
          invalidateCacheKey,
          clearCache,
          cache,
        } = useCache(5 * 60 * 1000)

        this.cacheInstance = {
          getCacheKey,
          isCacheValid,
          getFromCache,
          saveToCache,
          invalidateCacheKey,
          clearCache,
          cache,
        }
      }
      return this.cacheInstance
    },

    async fetchProcesses(params = {}) {
      this.loading = true
      const cache = this.initCache()
      const cacheKey = cache.getCacheKey('processes', params)

      if (cache.isCacheValid(cacheKey)) {
        console.log('📦 Используем кэшированные данные для ключа: ', cacheKey)
        const cached = cache.getFromCache(cacheKey)

        this.processes = cached.data.data || []
        this.pagination = cached.pagination

        this.loading = false
        return cached.response
      }

      try {
        const requestBody = {
          search: params.search || '',
        }

        console.log('📤 Отправка запроса /business_processes/load_business_processes:', requestBody)

        const response = params.url
          ? await globalApiClient.post(params.url, requestBody)
          : await globalApiClient.post('/business_processes/load_business_processes', requestBody)

        console.log('📥 Ответ от сервера:', response)

        if (response.data) {
          this.processes = response.data.data || []
          this.pagination = {
            current_page: response.data.current_page,
            data: response.data.data,
            first_page_url: response.data.first_page_url,
            from: response.data.from,
            last_page: response.data.last_page,
            last_page_url: response.data.last_page_url,
            links: response.data.links,
            next_page_url: response.data.next_page_url,
            path: response.data.path,
            per_page: response.data.per_page,
            prev_page_url: response.data.prev_page_url,
            to: response.data.to,
            total: response.data.total,
          }

          cache.saveToCache(cacheKey, response.data, this.pagination, response)
          this.lastParams = { ...params }
        }

        return response
      } catch (error) {
        console.error('❌ Ошибка загрузки бизнес-процессов:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // Создание
        async createProcess(payload) {
          try {
            console.log('📤 Отправка запроса на создание бизнес-процесса:', payload)
            const response = await globalApiClient.post('/business_processes/store', payload)
            console.log('📥 Ответ от сервера при создании бизнес-процесса:', response)
            
            this.clearCache()
            
            return response
          } catch (err) {
            console.error('❌ Ошибка при создании группы поддержки:', err)
            throw err
          }
        },

async updateProcess(payload) {
  try {
    console.log('📤 Отправка запроса на обновление бизнес-процесса:', payload)
    const response = await globalApiClient.post('/business_processes/update', payload)
    console.log('📥 Ответ от сервера при обновлении:', response)
    
    this.clearCache()
    
    return response
  } catch (err) {
    console.error('❌ Ошибка при обновлении бизнес-процесса:', err)
    throw err
  }
},

async updateStatuses(payload) {
  try {
    console.log('📤 Отправка запроса на обновление статусов:', payload)
    const response = await globalApiClient.post('/business_processes/update_statuses', payload)
    console.log('📥 Ответ от сервера при обновлении статусов:', response)
    
    this.clearCache()
    
    return response
  } catch (err) {
    console.error('❌ Ошибка при обновлении статусов:', err)
    throw err
  }
},

async addSupportGroup(payload) {
  try {
    console.log('Отправляем запрос на добавление группы: ', payload)
    const response = await globalApiClient.post('/add_support_group', payload)
    this.clearCache()
    return response
  } catch (err) {
    console.error('❌ Ошибка при добавлении группы поддержки:', err)
    throw err
  }
},

async removeSupportGroup(payload) {
  try {
    console.log('Отправляем запрос на удаление группы: ', payload)
    const response = await globalApiClient.post('/remove_support_group', payload)
    this.clearCache()
    return response
  } catch (err) {
    console.error('❌ Ошибка при удалении группы поддержки:', err)
    throw err
  }
},

// Удаление бизнес-процесса (добавим для полноты)
async deleteProcess(processId) {
  try {
    const response = await globalApiClient.post('/business_processes/destroy', { business_process_id: processId })
    this.clearCache()
    return response
  } catch (err) {
    console.error('❌ Ошибка при удалении бизнес-процесса:', err)
    throw err
  }
},

    async deleteProcesses(payload) {
      try {
        const requestBody = Array.isArray(payload)
          ? { processes: payload }
          : payload

        const response = await globalApiClient.post('/business_processes/destroy', requestBody)
        this.clearCache()
        return response
      } catch (error) {
        console.error('❌ Ошибка удаления бизнес-процессов:', error)
        throw error
      }
    },

    clearCacheByPrefix(prefix) {
      const cache = this.initCache()
      if (cache.cache?.value) {
        const keysToDelete = []
        cache.cache.value.forEach((_, key) => {
          if (key.startsWith(prefix)) {
            keysToDelete.push(key)
          }
        })
        keysToDelete.forEach((key) => cache.cache.value.delete(key))
        if (keysToDelete.length > 0) {
          console.log(`🗑️ Удалено ${keysToDelete.length} ключей с префиксом ${prefix}:`, keysToDelete)
        }
      }
    },

    invalidateCacheKey(params) {
      const cache = this.initCache()
      const cacheKey = cache.getCacheKey('classifications', params)
      cache.invalidateCacheKey(cacheKey)
    },

    clearCache() {
      const cache = this.initCache()
      cache.clearCache()
      this.lastParams = null
    },
  },
})