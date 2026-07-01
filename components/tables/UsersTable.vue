<!-- 
    Таблица/карточки пользователей
    Отображение списка пользователей в двух режимах
-->

<template>
  <UIIcons ref="uiIcons" />
  
  <!-- Табличный вид -->
  <div v-if="viewMode === 'table'" class="users-table-wrapper">
    <UITable
      :columns="columns"
      :data="users"
      :grid-template-columns="gridTemplateColumns"
      :loading="loading"
      :sortable="false"
      :pagination-data="pagination"
      @rowClick="handleRowClick"
      @sortChange="handleSortChange"
      @pageChange="handlePageChange"
    >
      <template #cell-select="{ row }">
        <div class="checkbox-cell" @click.stop>
          <UIInput
            v-if="canSelectUser(row)"
            type="checkbox"
            :model-value="isSelected(row.id)"
            @update:model-value="(checked) => toggleSelection(row.id, checked)"
            :disabled="false"
          />
        </div>
      </template>

      <template #cell-full_name="{ row }">
        <div class="full-name-cell">
          <div class="full-name-text">
            {{ formatFullName(row.last_name, row.first_name, row.middle_name) }}
          </div>
        </div>
      </template>

      <template #cell-role="{ row }">
        <span class="role-badge" :class="getRoleClass(row.role.id)">
          {{ getRoleLabel(row.role.id) }}
        </span>
      </template>

      <template #cell-organization="{ value }">
        <div class="organization-cell" :title="value?.name">
          {{ truncateText(value?.name, 30) || 'Не указан' }}
        </div>
      </template>

      <template #cell-object="{ value }">
        <div class="object-cell" :title="value?.name">
          {{ truncateText(value?.name, 30) || 'Не указан' }}
        </div>
      </template>

      <template #loading>
        <div class="custom-loading">
          <div class="spinner"></div>
          <span>Загрузка пользователей...</span>
        </div>
      </template>

      <template #empty>
        <div class="custom-empty">
          <Icon 
            :icon="uiIcons?.icons.usersLoadEmpty"
            class="empty-icon"
            width="80"
            height="80"
          />
          <h3>Пользователи не найдены</h3>
          <p>Попробуйте изменить критерии поиска или фильтры</p>
        </div>
      </template>
    </UITable>
  </div>

  <!-- Карточный вид -->
  <div v-else class="users-cards-wrapper">
    <UICard
      :data="usersForCard"
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
            v-if="canSelectUser(item)"
            type="checkbox"
            :model-value="isSelected(item.id)"
            @update:model-value="(checked) => toggleSelection(item.id, checked)"
            :disabled="false"
          />
        </div>
      </template>

      <template #field-role="{ item }">
        <span :class="getRoleClass(item.role?.id)">
          {{ getRoleLabel(item.role?.id) }}
        </span>
      </template>

      <template #field-organization="{ value }">
        {{ value?.name || '—' }}
      </template>

      <template #field-object="{ value }">
        {{ value?.name || '—' }}
      </template>

      <template #loading>
        <div class="custom-loading">
          <div class="spinner"></div>
          <span>Загрузка пользователей...</span>
        </div>
      </template>

      <template #empty>
        <div class="custom-empty">
          <Icon 
            :icon="uiIcons?.icons.usersLoadEmpty"
            class="empty-icon"
            width="50"
            height="50"
          />
          <h3>Пользователи не найдены</h3>
          <p>Попробуйте изменить критерии поиска</p>
        </div>
      </template>
    </UICard>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed, ref } from 'vue'
import UITable from '@/components/common/UI/UITable.vue'
import UICard from '@/components/common/UI/UICard.vue'
import UIInput from '@/components/common/UI/UIInput.vue'
import { Icon } from '@iconify/vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'
import { getUserId, getUserRole } from '@/utils/auth.utils'

const uiIcons = ref()

const props = defineProps({
  users: {
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
  selectedUserIds: {
    type: Array,
    default: () => []
  },
  viewMode: {
    type: String,
    default: 'table' // 'table' или 'cards'
  }
})

const emit = defineEmits(['rowClick', 'pageChange', 'sortChange', 'openProfile', 'update:selectedUserIds'])

// Поля для карточек
const cardFields = [
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Роль' },
  { key: 'organization', label: 'Организация' },
  { 
    key: 'object', 
    label: 'Объект',
    condition: (item) => item.role?.id === 4
  }
]

// Обработчик клика по строке/карточке
const handleRowClick = (row) => {
  emit('rowClick', row)
  emit('openProfile', row)
}

// Проверка выбран ли пользователь
const isSelected = (userId) => {
  return props.selectedUserIds.includes(userId)
}

// Переключение выбора пользователя
const toggleSelection = (userId, isChecked) => {
  let newSelection = [...props.selectedUserIds]
  
  if (isChecked) {
    if (!newSelection.includes(userId)) {
      newSelection.push(userId)
    }
  } else {
    newSelection = newSelection.filter(id => id !== userId)
  }
  
  emit('update:selectedUserIds', newSelection)
}

// Колонки таблицы
const columns = computed(() => {
  if (canSelectAnyUser.value) {
    return [
      { key: 'select', title: '', align: 'center' },
      { key: 'full_name', title: 'Пользователь', align: 'left' },
      { key: 'email', title: 'Email', align: 'left' },
      { key: 'role', title: 'Роль', align: 'center' },
      { key: 'organization', title: 'Организация', align: 'left' },
      { key: 'object', title: 'Объект', align: 'left' },
    ]
  } else {
    return [
      { key: 'full_name', title: 'Пользователь', align: 'left' },
      { key: 'email', title: 'Email', align: 'left' },
      { key: 'role', title: 'Роль', align: 'center' },
      { key: 'organization', title: 'Организация', align: 'left' },
      { key: 'object', title: 'Объект', align: 'left' },
    ]
  }
})

// Grid шаблон для таблицы
const gridTemplateColumns = computed(() => {
  if (canSelectAnyUser.value) {
    return '0.9fr 8fr 6fr 5fr 6fr 10fr'
  } else {
    return '8fr 6fr 5fr 6fr 10fr'
  }
})

const usersForCard = computed(() => {
  let object = props.users
  object.forEach(user => {
    if(user.middle_name)
      user.name = user.last_name + ' ' + user.first_name + ' ' + user.middle_name
    else{
      user.name = user.last_name + ' ' + user.first_name
    }
  })
  return object
})

// Проверка прав
const canSelectAnyUser = computed(() => {
  return getUserRole() === 'admin'
})

const canSelectUser = (row) => {
  if (!canSelectAnyUser.value) return false
  if (row.id === 1) return false
  if (row.id === getUserId()) return false
  return true
}

// Форматирование ФИО
const formatFullName = (lastName, firstName, middleName) => {
  const parts = []
  if (lastName) parts.push(lastName)
  if (firstName) parts.push(firstName)
  if (middleName) parts.push(middleName)
  return parts.length > 0 ? parts.join(' ') : 'Не указан'
}

// Обработчики
const handlePageChange = (url) => {
  emit('pageChange', url)
}

const handleSortChange = (sortOptions) => {
  emit('sortChange', sortOptions)
}

// Утилиты
const truncateText = (text, maxLength) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// Классы и метки для ролей
const getRoleClass = (roleId) => {
  if(props.viewMode === 'table'){
  switch (roleId) {
    case 1: return 'role-admin'
    case 2: return 'role-dispatcher'
    case 3: return 'role-engineer'
    case 4: return 'role-client'
    default: return 'role-default'
  }
} else{
  switch (roleId) {
    case 1: return 'role-admin-card'
    case 2: return 'role-dispatcher-card'
    case 3: return 'role-engineer-card'
    case 4: return 'role-client-card'
    default: return 'role-default-card'
  }
}
}

const getRoleLabel = (roleId) => {
  switch (roleId) {
    case 1: return 'Администратор'
    case 2: return 'Диспетчер'
    case 3: return 'Инженер'
    case 4: return 'Клиент'
    default: return '—'
  }
}
</script>

<style scoped>
.users-table-wrapper,
.users-cards-wrapper {
  height: 100%;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: #9c9c9c #eaeaea;
  margin-top: 10px;
}

/* Стили для таблицы */
.role-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 300;
  text-align: center;
  min-width: 115px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-admin { background-color: #dc3545; color: white; }
.role-dispatcher { background-color: #0fa873; color: white; }
.role-engineer { background-color: #195698; color: white; }
.role-client { background-color: #16961a; color: white; }
.role-default { background-color: #adb5bd; color: white; }

.role-admin-card { color: #dc3545; }
.role-dispatcher-card { color: #0fa873;  }
.role-engineer-card { color: #195698; }
.role-client-card { color: #16961a; }
.role-default-card { color: #adb5bd; }

.organization-cell,
.object-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Стили для карточек */
.card-select-checkbox {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Состояния загрузки */
.custom-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 60px;
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

.custom-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 60px;
  color: #666;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.custom-empty h3 {
  margin-bottom: 10px;
  color: #333;
}

.custom-empty p {
  color: #777;
}
</style>