<!-- UICard.vue - универсальный компонент для карточного отображения -->
<template>
  <div class="card-view">
    <div class="cards-grid">
      <div 
        v-for="item in data" 
        :key="item.id" 
        class="data-card"
        :class="{ 'card-clickable': clickable }"
        @click="clickable ? $emit('cardClick', item) : null"
      >
        <div class="card-header">
          <div class="card-title">
            <slot name="title" :item="item">
              {{ item.name }}
            </slot>
          </div>
          <div class="card-actions" @click.stop>
            <slot name="actions" :item="item" />
          </div>
        </div>

        <div class="card-content">
          <div 
            v-for="field in getVisibleFieldsForItem(item)" 
            :key="field.key" 
            class="card-field"
          >
            <span class="field-label">{{ field.label }}:
              <span class="field-value">
                <slot :name="`field-${field.key}`" :item="item" :value="item[field.key]">
                  {{ formatValue(item[field.key]) }}
                </slot>
              </span>
            </span>
          </div>
        </div>

        <div class="card-footer" v-if="$slots.footer">
          <slot name="footer" :item="item" />
        </div>
      </div>

        <!-- Состояние загрузки -->
        <div v-if="loading" class="loading-state">
          <slot name="loading">Загрузка данных...</slot>
        </div>
        <!-- Пустое состояние -->
        <div v-if="!loading && (!data || data.length === 0)" class="empty-state">
          <slot name="empty">Данные отсутствуют</slot>
        </div>
    </div>

    <!-- Пагинация -->
    <div v-if="showPagination && paginationData?.last_page > 1" class="card-pagination">
      <UIPagination
        :pagination-data="paginationData"
        :compact="true"
        @pageChange="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import UIPagination from '@/components/common/UI/UIPagination.vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
  fields: { 
    type: Array, 
    required: true,
    validator: (value) => {
      // Поддерживаем как строки, так и объекты с condition
      return value.every(field => 
        typeof field === 'string' || 
        (typeof field === 'object' && field.key)
      )
    }
  },
  clickable: { type: Boolean, default: true },
  paginationData: { type: Object, default: null },
  showPagination: { type: Boolean, default: true },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['cardClick', 'pageChange'])

// Формат полей: может быть строкой или объектом
const normalizedFields = computed(() => {
  return props.fields.map(field => {
    if (typeof field === 'string') {
      return { key: field, label: field }
    }
    return field
  })
})

// Проверка, должно ли поле отображаться для конкретного элемента
const shouldShowField = (field, item) => {
  // Если нет условия - показываем всегда
  if (!field.condition) return true
  
  // Если condition - функция, вызываем её
  if (typeof field.condition === 'function') {
    return field.condition(item)
  }
  
  // Если condition - объект с операторами
  if (typeof field.condition === 'object') {
    // Поддержка простого сравнения
    if (field.condition.field && field.condition.operator && field.condition.value) {
      const fieldValue = item[field.condition.field]
      switch (field.condition.operator) {
        case '===': return fieldValue === field.condition.value
        case '!==': return fieldValue !== field.condition.value
        case '==': return fieldValue == field.condition.value
        case '!=': return fieldValue != field.condition.value
        default: return true
      }
    }
    
    // Поддержка массива разрешенных ролей/значений
    if (field.condition.showWhen && Array.isArray(field.condition.showWhen)) {
      const fieldValue = item[field.condition.field || 'role.id']
      return field.condition.showWhen.includes(fieldValue)
    }
  }
  
  return true
}

// Получение видимых полей для конкретного элемента
const getVisibleFieldsForItem = (item) => {
  return normalizedFields.value.filter(field => shouldShowField(field, item))
}

const formatValue = (value) => {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return value.name || JSON.stringify(value)
  return String(value)
}

const handlePageChange = (url) => {
  emit('pageChange', url)
}
</script>

<style scoped>
.card-view {
  padding: 8px;
  position: relative;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

.data-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.2s ease;
}

.data-card.card-clickable {
  cursor: pointer;
}

.data-card.card-clickable:active {
  transform: scale(0.98);
  background-color: #f9fafb;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f8f9fa;
  border-bottom: 1px solid #e5e7eb;
}

.card-title {
  font-weight: 600;
  font-size: 15px;
  color: #1f2937;
  word-break: break-word;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.card-content {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card-field {
  display: flex;
  justify-content: flex-start;
  gap: 12px;
  font-size: 13px;
}

.field-label {
  min-width: 100px;
  color: #6b7280;
  font-weight: 500;
  flex-shrink: 0;
}


.field-value {
  color: #323232;
  word-break: break-word;
  font-weight: bold;
  flex: 1;
}

.card-footer {
  padding: 10px 16px;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
}

.card-pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

@media (max-width: 480px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
  
  .card-field {
    flex-direction: column;
    gap: 4px;
  }
  
  .field-label {
    min-width: auto;
  }
}
</style>