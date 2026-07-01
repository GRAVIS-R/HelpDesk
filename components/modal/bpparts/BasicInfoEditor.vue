<template>
  <div class="basic-info-editor" :class="{ 'view-mode': readonly }">
    <div class="org-grid">
      <section class="info-section">
        <div class="section-header">
          <h3 class="subheading">Основная информация</h3>
        </div>
        <div class="two-columns">
          <div class="form-row">
            <UIInput
              v-if="!readonly"
              ref="nameField"
              v-model="formData.name"
              label="Название бизнес-процесса"
              placeholder="Введите название"
              :required="true"
              :maxLength="60"
              @update:model-value="onFieldChange"
            />
            <UILabel v-else v-model="formData.name" label="Название бизнес-процесса" :show-empty-indicator="true" />
          </div>
        </div>
        <div class="form-row">
          <UITextarea 
            v-if="!readonly"
            v-model="formData.description"
            placeholder="Введите описание"
            label="Описание"
            :maxLength="300"
            :showCharCount="true"
            :rows="3"
            :minHeight="'45px'"
            :maxHeight="'90px'"
            @update:model-value="onFieldChange"
          />
          <UITextarea 
            v-else
            :model-value="formData.description"
            placeholder="Описание отсутствует"
            label="Описание"
            :maxLength="300"
            :rows="3"
            :readonly="true"
          />
        </div>
        <div class="form-row">
          <span class="deadline-label">Дедлайн</span>
        <div class="deadline-inputs">
          <div class="deadline-field">
            <UIInput
              v-if="!readonly"
              type="number"
              v-model="formData.months"
              placeholder="0"
              :min="0"
              :max="12"
              :maxLength="2"
              :step="1"
              :integer="true"
              :required="false"
              @update:model-value="onFieldChange"
            />
            <UILabel v-else v-model="formData.months" :empty-text="0" :show-empty-indicator="true" />
            <span class="deadline-unit">мес.</span>
          </div>
          <div class="deadline-field">
            <UIInput
              v-if="!readonly"
              type="number"
              v-model="formData.weeks"
              placeholder="0"
              :min="0"
              :max="5"
              :step="1"
              :maxLength="1"
              :integer="true"
              :required="false"
              @update:model-value="onFieldChange"
            />
            <UILabel v-else v-model="formData.weeks" :empty-text="0" :show-empty-indicator="true" />
            <span class="deadline-unit">нед.</span>
          </div>
          <div class="deadline-field">
            <UIInput
              v-if="!readonly"
              type="number"
              v-model="formData.days"
              placeholder="0"
              :min="0"
              :max="6"
              :step="1"
              :maxLength="1"
              :integer="true"
              :required="false"
              @update:model-value="onFieldChange"
            />
            <UILabel v-else v-model="formData.days" :empty-text="0" :show-empty-indicator="true" />
            <span class="deadline-unit">дн.</span>
          </div>
          <div class="deadline-field">
            <UIInput
              v-if="!readonly"
              type="number"
              v-model="formData.hours"
              placeholder="0"
              :min="0"
              :max="24"
              :maxLength="2"
              :step="1"
              :integer="true"
              :required="false"
              @update:model-value="onFieldChange"
            />
            <UILabel v-else v-model="formData.hours" :empty-text="0" :show-empty-indicator="true" />
            <span class="deadline-unit">ч.</span>
          </div>
          <div class="deadline-field">
            <UIInput
              v-if="!readonly"
              type="number"
              v-model="formData.minutes"
              placeholder="0"
              :min="0"
              :max="60"
              :maxLength="2"
              :step="1"
              :integer="true"
              :required="false"
              @update:model-value="onFieldChange"
            />
            <UILabel v-else v-model="formData.minutes" :empty-text="0" :show-empty-indicator="true" />
            <span class="deadline-unit">мин.</span>
          </div>
        </div>
        </div>
      </section>
    </div>

    <button 
      v-if="!readonly && hasChanges" 
      class="reset-section-btn" 
      @click="resetSection" 
      title="Сбросить изменения в этом разделе"
    >
      <Icon :icon="uiIcons?.icons.reload" width="16" height="16" />
      Сбросить
    </button>
  </div>
  <UIIcons ref="uiIcons" />
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'
import UIInput from '@/components/common/UI/UIInput.vue'
import UILabel from '@/components/common/UI/UILabel.vue'
import UITextarea from '@/components/common/UI/UITextarea.vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      name: '',
      description: '',
      months: null,
      weeks: null,
      days: null,
      hours: null,
      minutes: null
    })
  },
  readonly: {
    type: Boolean,
    default: false
  },
  initialData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'validity-change', 'reset', 'field-change'])

const uiIcons = ref()
const nameField = ref(null)

// Форма с правильной структурой
const formData = reactive({
  name: '',
  description: '',
  months: null,
  weeks: null,
  days: null,
  hours: null,
  minutes: null
})

// Храним начальное состояние для сброса
let initialFormState = null

// Синхронизация с props
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    const newData = {
      name: newVal.name || '',
      description: newVal.description || '',
      months: newVal.months !== undefined && newVal.months !== null ? newVal.months : null,
      weeks: newVal.weeks !== undefined && newVal.weeks !== null ? newVal.weeks : null,
      days: newVal.days !== undefined && newVal.days !== null ? newVal.days : null,
      hours: newVal.hours !== undefined && newVal.hours !== null ? newVal.hours : null,
      minutes: newVal.minutes !== undefined && newVal.minutes !== null ? newVal.minutes : null
    }
    Object.assign(formData, newData)
    
    // Сохраняем начальное состояние, если его еще нет
    if (!initialFormState && props.initialData) {
      initialFormState = { ...newData }
    }
  }
}, { immediate: true, deep: true })

// Обработчик изменения полей
function onFieldChange() {
  emit('field-change')
}

// Отслеживание изменений формы
watch(formData, (newVal) => {
  if (!props.readonly) {
    emit('update:modelValue', { ...newVal })
    validate()
    emit('field-change')
  }
}, { deep: true })

// Проверка наличия изменений
const hasChanges = computed(() => {
  if (!initialFormState) return false
  // Сравниваем все поля, включая дедлайн
  const current = {
    name: formData.name || '',
    description: formData.description || '',
    months: formData.months || null,
    weeks: formData.weeks || null,
    days: formData.days || null,
    hours: formData.hours || null,
    minutes: formData.minutes || null
  }
  const initial = {
    name: initialFormState.name || '',
    description: initialFormState.description || '',
    months: initialFormState.months || null,
    weeks: initialFormState.weeks || null,
    days: initialFormState.days || null,
    hours: initialFormState.hours || null,
    minutes: initialFormState.minutes || null
  }
  return JSON.stringify(current) !== JSON.stringify(initial)
})

// Сброс раздела
function resetSection() {
  if (initialFormState) {
    Object.assign(formData, { ...initialFormState })
    hasChanges.value = false
    emit('reset', 'basic-info')
    emit('field-change')
  }
}

// Валидация
const validationErrors = ref([])

function validate() {
  if (props.readonly) {
    validationErrors.value = []
    emit('validity-change', true)
    return true
  }
  
  const errors = []
  
  if (!formData.name || !formData.name.trim()) {
    errors.push('Название бизнес-процесса обязательно')
  } else if (formData.name.length > 60) {
    errors.push('Название не должно превышать 60 символов')
  }
  
  if (formData.description && formData.description.length > 300) {
    errors.push('Описание не должно превышать 300 символов')
  }
  
  validationErrors.value = errors
  const isValid = errors.length === 0 && !!formData.name?.trim()
  emit('validity-change', isValid)
  return isValid
}

// Геттер валидности для родителя
const isValid = computed(() => {
  if (props.readonly) return true
  return validationErrors.value.length === 0 && !!formData.name?.trim()
})

// Установка начального состояния
function setInitialState() {
  initialFormState = {
    name: formData.name || '',
    description: formData.description || '',
    months: formData.months || null,
    weeks: formData.weeks || null,
    days: formData.days || null,
    hours: formData.hours || null,
    minutes: formData.minutes || null
  }
}

// Получение данных для API
function getApiData() {
  return {
    name: formData.name?.trim() || '',
    description: formData.description || '',
    months: parseInt(formData.months) || 0,
    weeks: parseInt(formData.weeks) || 0,
    days: parseInt(formData.days) || 0,
    hours: parseInt(formData.hours) || 0,
    minutes: parseInt(formData.minutes) || 0
  }
}

defineExpose({
  validate,
  isValid,
  hasChanges,
  resetSection,
  setInitialState,
  getData: () => ({ ...formData }),
  getApiData,
  setData: (data) => {
    if (data) {
      Object.assign(formData, {
        name: data.name || '',
        description: data.description || '',
        months: data.months !== undefined ? data.months : null,
        weeks: data.weeks !== undefined ? data.weeks : null,
        days: data.days !== undefined ? data.days : null,
        hours: data.hours !== undefined ? data.hours : null,
        minutes: data.minutes !== undefined ? data.minutes : null
      })
      initialFormState = { ...formData }
    }
  }
})
</script>

<style scoped>
.basic-info-editor {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 90%;
  min-width: 900px;
  max-height: 46vh;
  min-height: 26vh;
}

.basic-info-editor.view-mode {
  gap: 0;
}

.org-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  min-height: calc(30vh);
}

.info-section {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background-color: #f8f8f8;
  padding: 20px;
}

.view-mode .info-section {
  background-color: #f8f8f8;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.subheading {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.two-columns {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-row :deep(.ui-input-field),
.form-row :deep(.ui-textarea) {
  width: 100%;
}

.deadline-label {
  font-size: 12px;
  font-weight: 500;
  color: rgb(138, 138, 138);
  margin-top: 4px;
}

.deadline-inputs {
  display: flex;
  gap: 40px;
  flex-wrap: wrap;
}

.deadline-field {
  flex: 1;
  min-width: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
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
  margin-top: 8px;
}

.reset-section-btn { 
  max-width: 120px;
  padding: 6px 12px; 
  border-radius: 8px; 
  cursor: pointer; 
  border: 1px solid #e5e7eb;
  background: white;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.reset-section-btn:hover {
  background: #f3f4f6;
  transform: scale(1.02);
}

.validation-errors {
  margin-top: 12px;
  padding: 10px;
  background: #fee2e2;
  border-radius: 6px;
  border-left: 3px solid #ef4444;
}

.error-item {
  font-size: 12px;
  color: #b91c1c;
  margin: 4px 0;
}

@media (max-width: 768px) {
  .org-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .deadline-inputs {
    flex-direction: column;
  }
  
  .deadline-field {
    width: 100%;
  }
}
</style>