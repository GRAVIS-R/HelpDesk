<template>
  <div v-if="visible" class="bp-create-backdrop" @keydown.esc="close" tabindex="-1" role="dialog" aria-modal="true">
    <div class="bp-create-modal" ref="modalRoot" role="document">
      <header class="modal-header">
        <h2 class="modal-title">Создание бизнес-процесса</h2>
        <div class="header-right">
          <button 
            class="save-btn" 
            :class="{ 'save-btn-active': isFormValid }"
            @click="onCreate" 
            :disabled="saving || !isFormValid"
            :title="createButtonTitle"
          >
            <Icon :icon="uiIcons?.icons.save" width="20" height="20" /> 
            {{ saving ? 'Создание...' : 'Создать' }}
          </button>

          <button class="close-btn" @click="close" title="Закрыть">
            <Icon :icon="uiIcons?.icons.close" class="close-btn-icon" width="36" height="36" />
          </button>
        </div>
      </header>

      <div class="bp-create__body">
        <div class="form-container">
          <div class="form-row">
            <UIInput
              ref="nameField"
              label="Название бизнес-процесса"
              v-model="formData.name"
              placeholder="Введите название"
              :maxLength="60"
              :required="true"
              @update:model-value="onFieldChange"
            />
          </div>

          <div class="form-row">
            <UITextarea
              v-model="formData.description"
              label="Описание"
              placeholder="Введите описание"
              :maxLength="300"
              :showCharCount="true"
              :rows="3"
              :minHeight="'45px'"
              :maxHeight="'90px'"
              @update:model-value="onFieldChange"
            />
          </div>

          <div class="form-row">
            <label class="deadline-label">Дедлайн</label>
            <div class="deadline-inputs">
              <div class="deadline-field">
                <UIInput
                  type="number"
                  v-model="deadline.months"
                  placeholder="0"
                  :min="0"
                  :max="12"
                  :maxLength="2"
                  :step="1"
                  :integer="true"
                  :required="false"
                />
                <span class="deadline-unit">м.</span>
              </div>
              <div class="deadline-field">
                <UIInput
                  type="number"
                  v-model="deadline.weeks"
                  placeholder="0"
                  :min="0"
                  :max="5"
                  :step="1"
                  :maxLength="1"
                  :integer="true"
                  :required="false"
                />
                <span class="deadline-unit">н.</span>
              </div>
              <div class="deadline-field">
                <UIInput
                  type="number"
                  v-model="deadline.days"
                  placeholder="0"
                  :min="0"
                  :max="6"
                  :step="1"
                  :maxLength="1"
                  :integer="true"
                  :required="false"
                />
                <span class="deadline-unit">дн.</span>
              </div>
              <div class="deadline-field">
                <UIInput
                  type="number"
                  v-model="deadline.hours"
                  placeholder="0"
                  :min="0"
                  :max="12"
                  :maxLength="2"
                  :step="1"
                  :integer="true"
                  :required="false"
                />
                <span class="deadline-unit">ч.</span>
              </div>
              <div class="deadline-field">
                <UIInput
                  type="number"
                  v-model="deadline.minutes"
                  placeholder="0"
                  :min="0"
                  :max="60"
                  :maxLength="2"
                  :step="1"
                  :integer="true"
                  :required="false"
                />
                <span class="deadline-unit">мин.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <UIIcons ref="uiIcons" />
  <SuccessNotification ref="successProcessModal" />
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'
import UIInput from '@/components/common/UI/UIInput.vue'
import UITextarea from '@/components/common/UI/UITextarea.vue'
import SuccessNotification from '@/components/notifications/SuccessNotification.vue'
import { useProcessesStore } from '@/stores/processes.store'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'created'])

const STORAGE_KEY = 'business_process_create_draft'

const uiIcons = ref()
const processesStore = useProcessesStore()
const successProcessModal = ref()
const errorModal = ref()
const nameField = ref()

const visible = ref(false)
const saving = ref(false)

// Данные формы
const formData = ref({
  name: '',
  description: ''
})

// Дедлайн (разбит на компоненты)
const deadline = ref({
  months: null,
  weeks: null,
  days: null,
  hours: null,
  minutes: null
})

// Валидация
const isFormValid = computed(() => {
  return formData.value.name && formData.value.name.trim().length > 0
})

const createButtonTitle = computed(() => {
  if (!isFormValid.value) {
    return 'Введите название бизнес-процесса'
  }
  return 'Создать бизнес-процесс'
})

// Сохранение черновика
function saveDraft() {
  if (!formData.value.name && !formData.value.description && !deadline.value.months && !deadline.value.weeks &&
      !deadline.value.days && !deadline.value.hours && !deadline.value.minutes) {
    return
  }
  
  const draft = {
    name: formData.value.name,
    description: formData.value.description,
    deadline: {
      months: deadline.value.months,
      weeks: deadline.value.weeks,
      days: deadline.value.days,
      hours: deadline.value.hours,
      minutes: deadline.value.minutes
    },
    timestamp: Date.now()
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
}

// Загрузка черновика
function loadDraft() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const draft = JSON.parse(saved)
      const isExpired = Date.now() - draft.timestamp > 24 * 60 * 60 * 1000
      
      if (!isExpired && draft.name) {
        formData.value = {
          name: draft.name || '',
          description: draft.description || ''
        }
        if (draft.deadline) {
          deadline.value = {
            months: deadline.value.months || null,
            weeks: deadline.value.weeks || null,
            days: draft.deadline.days || null,
            hours: draft.deadline.hours || null,
            minutes: draft.deadline.minutes || null
          }
        }
      } else if (isExpired) {
        clearDraft()
      }
    } catch (e) {
      console.error('Ошибка загрузки черновика:', e)
    }
  }
}

function clearDraft() {
  localStorage.removeItem(STORAGE_KEY)
}

function resetForm() {
  formData.value = {
    name: '',
    description: ''
  }
  deadline.value = {
    months: null,
    weeks: null,
    days: null,
    hours: null,
    minutes: null
  }
}

function onFieldChange() {
  saveDraft()
}

// Создание бизнес-процесса
async function onCreate() {
  if (saving.value || !isFormValid.value) return
  
  saving.value = true
  
  try {
    const createData = {
      name: formData.value.name.trim(),
      description: formData.value.description || '',
      months: parseInt(deadline.value.months) || 0,
      weeks: parseInt(deadline.value.weeks) || 0,
      days: parseInt(deadline.value.days) || 0,
      hours: parseInt(deadline.value.hours) || 0,
      minutes: parseInt(deadline.value.minutes) || 0
    }

    const response = await processesStore.createProcess(createData)

    if (!response.validator_fails && !response.errors) {
      const confirmed = await successProcessModal.value.open({
        title: '',
        mainMessage: 'Бизнес-процесс успешно создан',
        type: 'success',
      })
      if (confirmed) {
        emit('created', response)
        clearDraft()
        resetForm()
        close()
      }
      } else {
        await successProcessModal.value.open({
          title: '',
          mainMessage: 'Ошибка при создании',
          type: 'notSuccess',
        })
        handleServerErrors(response)
      }
  } catch (err) {
    console.error('Ошибка создания:', err)
    if (errorModal.value) {
      await errorModal.value.open({
        title: 'Ошибка создания',
        mainMessage: err?.message || 'Не удалось создать бизнес-процесс. Попробуйте позже.',
        type: 'error',
      })
    }
  } finally {
    saving.value = false
  }
}

function close() {
  visible.value = false
  saving.value = false
}

// Отслеживание видимости
watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    loadDraft()
    setTimeout(() => {
      if (nameField.value) {
        const input = nameField.value.$el?.querySelector('input')
        if (input) input.focus()
      }
    }, 100)
  } else {
    if (formData.value.name || formData.value.description || deadline.value.months || deadline.value.weeks ||
        deadline.value.days || deadline.value.hours || deadline.value.minutes) {
      saveDraft()
    }
  }
})

watch(visible, (val) => emit('update:modelValue', val))

onBeforeUnmount(() => {
  if (formData.value.name || formData.value.description || deadline.value.months || deadline.value.weeks ||
      deadline.value.days || deadline.value.hours || deadline.value.minutes) {
    saveDraft()
  }
})
</script>

<style scoped>
.bp-create-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
}

.bp-create-modal {
  width: 90%;
  max-width: 570px;
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
  padding: 8px 12px;
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

.save-btn {
  background: #9ca3af;
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

.save-btn-active {
  background: #3cc93a;
}

.save-btn-active:hover:not(:disabled) {
  background: #2db82b;
  transform: scale(1.02);
}

.save-btn:disabled {
  background: #c4c6c8;
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.close-btn {
  background: transparent;
  color: #3d3d3d;
  width: 34px;
  height: 34px;
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
}

.close-btn-icon:hover {
  color: #ef4444;
}

.bp-create__body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.deadline-label {
  font-size: 12px;
  font-weight: 500;
  color: black;
  margin-bottom: 2px;
}

.deadline-inputs {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.deadline-field {
  flex: 1;
  min-width: 50px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.deadline-field :deep(.ui-input-wrapper) {
  flex: 1;
}

.deadline-unit {
  font-size: 13px;
  color: #6b7280;
  white-space: nowrap;
}

.field-hint {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 4px;
}

/* Стили для полей ввода */
:deep(.ui-input-field),
:deep(.ui-textarea) {
  width: 100%;
}

:deep(.ui-textarea) {
  resize: vertical;
}

@media (max-width: 640px) {
  .deadline-inputs {
    flex-direction: column;
    gap: 12px;
  }
  
  .deadline-field {
    width: 100%;
  }
  
  .bp-create__body {
    padding: 16px;
  }
}
</style>