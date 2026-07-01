<template>
  <div class="status-editor" :class="{ 'view-mode': readonly }">
    <div class="org-grid">
      <div class="diagram-column">
        <div class="diagram-container">
          <VueFlow
            :nodes="nodes"
            :edges="edges"
            :node-types="nodeTypes"
            :default-zoom="2.5"
            :min-zoom="0.4"
            :max-zoom="3.7"
            :nodes-draggable="!readonly"
            :nodes-connectable="!readonly"
            :elements-selectable="!readonly"
            @connect="onConnect"
            @nodes-change="onNodesChange"
            @edges-change="onEdgesChange"
            @node-click="onNodeClick"
            @edge-click="onEdgeClick"
            @pane-click="onPaneClick"
            class="flow-diagram"
          >
            <Background pattern-color="#aaa" :gap="16" />
            <Controls />
          </VueFlow>
        </div>
      </div>

      <div class="details-column">
        <div class="editor-header">
          <h3>Редактор статусов</h3>
          <div class="header-buttons">
            <button class="info-btn" @click="showInfo" title="Подсказка" v-if="!readonly">
              <Icon :icon="uiIcons?.icons.info" class="info-btn-icon" width="24" height="24" />
            </button>
            <button v-if="!readonly && statusErrors.length" class="error-btn" @click="showErrors" title="Ошибки валидации">
              <Icon :icon="uiIcons?.icons.warning" width="20" height="20" />
              <span class="error-count">{{ statusErrors.length }}</span>
            </button>
          </div>
        </div>
        
        <div class="status-list-editor">
          <div 
            v-for="status in statuses" 
            :key="status.id"
            class="status-item-editor"
            :class="{ 'is-constant': isConstantStatus(status.id) }"
          >
            <div class="status-header">
              <div class="status-color" :style="{ backgroundColor: status.color }"></div>
              <!-- Режим редактирования -->
              <template v-if="!readonly">
                <UIInput
                  v-model="status.name"
                  :disabled="isNameLocked(status.id)"
                  placeholder="Название статуса"
                  :maxLength="30"
                  @update:model-value="onStatusNameChange(status, $event)"
                />
                <button 
                  v-if="!isConstantStatus(status.id)"
                  class="remove-status-btn" 
                  @click="removeStatus(status.id)"
                  title="Удалить статус"
                >
                  <Icon :icon="uiIcons?.icons.delete" width="20" height="20" />
                </button>
              </template>
              <!-- Режим просмотра -->
              <template v-else>
                <div class="status-name">{{ status.name }}</div>
              </template>
            </div>
            
            <div class="status-transitions-editor">
              <!-- Режим редактирования -->
              <template v-if="!readonly">
                <div class="transitions-group">
                  <UIComboBox
                    v-model="status.nextStatuses"
                    :options="getAvailableNextStatuses(status)"
                    option-label="name"
                    option-value="id"
                    :multiple="true"
                    :single-replace="isSingleReplace(status)"
                    :return-object="true"
                    placeholder="Выберите следующие статусы"
                    @update:model-value="updateNextStatuses(status, $event)"
                  />
                </div>
                <div class="transitions-group">
                  <UIComboBox
                    v-model="status.responsibles"
                    :options="usersList"
                    option-label="name"
                    option-value="id"
                    :multiple="true"
                    :return-object="true"
                    placeholder="Выберите ответственных"
                    :search-debounce="500"
                    :load-options="loadUsersOptions"
                    @update:model-value="updateResponsibles(status, $event)"
                  />
                </div>
              </template>
              <template v-else>
                  <div v-if="status.responsibles && status.responsibles.length" class="status-responsibles">
                    <span class="responsibles-label">Ответственные:</span>
                    <div class="responsibles-list">
                      <span 
                        v-for="user in status.responsibles" 
                        :key="user.id"
                        class="responsible-chip"
                      >
                      {{ getUserDisplayName(user) }}
                      </span>
                    </div>
                </div>
              </template>
            </div>
          </div>
          
          <button v-if="!readonly" class="add-status-btn" @click="addNewStatus">
            <Icon :icon="uiIcons?.icons.add" width="18" height="18" />
            Добавить статус
          </button>
        </div>
      </div>
    </div>
    <UIIcons ref="uiIcons" />

    <InfoNotification ref="infoNotification" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { VueFlow, MarkerType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useUsersStore } from '@/stores/users.store'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import UIInput from '@/components/common/UI/UIInput.vue'
import UIComboBox from '@/components/common/UI/UIComboBox.vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'
import InfoNotification from '@/components/notifications/InfoNotification.vue'
import DefaultNode from '@/components/modal/nodes/DefaultNode.vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  readonly: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'validity-change'])

// REF
const uiIcons = ref()
const infoNotification = ref()

// Константные статусы по умолчанию
const DEFAULT_STATUSES = [
  { id: 1, name: 'Создана', color: '#3971cb', type: 1, responsibles: [] },
  { id: 2, name: 'Закрыта', color: '#54cd41', type: 2, responsibles: [] }
]

const usersStore = useUsersStore()
const statuses = ref([])
const nextId = ref(3)
const isFirstLoad = ref(true)
const nodes = ref([])
const edges = ref([])
const selectedNodeId = ref(null)
const selectedEdgeId = ref(null)
const usersList = ref([])
const usersLoading = ref(false)
const usersSearchQuery = ref('')
const usersPagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 20,
  total: 0
})

// METHODS
const nodeTypes = {
  default: DefaultNode,
}

function generateId() {
  return nextId.value++
}

// Нормализация данных из API
function normalizeStatusesFromApi(apiStatuses) {
  if (!apiStatuses || !apiStatuses.length) {
    return JSON.parse(JSON.stringify(DEFAULT_STATUSES))
  }

  console.log('🔄 normalizeStatusesFromApi входные данные:', apiStatuses)
  
  // Создаем карту статусов для удобства
  const statusMap = new Map()
  const normalized = []
  
  // Сначала добавляем все статусы
  apiStatuses.forEach(status => {
    const normalizedStatus = {
      id: typeof status.id === 'string' ? parseInt(status.id) : status.id,
      name: status.name,
      color: status.color,
      type: status.type || 0,
      responsibles: status.responsibles || [],
      previousStatuses: [],  // будут хранить объекты из inheritance
      nextStatuses: [],      // будут хранить объекты из inheritance
      position: status.position || null
    }
    normalized.push(normalizedStatus)
    statusMap.set(normalizedStatus.id, normalizedStatus)
  })
  
  // Заполняем связи из inheritance
  apiStatuses.forEach(status => {
    const currentId = typeof status.id === 'string' ? parseInt(status.id) : status.id
    const currentStatus = statusMap.get(currentId)
    
    if (status.inheritance && Array.isArray(status.inheritance)) {
      status.inheritance.forEach(child => {
        // Сохраняем полный объект статуса из inheritance (уже содержит id, name, color)
        const childObject = {
          id: typeof child.id === 'string' ? parseInt(child.id) : child.id,
          name: child.name,
          color: child.color,
          type: child.type || 0
        }
        
        if (!currentStatus.nextStatuses.some(s => s.id === childObject.id)) {
          currentStatus.nextStatuses.push(childObject)
        }
        
        // Добавляем обратную связь
        const currentObject = {
          id: currentStatus.id,
          name: currentStatus.name,
          color: currentStatus.color,
          type: currentStatus.type
        }
        
        const childStatus = statusMap.get(childObject.id)
        if (childStatus && !childStatus.previousStatuses.some(s => s.id === currentId)) {
          childStatus.previousStatuses.push(currentObject)
        }
      })
    }
  })
  
  return normalized
}

function initializeStatuses() {
  if (props.modelValue && props.modelValue.length) {
    statuses.value = normalizeStatusesFromApi(props.modelValue)
    const maxId = Math.max(...statuses.value.map(s => s.id), 2)
    nextId.value = maxId + 1
    
    // Устанавливаем позиции ТОЛЬКО при первой загрузке
    if (isFirstLoad.value) {
      const total = statuses.value.length
      statuses.value.forEach((status, index) => {
        if (!status.position) {
          status.position = getDefaultPosition(index, total, false)
        }
      })
      isFirstLoad.value = false
    }
  } else {
    statuses.value = JSON.parse(JSON.stringify(DEFAULT_STATUSES))
    statuses.value.forEach((status, index) => {
      status.previousStatuses = []
      status.nextStatuses = []
      if (isFirstLoad.value) {
        status.position = getDefaultPosition(index, statuses.value.length, false)
      }
      status.responsibles = []
    })
    if (isFirstLoad.value) {
      isFirstLoad.value = false
    }
    nextId.value = 3
  }
  
  updateDiagram()
}

function updateDiagram() {
  const newNodes = []
  const newEdges = []
  const addedEdges = new Set()
  const totalStatuses = statuses.value.length
  
  statuses.value.forEach((status, index) => {
    const isSelected = selectedNodeId.value === status.id
    let showTarget = true
    let showSource = true
    let widthC = 200
    
    if (status.name === 'Создана') {
      showTarget = false
      widthC = 160
    }
    
    const nodeStyle = {
      backgroundColor: status.color || '#4a90e2',
      color: status.color === '#FFFFFF' ? '#333' : '#fff',
      border: `2px solid ${isSelected ? '#f39c12' : (status.color === '#FFFFFF' ? '#ccc' : (status.color || '#4a90e2'))}`,
      borderRadius: '6px',
      textAlign: 'center',
      alignItems: 'center',
      fontSize: '16px',
      fontWeight: '500',
      boxShadow: isSelected ? '0 0 0 3px rgba(243, 156, 18, 0.3)' : 'none',
    }
    
    const position = status.position
    
    newNodes.push({
      id: String(status.id),
      position: position,
      width: widthC,
      style: nodeStyle,
      data: {
        ...status,
        label: status.name,
        color: status.color,
        showTargetHandle: showTarget,
        showSourceHandle: showSource
      },
    })
  })
  
  statuses.value.forEach(status => {
    console.log('Связи: ', status.nextStatuses)
    if (status.nextStatuses && Array.isArray(status.nextStatuses)) {
      status.nextStatuses.forEach(nextStatus => {
        // nextStatus - это объект { id, name, color, type }
        const edgeKey = `${status.id}-${nextStatus.id}`
        if (!addedEdges.has(edgeKey)) {
          addedEdges.add(edgeKey)
          const isSelected = selectedEdgeId.value === edgeKey
          
          newEdges.push({
            id: edgeKey,
            source: String(status.id),
            target: String(nextStatus.id),
            type: 'smoothstep',
            animated: false,
            markerEnd: {
              type: MarkerType.Arrow,
              width: 12,
              height: 12,
              color: status.color === '#FFFFFF' ? '#ccc' : status.color,
            },
            style: { 
              stroke: status.color === '#FFFFFF' ? '#ccc' : status.color, 
              strokeWidth: isSelected ? 4 : 3,
            },
            label: '',
          })
        }
      })
    }
  })
  
  nodes.value = newNodes
  edges.value = newEdges
  
  if (!props.readonly) {
    validate()
  }
}

function getDefaultPosition(statusIndex, totalStatuses, isNew) {
  const startX = 50
  const startY = 50
  const stepX = 300
  const stepY = 180
  const currentStatus = statuses.value[statusIndex]
  console.log("Statuses: ", statuses.value)
  
  if (currentStatus.name === 'Создана') {
    return { x: startX, y: startY }
  }
  
  if (currentStatus.name === 'Закрыта') {
      return { 
        x: startX + stepX * (totalStatuses - 1), 
        y: startY + stepY * (totalStatuses - 1) 
      }
  }

  if(isNew){
    return { 
      x: stepX * (statusIndex-1),
      y: startY * (statusIndex-1)
    }
  }
  
  if(statuses.value[totalStatuses-1]?.name === "Закрыта"){
    return { 
      x: startX + stepX * statusIndex, 
      y: startY + stepY * statusIndex 
    }
  }
  else{
    return { 
      x: startX + stepX * (statusIndex-1), 
      y: startY + stepY * (statusIndex-1) 
    }
  }
}

const statusErrors = ref([])

function validate() {
  if (props.readonly) {
    statusErrors.value = []
    emit('validity-change', true)
    return true
  }
  
  const errors = []
  
  const names = statuses.value.map(s => s.name?.trim().toLowerCase()).filter(Boolean)
  if (names.length !== new Set(names).size) {
    errors.push('Названия статусов должны быть уникальными')
  }
  
  if (statuses.value.some(s => !s.name || !s.name.trim())) {
    errors.push('Все статусы должны иметь названия')
  }
  
  for (const status of statuses.value) {
    const hasPrevious = status.previousStatuses && status.previousStatuses.length > 0
    const hasNext = status.nextStatuses && status.nextStatuses.length > 0
    
    if (status.name === 'Создана') {
      if (!hasNext) errors.push(`У статуса "${status.name}" должна быть хотя бы одна исходящая связь`)
    } else if (status.name === 'Закрыта') {
      if (!hasPrevious) errors.push(`У статуса "${status.name}" должна быть хотя бы одна входящая связь`)
    } else {
      if (!hasPrevious || !hasNext) {
        errors.push(`Статус "${status.name}" должен иметь и входящие, и исходящие связи`)
      }
    }
  }
  
  for (const status of statuses.value) {
    if (status.name !== 'Закрыта' && (!status.nextStatuses || status.nextStatuses.length === 0)) {
      errors.push(`Только статус "Закрыта" может быть конечным. Статус "${status.name}" не имеет исходящих связей`)
      break
    }
  }
  
  statusErrors.value = errors
  const isValid = errors.length === 0
  emit('validity-change', isValid)
  return isValid
}

function showErrors() {
  if (statusErrors.value.length === 0) return
  
  infoNotification.value.open({
    title: 'Ошибки валидации статусов',
    content: `
      <div class="error-list">
        ${statusErrors.value.map(error => `<div class="error-item-modal">⚠️ ${error}</div>`).join('')}
      </div>
    `,
    type: 'error',
    width: '500px'
  })
}

function showInfo() {
  infoNotification.value.open({
    title: 'Редактор статусов бизнес-процесса',
    content: `
      <div class="info-content">
        <h4>Что такое бизнес процесс?</h4>
        <p>Бизнес процесс - это последовательность статусов, через которые проходит заявка от создания до закрытия.</p>
        
        <h4>Правила создания:</h4>
        <ul>
          <li><strong>Создана</strong> - начальный статус, максимальное число исходящих связей - 1</li>
          <li><strong>Закрыта</strong> - конечный статус</li>
          <li>Каждый промежуточный статус должен иметь <strong>как входящие, так и исходящие связи</strong></li>
          <li>У статуса <strong>"Создана"</strong> должна быть хотя бы одна исходящая связь</li>
          <li>У статуса <strong>"Закрыта"</strong> должна быть хотя бы одна входящая связь</li>
          <li><strong>Только "Закрыта"</strong> может быть конечным статусом</li>
          <li><strong>Для возврата</strong> заявки в работу нужно указать переход с "Закрыта" на промежуточный статус</li>
          <li>Названия статусов должны быть <strong>уникальными</strong></li>
          <li>Все статусы должны иметь названия</li>
        </ul>
        
        <h4>Как редактировать:</h4>
        <ul>
          <li>📝 <strong>Кликните на статус</strong> на диаграмме, чтобы выделить его</li>
          <li>🔗 <strong>Перетащите</strong> из правого кружка одного статуса в левый кружок другого, чтобы создать связь</li>
          <li>❌ <strong>Кликните на связь</strong> и нажмите Backspace, чтобы удалить</li>
          <li>✏️ <strong>Изменить название</strong> можно в панели справа</li>
          <li>🎨 <strong>Цвет</strong> генерируется автоматически из названия</li>
          <li>🗑️ <strong>Удалить статус</strong> можно кнопкой корзины</li>
          <li>📦 <strong>Переместить статус</strong> можно перетаскивая его на диаграмме</li>
        </ul>
        
        <div class="warning-box">
          ⚠️ <strong>Важно:</strong> Без правильно настроенных связей бизнес процесс не сможет работать!
        </div>
      </div>
    `,
    type: 'info',
    width: '550px'
  })
}

function getUserDisplayName(user) {
  if (!user) return ''
  if (user.first_name && user.last_name) {
    return `${user.last_name} ${user.first_name} ${user.middle_name || ''}`.trim()
  }
  return user.name || user.login || user.email || `Пользователь ${user.id}`
}

function onStatusNameChange(status, newValue) {
  if (props.readonly) return
  
  const trimmedName = newValue?.trim()
  if (!trimmedName) return
  
  const duplicate = statuses.value.find(s => s.id !== status.id && s.name?.trim().toLowerCase() === trimmedName.toLowerCase())
  if (duplicate) {
    status.name = `${trimmedName} 1`
  } else {
    status.name = trimmedName
  }
  
  updateNodeLabelAndColor(status)
  validate()
  emitUpdate()
}

const isSingleReplace = (status) => {
  // Для статуса "Создана" - только одиночный выбор
  if (status.name === 'Создана') {
    return true
  }
  // Для всех остальных - множественный
  return false
}

function updateNextStatuses(status, selectedObjects) {
  if (props.readonly) return
  
  // selectedObjects - массив объектов из UIComboBox (содержат id, name)
  const newNextStatuses = selectedObjects || []
  
  // Удаляем связи, которых больше нет
  const removedStatuses = status.nextStatuses?.filter(current => 
    !newNextStatuses.some(newStatus => newStatus.id === current.id)
  ) || []
  
  removedStatuses.forEach(removed => {
    const removedStatus = statuses.value.find(s => s.id === removed.id)
    if (removedStatus?.previousStatuses) {
      const index = removedStatus.previousStatuses.findIndex(s => s.id === status.id)
      if (index !== -1) {
        removedStatus.previousStatuses.splice(index, 1)
      }
    }
  })
  
  // Добавляем новые связи
  const addedStatuses = newNextStatuses.filter(newStatus => 
    !status.nextStatuses?.some(current => current.id === newStatus.id)
  )
  
  addedStatuses.forEach(added => {
    const addedStatus = statuses.value.find(s => s.id === added.id)
    if (addedStatus) {
      if (!addedStatus.previousStatuses) addedStatus.previousStatuses = []
      const statusObject = {
        id: status.id,
        name: status.name,
        color: status.color,
        type: status.type
      }
      if (!addedStatus.previousStatuses.some(s => s.id === status.id)) {
        addedStatus.previousStatuses.push(statusObject)
      }
    }
  })
  
  // Обновляем связи текущего статуса
  status.nextStatuses = newNextStatuses

  updateDiagram()
  validate()
  emitUpdate()
}

function getAvailableNextStatuses(currentStatus) {
  if (!statuses.value.length) return []
  return statuses.value
    .filter(s => s.id !== currentStatus.id && s.name !== 'Создана')
    .map(s => ({ id: s.id, name: s.name, color: s.color, type: s.type }))
}

function addNewStatus() {
  if (props.readonly) return
  
  const baseName = 'Новый статус'
  let newStatusName = baseName
  let counter = 1
  while (statuses.value.some(s => s.name === newStatusName)) {
    counter++
    newStatusName = `${baseName} ${counter}`
  }
  
  const usedColors = statuses.value.map(s => s.color).filter(c => c)
  const newId = generateId()
  
  // Позиция для нового статуса - правый верхний угол
  const startX = 50
  const startY = 50
  const stepX = 300

  const newPosition = { 
    x: startX + stepX * (statuses.value.length - 1), 
    y: startY 
  }
  
  const newStatus = {
    id: newId,
    name: newStatusName,
    color: getColorFromName(newStatusName, usedColors),
    type: 0,
    position: newPosition,
    previousStatuses: [],
    nextStatuses: [],
    responsibles: []
  }
  
  statuses.value.push(newStatus)
  
  updateDiagram()
  validate()
  emitUpdate()
}

function removeStatus(statusId) {
  if (props.readonly) return
  if (isConstantStatus(statusId)) return
  
  const indexToRemove = statuses.value.findIndex(s => s.id === statusId)
  
  // Удаляем все связи, ведущие к этому статусу и от него
  statuses.value.forEach(status => {
    if (status.previousStatuses) {
      status.previousStatuses = status.previousStatuses.filter(s => s.id !== statusId)
    }
    if (status.nextStatuses) {
      status.nextStatuses = status.nextStatuses.filter(s => s.id !== statusId)
    }
  })
  
  statuses.value.splice(indexToRemove, 1)
  
  updateDiagram()
  validate()
  emitUpdate()
}

function onConnect(connection) {
  if (props.readonly) return
  
  const source = parseInt(connection.source)
  const target = parseInt(connection.target)
  
  const sourceStatus = statuses.value.find(s => s.id === source)
  const targetStatus = statuses.value.find(s => s.id === target)
  
  if (!sourceStatus || !targetStatus) return
  if (targetStatus.name === 'Создана') return
  if (source === target) return

  // Для статуса "Создана" - удаляем старую связь перед добавлением новой
  if (sourceStatus.name === 'Создана' && sourceStatus.nextStatuses?.length > 0) {
    const oldNextId = sourceStatus.nextStatuses[0].id
    const oldNextStatus = statuses.value.find(s => s.id === oldNextId)
    if (oldNextStatus?.previousStatuses) {
      const idx = oldNextStatus.previousStatuses.findIndex(s => s.id === sourceStatus.id)
      if (idx !== -1) {
        oldNextStatus.previousStatuses.splice(idx, 1)
      }
    }
    sourceStatus.nextStatuses = []
  }
  
  // Проверяем существование связи по id объекта
  if (sourceStatus.nextStatuses?.some(s => s.id === target)) return
  
  if (!sourceStatus.nextStatuses) sourceStatus.nextStatuses = []
  if (!targetStatus.previousStatuses) targetStatus.previousStatuses = []
  
  const targetObject = {
    id: targetStatus.id,
    name: targetStatus.name,
    color: targetStatus.color,
    type: targetStatus.type
  }
  const sourceObject = {
    id: sourceStatus.id,
    name: sourceStatus.name,
    color: sourceStatus.color,
    type: sourceStatus.type
  }
  
  if (!sourceStatus.nextStatuses.some(s => s.id === target)) {
    sourceStatus.nextStatuses.push(targetObject)
  }
  if (!targetStatus.previousStatuses.some(s => s.id === source)) {
    targetStatus.previousStatuses.push(sourceObject)
  }
  
  updateDiagram()
  validate()
  emitUpdate()
}

function onEdgesChange(changes) {
  if (props.readonly) return
  
  changes.forEach(change => {
    if (change.type === 'remove') {
      const removedEdge = edges.value.find(e => e.id === change.id)
      if (removedEdge) {
        const sourceId = parseInt(removedEdge.source)
        const targetId = parseInt(removedEdge.target)
        const sourceStatus = statuses.value.find(s => s.id === sourceId)
        const targetStatus = statuses.value.find(s => s.id === targetId)
        
        if (sourceStatus?.nextStatuses) {
          // Ищем по id объекта
          const index = sourceStatus.nextStatuses.findIndex(s => s.id === targetId)
          if (index !== -1) {
            sourceStatus.nextStatuses.splice(index, 1)
          }
        }
        if (targetStatus?.previousStatuses) {
          // Ищем по id объекта
          const index = targetStatus.previousStatuses.findIndex(s => s.id === sourceId)
          if (index !== -1) {
            targetStatus.previousStatuses.splice(index, 1)
          }
        }
        updateDiagram()
        validate()
        emitUpdate()
      }
    }
  })
}


function onNodesChange(changes) {
  if (props.readonly) return
  
  // Обновляем позиции статусов при перемещении узлов
  changes.forEach(change => {
    if (change.type === 'position' && change.id) {
      const statusId = parseInt(change.id)
      const status = statuses.value.find(s => s.id === statusId)
      if (status && change.position) {
        status.position = { x: change.position.x, y: change.position.y }
      }
    }
  })
  
  emitUpdate()
}

function onNodeClick({ id }) {
  if (props.readonly) return
  selectedNodeId.value = parseInt(id)
  selectedEdgeId.value = null
  updateDiagram()
}

function onEdgeClick(edge) {
  if (props.readonly) return
  selectedEdgeId.value = edge.id
  selectedNodeId.value = null
  updateDiagram()
}

function onPaneClick() {
  if (props.readonly) return
  selectedNodeId.value = null
  selectedEdgeId.value = null
  updateDiagram()
}

function updateNodeLabelAndColor(status) {
  const nodeIndex = nodes.value.findIndex(n => parseInt(n.id) === status.id)
  if (nodeIndex !== -1) {
    const otherColors = statuses.value
      .filter(s => s.id !== status.id)
      .map(s => s.color)
      .filter(c => c)
    
    nodes.value[nodeIndex].data.label = status.name
    const newColor = getColorFromName(status.name, otherColors)
    nodes.value[nodeIndex].data.color = newColor
    status.color = newColor
    nodes.value = [...nodes.value]
  }
}

function getColorFromName(name, usedColors = []) {
  if (!name) return '#4a90e2'
  if (name === 'Создана') return '#3971cb'
  if (name === 'Закрыта') return '#54cd41'
  
  const colors = [
    '#1caae2', '#1ec35d', '#938900', '#8d00c5', '#16bd00', '#bd0000',
    '#ce1f79', '#2438cd', '#3c3b67', '#dc3000', '#17b289', '#a6d000',
    '#960943', '#974c07', '#e48c08', '#d2c100', '#4d14b6', '#72cc0b',
  ]
  
  if (usedColors.length === 0 || usedColors.length >= colors.length) {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i)
    }
    return colors[Math.abs(hash) % colors.length]
  }
  
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i)
  }
  
  let colorIndex = Math.abs(hash) % colors.length
  let selectedColor = colors[colorIndex]
  let attempts = 0
  
  while (usedColors.includes(selectedColor) && attempts < colors.length * 2) {
    colorIndex = (colorIndex + 1) % colors.length
    selectedColor = colors[colorIndex]
    attempts++
  }
  
  return selectedColor
}

function isConstantStatus(statusId) {
  const status = statuses.value.find(s => s.id === statusId)
  if (status) {
    return status.name === 'Создана' || status.name === 'Закрыта'
  }
  return statusId === 1 || statusId === 2
}

function isNameLocked(statusId) {
  const status = statuses.value.find(s => s.id === statusId)
  if (status) {
    return status.name === 'Создана' || status.name === 'Закрыта'
  }
  return statusId === 1 || statusId === 2
}

// Функция для получения данных в формате API (для отправки)
function getApiStatuses() {
  return statuses.value.map(status => {
    // Убеждаемся, что nextStatuses - это массив объектов с полем name
    const childrenNames = (status.nextStatuses || [])
      .filter(next => next && next.name) // фильтруем пустые/некорректные
      .map(next => next.name)
    
    console.log(`Статус "${status.name}" имеет nextStatuses:`, status.nextStatuses)
    console.log(`childrenNames для "${status.name}":`, childrenNames)
    
    return {
      name: status.name,
      color: status.color,
      children: childrenNames,
      responsible: (status.responsibles || []).map(r => r.id).filter(Boolean)
    }
  })
}

let isInternalUpdate = false
function emitUpdate() {
  if (props.readonly) return
  
  isInternalUpdate = true
  const dataToSave = statuses.value.map(status => ({
    id: status.id,
    name: status.name,
    color: status.color,
    type: status.type || 0,
    position: status.position || null,
    previousStatuses: (status.previousStatuses || []).map(s => s.id),
    nextStatuses: (status.nextStatuses || []).map(s => s.id),
    is_constant: isConstantStatus(status.id),
    responsibles: status.responsibles || []
  }))
  console.log("Position: ", dataToSave.position)
  emit('update:modelValue', dataToSave)
  
  setTimeout(() => {
    isInternalUpdate = false
  }, 0)
}

function resetForm() {
  if (props.readonly) return
  statuses.value = JSON.parse(JSON.stringify(DEFAULT_STATUSES))
  const total = statuses.value.length
  statuses.value.forEach((status, index) => {
    status.previousStatuses = []
    status.nextStatuses = []
    // При сбросе устанавливаем дефолтные позиции
    status.position = getDefaultPosition(index, total, false)
    status.responsibles = []
  })
  nextId.value = 3
  isFirstLoad.value = true // Сбрасываем флаг при необходимости
  updateDiagram()
  validate()
  emitUpdate()
}

defineExpose({
  validate,
  resetForm,
  getStatuses: () => statuses.value,
  getApiStatuses,
  setStatuses: (data) => {
  if (data && data.length) {
    const oldPositions = new Map()
    statuses.value.forEach(status => {
      if (status.position) {
        oldPositions.set(status.id, status.position)
      }
    })
    
    statuses.value = normalizeStatusesFromApi(data)
    
    // Восстанавливаем позиции
    statuses.value.forEach(status => {
      const oldPosition = oldPositions.get(status.id)
      if (oldPosition) {
        status.position = oldPosition
      }
    })
    
    const maxId = Math.max(...statuses.value.map(s => s.id), 2)
    nextId.value = maxId + 1
    updateDiagram()
    if (!props.readonly) validate()
  }
}
})

onMounted(() => {
  initializeStatuses()
})

watch(() => props.readonly, () => {
  updateDiagram()
})

watch(() => props.modelValue, (newVal) => {
  if (isInternalUpdate) return
  
  if (newVal && newVal.length) {
    const oldPositions = new Map()
    // Сохраняем старые позиции
    statuses.value.forEach(status => {
      if (status.position) {
        oldPositions.set(status.id, status.position)
      }
    })
    
    statuses.value = normalizeStatusesFromApi(newVal)
    
    // Восстанавливаем позиции, если они были
    statuses.value.forEach(status => {
      const oldPosition = oldPositions.get(status.id)
      console.log('Position: ', status.position)
      if (oldPosition) {
        status.position = oldPosition
      } else if (!status.position) {
        const index = statuses.value.findIndex(s => s.id === status.id)
        if (index !== -1) {  // ✅ проверяем, что статус найден
          status.position = getDefaultPosition(index, statuses.value.length, true)
        } else {
          // Фолбэк на дефолтную позицию
          status.position = { x: 100, y: 100 }
        }
      }
    })
    
    const maxId = Math.max(...statuses.value.map(s => s.id), 2)
    nextId.value = maxId + 1
    updateDiagram()
  }
}, { deep: true })

// Функция загрузки пользователей для комбобокса
const loadUsersOptions = async (params) => {
  if (usersLoading.value) return
  
  usersLoading.value = true
  
  try {
    const searchValue = params?.search || usersSearchQuery.value
    const page = params?.page || usersPagination.value.current_page
    
    const requestParams = {
      search: searchValue,
      page: page,
      perPage: 20
    }
    
    const response = await usersStore.fetchUsers(requestParams)
    
    if (response?.data && Array.isArray(response.data.data)) {
      const formattedUsers = response.data.data.map(user => ({
        id: user.id,
        name: `${user.last_name || ''} ${user.first_name || ''} ${user.middle_name || ''}`.trim() || user.login || user.email,
        login: user.login,
        email: user.email
      }))
      
      if (page === 1) {
        usersList.value = formattedUsers
      } else {
        usersList.value = [...usersList.value, ...formattedUsers]
      }
      
      usersPagination.value = {
        current_page: response.data.current_page || 1,
        last_page: response.data.last_page || 1,
        per_page: response.data.per_page || 20,
        total: response.data.total || 0
      }
    }
  } catch (error) {
    console.error('Ошибка загрузки пользователей:', error)
  } finally {
    usersLoading.value = false
  }
}

function updateResponsibles(status, selectedUsers) {
  if (props.readonly) return
  
  status.responsibles = selectedUsers || []
  
  validate()
  emitUpdate()
}
</script>

<style scoped>

.colors{
  color: #1caae2;
  color: #1ec35d;
  color: #938900;
  color: #8d00c5;
  color: #16bd00;
  color: #bd0000;
  color: #ce1f79;
  color: #2438cd;
  color: #3c3b67;
  color: #dc3000;
  color: #e48c08;
  color: #a6d000;
  color: #960943;
  color: #974c07;
  color: #17b289;
  color: #d2c100;
  color: #4d14b6;
  color: #72cc0b;
  color: #54cd41;
  color: #3971cb;
}

.status-editor {
  max-width: 100%;
  min-width: 100%;
  max-height: 86vh;
  min-height: 66vh;
  width: 100%;
  min-width: 1400px;
  overflow-y: hidden;
  background: #fff;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
}

.status-editor.view-mode {
  width: 100%;
  min-width: 1400px;
}

.org-grid {
  display: grid;
  grid-template-columns: 10fr 3fr;
  gap: 12px;
  min-height: calc(60vh);
  width: 100%;
}

.diagram-column {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  background: #fafafa;
  max-height: calc(75vh);
  min-width: 1000px;
  width: 100%;
}

.diagram-container {
  width: 100%;
  height: calc(75vh);
  min-height: 0;
}

.flow-diagram {
  width: 100%;
  height: 100%;
  min-height: calc(60vh);
  background: #fafafa;
}

.details-column {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  background: white;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgb(138, 138, 138) rgba(0, 0, 0, 0);
  min-height: calc(60vh);
  max-height: calc(75vh);
  display: flex;
  flex-direction: column;
  max-width: 284px;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  margin-bottom: 10px;
}

.editor-header h3 {
  margin: 0;
  font-size: 16px;
  line-height: 24px;
  color: #333;
}

.header-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-btn {
  background: rgba(234, 234, 234, 0.1);
  color: rgb(46, 46, 46);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.info-btn:hover {
  transform: scale(1.05);
}

.info-btn-icon:hover {
  color: rgb(99, 99, 99);
}

.error-btn {
  background: rgba(239, 131, 68, 0.1);
  color: #ef9144;
  border: 1px solid #ef7544;
  border-radius: 20px;
  padding: 4px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.error-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  transform: scale(1.02);
}

.error-count {
  font-weight: 600;
  background: #ef8b44;
  color: white;
  border-radius: 12px;
  padding: 0 6px;
  font-size: 11px;
  line-height: 18px;
}

.status-list-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.status-item-editor {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px;
  background: #f8f9fa;
  transition: all 0.2s;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.status-color {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid #ddd;
}

.status-header :deep(.ui-input-wrapper) {
  flex: 1;
}

.status-header :deep(.ui-input-field) {
  height: 32px !important;
  min-height: 32px !important;
}

.remove-status-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  color: #dc3545;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.remove-status-btn:hover {
  background: rgba(220, 53, 69, 0.1);
  transform: scale(1.05);
}

.add-status-btn {
  background: none;
  display: flex;
  text-align: center;
  align-items: center;
  justify-content: center;
  border: 1px dashed #178aee;
  color: #178aee;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.add-status-btn:hover {
  border-color: #2478d1;
  background-color: #e2f0ff;
  color: #2478d1;
}

.status-transitions-editor {
  display: flex;
  flex-direction: column;
}

.transitions-group {
  display: flex;
  flex-direction: column;
  margin-top: 10px;
}

/* Стили для режима просмотра */
.status-view-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 4px 0;
}

.status-view-name {
  font-weight: 600;
  font-size: 14px;
  color: #1f2937;
  line-height: 32px;
}

.status-name {
  font-weight: 600;
  font-size: 14px;
  color: #1f2937;
  display: flex;
  flex-direction: column;
}

.status-responsibles {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 5px;
}

.responsibles-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
}

.responsibles-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.responsible-chip {
  background: #e8f0fe;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  color: #1967d2;
  white-space: nowrap;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Медиа-запросы */
@media (max-width: 1200px) {
  .org-grid {
    grid-template-columns: 1fr;
  }
  
  .diagram-container {
    min-height: 400px;
  }
  
  .flow-diagram {
    min-height: 400px;
  }
}
</style>