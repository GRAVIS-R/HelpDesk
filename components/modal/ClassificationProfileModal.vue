<template>
  <div v-if="visible" class="classification-modal-backdrop" @keydown.esc="close" tabindex="-1" role="dialog" aria-modal="true">
    <div class="classification-modal" ref="modalRoot" role="document" :aria-label="modalTitle">
      <header class="modal-header">
        <h2 class="modal-title">{{ modalTitle }}</h2>
        <div class="header-right">
          <template v-if="isEditing && mode !== 'create'">
            <button  
              v-if="hasFormChanges" 
              class="save-btn" 
              :class="{ 'save-btn-active': isFormValid }"
              @click="onSave" 
              :disabled="saving || !isFormValid"
              title="Сохранить изменения"
            >
              <Icon :icon="uiIcons?.icons.save" width="20" height="20" /> Сохранить изменения
            </button>
          </template>
          <template v-else-if="isEditing && mode === 'create'">
            <button 
              class="save-btn" 
              :class="{ 'save-btn-active': isFormValid }"
              @click="onSave" 
              :disabled="saving || !isFormValid"
              title="Применить"
            >
              <Icon :icon="uiIcons?.icons.save" width="20" height="20" /> Применить
            </button>
          </template>
          <template v-else>
            <button type="button" class="btn" @click="enterEdit" v-if="canEdit && mode !== 'create' && mode !== 'view'">
              <Icon :icon="uiIcons?.icons.editOutline" width="20" height="20" /> Редактировать
            </button>
          </template>
          <button class="close-btn" @click="close" title="Закрыть">
            <Icon :icon="uiIcons?.icons.close" class="close-btn-icon" width="36" height="36" />
          </button>
        </div>
      </header>

      <div class="classification-modal__body">
        <!-- Режим просмотра -->
        <template v-if="!isEditing">
          <div class="classification-grid">
            <section class="classification-main">
              <div class="classification-section">
                <h3 class="subheading">Основная информация</h3>
                <div class="two-columns">
                  <UITextarea 
                    :modelValue="localClassification.name" 
                    placeholder="Название отсутствует"
                    label="Название классификации"
                    :maxLength="125"
                    :showCharCount="true"
                    :rows="4"
                    :minHeight="'45px'"
                    :maxHeight="'90px'"
                    :readonly="true"
                  />
                  <UITextarea 
                    :modelValue="localClassification.description" 
                    placeholder="Описание отсутствует"
                    label="Описание"
                    :maxLength="300"
                    :showCharCount="true"
                    :rows="4"
                    :minHeight="'45px'"
                    :maxHeight="'90px'"
                    :readonly="true"
                  />
                </div>
              </div>
              <div class="classification-section">
                <h3 class="subheading">Организации клиентов</h3>
                <div class="organizations-table-view">
                  <div v-if="localClassification.organizations && localClassification.organizations.length > 0" class="organizations-list">
                    <div 
                      v-for="org in localClassification.organizations" 
                      :key="getOrganizationId(org)" 
                      class="organization-item"
                    >
                      <div class="organization-avatar" :style="getOrganizationAvatarStyle(org)">
                        {{ getOrganizationInitials(org) }}
                      </div>
                      <div class="organization-info">
                        <span class="organization-name">{{ getOrganizationLabel(org) }}</span>
                      </div>
                    </div>
                  </div>
                  <div v-else class="no-organizations">
                    Организации не назначены
                  </div>
                </div>
              </div>
            </section>
          </div>
        </template>

        <!-- Режим редактирования -->
        <template v-else>
          <div class="classification-grid">
            <section class="classification-main">
              <div class="classification-section">
                <h3 class="subheading">Основная информация</h3>
                <div class="two-columns">
                  <div class="form-row">
                    <UITextarea 
                      ref="nameInput"
                      v-model="localClassification.name"
                      placeholder="Введите название"
                      label="Название классификации"
                      :required="true"
                      :maxLength="125"
                      :showCharCount="true"
                      :rows="4"
                      :minHeight="'45px'"
                      :maxHeight="'120px'"
                      :readonly="false"
                    />
                  </div>
                  <div class="form-row">
                    <UITextarea 
                      ref="descriptionInput"
                      v-model="localClassification.description"
                      placeholder="Введите описание"
                      label="Описание"
                      :maxLength="300"
                      :showCharCount="true"
                      :rows="4"
                      :minHeight="'45px'"
                      :maxHeight="'120px'"
                      :readonly="false"
                    />
                  </div>
                </div>
              </div>
              <div class="classification-section">
                <h3 class="subheading">Организации клиентов</h3>
                
                <!-- Таблица организаций -->
                <div class="organizations-table">
                  <div class="organizations-row header-row">
                    <div class="organization-col name-col">Организация</div>
                    <div class="organization-col actions-col"></div>
                  </div>

                  <div v-for="(org, index) in localClassification.organizationsCombobox" :key="getOrganizationId(org) || index" class="organizations-row">
                    <div class="organization-col name-col">
                      <UIComboBox
                        :ref="el => setOrganizationComboRef(el, index)"
                        v-model="localClassification.organizationsCombobox[index]"
                        :return-object="true"
                        :options="[]"
                        option-label="name"
                        option-value="id"
                        placeholder="Выберите организацию"
                        :search-debounce="500"
                        :max-length="30"
                        :load-options="(searchStr, url) => loadOrganizationsOptions(searchStr, url, index)"
                        @update:model-value="(val) => onOrganizationChange(index, val)"
                      />
                    </div>
                    <div class="organization-col actions-col">
                      <button 
                        class="remove-organization-btn"
                        @click="removeOrganization(index)"
                        title="Удалить организацию"
                      >
                        <Icon :icon="uiIcons?.icons.close" width="22" height="22" />
                      </button>
                    </div>
                  </div>
                  
                  <!-- Кнопка добавления организации -->
                  <div class="organizations-row add-row">
                    <div class="organization-col add-button-col">
                      <button 
                        class="add-organization-btn"
                        @click="addOrganization"
                      >
                        + Добавить организацию
                      </button>
                    </div>
                  </div>
                </div>
                
                <div v-if="organizationsTouched && organizationsError" class="field-error">
                  {{ organizationsError }}
                </div>
              </div>
              
              <div class="classification-modal__footer">
                <div class="left-actions">
                  <span v-if="serverError" class="server-error">{{ serverError }}</span>
                </div>
                <div class="right-actions">
                  <template v-if="mode !== 'create'">
                    <button type="button" class="btn" @click="cancelEdit" :disabled="saving">Отменить изменения</button>
                    <button type="button" class="btn danger" v-if="canDelete" @click.stop="deleteClassification" title="Удалить классификацию">
                      <Icon :icon="uiIcons?.icons.deleteOutline" width="20" height="20" /> Удалить
                    </button>
                  </template>
                  <template v-else>
                    <button 
                      v-if="hasAnyInput" 
                      type="button" 
                      class="btn" 
                      @click="resetForm"
                    >
                      <Icon :icon="uiIcons?.icons.reload" width="20" height="20" />Сбросить
                    </button>
                  </template>
                </div>
              </div>
            </section>
          </div>
        </template>
      </div>
    </div>
  </div>
  <UIIcons ref="uiIcons" />
  <DeleteNotification ref="deleteClassificationModal" />
  <SuccessNotification ref="successClassificationModal" />
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'
import UIComboBox from '@/components/common/UI/UIComboBox.vue'
import UITextarea from '@/components/common/UI/UITextarea.vue'
import DeleteNotification from '@/components/notifications/DeleteNotification.vue'
import SuccessNotification from '@/components/notifications/SuccessNotification.vue'
import { useClassificationsStore } from '@/stores/classifications.store'
import { getUserRole } from '@/utils/auth.utils'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'view' }, // 'view', 'edit', 'create'
  classification: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'saved', 'deleted'])

const classificationsStore = useClassificationsStore()
const deleteClassificationModal = ref()
const successClassificationModal = ref()

const uiIcons = ref()
const visible = ref(Boolean(props.modelValue))
const isEditing = ref(props.mode === 'create')
const saving = ref(false)
const serverError = ref(null)

const nameInput = ref(null)
const descriptionInput = ref(null)
const organizationComboRefs = ref([])

// Форма классификации
const localClassification = reactive({
  id: null,
  name: '',
  description: '',
  organizations: [], // Основной массив для сохранения
  organizationsCombobox: [] // Массив для отображения в комбобоксах
})

// Клон для отслеживания изменений
const formClone = {
  id: null,
  name: '',
  description: '',
  organizations: []
}

const organizationsTouched = ref(false)
const organizationsError = ref('')
let searchTimer = null

// Функция для сохранения рефов комбобоксов
const setOrganizationComboRef = (el, index) => {
  if (el) {
    organizationComboRefs.value[index] = el
  }
}

// Получение ID организации
function getOrganizationId(org) {
  if (!org) return null
  if (typeof org === 'number' || typeof org === 'string') return Number(org)
  return Number(org.id ?? org.organization_id ?? org.value ?? null)
}

// Получение названия организации
function getOrganizationLabel(org) {
  if (!org) return ''
  if (typeof org === 'string' || typeof org === 'number') return String(org)
  return org.name || org.organization_name || org.title || org.label || `#${getOrganizationId(org) || ''}`
}

// Получение инициалов организации
function getOrganizationInitials(org) {
  const name = getOrganizationLabel(org)
  if (!name) return '?'
  const words = name.split(' ')
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

// Получение цвета аватарки
function getOrganizationAvatarStyle(org) {
  const name = getOrganizationLabel(org)
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return {
    backgroundColor: `hsl(${hue}, 70%, 55%)`
  }
}

// Получение списка ID уже добавленных организаций
const getSelectedOrganizationIds = (currentIndex = null) => {
  return localClassification.organizations
    .filter((org, idx) => org && org.id && idx !== currentIndex)
    .map(org => org.id)
}

const loadOrganizationsOptions = async (searchStr, url = null, currentIndex = null) => {
  try {
    const selectedIds = getSelectedOrganizationIds(currentIndex)
    const response = await classificationsStore.loadClientOrganizations(searchStr)
    
    let organizations = []
    if (response && Array.isArray(response.data?.data)) {
      organizations = response.data.data
    } else if (response && Array.isArray(response.data)) {
      organizations = response.data
    } else if (response && Array.isArray(response)) {
      organizations = response
    }
    
    const filteredOrganizations = organizations.filter(
      org => !selectedIds.includes(getOrganizationId(org))
    )
    
    return {
      data: filteredOrganizations,
      current_page: 1,
      last_page: 1,
      next_page_url: null,
      prev_page_url: null
    }
  } catch (error) {
    console.error('Ошибка загрузки организаций:', error)
    return {
      data: [],
      current_page: 1,
      last_page: 1,
      next_page_url: null,
      prev_page_url: null
    }
  }
}

// Обработчик изменения организации
const onOrganizationChange = (index, value) => {
  if (value && getOrganizationId(value)) {
    const orgId = getOrganizationId(value)
    const orgName = getOrganizationLabel(value)
    
    // Обновляем оба массива
    localClassification.organizations[index] = { id: orgId, name: orgName }
    localClassification.organizationsCombobox[index] = { id: orgId, name: orgName }
    organizationsError.value = ''
    organizationsTouched.value = true
  } else if (!value) {
    // Если значение удалено, удаляем оба элемента
    localClassification.organizations.splice(index, 1)
    localClassification.organizationsCombobox.splice(index, 1)
    organizationComboRefs.value.splice(index, 1)
    organizationsError.value = ''
  }
  validateOrganizations(true)
}

// Проверка на дубликаты организаций
const checkDuplicateOrganizations = () => {
  const orgIds = localClassification.organizations
    .filter(org => org && org.id)
    .map(org => org.id)
  
  const uniqueIds = new Set(orgIds)
  if (orgIds.length !== uniqueIds.size) {
    organizationsError.value = 'Нельзя добавить одну организацию несколько раз'
    return false
  }
  organizationsError.value = ''
  return true
}

// Добавление организации
const addOrganization = () => {
  const hasEmptyRow = localClassification.organizationsCombobox.some(org => !org || !org.id)
  if (hasEmptyRow) {
    organizationsError.value = 'Сначала заполните или удалите пустую строку'
    return
  }
  
  // Добавляем в оба массива
  localClassification.organizations.push({ id: null, name: '' })
  localClassification.organizationsCombobox.push({ id: null, name: '' })
  
  organizationsError.value = ''
  nextTick(() => {
    const lastIndex = localClassification.organizationsCombobox.length - 1
    if (organizationComboRefs.value[lastIndex]) {
      organizationComboRefs.value[lastIndex].focus()
    }
  })
}

// Удаление организации
const removeOrganization = (index) => {
  localClassification.organizations.splice(index, 1)
  localClassification.organizationsCombobox.splice(index, 1)
  organizationComboRefs.value.splice(index, 1)
  organizationsError.value = ''
  validateOrganizations(true)
}

watch(() => props.modelValue, (v) => {
  visible.value = v
  if (v) openAndLoad()
  else resetState()
})

watch(visible, (v) => emit('update:modelValue', v))

const modalTitle = computed(() => {
  if (props.mode === 'create') return 'Создание классификации'
  if (isEditing.value) return 'Редактирование классификации'
  return 'Профиль классификации'
})

const canEdit = computed(() => {
  return props.mode === 'create' || props.mode === 'edit'
})

const canDelete = computed(() => {
  return getUserRole() === 'admin'
})

function resetForm() {
  localClassification.id = null
  localClassification.name = ''
  localClassification.description = ''
  localClassification.organizations = []
  localClassification.organizationsCombobox = []
  organizationComboRefs.value = []
  organizationsError.value = ''
  organizationsTouched.value = false
  serverError.value = null
}

function fillForm(src) {
  if (!src) {
    resetForm()
    return
  }
  
  localClassification.id = src.id ?? src.classification_id ?? null
  localClassification.name = src.name || ''
  localClassification.description = src.description || ''
  
  // Основной массив organizations - полные данные
  const organizationsSource = src.organizations || src.client_organizations || src.organization_list || []
  localClassification.organizations = organizationsSource.map(org => ({
    id: getOrganizationId(org),
    name: getOrganizationLabel(org)
  })).filter(org => org.id !== null)
  
  // Массив для комбобоксов - только id и name для отображения
  localClassification.organizationsCombobox = localClassification.organizations.map(org => ({
    id: org.id,
    name: org.name
  }))
  
  cloneForm()
}

function cloneForm() {
  formClone.id = localClassification.id
  formClone.name = localClassification.name
  formClone.description = localClassification.description
  formClone.organizations = [...localClassification.organizations]
}

function openAndLoad() {
  serverError.value = null
  saving.value = false
  organizationsError.value = ''

  if (!props.classification || props.mode === 'create') {
    resetForm()
    isEditing.value = props.mode === 'create'
    nextTick(() => nameInput.value?.focus?.())
    return
  }

  fillForm(props.classification)
  isEditing.value = false
  nextTick(() => nameInput.value?.focus?.())
}

function resetState() {
  isEditing.value = props.mode === 'create'
  saving.value = false
  serverError.value = null
  organizationsError.value = ''
  resetForm()
  clearErrors()
}

function clearErrors() {
  serverError.value = null
  organizationsError.value = ''
  organizationsTouched.value = false
  if (nameInput.value && typeof nameInput.value.clearError === 'function') {
    nameInput.value.clearError()
  }
  if (descriptionInput.value && typeof descriptionInput.value.clearError === 'function') {
    descriptionInput.value.clearError()
  }
}

function enterEdit() {
  if (!canEdit.value) return
  isEditing.value = true
  nextTick(() => clearErrors())
}

function cancelEdit() {
  isEditing.value = false
  if (props.mode === 'create') {
    close()
  } else {
    fillForm(props.classification)
  }
}

function close() {
  visible.value = false
}

function validateOrganizations(markTouched = false) {
  if (markTouched) organizationsTouched.value = true

  if (!Array.isArray(localClassification.organizations) || localClassification.organizations.length === 0) {
    organizationsError.value = 'Выберите хотя бы одну организацию клиента'
    return false
  }

  const validOrgs = localClassification.organizations.filter(org => org && org.id !== null)
  if (validOrgs.length === 0) {
    organizationsError.value = 'Выберите хотя бы одну организацию клиента'
    return false
  }

  organizationsError.value = ''
  return true
}

function validateForm() {
  let isValid = true

  if (!localClassification.name || !localClassification.name.trim()) {
    if (nameInput.value && typeof nameInput.value.setError === 'function') {
      nameInput.value.setError('Название обязательно')
    }
    isValid = false
  } else {
    if (nameInput.value && typeof nameInput.value.clearError === 'function') {
      nameInput.value.clearError()
    }
  }

  if (!validateOrganizations(true)) {
    isValid = false
  }

  serverError.value = null
  return isValid
}

function hasChanges() {
  if (formClone.id !== localClassification.id) return true
  if (formClone.name !== localClassification.name) return true
  if (formClone.description !== localClassification.description) return true

  const localIds = localClassification.organizations.map(o => o.id).sort()
  let result = true
  localClassification.organizations.forEach(org => {
    if(org.id === null){
      result = false
    }
  })
  if(!result){
    return false
  }
  const cloneIds = formClone.organizations.map(o => o.id).sort()
  
  if (JSON.stringify(cloneIds) !== JSON.stringify(localIds)) return true
  
  return false
}

function buildPayload(includeId = false) {
  const organizationsIds = localClassification.organizations
    .filter(org => org && org.id)
    .map(org => org.id)
  
  const payload = {
    name: (localClassification.name ?? '').trim(),
    description: (localClassification.description ?? '').trim(),
    organizations: organizationsIds
  }

  if (includeId && localClassification.id) {
    payload.classification_id = localClassification.id
  }

  return payload
}

function applyServerErrors(fieldErrors) {
  const getFirst = (key) => {
    const value = fieldErrors?.[key]
    if (Array.isArray(value)) return value[0]
    if (typeof value === 'string') return value
    return ''
  }

  const nameError = getFirst('name')
  if (nameError && nameInput.value && typeof nameInput.value.setError === 'function') {
    nameInput.value.setError(nameError)
  }

  const descriptionError = getFirst('description')
  if (descriptionError && descriptionInput.value && typeof descriptionInput.value.setError === 'function') {
    descriptionInput.value.setError(descriptionError)
  }

  const orgsError = getFirst('organizations')
  if (orgsError) {
    organizationsTouched.value = true
    organizationsError.value = orgsError
  }
}

const onSave = async () => {
  if (saving.value) return
  
  if (!validateForm()) {
    return
  }
  
  if (!checkDuplicateOrganizations()) {
    return
  }
  
  if (props.mode !== "create" && !hasChanges()) {
    close()
    return
  }
  
  saving.value = true
  serverError.value = null
  organizationsError.value = ''
  
  try {
    const payload = buildPayload(props.mode === 'edit')
    let response
    
    if (props.mode === 'create') {
      response = await classificationsStore.createClassification(payload)
      
      if (!response.validator_fails && !response.errors) {
        const confirmed = await successClassificationModal.value.open({
          title: '',
          mainMessage: 'Классификация успешно создана',
          type: 'success',
        })
        if (confirmed) {
          emit('saved', response)
          close()
        }
      } else {
        await successClassificationModal.value.open({
          title: '',
          mainMessage: 'Ошибка при создании классификации',
          type: 'notSuccess',
        })
        handleServerErrors(response)
      }
    } else {
      response = await classificationsStore.updateClassification(payload)
      
      if (!response.validator_fails && !response.errors) {
        const confirmed = await successClassificationModal.value.open({
          title: '',
          mainMessage: 'Классификация успешно обновлена',
          type: 'success',
        })
        if (confirmed) {
          isEditing.value = false
          emit('saved', response)
          close()
        }
      } else {
        await successClassificationModal.value.open({
          title: '',
          mainMessage: 'Ошибка при обновлении классификации',
          type: 'notSuccess',
        })
        handleServerErrors(response)
      }
    }
  } catch (err) {
    console.error('Classification save error:', err)
    serverError.value = err?.response?.data?.message || err?.message || 'Ошибка сохранения'
    
    await successClassificationModal.value.open({
      title: '',
      mainMessage: serverError.value,
      type: 'notSuccess',
    })
  } finally {
    saving.value = false
  }
}

function handleServerErrors(response) {
  const errors = response.errors || response.validator_fails || {}
  
  if (errors.name && nameInput.value) {
    nameInput.value.setError?.(errors.name[0])
  }
  
  if (errors.description && descriptionInput.value) {
    descriptionInput.value.setError?.(errors.description[0])
  }
  
  if (errors.organizations) {
    organizationsError.value = Array.isArray(errors.organizations) ? errors.organizations[0] : errors.organizations
  }
  
  if (Object.keys(errors).length > 0 && !organizationsError.value) {
    serverError.value = Object.values(errors).flat()[0]
  }
}

const deleteClassification = async () => {
  let confirmed
  
  if (localClassification.name) {
    confirmed = await deleteClassificationModal.value.open({
      title: 'Удаление классификации',
      mainMessage: 'Вы действительно хотите удалить классификацию ',
      secondaryMessage: localClassification.name + '?'
    })
  } else {
    confirmed = await deleteClassificationModal.value.open({
      title: 'Удаление классификации',
      mainMessage: 'Вы действительно хотите удалить классификацию?',
      secondaryMessage: ''
    })
  }
  
  if (confirmed) {
    saving.value = true
    
    try {
      const payload = { classification_ids: [localClassification.id] }
      const response = await classificationsStore.deleteClassifications(payload)
      
      if (response.validator_fails || response.errors) {
        await successClassificationModal.value.open({
          title: '',
          mainMessage: 'Ошибка при удалении классификации',
          type: 'notSuccess',
        })
      } else {
        const confirmed2 = await successClassificationModal.value.open({
          title: '',
          mainMessage: 'Классификация успешно удалена',
          type: 'success',
        })
        if (confirmed2) {
          emit('deleted', localClassification.id)
          close()
        }
      }
    } catch (err) {
      console.error('Ошибка удаления:', err)
      await successClassificationModal.value.open({
        title: '',
        mainMessage: 'Ошибка при удалении классификации',
        type: 'notSuccess',
      })
    } finally {
      saving.value = false
    }
  }
}

const isFormValid = computed(() => {
  let result = true
  localClassification.organizations.forEach(org => {
    if(org.id === null){
      result = false
    }
  })
  if(!result){
    return false
  }
  return localClassification.name && localClassification.name.trim().length > 0 &&
         localClassification.organizations && localClassification.organizations.length > 0 &&
         localClassification.organizations.some(org => org && org.id)
})

const hasFormChanges = computed(() => {
  console.log('hasChanges: ', hasChanges())
  return hasChanges()
})

const hasAnyInput = computed(() => {
  return localClassification.name?.trim() || localClassification.description?.trim() || localClassification.organizationsCombobox.length > 0
})
</script>

<style scoped>
.classification-modal-backdrop {
  position: fixed; 
  inset: 0; 
  z-index: 2200; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  background: rgba(0,0,0,0.45);
}

.classification-modal {
  width: 50%; 
  max-width: 850px;
  max-height: 88vh;
  overflow-y: auto;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 30px 80px rgba(3,20,50,0.35);
  display: flex;
  flex-direction: column;
}

.modal-header {
  background: #ffffff;
  position: sticky;
  top: 0;
  z-index: 15;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 20px;
  border-bottom: 2px solid #969696;
  border-radius: 12px 12px 0 0;
}

.modal-title {
  font-size: 18px;
  margin: 0;
  color: #0b1630;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.save-btn {
  background: #3cc93a;
  color: white;
  border: none;
  padding: 4px 12px;
  border-radius: 16px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.save-btn:hover:not(:disabled) {
  background: #34bb32;
  transform: scale(1.03);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  color: rgb(46, 46, 46);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  margin-left: 6px;
}

.close-btn:hover {
  transform: scale(1.1);
}

.close-btn-icon:hover {
  color: rgb(255, 19, 19);
}

.classification-modal__body {
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.classification-grid {
  display: grid;
  grid-template-columns: 1fr;
  align-items: start;
}

.classification-main {
  min-width: 0;
}

.classification-section {
  border: 1px solid rgb(218, 218, 218);
  border-radius: 6px;
  background-color: #f7f7f7;
  margin-bottom: 10px;
  padding-left: 8px;
  padding-right: 8px;
  padding-top: 8px;
}

.two-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 6px;
}

.subheading {
  margin: 2px 0 6px;
  font-size: 14px;
  color: #374151;
}

.server-error {
  color: #b00020;
  margin: 8px 0;
  font-weight: 600;
}

.classification-modal__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0 4px;
  gap: 8px;
}

.right-actions {
  margin-top: 10px;
  display: flex;
  gap: 16px;
  align-items: center;
}

.btn { 
  padding: 4px 10px; 
  border-radius: 6px; 
  cursor: pointer; 
  border: 1px solid rgba(0,0,0,0.08);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn:hover {
  transform: scale(1.03);
}

.btn.primary { 
  background: #178aee; 
  color: #fff; 
  border: none; 
}

.btn.danger { 
  background: #ef4444; 
  color: #fff; 
  border: none; 
}

.save-btn-active {
  background: #3cc93a;
  opacity: 1;
  cursor: pointer;
}

.save-btn-active:hover:not(:disabled) {
  background: #34bb32;
  transform: scale(1.03);
}

.save-btn:disabled {
  background: #cccccc;
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.form-row {
  display: flex;
  flex-direction: column;
}

/* Стили для таблицы организаций (режим редактирования) */
.organizations-table {
  border: 1px solid #c5c5c5;
  border-radius: 6px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #a3a3a3;
  max-height: 50%;
  background: white;
  margin-bottom: 8px;
}

.organizations-row {
  display: grid;
  grid-template-columns: 9fr 1fr;
  align-items: center;
  min-height: 36px;
  border-bottom: 1px solid #e0e0e0;
}

.organizations-row.header-row {
  background-color: #f8f9fa;
  font-weight: 500;
  border-bottom: 1px solid #c5c5c5;
}

.organizations-row:last-child {
  border-bottom: none;
}

.organization-col {
  padding: 4px 8px;
}

.name-col {
  padding-right: 8px;
}

.actions-col {
  display: flex;
  justify-content: center;
  align-items: center;
}

.add-row {
  background-color: #ffffff;
}

.add-button-col {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  padding: 4px;
}

.add-organization-btn {
  background: none;
  border: 1px dashed #178aee;
  color: #178aee;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.add-organization-btn:hover {
  border-color: #2478d1;
  background-color: #e2f0ff;
  color: #2478d1;
}

.remove-organization-btn {
  background: none;
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

.remove-organization-btn:hover {
  background-color: rgba(220, 53, 69, 0.1);
  transform: scale(1.1);
}

/* Стили для режима просмотра */
.organizations-table-view {
  border: 1px solid #e0e0e0;
  max-height: 50%;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #a3a3a3;
  border-radius: 6px;
  background: white;
  padding: 8px;
  margin-bottom: 8px;
}

.organizations-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.organization-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 2px 4px;
  border-radius: 8px;
  transition: all 0.2s ease;
  background-color: #f6f6f6;
  border: 1px solid transparent;
}

.organization-item:hover {
  background-color: #e3f2fd;
}

.organization-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  color: white;
  font-size: 14px;
  flex-shrink: 0;
  text-transform: uppercase;
}

.organization-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.organization-name {
  font-weight: 500;
  color: #212121;
  font-size: 14px;
}

.name-col :deep(.ui-combobox-wrapper) {
  position: relative;
  overflow: visible;
}

.name-col :deep(.combobox-dropdown) {
  z-index: 1000 !important;
}

.no-organizations {
  padding: 12px;
  text-align: center;
  color: #999;
  font-style: italic;
}

.field-error {
  color: #b00020;
  font-size: 12px;
  margin-top: 4px;
}

.left-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

@media (max-width: 1200px) {
  .classification-grid {
    grid-template-columns: 1fr;
  }
  .classification-modal {
    width: calc(100% - 24px);
  }
}
</style>