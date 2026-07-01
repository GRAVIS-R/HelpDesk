<template>
  <div class="support-group-editor" :class="{ 'view-mode': readonly }">
    <!-- Режим просмотра -->
    <template v-if="readonly">
      <div v-if="groups.length === 0" class="empty-state">
        <Icon :icon="uiIcons?.icons.supportGroup" width="48" height="48" class="empty-icon" />
        <p>Группы поддержки не назначены</p>
      </div>
      <div v-else class="cards-grid">
        <div 
          v-for="group in groups" 
          :key="group.id" 
          class="group-card"
        >
          <div class="card-content">
            <div class="group-name" :title="group.name">
              <Icon :icon="uiIcons?.icons.supportGroup" width="22" height="22" class="group-icon" />
              <span>{{ truncateText(group.name, 40) }}</span>
            </div>
            <div class="group-description">
              <span>{{ truncateText(group.description, 80) || 'Описание отсутствует' }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Режим редактирования -->
    <template v-else>
      <div v-if="groups.length === 0 && !showAddCard" class="empty-state">
        <Icon :icon="uiIcons?.icons.supportGroup" width="48" height="48" class="empty-icon" />
        <p>Группы поддержки не назначены</p>
      </div>
      
      <div class="cards-grid">
        <!-- Карточки существующих групп -->
        <div 
          v-for="group in groups" 
          :key="group.id" 
          class="group-card editable-card"
        >
          <div class="card-content">
            <div class="group-name" :title="group.name">
              <Icon :icon="uiIcons?.icons.supportGroup" width="22" height="22" class="group-icon" />
              <span>{{ truncateText(group.name, 40) }}</span>
            </div>
            <div class="group-description">
              <span>{{ truncateText(group.description, 80) || 'Описание отсутствует' }}</span>
            </div>
          </div>
          <div class="card-footer">
            <button 
              class="remove-btn"
              @click="removeGroup(group.id)"
              :disabled="loading"
              title="Удалить группу"
            >
              <Icon :icon="uiIcons?.icons.close" width="22" height="22" />
            </button>
          </div>
        </div>

        <!-- Карточка добавления группы -->
        <div v-if="showAddCard" class="group-card add-card" :class="{ 'add-card-active': isAdding }">
          <div class="add-card-content">
            <UIComboBox
              v-if="isAdding"
              ref="groupComboRef"
              v-model="selectedGroup"
              :return-object="true"
              :options="[]"
              option-label="name"
              option-value="id"
              placeholder="Поиск группы поддержки..."
              :search-debounce="500"
              :max-length="30"
              :load-options="loadGroupsOptions"
              @update:model-value="onGroupSelected"
              @blur="cancelAdd"
            />
            <button 
              v-else
              class="add-card-btn"
              @click="startAdd"
            >
              <Icon :icon="uiIcons?.icons.add" width="32" height="32" />
              <span class="add-card-text">Добавить группу</span>
            </button>
          </div>
        </div>
      </div>
    </template>

    <UIIcons ref="uiIcons" />
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'
import UIComboBox from '@/components/common/UI/UIComboBox.vue'
import { useSupportGroupsStore } from '@/stores/support.groups.store'
import { useProcessesStore } from '@/stores/processes.store'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  businessProcessId: {
    type: Number,
    required: true
  },
  readonly: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'groups-updated', 'add-group', 'remove-group'])

const uiIcons = ref()
const groupComboRef = ref(null)
const supportGroupsStore = useSupportGroupsStore()
const processesStore = useProcessesStore()

// Состояние
const groups = ref([])
const loading = ref(false)
const isAdding = ref(false)
const selectedGroup = ref(null)
const showAddCard = ref(true)

// Кэш для загруженных групп (чтобы не дублировать запросы)
const loadedGroupsCache = ref(new Map())

// Загруженные ID групп для исключения из поиска
const getAddedGroupIds = () => {
  return groups.value.map(g => g.id)
}

// Очистка кэша при изменении списка групп
const clearCache = () => {
  loadedGroupsCache.value.clear()
}

// Загрузка опций групп поддержки через store
const loadGroupsOptions = async (searchStr, url = null) => {
  try {
    const addedIds = getAddedGroupIds()
    const cacheKey = `${searchStr}_${url || 'default'}`
    
    // Проверяем кэш
    let groupsList = []
    if (loadedGroupsCache.value.has(cacheKey)) {
      groupsList = loadedGroupsCache.value.get(cacheKey)
    } else {
      // Используем store для загрузки групп
      const response = await supportGroupsStore.fetchSupportGroups({
        search: searchStr || '',
        url: url
      })
      
      if (response && response.data && Array.isArray(response.data.data)) {
        groupsList = response.data.data
      } else if (response && response.data && Array.isArray(response.data)) {
        groupsList = response.data
      } else if (Array.isArray(response)) {
        groupsList = response
      }
      
      // Сохраняем в кэш
      loadedGroupsCache.value.set(cacheKey, groupsList)
    }
    
    // Форматируем группы для отображения
    const formattedGroups = groupsList.map(group => ({
      id: group.id,
      name: group.name || 'Без названия',
      description: group.description || '',
      users: group.users || []
    }))
    
    // Фильтруем уже добавленные группы
    const filteredGroups = formattedGroups.filter(
      group => !addedIds.includes(group.id)
    )
    
    return {
      data: filteredGroups,
      current_page: 1,
      last_page: 1,
      next_page_url: null,
      prev_page_url: null
    }
  } catch (error) {
    console.error('Ошибка загрузки групп поддержки:', error)
    return {
      data: [],
      current_page: 1,
      last_page: 1,
      next_page_url: null,
      prev_page_url: null
    }
  }
}

// Начать добавление группы
const startAdd = () => {
  isAdding.value = true
  selectedGroup.value = null
  nextTick(() => {
    if (groupComboRef.value) {
      groupComboRef.value.focus()
    }
  })
}

// Отмена добавления
const cancelAdd = () => {
  if (!selectedGroup.value) {
    isAdding.value = false
    selectedGroup.value = null
  }
}

// Обработчик выбора группы
const onGroupSelected = async (group) => {
  if (!group || !group.id) {
    cancelAdd()
    return
  }
  
  // Проверяем, не добавлена ли уже группа
  if (getAddedGroupIds().includes(group.id)) {
    console.warn('Группа уже добавлена:', group.id)
    cancelAdd()
    return
  }
  
  loading.value = true
  
  try {
    const payload = {
      business_process_id: props.businessProcessId,
      support_group_id: group.id
    }
    
    // Используем store для добавления группы (нужно добавить метод в store)
    const response = await processesStore.addSupportGroup(payload)
    
    if (response && !response.validator_fails && !response.errors) {
      // Добавляем группу в список
      const newGroup = {
        id: response.id || group.id,
        name: response.name || group.name,
        description: response.description || '',
        users: response.users || []
      }
      
      groups.value.push(newGroup)
      emit('update:modelValue', [...groups.value])
      emit('groups-updated', [...groups.value])
      emit('add-group', newGroup)
      
      // Очищаем кэш, чтобы при следующем поиске обновился список доступных групп
      clearCache()
    } else {
      const errorMsg = response?.validator_fails?.['Ошибка добавления Группы поддержки'] ||
                       response?.message ||
                       'Ошибка при добавлении группы'
      console.error('Ошибка добавления группы:', errorMsg)
    }
  } catch (error) {
    console.error('Ошибка при добавлении группы:', error)
  } finally {
    loading.value = false
    isAdding.value = false
    selectedGroup.value = null
  }
}

// Удаление группы
const removeGroup = async (groupId) => {
  const groupToRemove = groups.value.find(g => g.id === groupId)
  if (!groupToRemove) return
  
  loading.value = true
  
  try {
    const payload = {
      business_process_id: props.businessProcessId,
      support_groups: [groupId]
    }
    
    // Используем store для удаления группы (нужно добавить метод в store)
    const response = await processesStore.removeSupportGroup(payload)
    
    if (response && !response.validator_fails && !response.errors) {
      // Удаляем группу из списка
      const index = groups.value.findIndex(g => g.id === groupId)
      if (index !== -1) {
        groups.value.splice(index, 1)
        emit('update:modelValue', [...groups.value])
        emit('groups-updated', [...groups.value])
        emit('remove-group', groupId)
        
        // Очищаем кэш, чтобы при следующем поиске обновился список доступных групп
        clearCache()
      }
    } else {
      const errorMsg = response?.validator_fails?.['Ошибка удаления Группы поддержки'] ||
                       response?.message ||
                       'Ошибка при удалении группы'
      console.error('Ошибка удаления группы:', errorMsg)
    }
  } catch (error) {
    console.error('Ошибка при удалении группы:', error)
  } finally {
    loading.value = false
  }
}

// Синхронизация с props
watch(() => props.modelValue, (newVal) => {
  if (newVal && Array.isArray(newVal)) {
    groups.value = [...newVal]
    // При изменении списка групп очищаем кэш
    clearCache()
  } else if (newVal === null || newVal === undefined) {
    groups.value = []
    clearCache()
  }
}, { immediate: true, deep: true })

// Сброс состояния добавления
const resetAddState = () => {
  isAdding.value = false
  selectedGroup.value = null
}

// Обрезка текста
const truncateText = (text, maxLength) => {
  if (!text) return ''
  const stringText = String(text)
  if (stringText.length <= maxLength) return stringText
  return stringText.substring(0, maxLength) + '...'
}

// Получение текущих групп
const getGroups = () => {
  return [...groups.value]
}

// Установка групп
const setGroups = (newGroups) => {
  groups.value = [...newGroups]
  emit('update:modelValue', [...groups.value])
  clearCache()
}

defineExpose({
  getGroups,
  setGroups,
  resetAddState
})
</script>

<style scoped>
.support-group-editor {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.support-group-editor.view-mode {
  min-height: auto;
}

/* Сетка карточек */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  padding: 4px;
}

/* Базовая карточка */
.group-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e9ecef;
  transition: all 0.2s ease;
}

/* Режим просмотра - карточки */
.view-mode .group-card {
  cursor: default;
}

/* Режим редактирования */
.editable-card {
  cursor: default;
}

.editable-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* Содержимое карточки */
.card-content {
  padding: 12px;
  flex: 1;
}

/* Название группы */
.group-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
  color: #1a1a2e;
  margin-bottom: 10px;
  word-break: break-word;
}

.group-icon {
  flex-shrink: 0;
  color: #178aee;
}

/* Описание группы */
.group-description {
  font-size: 13px;
  color: #6c757d;
  line-height: 1.4;
  word-break: break-word;
  min-height: 36px;
}

/* Футер карточки */
.card-footer {
  padding: 8px 12px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.engineers-count {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6c757d;
}

/* Кнопка удаления */
.remove-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px;
  border-radius: 50%;
  color: #dc3545;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-btn:hover:not(:disabled) {
  background-color: rgba(220, 53, 69, 0.1);
  transform: scale(1.05);
}

.remove-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Карточка добавления */
.add-card {
  border: 2px dashed rgb(67, 146, 216);
  background: #fafbfc;
  box-shadow: none;
  transition: all 0.2s ease;
  cursor: pointer;
}

.add-card:hover {
  border-color: #178aee;
  background: #f0f7ff;
}

.add-card-active {
  border-color: #178aee;
  background: white;
}

.add-card-text {
  color: rgb(67, 146, 216);
}

.add-card-text:hover {
  color: #178aee;
}

.add-card-content {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  padding: 16px;
}

.add-card-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgb(67, 146, 216);
  transition: all 0.2s;
  width: 100%;
}

.add-card-btn:hover {
  color: #178aee;
}

.add-card-btn svg {
  transition: transform 0.2s;
}

.add-card-btn:hover svg {
  transform: scale(1.1);
}

.add-card-btn span {
  font-size: 13px;
  font-weight: 500;
}

/* Комбобокс внутри карточки добавления */
.add-card-content :deep(.ui-combobox-wrapper) {
  width: 100%;
}

.add-card-content :deep(.ui-combobox-input) {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
}

/* Пустое состояние */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #9ca3af;
  text-align: center;
}

.empty-icon {
  opacity: 0.5;
  margin-bottom: 12px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* Адаптивность */
@media (max-width: 1200px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>