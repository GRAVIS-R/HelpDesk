<template>
  <!-- Основной контент страницы -->
  <div class="all-users-page">
    <UIIcons ref="uiIcons" />
    <DeleteNotification ref="deleteNotification" />
    <SuccessNotification ref="successUserModal" />

    <!-- Панель с кнопками над таблицей -->
    <div class="table-controls">
      <div class="table-controls-left">
        <button 
          v-if="canDeleteUsers"
          type="button" 
          class="btn danger" 
          @click.stop="deleteSelectedUsers" 
          :disabled="selectedUserIds.length === 0"
          :title="getDeleteButtonTitle"
        >
          <Icon :icon="uiIcons?.icons.deleteOutline" width="22" height="22" />
        </button>

        <div class="search-section">
          <UIInput
            v-model="searchQuery"
            placeholder="Поиск..."
            type="text"
            :max-length="30"
            @keyup.enter="handleSearch"
            class="search-input"
            customClass="search-ui-input"
          /> 
          <button class="search-btn" @click="handleSearch">
            <Icon :icon="uiIcons?.icons.userSearch" width="24" height="24"/>
          </button> 
        </div>

          <!-- Мобильная кнопка фильтров -->
        <div v-if="isMobile" class="mobile-filters-wrapper" ref="mobileFiltersWrapperRef">
          <button 
            class="mobile-filter-btn"
            @click="toggleMobileFilters"
            :class="{ 'active': isMobileFiltersOpen }"
          >
            <Icon :icon="uiIcons?.icons.filter" width="20" height="20" />
            <span v-if="selectedRoles.length > 0" class="filter-badge">{{ selectedRoles.length }}</span>
          </button>

          <!-- Выпадающий список фильтров -->
          <Teleport to="body">
          <div v-if="isMobileFiltersOpen" class="mobile-filters-dropdown" :style="dropdownStyle" @click.stop>
            <div class="dropdown-content">
              <button
                class="mobile-filter-option"
                :class="{ active: selectedRoles.includes('admin') }"
                @click="setQuickFilter('admin')"
              >
                <span class="filter-option-text">Администраторы</span>
                <span v-if="selectedRoles.includes('admin')" class="check-icon">✓</span>
              </button>
              <button
                class="mobile-filter-option"
                :class="{ active: selectedRoles.includes('dispatcher') }"
                @click="setQuickFilter('dispatcher')"
              >
                <span class="filter-option-text">Диспетчеры</span>
                <span v-if="selectedRoles.includes('dispatcher')" class="check-icon">✓</span>
              </button>
              <button
                class="mobile-filter-option"
                :class="{ active: selectedRoles.includes('engineer') }"
                @click="setQuickFilter('engineer')"
              >
                <span class="filter-option-text">Инженеры</span>
                <span v-if="selectedRoles.includes('engineer')" class="check-icon">✓</span>
              </button>
              <button
                class="mobile-filter-option"
                :class="{ active: selectedRoles.includes('client') }"
                @click="setQuickFilter('client')"
              >
                <span class="filter-option-text">Клиенты</span>
                <span v-if="selectedRoles.includes('client')" class="check-icon">✓</span>
              </button>
            </div>
          </div>
        </Teleport>
        </div>

        <!-- Кнопка создания пользователя (мобильная версия) -->
        <UIButton
          v-if="canCreateUser && viewMode === 'cards' && isMobile"
          class="create-user-btn-mobile"
          @click="openCreateModal"
        >
          <span class="btn-content">
            <Icon :icon="uiIcons?.icons.userCreate" width="20" height="20"/>
          </span>
        </UIButton>

        <!-- Десктопные фильтры -->
        <div v-if="!isMobile" class="quick-filters">
          <UIButton
            class="filter-btn"
            :class="{ 'filter-btn--admin--active': selectedRoles.includes('admin') }"
            @click="setQuickFilter('admin')"
          >
            Администраторы
          </UIButton>
          <UIButton
            class="filter-btn"
            :class="{ 'filter-btn--dispatcher--active': selectedRoles.includes('dispatcher') }"
            @click="setQuickFilter('dispatcher')"
          >
            Диспетчеры
          </UIButton>
          <UIButton
            class="filter-btn"
            :class="{ 'filter-btn--engineer--active': selectedRoles.includes('engineer') }"
            @click="setQuickFilter('engineer')"
          >
            Инженеры
          </UIButton>
          <UIButton
            class="filter-btn"
            :class="{ 'filter-btn--client--active': selectedRoles.includes('client') }"
            @click="setQuickFilter('client')"
          >
            Клиенты
          </UIButton>
        </div>
      </div>

      <div class="table-controls-right" v-if="viewMode === 'table' && !isMobile">
        <UIButton
          class="create-user-btn"
          @click="openCreateModal"
          v-if="canCreateUser"
        >
          <span class="btn-content">
            <Icon :icon="uiIcons?.icons.userCreate" width="22" height="22"/>
            <span>Создать пользователя</span>
          </span>
        </UIButton>
      </div>
    </div>

    <!-- Таблица пользователей -->
    <div class="table-section">
      <UsersTable
        :users="users"
        :loading="loading"
        :pagination="paginationData"
        :view-mode="viewMode"
        :show-laravel-pagination="false"
        :selected-user-ids="selectedUserIds"
        @update:selectedUserIds="handleSelectionChange"
        @rowClick="handleRowClick"
        @pageChange="handlePageChange"
      />
    </div>

    <!-- Модальные окна -->
    <UserProfileModal
      v-model="modalVisible"
      :mode="modalMode"
      :user="selectedUser"
      @saved="handleUserSaved"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted, nextTick } from 'vue'
import UIInput from '@/components/common/UI/UIInput.vue'
import { getUserRole, getUserId } from '@/utils/auth.utils'
import { useUsersStore } from '@/stores/users.store'
import UsersTable from '@/components/tables/UsersTable.vue'
import UserProfileModal from '@/components/modal/UserProfileModal.vue'
import DeleteNotification from '@/components/notifications/DeleteNotification.vue'
import SuccessNotification from '@/components/notifications/SuccessNotification.vue'
import UIButton from '@/components/common/UI/UIButton.vue'
import { Icon } from '@iconify/vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'

const uiIcons = ref()
const usersStore = useUsersStore()
const searchQuery = ref('')
const selectedRoles = ref([])
const users = ref([])
const loading = ref(false)
const activeFilters = ref({})
const selectedUserIds = ref([])
const selectedUser = ref(null)
const modalVisible = ref(false)
const modalMode = ref('user')
const deleteNotification = ref(null)
const successUserModal = ref()
const viewMode = ref('table')
const isMobile = ref(false)
const isMobileFiltersOpen = ref(false)
const mobileFiltersWrapperRef = ref(null)
const dropdownStyle = ref({})

// Поля для карточек
const cardFields = [
  { key: 'full_name', label: 'Пользователь' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Роль' },
  { key: 'organization', label: 'Организация' },
  { key: 'object', label: 'Объект' },
]

// Проверка прав
const canCreateUser = computed(() => getUserRole() === 'admin')
const canDeleteUsers = computed(() => getUserRole() === 'admin')

const getDeleteButtonTitle = computed(() => {
  if (selectedUserIds.value.length === 0) {
    return 'Выберите пользователей для удаления'
  }
  return `Удалить выбранных пользователей (${selectedUserIds.value.length})`
})

const handleSelectionChange = (newSelection) => {
  selectedUserIds.value = newSelection
}

const roleIdMap = {
  'admin': 1,
  'dispatcher': 2,
  'engineer': 3,
  'client': 4
}

const paginationData = ref({
  current_page: 1,
  last_page: 1,
  per_page: 20,
  prev_page_url: null,
  next_page_url: null,
  total: 0,
  links: [],
  from: 0,
  to: 0,
})

const lastRequestParams = ref({
  search: '',
  roles: [],
  page: 1
})

// Функция для вычисления позиции выпадающего списка
const updateDropdownPosition = () => {
  if (!mobileFiltersWrapperRef.value) return
  
  const buttonRect = mobileFiltersWrapperRef.value.getBoundingClientRect()
  
  dropdownStyle.value = {
    position: 'fixed',
    top: `${buttonRect.bottom + 8}px`,
    right: `${window.innerWidth - buttonRect.right}px`,
    minWidth: '220px',
    zIndex: 9999
  }
}

// Открытие/закрытие фильтров
const toggleMobileFilters = () => {
  if (!isMobileFiltersOpen.value) {
    // При открытии обновляем позицию
    nextTick(() => {
      updateDropdownPosition()
    })
  }
  isMobileFiltersOpen.value = !isMobileFiltersOpen.value
}

// Закрытие выпадающего списка при клике вне
const handleClickOutside = (event) => {
  const wrapper = document.querySelector('.mobile-filters-wrapper')
  const dropdown = document.querySelector('.mobile-filters-dropdown')
  
  if (wrapper && !wrapper.contains(event.target) && dropdown && !dropdown.contains(event.target)) {
    isMobileFiltersOpen.value = false
  }
}

// Загрузка пользователей
const loadUsers = async (url) => {
  loading.value = true
  try {
    const params = {
      search: searchQuery.value,
      roles: activeFilters.value.role || [],
    }
    const currentPage = paginationData.value.current_page

    lastRequestParams.value = {
      search: params.search,
      roles: [...params.roles],
      page: currentPage
    }
    if(url){
      params.url = url
    }

    const response = await usersStore.fetchUsers(params)

    if (response?.data && Array.isArray(response.data.data)) {
      users.value = response.data.data
      paginationData.value = {
        current_page: response.data.current_page || 1,
        last_page: response.data.last_page || 1,
        per_page: response.data.per_page || 20,
        prev_page_url: response.data.prev_page_url || null,
        next_page_url: response.data.next_page_url || null,
        total: response.data.total || 0,
        links: response.data.links || [],
        from: response.data.from || 0,
        to: response.data.to || 0
      }
    } else {
      users.value = []
    }
  } catch (error) {
    console.error('Ошибка загрузки пользователей:', error)
  } finally {
    loading.value = false
  }
}

// Множественное удаление
const deleteSelectedUsers = async () => {
  if (selectedUserIds.value.length === 0) return
  
  const confirmed = await deleteNotification.value?.open({
    title: 'Подтверждение массового удаления',
    mainMessage: `Вы действительно хотите удалить ${selectedUserIds.value.length} пользователей?`,
    secondaryMessage: 'Это действие необратимо. Все данные пользователей будут потеряны.',
    confirmText: 'Удалить'
  })
  
  if (!confirmed) return
  
  loading.value = true
  
  try {
    const payload = { users: selectedUserIds.value }
    const result = await usersStore.deleteUsers(payload)
    
    if (!result.validate_fails && !result.errors) {
      let confirmed = await successUserModal.value.open({
        title: '',
        mainMessage: 'Пользователь успешно удален',
        type: 'success',
      })
      if(confirmed){
        selectedUserIds.value = []
        await loadUsers()
      }
    } else {
      await successUserModal.value.open({
        title: '',
        mainMessage: 'Ошибка при удалении пользователей. Пользователи не удалены',
        type: 'notSuccess',
      })
    }
  } catch (error) {
    console.error('Ошибка при удалении пользователей:', error)
    await successUserModal.value.open({
      title: '',
      mainMessage: 'Ошибка при удалении пользователей. Пользователи не удалены',
      type: 'notSuccess',
    })
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  selectedUser.value = null
  modalMode.value = 'create'
  modalVisible.value = true
}

const handleUserSaved = () => {
  usersStore.clearCache()
  loadUsers()
}

const handleRowClick = (user) => {
  if (!user) return
  const safeUser = {
    id: user.id,
    user_id: user.id,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    middle_name: user.middle_name || '',
    email: user.email || '',
    login: user.login || '',
    phone_number: user.phone_number || null,
    role: user.role || null,
    role_id: user.role.id || null,
    organization: user.organization,
    object: user.object || null,
  }

  if(getUserId() === user.user_id){
    modalMode.value = 'self'
  } else {
    modalMode.value = 'user'
  }
  selectedUser.value = safeUser
  modalVisible.value = true
}

const getRoleNameFromId = (roleId) => {
  switch (Number(roleId)) {
    case 1: return 'Администратор'
    case 2: return 'Диспетчер'
    case 3: return 'Инженер'
    case 4: return 'Клиент'
    default: return null
  }
}

const handlePageChange = (page) => {
  paginationData.value.current_page = page
  loadUsers()
}

const handleSearch = () => {
  paginationData.value.current_page = 1
  loadUsers()
  if (isMobile.value) {
    isMobileFiltersOpen.value = false
  }
}

const setQuickFilter = (roleSlug) => {
  if (selectedRoles.value.includes(roleSlug)) {
    selectedRoles.value = selectedRoles.value.filter(r => r !== roleSlug)
  } else {
    selectedRoles.value = [...selectedRoles.value, roleSlug]
  }
  activeFilters.value.role = selectedRoles.value.map(slug => roleIdMap[slug])
  paginationData.value.current_page = 1
  loadUsers()
}

// Мобильные методы

const clearAllFilters = () => {
  selectedRoles.value = []
  activeFilters.value.role = []
  paginationData.value.current_page = 1
  loadUsers()
  isMobileFiltersOpen.value = false
}

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 900
  if (isMobile.value) {
    viewMode.value = 'cards'
  } else {
    viewMode.value = 'table'
    isMobileFiltersOpen.value = false
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  document.addEventListener('click', handleClickOutside)
  activeFilters.value.role = []
  selectedRoles.value = []
  loadUsers()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.all-users-page{
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.table-controls {
  display: flex;
  gap: 20px;
  border-bottom: 3px solid rgb(210, 210, 210);
  position: sticky;
  top: 10px;
  width: 100%;
  padding-bottom: 10px;
}

.table-controls-right{
  align-content: end;
  width: 30%;
  display: flex;
  justify-content: flex-end;  /* Прижимает содержимое к правому краю */
  align-items: center;        /* Выравнивает по вертикали */
  padding-right: 20px;
}

.table-controls-left{
  display: flex;
  align-items: center;
  width: 70%;
  gap: 20px;
  padding-left: 20px;
  flex-wrap: wrap;
}

.filter-section {
  display: flex;
  align-items: center;
}

.table-section {
  padding: 10px;
  margin: 0 20px 0 20px;
  flex: 1;
  overflow: hidden;
  min-height: 0; 
}

.quick-filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.search-filter-create-section{
  gap: 10px;
  display: flex;
  align-items: center;
  flex: 1;
}

.search-section {
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 300px;
}

.search-ui-input :deep(.ui-input) {
  padding-top: 2px !important;
  padding-left: 10px !important;
  padding-bottom: 2px !important;
  border-radius: 20px 0 0 20px !important;
  font-size: 14px !important;
}

.search-btn {
  background: #319ef8;
  color: white;
  border: 1px solid #1296e8;
  border-radius: 0 20px 20px 0;
  padding: 1px 6px;
  cursor: pointer;
  font-size: 12px;
  margin-left: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-btn:hover {
  background: #299eff;
  border-color: #339af0;
  transform: scale(1.05);
}

.reset-btn {
  padding: 6px 15px;
  font-size: 14px;
}

/* Адаптивность */
@media (max-width: 1200px) {
  .table-controls {
    flex-wrap: wrap;
    gap: 15px;
  }

  .table-controls-left {
    flex-wrap: wrap;
    width: 100%;
  }

  .quick-filters {
    width: 100%;
    justify-content: center;
    margin-top: 10px;
  }

  .search-section {
    max-width: 200px;
  }
}

  /* Общая кнопка */
  .filter-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 5px;
    font-weight: 300;
    font-size: 12px;
    border: 1px solid #195698;
    background-color: #f1f9ff;
    color: #195698;
    cursor: pointer;
    transition: transform .06s ease, box-shadow .12s ease, filter .06s ease;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 32px;
    line-height: 1;
    white-space: nowrap;
  }

  /* hover/active */
  .filter-btn:hover {
    background: #dbe4ff;
    border-color: #0056e9;
    transform: scale(1.02);
  }

  /* Активный (включённый) фильтр — более заметный эффект */
  .filter-btn--admin--active {
    background-color: #dc3545;
    color: white;
    transform: scale(1.02);
    border: none;
  }
  .filter-btn--dispatcher--active {
    background-color: #0fa873;
    color: white;
    transform: scale(1.02);
    border: none;
  }
  .filter-btn--engineer--active {
    background-color: #195698;
    color: white;
    transform: scale(1.02);
    border: none;
  }
  .filter-btn--client--active {
    background-color: #16961a;
    color: white;
    transform: scale(1.02);
    border: none;
  }

  .filter-btn--admin--active:hover {
    background-color: #ba1c2b;
    color: white;
    transform: scale(1.05);
    border: none;
  }
  .filter-btn--dispatcher--active:hover {
    background-color: #0e875d;
    color: white;
    transform: scale(1.05);
    border: none;
  }
  .filter-btn--engineer--active:hover {
    background-color: #114985;
    color: white;
    transform: scale(1.05);
    border: none;
  }
  .filter-btn--client--active:hover {
    background-color: #117b15;
    color: white;
    transform: scale(1.05);
    border: none;
  }

  /* Фокус-кейсы (keyboard accessible) */
  .filter-btn:focus {
    box-shadow: 0 0 0 2px rgba(56, 145, 255, 0.334);
    outline: none;
  }

.btn { 
  padding: 4px 4px; 
  border-radius:50%; 
  cursor:pointer; 
  border:1px solid rgba(0,0,0,0.08);
  transition: all 0.2s;
  display: flex;
  align-items: center;
}

.btn.danger:disabled {
  background:#b8b8b8; 
  color:#f0f0f0; 
  cursor: not-allowed;
  transform: none;
}

.btn:disabled:hover {
  transform: none;
}

.btn:hover:not(:disabled) {
  transform: scale(1.03);
  background:#c52727; 
}

.btn.danger { 
  background:#ef4444; 
  color:#fff; 
  border:none; 
}

.create-user-btn {
  background: #3cc93a;
  color: white;
  border: none;
  padding: 5px 14px;
  border-radius: 20px;
  font-weight: 400 !important;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;

}

.create-user-btn:hover {
  background: #28a23e;
  transform: scale(1.02);
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1;
}

.btn-content .iconify {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Мобильные фильтры */
.mobile-filters-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.mobile-filter-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f1f9ff;
  border: 1px solid #319ef8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.2s;
}

.mobile-filter-btn:hover {
  background: #dbe4ff;
  transform: scale(1.05);
}

.mobile-filter-btn.active {
  background: #319ef8;
  color: white;
}

.filter-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #dc3545;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: bold;
  min-width: 16px;
  text-align: center;
}

.mobile-filters-dropdown {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  animation: fadeIn 0.2s ease;
  z-index: 9999;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f8f9fa;
  border-bottom: 1px solid #e5e7eb;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.clear-filters-btn {
  background: none;
  border: none;
  color: #dc3545;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.clear-filters-btn:hover {
  background: rgba(220, 53, 69, 0.1);
}

.dropdown-content {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mobile-filter-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 6px 8px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #374151;
  transition: all 0.2s;
  text-align: left;
}

.mobile-filter-option:hover {
  background: #f3f4f6;
}

.mobile-filter-option.active {
  background: #e0e7ff;
  color: #144da8;
  font-weight: 500;
}

.filter-option-text {
  flex: 1;
}

.check-icon {
  color: #16bd00;
  font-weight: bold;
  font-size: 16px;
}

.create-user-btn-mobile {
  background: #3cc93a;
  color: white;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.create-user-btn-mobile:hover {
  background: #28a23e;
  transform: scale(1.05);
}

@media (max-width: 1024px) {
  .search-btn {
    padding: 1px 4px;
    font-size: 11px;
  }
  .table-controls-left {
    gap: 12px;
  }
  
  .filter-btn {
    padding: 6px 10px;
    font-size: 11px;
  }

  .table-section {
    padding: 5px;
    margin: 0 10px 0 10px;
    flex: 1;
    overflow: hidden;
    min-height: 0; 
  } 
}

@media (max-width: 900px) {
  .table-controls {
    flex-direction: column;
    gap: 12px;
    padding-bottom: 10px;
  }

  .table-controls-left {
    width: 100%;
    flex-wrap: wrap;
    gap: 12px;
    padding-left: 16px;
    padding-right: 16px;
  }

  .table-controls-right {
    width: 100%;
    padding-right: 16px;
    padding-left: 16px;
    justify-content: flex-start;
  }

  .search-section {
    max-width: 80%;
    flex: 1;
    min-width: 50px;
  }

  .quick-filters {
    width: 100%;
    justify-content: flex-start;
    margin-top: 0;
    gap: 8px;
    flex-wrap: wrap;
  }
}

/* Медиа-запросы */
@media (max-width: 768px) {
  .search-section {
    flex: 1;
    max-width: 70%;
  }
  
  .search-ui-input :deep(.ui-input) {
    font-size: 12px !important;
    padding-top: 2px !important;
    padding-bottom: 2px !important;
  }
  
  .quick-filters {
    display: none;
  }
  
  .table-controls-right {
    display: none;
  }
  
  .filter-btn {
    display: none;
  }
}

@media (max-width: 480px) {
  .mobile-filter-btn {
    width: 28px;
    height: 28px;
  }
  
  .create-user-btn-mobile {
    width: 28px;
    height: 28px;
  }
}
</style>