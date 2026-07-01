<template>
  <UIIcons ref="uiIcons" />
  <div class="business-processes-wrapper">
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <span>Загрузка бизнес-процессов...</span>
    </div>

    <div v-else-if="!processes || processes.length === 0" class="empty-container">
      <Icon 
        :icon="uiIcons?.icons.classificationsLoadEmpty"
        class="empty-icon"
        width="80"
        height="80"
      />
      <h3>Бизнес-процессы не найдены</h3>
      <p>Попробуйте изменить критерии поиска</p>
    </div>

    <div v-else class="cards-grid">
      <div
        v-for="item in processes"
        :key="item.id"
        class="process-card"
        @click="handleRowClick(item)"
      >
        <div class="card-content">
          <div class="process-name" :title="item.name">
            <Icon :icon="uiIcons?.icons.process || uiIcons?.icons.classification" width="22" height="22" class="process-icon" />
            <span>{{ truncateText(item.name, 42) }}</span>
          </div>

          <div class="process-classifications">
            <div class="card-header">
              <span>Классификации:</span>
            </div>
            <div class="classifications-list">
              <div
                v-for="conn in getVisibleClassifications(item.classification_connections)"
                :key="getClassificationKey(conn)"
                class="classification-chip"
                :title="getClassificationLabel(conn)"
              >
                {{ truncateText(getClassificationLabel(conn), 24) }}
              </div>
              <div
                v-if="getHiddenClassificationsCount(item.classification_connections) > 0"
                class="classification-chip more-chip"
                :title="`Еще ${getHiddenClassificationsCount(item.classification_connections)} классификаций`"
              >
                +{{ getHiddenClassificationsCount(item.classification_connections) }}
              </div>
              <div v-if="!normalizeClassifications(item.classification_connections).length" class="no-classifications">
                Не назначены
              </div>
            </div>
          </div>

          <div class="process-support-groups">
            <div class="card-header">
              <span>Группы поддержки:</span>
            </div>
            <div class="groups-list">
              <div
                v-for="group in getVisibleSupportGroups(item.support_groups)"
                :key="getSupportGroupKey(group)"
                class="group-chip"
                :title="getSupportGroupLabel(group)"
              >
                {{ truncateText(getSupportGroupLabel(group), 24) }}
              </div>
              <div
                v-if="getHiddenSupportGroupsCount(item.support_groups) > 0"
                class="group-chip more-chip"
                :title="`Еще ${getHiddenSupportGroupsCount(item.support_groups)} групп поддержки`"
              >
                +{{ getHiddenSupportGroupsCount(item.support_groups) }}
              </div>
              <div v-if="!normalizeSupportGroups(item.support_groups).length" class="no-groups">
                Не назначены
              </div>
            </div>
          </div>

          <div class="process-deadline" v-if="item.deadline">
            <div class="deadline-info">
              <Icon :icon="uiIcons?.icons.clock || 'mdi:clock-outline'" width="14" height="14" />
              <span>{{ formatDeadline(item.deadline) }}</span>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <div class="checkbox-cell" @click.stop>
            <UIInput
              v-if="canSelectProcess()"
              type="checkbox"
              :model-value="isSelected(item.id)"
              @update:model-value="(checked) => toggleSelection(item.id, checked)"
              :disabled="false"
            />
          </div>
          <div class="stats-info">
            <span class="stat-badge" :title="`${normalizeClassifications(item.classification_connections).length} классификаций`">
              <Icon :icon="uiIcons?.icons.classification || 'mdi:tag-outline'" width="16" height="16" />
              {{ normalizeClassifications(item.classification_connections).length }}
            </span>
            <span class="stat-badge" :title="`${normalizeSupportGroups(item.support_groups).length} групп поддержки`">
              <Icon :icon="uiIcons?.icons.group || 'mdi:account-group-outline'" width="16" height="16" />
              {{ normalizeSupportGroups(item.support_groups).length }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <UIPagination
      v-if="showPagination"
      :pagination-data="paginationData"
      :show-info="showPaginationInfo"
      :show-page-size-selector="showPageSizeSelector"
      :show-page-jump="showPageJump"
      :compact="compactPagination"
      :no-border="paginationNoBorder"
      @pageChange="handlePageChange"
      class="table-pagination"
    />
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed, ref } from 'vue'
import UIInput from '@/components/common/UI/UIInput.vue'
import { Icon } from '@iconify/vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'
import UIPagination from '@/components/common/UI/UIPagination.vue'
import { getUserRole } from '@/utils/auth.utils'

const uiIcons = ref()

// Константы для отображения
const MAX_VISIBLE_ITEMS = {
  CLASSIFICATIONS: 2,
  SUPPORT_GROUPS: 2,
  STATUSES: 2,
}

const props = defineProps({
  processes: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  paginationData: {
    type: Object,
    default: () => ({
      current_page: 1,
      last_page: 1,
      per_page: 20,
      total: 0,
      links: [],
      from: 0,
      to: 0,
      prev_page_url: null,
      next_page_url: null,
    }),
  },
  showPaginationInfo: { type: Boolean, default: true },
  showPageSizeSelector: { type: Boolean, default: false },
  showPageJump: { type: Boolean, default: false },
  compactPagination: { type: Boolean, default: false },
  paginationNoBorder: { type: Boolean, default: false },
  selectedProcessIds: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['rowClick', 'pageChange', 'update:selectedProcessIds'])

// Права доступа
const canSelectAnyProcess = computed(() => {
  return getUserRole() === 'admin'
})

const canSelectProcess = () => {
  return canSelectAnyProcess.value
}

// Выделение чекбоксов
const isSelected = (processId) => {
  return props.selectedProcessIds.includes(processId)
}

const toggleSelection = (processId, isChecked) => {
  let newSelection = [...props.selectedProcessIds]

  if (isChecked) {
    if (!newSelection.includes(processId)) {
      newSelection.push(processId)
    }
  } else {
    newSelection = newSelection.filter(id => id !== processId)
  }

  emit('update:selectedProcessIds', newSelection)
}

// ========== Нормализация данных ==========

// Нормализация классификаций из classification_connections
const normalizeClassifications = (connections) => {
  if (!connections || !Array.isArray(connections)) return []
  
  return connections.map((conn) => {
    if (conn.classification) {
      return {
        id: conn.classification.id,
        name: conn.classification.name,
        description: conn.classification.description,
      }
    }
    return null
  }).filter(Boolean)
}

// Нормализация групп поддержки
const normalizeSupportGroups = (groups) => {
  if (!groups || !Array.isArray(groups)) return []
  
  return groups.map((group) => {
    if (typeof group === 'object') {
      return {
        id: group.id,
        name: group.name,
        description: group.description,
      }
    }
    return {
      id: group,
      name: String(group),
    }
  })
}

// Нормализация статусов
const normalizeStatuses = (statuses) => {
  if (!statuses || !Array.isArray(statuses)) return []
  
  return statuses.map((status) => ({
    id: status.id,
    name: status.name,
    color: status.color,
    type: status.type,
  }))
}

// ========== Получение меток ==========

const getClassificationLabel = (connection) => {
  if (!connection) return ''
  if (connection.classification) {
    return connection.classification.name || `#${connection.classification.id}`
  }
  if (typeof connection === 'string') return connection
  return connection.name || connection.classification_name || `#${connection.id ?? ''}`
}

const getClassificationKey = (connection) => {
  if (!connection) return ''
  if (connection.classification) return connection.classification.id
  return connection.id ?? getClassificationLabel(connection)
}

const getSupportGroupLabel = (group) => {
  if (!group) return ''
  if (typeof group === 'string' || typeof group === 'number') return String(group)
  return group.name || group.group_name || `#${group.id ?? ''}`
}

const getSupportGroupKey = (group) => {
  if (!group) return ''
  if (typeof group === 'string' || typeof group === 'number') return String(group)
  return group.id ?? getSupportGroupLabel(group)
}

// ========== Видимые элементы (с ограничением) ==========

const getVisibleClassifications = (connections) => {
  const normalized = normalizeClassifications(connections)
  return normalized.slice(0, MAX_VISIBLE_ITEMS.CLASSIFICATIONS)
}

const getHiddenClassificationsCount = (connections) => {
  const normalized = normalizeClassifications(connections)
  if (normalized.length <= MAX_VISIBLE_ITEMS.CLASSIFICATIONS) return 0
  return normalized.length - MAX_VISIBLE_ITEMS.CLASSIFICATIONS
}

const getVisibleSupportGroups = (groups) => {
  const normalized = normalizeSupportGroups(groups)
  return normalized.slice(0, MAX_VISIBLE_ITEMS.SUPPORT_GROUPS)
}

const getHiddenSupportGroupsCount = (groups) => {
  const normalized = normalizeSupportGroups(groups)
  if (normalized.length <= MAX_VISIBLE_ITEMS.SUPPORT_GROUPS) return 0
  return normalized.length - MAX_VISIBLE_ITEMS.SUPPORT_GROUPS
}

const getVisibleStatuses = (statuses) => {
  const normalized = normalizeStatuses(statuses)
  return normalized.slice(0, MAX_VISIBLE_ITEMS.STATUSES)
}

const getHiddenStatusesCount = (statuses) => {
  const normalized = normalizeStatuses(statuses)
  if (normalized.length <= MAX_VISIBLE_ITEMS.STATUSES) return 0
  return normalized.length - MAX_VISIBLE_ITEMS.STATUSES
}

// ========== Вспомогательные функции ==========

const truncateText = (text, maxLength) => {
  if (!text) return ''
  const stringText = String(text)
  if (stringText.length <= maxLength) return stringText
  return stringText.substring(0, maxLength) + '...'
}

// Определение цвета текста для статуса (белый для темных фонов, темный для светлых)
const getStatusTextColor = (bgColor) => {
  if (!bgColor) return '#495057'
  // Простая проверка: если цвет темный (начинается с # и имеет низкую яркость)
  // Можно расширить для более точного определения
  const darkColors = ['#000', '#1a1a2e', '#2c3e50', '#34495e', '#8B0000', '#800000', '#dc3545', '#28a745']
  if (darkColors.some(color => bgColor.toLowerCase().includes(color.toLowerCase()))) {
    return '#ffffff'
  }
  return '#495057'
}

// Форматирование дедлайна
const formatDeadline = (deadline) => {
  if (!deadline) return ''
  const parts = []

  if (deadline.months) parts.push(`${deadline.months} мес.`)
  if (deadline.weeks) parts.push(`${deadline.weeks} нед.`)
  if (deadline.days) parts.push(`${deadline.days} д.`) 
  if (deadline.hours) parts.push(`${deadline.hours} ч.`) 
  if (deadline.minutes) parts.push(`${deadline.minutes} мин.`) 
  return parts.length ? parts.join(' ') : 'Не указан'
}

// Пагинация
const showPagination = computed(() => {
  return props.paginationData?.last_page > 1
})

const handleRowClick = (item) => {
  emit('rowClick', item)
}

const handlePageChange = (url) => {
  emit('pageChange', url)
}
</script>

<style scoped>
.business-processes-wrapper {
  background: transparent;
  min-height: 400px;
  height: 100%;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: #9c9c9c #eaeaea;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-top: 10px;
}

.process-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e9ecef;
}

.process-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: #dee2e6;
}

.card-content {
  padding: 12px;
  flex: 1;
}

.process-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
  color: #1a1a2e;
  margin-bottom: 10px;
  word-break: break-word;
  min-height: 42px;
}

.process-icon {
  flex-shrink: 0;
  color: #178aee;
}

.process-description {
  margin-bottom: 12px;
}

.card-header{
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #495057;
  margin-bottom: 8px;
}

.description-text {
  font-size: 12px;
  color: #495057;
  line-height: 1.4;
  word-break: break-word;
}

.process-classifications,
.process-support-groups {
  margin-bottom: 10px;
}

.classifications-list,
.groups-list,
.status-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.classification-chip,
.group-chip {
  background: #e8f0fe;
  padding: 3px 8px;
  border-radius: 14px;
  font-size: 11px;
  color: #1967d2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.status-chip {
  padding: 3px 8px;
  border-radius: 14px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.more-chip {
  background: #f1f3f5;
  color: #6c757d;
  font-weight: 500;
}

.more-chip:hover {
  background: #e9ecef;
}

.no-classifications,
.no-groups {
  font-size: 11px;
  color: #adb5bd;
  font-style: italic;
}

.process-deadline {
  margin-top: 8px;
  padding-top: 6px;
}

.deadline-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #797979;
}

.card-footer {
  padding: 8px 10px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.checkbox-cell {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-left: 8px;
}

.stats-info {
  display: flex;
  gap: 12px;
}

.stat-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #6c757d;
}

.stat-badge svg {
  opacity: 0.6;
}

.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px;
  color: #666;
  min-height: 400px;
}

.empty-icon {
  opacity: 0.5;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-container h3 {
  margin: 0;
  color: #333;
}

.empty-container p {
  margin: 0;
  color: #777;
}

/* Адаптивность */
@media (max-width: 1400px) {
  .cards-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 1000px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }

  .business-processes-wrapper {
    padding: 0;
  }
}
</style>