<!-- 
    Таблица организаций с использованием базового UITable
    Отображение списка организаций с пагинацией через Laravel Paginator
-->

<template>
  <UIIcons ref="uiIcons" />
  <div v-if="viewMode === 'table'" class="objects-table-wrapper">
    <!-- Общий компонент таблицы -->
    <UITable
      :columns="columns"
      :data="objects"
      :grid-template-columns="gridTemplateColumns"
      :loading="loading"
      :sortable="false"
      :pagination-data="pagination"
      @rowClick="handleRowClick"
      @sortChange="handleSortChange"
      @pageChange="handlePageChange"
    >   

    <!-- Шаблон для чекбокса выбора -->
    <template #cell-select="{ row }">
      <div class="checkbox-cell" @click.stop>
        <UIInput
          v-if="canSelectObject()"
          type="checkbox"
          :model-value="isSelected(row.id)"
          @update:model-value="(checked) => toggleSelection(row.id, checked)"
          :disabled="false"
        />
      </div>
    </template>
    
      <template #cell-object="{ row }">
        <div class="object-cell" :title="row.name">
          <div class="object-name">{{ truncateText(row.name, 35) }}</div>
        </div>
      </template>

      <template #cell-organization="{ row }">
        <span class="object-cell" :title="row.organization.name">
          <div class="object-name">{{ truncateText(row.organization.name, 35) }}</div>
        </span>
      </template>

      <template #cell-address="{ row }">
        <div class="address-cell" :title="row.contact.address">
          <div class="object-name">{{ truncateText(row.contact?.address, 45) || 'Не указан' }}</div>
        </div>
      </template>

      <template #cell-building="{ row }">
        <div class="object-cell" :title="row.contact.building">
          <div class="object-name">{{ truncateText(row.contact?.building, 20) || 'Не указан' }}</div>
        </div>
      </template>

      <template #cell-office="{ row }">
        <div class="object-cell" :title="row.contact.office">
          <div class="object-name">{{ truncateText(row.contact?.office, 20) || 'Не указано'}}</div>
        </div>
      </template>

      <template #cell-phone="{ row }">
        <div class="main-contact-cell" :title="row.phone_number.phone_number">
          <div class="object-name">{{ truncateText(row.phone_number?.phone_number, 25) || 'Не указан'}}</div>
        </div>
      </template>

      <template #loading>
        <div class="custom-loading">
          <div class="spinner"></div>
          <span>Загрузка объектов...</span>
        </div>
      </template>

      <template #empty>
        <div class="custom-empty">
          <Icon 
            :icon="uiIcons?.icons.objectLoadEmpty"
            class="empty-icon"
            width="80"
            height="80"
          />
          <h3>Объекты не найдены</h3>
          <p>Попробуйте изменить критерии поиска или фильтры</p>
        </div>
      </template>
    </UITable>
  </div>

  <!-- Карточный вид -->
  <div v-else class="objects-cards-wrapper">
    <UICard
      :data="objects"
      :fields="cardFields"
      :loading="loading"
      :pagination-data="pagination"
      :clickable="true"
      @cardClick="handleRowClick"
      @pageChange="handlePageChange"
    >
      <!-- Действия на карточке (чекбокс) -->
      <template #actions="{ item }">
        <div class="checkbox-cell" @click.stop>
        <UIInput
          v-if="canSelectObject()"
          type="checkbox"
          :model-value="isSelected(item.id)"
          @update:model-value="(checked) => toggleSelection(item.id, checked)"
          :disabled="false"
        />
      </div>
      </template>

      <!-- Название объекта -->
      <template #field-object="{ item }">
        <div class="card-object">
          {{ truncateText(item.name, 45) }}
        </div>
      </template>

      <!-- Организация -->
      <template #field-organization="{ item }">
        <div class="card-organization">
          {{ truncateText(item.organization.name, 45) }}
        </div>
      </template>

      <!-- Полный адрес (адрес + дом + помещение) в одну строку -->
      <template #field-full_address="{ item }">
        <div class="card-address">
          {{ formatFullAddress(item) }}
        </div>
      </template>

      <template #loading>
        <div class="custom-loading">
          <div class="spinner"></div>
          <span>Загрузка объектов...</span>
        </div>
      </template>

      <template #empty>
        <div class="custom-empty">
          <Icon 
            :icon="uiIcons?.icons.objectLoadEmpty"
            class="empty-icon"
            width="50"
            height="50"
          />
          <h3>Объекты не найдены</h3>
          <p>Попробуйте изменить критерии поиска</p>
        </div>
      </template>
    </UICard>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed, ref } from 'vue'
import UITable from '@/components/common/UI/UITable.vue'
import UIInput from '@/components/common/UI/UIInput.vue'
import UICard from '@/components/common/UI/UICard.vue'
import { Icon } from '@iconify/vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'
import { getUserRole } from '@/utils/auth.utils'

const uiIcons = ref()

const props = defineProps({
  objects: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  pagination: { 
    type: Object, 
    default: () => ({}) 
  },
  selectedObjectIds: {
    type: Array,
    default: () => []
  },
  viewMode: {
    type: String,
    default: 'table' // 'table' или 'cards'
  }
})

const emit = defineEmits(['rowClick', 'pageChange', 'sortChange', 'openProfile', 'update:selectedObjectIds'])

// Поля для карточек
const cardFields = [
  { key: 'organization', label: 'Организация' },
  { key: 'full_address', label: 'Адрес' },
]

// Форматирование полного адреса
const formatFullAddress = (row) => {
  const addressParts = []
  
  if (row.contact?.address) {
    addressParts.push(row.contact.address)
  }
  if (row.contact?.building) {
    addressParts.push(`д. ${row.contact.building}`)
  }
  if (row.contact?.office) {
    addressParts.push(`пом. ${row.contact.office}`)
  }
  
  return addressParts.length > 0 ? addressParts.join(', ') : 'Не указан'
}

const isSelected = (orgId) => {
  return props.selectedObjectIds.includes(orgId)
}

// Переключение выбора пользователя
const toggleSelection = (orgId, isChecked) => {
  let newSelection = [...props.selectedObjectIds]
  
  if (isChecked) {
    if (!newSelection.includes(orgId)) {
      newSelection.push(orgId)
    }
  } else {
    newSelection = newSelection.filter(id => id !== orgId)
  }
  emit('update:selectedObjectIds', newSelection)
}

// Grid шаблон
const gridTemplateColumns = computed(() => {
  if(canSelectAnyObject.value){
    return '0.9fr 5fr 5fr 10fr 3fr 3fr 3fr'
  } else {
    return '5fr 5fr 10fr 3fr 3fr 3fr'
  }
})

// Колонки таблицы - статичны и зависят только от прав пользователя
const columns = computed(() => {
  if (canSelectAnyObject.value) {
    return [
      { key: 'select', title: '', align: 'center' },
      { key: 'object', title: 'Объект', align: 'left' },
      { key: 'organization', title: 'Организация', align: 'left' },
      { key: 'address', title: 'Адрес', align: 'left' },
      { key: 'building', title: 'Дом', align: 'left' },
      { key: 'office', title: 'Помещение', align: 'left' },
      { key: 'phone', title: 'Телефон', align: 'left' },
    ]
  } else {
    return [
      { key: 'object', title: 'Объект', align: 'left' },
      { key: 'organization', title: 'Организация', align: 'left' },
      { key: 'address', title: 'Адрес', align: 'left' },
      { key: 'building', title: 'Дом', align: 'left' },
      { key: 'office', title: 'Помещение', align: 'left' },
      { key: 'phone', title: 'Телефон', align: 'left' },
    ]
  }
})

// Проверка, может ли текущий пользователь удалять организации
const canSelectAnyObject = computed(() => {
  return getUserRole() === 'admin'
})

// Проверка, можно ли выбрать организацию
const canSelectObject = () => {
  // Нельзя выбрать: 
  // 1. Если текущий пользователь не админ
  if (!canSelectAnyObject.value) return false
  return true
}

// Обработчик клика по строке
const handleRowClick = (row) => {
  emit('rowClick', row)
  emit('openProfile', row)
}

// Обработчик изменения страницы
const handlePageChange = (url) => {
  emit('pageChange', url)
}

// Обработчик сортировки
const handleSortChange = (sortOptions) => {
  emit('sortChange', sortOptions)
}

// Вспомогательные функции
const truncateText = (text, maxLength) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
</script>

<style scoped>
.objects-table-wrapper,
.objects-cards-wrapper {
  height: 100%;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: #9c9c9c #eaeaea;
  margin-top: 10px;
}

.objects-table-wrapper :deep(.ui-table) {
  flex: 1;
  overflow: auto;
}

/* Ячейка организации */
.object-cell {
  display: flex;
  flex-direction: column;
}

.object-name {
  font-weight: 500;
  color: #1d1d1d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.org-short-name {
  font-size: 11px;
  color: #777;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Бейджи типов контрагентов (ЮЛ/ФЛ) */
.agent-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 300;
  text-align: center;
  min-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-legal {
  background-color: #ddf1ff;
  color: #1469bf;
}

.agent-physical {
  background-color: #cef7ce;
  color: #27752b;
}

.agent-default {
  background-color: #f5f5f5;
  color: #757575;
}

/* Бейджи типов организаций (Заказчик/Подрядчик/Наша компания) */
.object-type-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 300;
  text-align: center;
  min-width: 110px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.org-customer {
  background-color: #16961a;
  color: white;
}

.org-contractor {
  background-color: #11af8a;
  color: white;
}

.org-subcontractor {
  background-color: #1a7ccc;
  color: white;
}

.org-our {
  background-color: #1914b0;
  color: white;
}

.org-default {
  background-color: #f5f5f5;
  color: #757575;
}

/* Ячейка адреса */
.address-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Ячейка главного контакта */
.main-contact-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.contact-name {
  font-weight: 500;
  color: #1d1d1d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-position {
  font-size: 11px;
  color: #777;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Ячейка телефона */
.phone-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.main-phone {
  font-weight: 500;
  color: #1d1d1d;
  white-space: nowrap;
}

/* Ячейка статистики */
.stats-cell {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #1774ee;
  font-size: 14px;
}

.stat-item .iconify {
  color: #178aee;
}

/* Состояния загрузки и пустого состояния */
.custom-loading,
.custom-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 60px;
  color: #666;
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

.custom-empty h3 {
  margin: 0;
  color: #333;
}

.custom-empty p {
  margin: 0;
  color: #777;
}

.empty-icon {
  opacity: 0.5;
}

.text-muted {
  color: #999;
  font-style: italic;
}
</style>