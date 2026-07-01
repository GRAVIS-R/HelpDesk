<template>
  <div v-if="visible" class="bp-modal-backdrop" @keydown.esc="close" tabindex="-1" role="dialog" aria-modal="true">
    <div class="bp-modal" ref="modalRoot" role="document" :aria-label="modalTitle">
      <header class="modal-header">
        <h2 class="modal-title">{{ modalTitle }}</h2>
        <!-- Кнопки переключения между редакторами -->
          <div class="tab-buttons">
            <button 
              class="tab-btn" 
              :class="{ active: activeTab === 'info' }"
              @click="switchTab('info')"
            >
              <Icon :icon="uiIcons?.icons.info" width="18" height="18" />
              Главная
            </button>
            <button 
              class="tab-btn" 
              :class="{ active: activeTab === 'statuses' }"
              @click="switchTab('statuses')"
            >
              <Icon :icon="uiIcons?.icons.businessProcess" width="18" height="18" />
              Статусы
            </button>
            <button 
              class="tab-btn" 
              :class="{ active: activeTab === 'groups' }"
              @click="switchTab('groups')"
            >
              <Icon :icon="uiIcons?.icons.supportGroup" width="18" height="18" />
              Группы
            </button>
            <button 
              class="tab-btn" 
              :class="{ active: activeTab === 'connections' }"
              @click="switchTab('connections')"
            >
              <Icon :icon="uiIcons?.icons.classifications" width="18" height="18" />
              Связи
            </button>
          </div>
        <div class="header-right">
          <!-- Кнопка сохранения для текущей вкладки -->
          <button 
            v-if="isEditing && activeTabSaveable"
            class="save-btn" 
            :class="{ 'save-btn-active': isCurrentTabValid }"
            @click="saveCurrentTab" 
            :disabled="saving || !isCurrentTabValid || !hasCurrentTabChanges"
            :title="getSaveButtonTitle()"
          >
            <Icon :icon="uiIcons?.icons.save" width="20" height="20" /> 
            {{ saving ? 'Сохранение...' : 'Сохранить' }}
          </button>

          <!-- Кнопка редактирования (режим просмотра) -->
          <button 
            v-if="!isEditing && mode !== 'create'"
            type="button" 
            class="btn" 
            @click="enterEdit"
          >
            <Icon :icon="uiIcons?.icons.editOutline" width="20" height="20" /> 
          </button>

          <button 
            v-if="isEditing && mode !== 'create'"
            type="button" 
            class="btn" 
            @click="enterEdit"
          >
            <Icon :icon="uiIcons?.icons.notEditOutline" width="20" height="20" /> 
          </button>

          <!-- Кнопка закрытия -->
          <button class="close-btn" @click="close" title="Закрыть">
            <Icon :icon="uiIcons?.icons.close" class="close-btn-icon" width="36" height="36" />
          </button>
        </div>
      </header>

      <div class="bp-modal__body">
        <!-- Режим просмотра -->
        <template v-if="!isEditing">
          <div class="view-mode">
            <div v-show="activeTab === 'info'" class="editor-container">
              <BasicInfoEditor 
                v-model="basicInfo"
                :readonly="true"
                :initial-data="initialBasicInfo"
              />
            </div>
            <div v-show="activeTab === 'statuses'" class="editor-container">
              <StatusEditor 
                v-model="statusesListView"
                :readonly="true"
              />
            </div>
              <!-- Режим просмотра -->
              <div v-show="activeTab === 'groups'" class="editor-container">
              <SupportGroupEditor 
                v-model="supportGroups"
                :business-process-id="props.process?.id"
                :readonly="true"
              />
            </div>

            <div v-show="activeTab === 'connections'" class="editor-container">
              <!-- TODO: компонент ConnectionsEditor -->
              <div class="placeholder-editor">
                <p>Связи</p>
              </div>
            </div>
          </div>
        </template>

        <!-- Режим редактирования -->
        <template v-else>
          <div class="edit-mode">
            <div v-show="activeTab === 'info'" class="editor-container">
              <BasicInfoEditor 
                ref="basicInfoEditorRef"
                v-model="basicInfo"
                :readonly="false"
                :initial-data="initialBasicInfo"
                @validity-change="onBasicInfoValidityChange"
                @field-change="onBasicInfoChange"
              />
            </div>
            <div v-show="activeTab === 'statuses'" class="editor-container">
              <StatusEditor 
                ref="statusEditorRef"
                v-model="statusesListEdit"
                :readonly="false"
                @validity-change="onStatusesValidityChange"
                @update:model-value="onStatusesChange"
              />
            </div>
            <div v-show="activeTab === 'groups'" class="editor-container">
              <SupportGroupEditor 
                ref="supportGroupEditorRef"
                v-model="supportGroupsEdit"
                :business-process-id="props.process?.id"
                :readonly="false"
                @groups-updated="onSupportGroupsChange"
              />
            </div>
            <div v-show="activeTab === 'connections'" class="editor-container">
              <!-- TODO: компонент ConnectionsEditor -->
              <div class="placeholder-editor">
                <p>Связи</p>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>

  <UIIcons ref="uiIcons" />
  <SuccessNotification ref="successModal" />
  <DeleteNotification ref="deleteModal" />
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'
import SuccessNotification from '@/components/notifications/SuccessNotification.vue'
import DeleteNotification from '@/components/notifications/DeleteNotification.vue'
import BasicInfoEditor from './bpparts/BasicInfoEditor.vue'
import StatusEditor from './bpparts/StatusEditor.vue'
import SupportGroupEditor from './bpparts/SupportGroupEditor.vue'
import { useProcessesStore } from '@/stores/processes.store'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'view' }, // 'view', 'edit', 'create'
  process: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'saved', 'deleted'])

const processesStore = useProcessesStore()

const uiIcons = ref()
const successModal = ref()
const deleteModal = ref()
const basicInfoEditorRef = ref()
const statusEditorRef = ref()
const supportGroupEditorRef = ref()

// Состояние
const visible = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const activeTab = ref('info')

// Данные форм
const basicInfo = ref({
  name: '',
  description: '',
  months: null,
  weeks: null,
  days: null,
  hours: null,
  minutes: null
})

const statusesListView = ref([])
const statusesListEdit = ref([])
const statusesListEditClone = ref([])

// Начальные данные для сброса
const initialBasicInfo = ref(null)
const initialStatuses = ref(null)

// Флаги наличия изменений для каждой вкладки
const hasBasicInfoChanges = ref(false)
const hasStatusesChanges = ref(false)

// Валидность каждой вкладки
const isBasicInfoValid = ref(false)
const isStatusesValid = ref(false)
// Для групп и связей пока всегда true
const isGroupsValid = ref(true)
const isConnectionsValid = ref(true)

// Данные
const supportGroups = ref([])
const supportGroupsEdit = ref([])
const supportGroupsClone = ref([])
const hasSupportGroupsChanges = ref(false)

// Состояние сохранения для каждой вкладки
const savingTabs = ref({
  info: false,
  statuses: false,
  groups: false,
  connections: false
})

// Какие вкладки можно сохранять
const activeTabSaveable = computed(() => {
  const saveableTabs = ['info', 'statuses', 'groups', 'connections']
  return saveableTabs.includes(activeTab.value)
})

// Валидность текущей вкладки
const isCurrentTabValid = computed(() => {
  switch (activeTab.value) {
    case 'info':
      return isBasicInfoValid.value
    case 'statuses':
      return isStatusesValid.value
    case 'groups':
      return isGroupsValid.value
    case 'connections':
      return isConnectionsValid.value
    default:
      return false
  }
})

// Проверка наличия изменений в текущей вкладке
const hasCurrentTabChanges = computed(() => {
  switch (activeTab.value) {
    case 'info':
      return hasBasicInfoChanges.value
    case 'statuses':
      return hasStatusesChanges.value
    case 'groups':
      return hasSupportGroupsChanges.value
    case 'connections':
      return false
    default:
      return false
  }
})

function getSaveButtonTitle() {
  if (!isCurrentTabValid.value) {
    switch (activeTab.value) {
      case 'info': return 'Заполните название бизнес-процесса'
      case 'statuses': return 'Настройте статусы процесса'
      default: return 'Форма не валидна'
    }
  }
  if (!hasCurrentTabChanges.value) {
    return 'Нет изменений для сохранения'
  }
  return 'Сохранить изменения'
}

// Переключение вкладки
function switchTab(tab) {
  if (saving.value) return
  activeTab.value = tab
}

// Обработчики изменений
function onBasicInfoValidityChange(isValid) {
  isBasicInfoValid.value = isValid
}

function onStatusesValidityChange(isValid) {
  isStatusesValid.value = isValid
}

function onBasicInfoChange() {
  hasBasicInfoChanges.value = true
}

function onStatusesChange() {
  hasStatusesChanges.value = true
}

function onSupportGroupsChange(groups) {
  hasSupportGroupsChanges.value = true
}

// Сохранение текущей вкладки
async function saveCurrentTab() {
  if (saving.value || !isCurrentTabValid.value || !hasCurrentTabChanges.value) return
  
  saving.value = true
  savingTabs.value[activeTab.value] = true
  
  try {
    let response = null
    
    switch (activeTab.value) {
      case 'info':
        response = await saveBasicInfo()
        break
      case 'statuses':
        response = await saveStatuses()
        break
      case 'groups':
        hasSupportGroupsChanges.value = false
        if (supportGroupEditorRef.value) {
          // Обновляем клон
          supportGroupsClone.value = JSON.parse(JSON.stringify(supportGroupsEdit.value))
        }
        await successModal.value.open({
          title: '',
          mainMessage: getSuccessMessage(),
          type: 'success',
        })
        break
      case 'connections':
        // TODO: saveConnections()
        break
    }
    
    if (response && !response.validator_fails && !response.errors) {
      // Сбрасываем флаг изменений для текущей вкладки
      switch (activeTab.value) {
        case 'info':
          hasBasicInfoChanges.value = false
          // Обновляем начальные данные
          if (basicInfoEditorRef.value) {
            basicInfoEditorRef.value.setInitialState()
          }
          break
        case 'statuses':
          hasStatusesChanges.value = false
          // Обновляем начальные данные
          if (statusEditorRef.value) {
            statusEditorRef.value.setInitialState?.()
          }
          break
      }
      
      await successModal.value.open({
        title: '',
        mainMessage: getSuccessMessage(),
        type: 'success',
      })
      
      emit('saved', response.data)
    } else {
      await successModal.value.open({
        title: '',
        mainMessage: response?.message || 'Ошибка при сохранении',
        type: 'notSuccess',
      })
    }
  } catch (err) {
    console.error('Ошибка сохранения:', err)
    await successModal.value.open({
      title: '',
      mainMessage: err?.response?.data?.message || err?.message || 'Ошибка сохранения',
      type: 'notSuccess',
    })
  } finally {
    saving.value = false
    savingTabs.value[activeTab.value] = false
  }
}

// Сохранение основной информации
async function saveBasicInfo() {
  const basicData = basicInfoEditorRef.value?.getApiData?.() || {
    name: basicInfo.value.name,
    description: basicInfo.value.description,
    months: 0,
    weeks: 0,
    days: 0,
    hours: 0,
    minutes: 0
  }
  
  const saveData = {
    business_process_id: props.process?.id,
    name: basicData.name,
    description: basicData.description,
    months: basicData.months || 0,
    weeks: basicData.weeks || 0,
    days: basicData.days || 0,
    hours: basicData.hours || 0,
    minutes: basicData.minutes || 0
  }
  
  console.log('📤 Сохранение основной информации:', saveData)
  return await processesStore.updateProcess(saveData)
}

// Сохранение статусов
async function saveStatuses() {
  const statusesData = statusEditorRef.value?.getApiStatuses?.() || []
  
  const saveData = {
    business_process_id: props.process?.id,
    statuses: statusesData
  }
  
  console.log('📤 Сохранение статусов:', saveData)
  return await processesStore.updateStatuses(saveData)
}

function getSuccessMessage() {
  switch (activeTab.value) {
    case 'info': return 'Основная информация обновлена'
    case 'statuses': return 'Статусы процесса обновлены'
    case 'groups': return 'Группы поддержки обновлены'
    case 'connections': return 'Связи обновлены'
    default: return 'Сохранено'
  }
}

function loadData() {
  if (props.mode === 'create') {
    resetBasicData()
    statusesListView.value = []
    statusesListEdit.value = []
  } else if (props.process) {
    basicInfo.value = {
      name: props.process.name || '',
      description: props.process.description || '',
      months: props.process.deadline?.months || null,
      weeks: props.process.deadline?.weeks || null,
      days: props.process.deadline?.days || null,
      hours: props.process.deadline?.hours || null,
      minutes: props.process.deadline?.minutes || null
    }

    const clonedStatuses = props.process.statuses ? JSON.parse(JSON.stringify(props.process.statuses)) : []
    statusesListView.value = clonedStatuses
    statusesListEdit.value = clonedStatuses

    supportGroups.value = props.process?.support_groups || []
    supportGroupsEdit.value = props.process?.support_groups ? JSON.parse(JSON.stringify(props.process.support_groups)) : []
    supportGroupsClone.value = props.process?.support_groups ? JSON.parse(JSON.stringify(props.process.support_groups)) : []
  } else {
    resetBasicData()
    statusesListView.value = []
    statusesListEdit.value = []
  }
  
  // Сохраняем начальные данные
  initialBasicInfo.value = { ...basicInfo.value }
  initialStatuses.value = JSON.parse(JSON.stringify(statusesListEdit.value))
  
  // Сбрасываем флаги изменений
  hasBasicInfoChanges.value = false
  hasStatusesChanges.value = false
  
  // Устанавливаем начальное состояние в редакторах
  if (basicInfoEditorRef.value) {
    basicInfoEditorRef.value.setInitialState()
  }
  if (statusEditorRef.value) {
    statusEditorRef.value.setInitialState?.()
  }
}

function resetBasicData() {
  basicInfo.value = {
    name: '',
    description: '',
    months: null,
    weeks: null,
    days: null,
    hours: null,
    minutes: null
  }
}

// Редактирование
function enterEdit() {
  if (!canEdit.value) 
    return
  if(isEditing.value){
    isEditing.value = false
    statusesListEdit.value = JSON.parse(JSON.stringify(statusesListEditClone.value))
  }
  else{
    statusesListEditClone.value = JSON.parse(JSON.stringify(statusesListEdit.value))
    isEditing.value = true
  }
}

// Закрытие
function close() {
  if (saving.value) return
  visible.value = false
  isEditing.value = false
  activeTab.value = 'info'
  hasBasicInfoChanges.value = false
  hasStatusesChanges.value = false
}

// Вычисляемые свойства
const modalTitle = computed(() => {
  if (isEditing.value) return 'Редактирование'
  return props.process?.name || 'Бизнес процесс'
})

const canEdit = computed(() => {
  return props.mode === 'create' || props.mode === 'edit'
})

// Отслеживание видимости
watch(() => props.modelValue, async (v) => {
  visible.value = v
  if (v) {
    loadData()
    if (props.mode === 'create') {
      isEditing.value = true
      activeTab.value = 'info'
    } else {
      isEditing.value = false
    }
  }
})

watch(visible, (v) => emit('update:modelValue', v))
</script>

<style scoped>
/* Добавляем стили для кнопки сброса всего */
.reset-all-btn {
  background: #f59e0b;
  color: white;
  border: none;
  padding: 6px 14px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.reset-all-btn:hover {
  background: #d97706;
  transform: scale(1.02);
}

/* Остальные стили остаются как в предыдущей версии */
.bp-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
}

.bp-modal {
  max-width: 93%;
  min-width: 900px;
  max-height: 86vh;
  min-height: 26vh;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 30px 80px rgba(3, 20, 50, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  background: #ffffff;
  position: sticky;
  top: 0;
  z-index: 15;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #1f2937;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tab-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f3f4f6;
  padding: 4px;
  border-radius: 10px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #374151;
  background: #e5e7eb;
}

.tab-btn.active {
  background: white;
  color: #178aee;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.save-btn {
  background: #3cc93a;
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.save-btn:hover:not(:disabled) {
  background: #34bb32;
  transform: scale(1.02);
}

.save-btn:disabled {
  background: #c4c6c8;
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.save-btn-active {
  background: #3cc93a;
  opacity: 1;
}

.close-btn {
  background: transparent;
  color: #454545;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  transform: scale(1.05);
}

.close-btn-icon:hover {
  color: #ef4444;
}

.bp-modal__body-create {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
}

.bp-modal__body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px 12px;
}

.view-mode {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-mode {
  height: 100%;
}

.editor-container {
  height: 100%;
  min-height: 500px;
}

.right-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn {
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid #d1d5db;
  background: rgb(246, 246, 246);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
}

.btn:hover {
  transform: scale(1.02);
  background: #f3f4f6;
}

.btn.danger {
  background: #ef4444;
  color: white;
  border: none;
}

.btn.danger:hover {
  background: #dc2626;
}

@media (max-width: 1200px) {
  .bp-modal {
    width: calc(100% - 24px);
  }
}

@media (max-width: 768px) {
  .modal-header {
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .tab-buttons {
    order: 1;
    width: 100%;
    justify-content: center;
  }
  
  .header-right {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}
</style>