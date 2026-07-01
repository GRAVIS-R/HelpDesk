<!-- 
    Таблица организаций с использованием базового UITable
    Отображение списка организаций с пагинацией через Laravel Paginator
-->

<template>
  <UIIcons ref="uiIcons" />
  <div v-if="viewMode === 'table'" class="organizations-table-wrapper">
    <!-- Общий компонент таблицы -->
    <UITable
      :columns="columns"
      :data="organizations"
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
          v-if="canSelectOrganization(row)"
          type="checkbox"
          :model-value="isSelected(row.id)"
          @update:model-value="(checked) => toggleSelection(row.id, checked)"
          :disabled="false"
        />
      </div>
    </template>

      <template #cell-organization="{ row }">
        <div class="organization-cell" :title="row.name">
          <div class="org-name">{{ truncateText(row.name, 40) }}</div>
        </div>
      </template>

      <template #cell-type_org="{ row }">
        <div class="org-types-cell">
          <span 
            v-for="role in getOrganizationRoles(row)" 
            :key="role.id"
            class="org-type-badge" 
            :class="getOrgTypeClass(role.id)"
          >
          {{ role.name }}
          </span>
          <span v-if="!getOrganizationRoles(row).length" class="org-type-badge org-default">
          —
          </span>
        </div>
      </template>

      <template #cell-address="{ row }">
        <div class="address-cell" :title="row.contact.address">
          <div class="org-name">{{ truncateText(row.contact?.address, 40) || 'Не указан' }}</div>
        </div>
      </template>

      <template #cell-phone="{ row }">
        <div class="main-contact-cell" :title="row.phone_number.phone_number">
          <div class="object-name">{{ truncateText(row.phone_number?.phone_number, 25) || 'Не указан'}}</div>
        </div>
      </template>

      <template #cell-objects_contacts="{ row }">
        <div class="stats-cell">
          <div class="stat-item" :title="'Объекты'">
            <Icon :icon="uiIcons?.icons.countOffices" width="22" height="22" />
            <span>{{ getObjectCount(row) }}</span>
            <!--<span>{{ row.objects?.length || 0 }}</span>-->
          </div>
        </div>
      </template>

      <template #loading>
        <div class="custom-loading">
          <div class="spinner"></div>
          <span>Загрузка организаций...</span>
        </div>
      </template>

      <template #empty>
        <div class="custom-empty">
          <Icon 
            :icon="uiIcons?.icons.organizationsLoadEmpty"
            class="empty-icon"
            width="80"
            height="80"
          />
          <h3>Организации не найдены</h3>
          <p>Попробуйте изменить критерии поиска или фильтры</p>
        </div>
      </template>
    </UITable>
  </div>

  <!-- Карточный вид -->
  <div v-else class="organizations-cards-wrapper">
    <UICard
      :data="organizations"
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
            v-if="canSelectOrganization(item)"
            type="checkbox"
            :model-value="isSelected(item.id)"
            @update:model-value="(checked) => toggleSelection(item.id, checked)"
            :disabled="false"
          />
        </div>
      </template>

      <template #field-type_org="{ item }">
        <span 
            v-for="role in getOrganizationRoles(item)" 
            :key="role.id"
            :class="getOrgTypeClass(role.id)"
          >
          {{ role.name }}
          </span>
          <span v-if="!getOrganizationRoles(item).length" class="org-default-card">
          —
          </span>
      </template>

      <template #field-address="{ item }">
        {{ item?.contact.address || '—' }}
      </template>

      <template #field-phone_number="{ item }">
        {{ item?.phone_number?.phone_number || '—' }}
      </template>

      <template #loading>
        <div class="custom-loading">
          <div class="spinner"></div>
          <span>Загрузка организаций...</span>
        </div>
      </template>
      
      <template #empty>
        <div class="custom-empty">
          <Icon 
            :icon="uiIcons?.icons.organizationsLoadEmpty"
            class="empty-icon"
            width="50"
            height="50"
          />
          <h3>Организации не найдены</h3>
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
import { Icon } from '@iconify/vue'
import UICard from '@/components/common/UI/UICard.vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'
import { getUserRole } from '@/utils/auth.utils'

const uiIcons = ref()

const props = defineProps({
  organizations: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  pagination: {
    type: Object,
    default: () => ({
      current_page: 1,
      last_page: 1,
      per_page: 20,
      total: 0,
      links: [],
      from: 0,
      to: 0
    })
  },
  selectedOrgIds: {
    type: Array,
    default: () => []
  },
  viewMode: {
    type: String,
    default: 'table' // 'table' или 'cards'
  }
})

const emit = defineEmits(['rowClick', 'pageChange', 'sortChange', 'openProfile', 'update:selectedOrgIds'])

// Поля для карточек
const cardFields = [
  { key: 'type_org', label: 'Типы' },
  { key: 'address', label: 'Адрес' },
  { key: 'phone_number', label: 'Телефон' },
]

// Проверка выбран ли пользователь
const isSelected = (orgId) => {
  return props.selectedOrgIds.includes(orgId)
}

// Переключение выбора пользователя
const toggleSelection = (orgId, isChecked) => {
  let newSelection = [...props.selectedOrgIds]
  
  if (isChecked) {
    if (!newSelection.includes(orgId)) {
      newSelection.push(orgId)
    }
  } else {
    newSelection = newSelection.filter(id => id !== orgId)
  }
  
  emit('update:selectedOrgIds', newSelection)
}

// Grid шаблон
const gridTemplateColumns = computed(() => {
  if(canSelectAnyOrganization.value){
    return '0.8fr 5fr 5.5fr 6.5fr 3fr 1.5fr'
  } else {
    return '5fr 5.5fr 6.5fr 3fr 1.5fr'
  }
})

// Колонки таблицы - статичны и зависят только от прав пользователя
const columns = computed(() => {
  if (canSelectAnyOrganization.value) {
    return [
      { key: 'select', title: '', align: 'center' },
      { key: 'organization', title: 'Организация', align: 'left' },
      { key: 'type_org', title: 'Типы', align: 'center' }, 
      { key: 'address', title: 'Адрес главного офиса', align: 'left' },
      { key: 'phone', title: 'Телефон', align: 'left' }, 
      { key: 'objects_contacts', title: '', align: 'center' },
    ]
  } else {
    return [
      { key: 'organization', title: 'Организация', align: 'left' },
      { key: 'type_org', title: 'Типы', align: 'center' },
      { key: 'address', title: 'Адрес главного офиса', align: 'left' },
      { key: 'phone', title: 'Телефон', align: 'left' }, 
      { key: 'objects_contacts', title: '', align: 'center' },
    ]
  }
})

// Проверка, может ли текущий пользователь удалять организации
const canSelectAnyOrganization = computed(() => {
  return getUserRole() === 'admin'
})

// Проверка, можно ли выбрать организацию
const canSelectOrganization = (row) => {
  // Нельзя выбрать: 
  // 1. Если текущий пользователь не админ
  // 2. Организацию с ID = 1 (Основная организация)
  if (!canSelectAnyOrganization.value) return false
  if (row.id === 1) return false
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

// Получение главного офиса
const getMainOffice = (organization) => {
  if (!organization.objects || !organization.objects.length) return null
  return organization.objects.find(obj => obj.is_main === true) || organization.objects[0]
}

// Типы организаций по ID роли
const getOrgTypeClass = (roleId) => {
  if(props.viewMode === 'table'){
    switch (Number(roleId)) {
      case 1:
        return 'org-main'
      case 2:
        return 'org-contractor'
      case 3:
        return 'org-subcontractor'
      case 4:
        return 'org-customer'
      default:
        return 'org-default'
    }
  }
  else{
    switch (Number(roleId)) {
      case 1:
        return 'org-main-card'
      case 2:
        return 'org-contractor-card'
      case 3:
        return 'org-subcontractor-card'
      case 4:
        return 'org-customer-card'
      default:
        return 'org-default-card'
    }
  }
}

const getOrgTypeLabel = (roleId) => {
  switch (Number(roleId)) {
    case 1:
      return 'Основная организация'
    case 2:
      return 'Подрядчик'
    case 3:
      return 'Субподрядчик'
    case 4:
      return 'Заказчик'
    default:
      return '—'
  }
}

// Получение ролей организации (массив объектов с id и name)
const getOrganizationRoles = (organization) => {
  if (!organization.roles) return []
  if (Array.isArray(organization.roles)) {
    return organization.roles
  }
  return []
}

const getObjectCount = (row) => {
  let count = row.objects.length
  if(row.contact.address){
    count = row.objects.length + 1
  }
  return count
}
</script>

<style scoped>
.organizations-table-wrapper,
.organizations-cards-wrapper {
  height: 100%;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: #9c9c9c #eaeaea;
  margin-top: 10px;
}

.organizations-table-wrapper :deep(.ui-table) {
  flex: 1;
  overflow: auto;
}

/* Ячейка организации */
.organization-cell {
  display: flex;
  flex-direction: column;
}

.org-name {
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

.org-types-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
  align-items: center;
}

/* Бейджи типов организаций (Заказчик/Подрядчик/Наша компания) */
.org-type-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 300;
  text-align: center;
  min-width: 90px;
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

.org-main {
  background-color: #15109f;
  color: white;
}

.org-default {
  background-color: #f5f5f5;
  color: #757575;
}

.org-customer-card {
  padding-right: 6px;
  color: #16961a;
}

.org-contractor-card {
  color: #11af8a;
}

.org-subcontractor-card {
  color: #1a7ccc;
}

.org-main-card {
  color: #15109f;
}

.org-default-card {
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