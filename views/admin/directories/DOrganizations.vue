<!--
    Справочник организаций
    Таблица компаний с поиском и фильтрацией
    Создание/редактирование компаний, управление контактными лицами
-->
<template>
  <!-- Основной контент страницы -->
  <UIIcons ref="uiIcons" />
  <DeleteNotification ref="deleteNotification" />
  <SuccessNotification ref="successOrganizationModal" />

  <div class="all-organizations-page">
    <!-- Панель с кнопками над таблицей -->
    <div class="table-controls">
      <div class="table-controls-left">
        <button 
          v-if="canDeleteOrg"
          type="button" 
          class="btn danger" 
          @click.stop="deleteSelectedOrgs" 
          :disabled="selectedOrgIds.length === 0"
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
              <Icon :icon="uiIcons?.icons.organizationSearch" width="24" height="24" />
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
                <span v-if="selectedTypes.length > 0" class="filter-badge">{{ selectedTypes.length }}</span>
              </button>

              <!-- Выпадающий список фильтров -->
              <Teleport to="body">
              <div v-if="isMobileFiltersOpen" class="mobile-filters-dropdown" :style="dropdownStyle" @click.stop>
                <div class="dropdown-content">
                  <button
                    class="mobile-filter-option"
                    :class="{ active: selectedTypes.includes(organizationTypeMap.mainOrganization) }"
                    @click="setQuickFilter('mainOrganization')"
                  >
                    <span class="filter-option-text">Основная организация</span>
                    <span v-if="selectedTypes.includes(organizationTypeMap.mainOrganization)" class="check-icon">✓</span>
                  </button>
                  <button
                    class="mobile-filter-option"
                    :class="{ active: selectedTypes.includes(organizationTypeMap.contractor) }"
                    @click="setQuickFilter('contractor')"
                  >
                    <span class="filter-option-text">Подрядчики</span>
                    <span v-if="selectedTypes.includes(organizationTypeMap.contractor)" class="check-icon">✓</span>
                  </button>
                  <button
                    class="mobile-filter-option"
                    :class="{ active: selectedTypes.includes(organizationTypeMap.subcontractor) }"
                    @click="setQuickFilter('subcontractor')"
                  >
                    <span class="filter-option-text">Субподрядчики</span>
                    <span v-if="selectedTypes.includes(organizationTypeMap.subcontractor)" class="check-icon">✓</span>
                  </button>
                  <button
                    class="mobile-filter-option"
                    :class="{ active: selectedTypes.includes(organizationTypeMap.customer) }"
                    @click="setQuickFilter('customer')"
                  >
                    <span class="filter-option-text">Заказчики</span>
                    <span v-if="selectedTypes.includes(organizationTypeMap.customer)" class="check-icon">✓</span>
                  </button>
                </div>
              </div>
              </Teleport>
            </div>

            <!-- Кнопка создания организации (мобильная версия) -->
            <UIButton
              v-if="canCreateOrganization && isMobile"
              class="create-org-btn-mobile"
              @click="openCreateModal"
            >
              <span class="btn-content">
                <Icon :icon="uiIcons?.icons.organizationCreate" width="20" height="20" />
              </span>
            </UIButton>

        <!-- Десктопные фильтры -->
        <div v-if="!isMobile" class="quick-filters">
          <UIButton
            class="filter-btn"
            :class="{ 'filter-btn--mainOrganization--active': selectedTypes.includes(organizationTypeMap.mainOrganization) }"
            @click="setQuickFilter('mainOrganization')"
          >
            Основная организация
          </UIButton>
          <UIButton
            class="filter-btn"
            :class="{ 'filter-btn--contractor--active': selectedTypes.includes(organizationTypeMap.contractor) }"
            @click="setQuickFilter('contractor')"
          >
            Подрядчики
          </UIButton>
          <UIButton
            class="filter-btn"
            :class="{ 'filter-btn--subcontractor--active': selectedTypes.includes(organizationTypeMap.subcontractor) }"
            @click="setQuickFilter('subcontractor')"
          >
            Субподрядчики
          </UIButton>
          <UIButton
            class="filter-btn"
            :class="{ 'filter-btn--customer--active': selectedTypes.includes(organizationTypeMap.customer) }"
            @click="setQuickFilter('customer')"
          >
            Заказчики
          </UIButton>
        </div>
      </div>

      <div class="table-controls-right" v-if="!isMobile">
        <UIButton
          class="create-organization-btn"
          @click="openCreateModal"
          v-if="canCreateOrganization"
        >
          <span class="btn-content">
            <Icon :icon="uiIcons?.icons.organizationCreate" width="22" height="22" />
            <span>Создать организацию</span>
          </span>
        </UIButton>
      </div>
    </div>

    <!-- Таблица организаций -->
    <div class="table-section">
      <OrganizationsTable
        :organizations="organizations"
        :loading="loading"
        :pagination="paginationData"
        :selected-org-ids="selectedOrgIds"
        :view-mode="viewMode"
        @update:selectedOrgIds="handleSelectionChange"
        @rowClick="handleRowClick"
        @pageChange="handlePageChange"
      />
    </div>

    <!-- Модалка профиля -->
    <OrganizationProfileModal
      v-model="modalVisible"
      :mode="modalMode"
      :organization="selectedOrganization"
      @saved="handleOrganizationSaved"
      @deleted="handleOrganizationDeleted"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted, nextTick } from 'vue'
import UIInput from '@/components/common/UI/UIInput.vue'
import { getUserRole } from '@/utils/auth.utils'
import { useOrganizationsStore } from '@/stores/organizations.store'
import OrganizationsTable from '@/components/tables/OrganizationsTable.vue'
import OrganizationProfileModal from '@/components/modal/OrganizationProfileModal.vue'
import DeleteNotification from '@/components/notifications/DeleteNotification.vue'
import SuccessNotification from '@/components/notifications/SuccessNotification.vue'
import { Icon } from '@iconify/vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'
import UIButton from '@/components/common/UI/UIButton.vue'

const uiIcons = ref()
const organizationsStore = useOrganizationsStore()
const searchQuery = ref('')
const selectedTypes = ref([]) // хранит id: 1,2,3,4
const organizations = ref([])
const loading = ref(false)
const selectedOrgIds = ref([]) // массив ID выбранных организаций
const deleteNotification = ref(null)
const selectedOrganization = ref(null)
const successOrganizationModal = ref()
const modalVisible = ref(false)
const modalMode = ref('create')
const viewMode = ref('table')
const isMobile = ref(false)
const isMobileFiltersOpen = ref(false)
const mobileFiltersWrapperRef = ref(null)
const dropdownStyle = ref({})

// Map типов организаций (UI key -> id)
const organizationTypeMap = {
  mainOrganization: 1, // Основная организация
  contractor: 2,       // Подрядчик
  subcontractor: 3,    // Субподрядчик
  customer: 4,         // Заказчик
}

// Проверка прав на создание организации
const canCreateOrganization = computed(() => {
  return getUserRole() === 'admin'
})

// Пагинация
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

const canDeleteOrg = computed(() => {
  return getUserRole() === 'admin'
})

// Текст подсказки для кнопки удаления
const getDeleteButtonTitle = computed(() => {
  if (selectedOrgIds.value.length === 0) {
    return 'Выберите организации для удаления'
  }
  return `Удалить выбранные организации (${selectedOrgIds.value.length})`
})

// Обработка изменения выбранных пользователей
const handleSelectionChange = (newSelection) => {
  selectedOrgIds.value = newSelection
}

// Загрузка организаций
const loadOrganizations = async (url) => {
  loading.value = true

  try {
    const params = {
      search: searchQuery.value,
      types: selectedTypes.value,
    }
    if(url){
      params.url = url
    }

    const response = await organizationsStore.fetchOrganizations(params)

    if (response && response.data) {
      if (response.data.data) {
        organizations.value = response.data.data || []
        paginationData.value = {
          current_page: response.data.current_page || 1,
          last_page: response.data.last_page || 1,
          per_page: response.data.per_page || 20,
          prev_page_url: response.data.prev_page_url || null,
          next_page_url: response.data.next_page_url || null,
          total: response.data.total || 0,
          links: response.data.links || [],
          from: response.data.from || 0,
          to: response.data.to || 0,
        }
      } else {
        organizations.value = []
      }
    } else {
      organizations.value = []
    }
  } catch (error) {
    console.error('Ошибка загрузки организаций:', error)
    organizations.value = []
  } finally {
    loading.value = false
  }
}

// Множественное удаление выбранных организаций
const deleteSelectedOrgs = async () => {
  if (selectedOrgIds.value.length === 0) return
  
  const confirmed = await deleteNotification.value?.open({
    title: 'Подтверждение массового удаления',
    mainMessage: `Вы действительно хотите удалить организации?`,
    secondaryMessage: 'Это действие необратимо. Все данные организаций и их пользователей будут удалены.',
    confirmText: 'Удалить'
  })
  
  if (!confirmed) return
  
  loading.value = true
  
  try {
    const result = await organizationsStore.deleteOrganizations(selectedOrgIds.value)
    
    if (!result.data.validator_fails && !result.errors) {
      let confirmed = await successOrganizationModal.value.open({
        title: '',
        mainMessage: 'Организации успешно удалены',
        type: 'success',
      })
      if(confirmed){
        selectedOrgIds.value = []
        await loadOrganizations()
      }
    } else {
      await successOrganizationModal.value.open({
        title: '',
        mainMessage: 'Ошибка при удалении организаций. Организации не удалены',
        type: 'notSuccess',
      })
    }
  } catch (error) {
    console.error('Ошибка при удалении организаций:', error)
    await successOrganizationModal.value.open({
      title: '',
      mainMessage: 'Ошибка при удалении организаций. Организации не удалены',
      type: 'notSuccess',
    })
  } finally {
    loading.value = false
  }
}

// Открыть модалку создания
const openCreateModal = () => {
  selectedOrganization.value = null
  modalMode.value = 'create'
  modalVisible.value = true
}

// После сохранения
const handleOrganizationSaved = () => {
  organizationsStore.clearCache()
  loadOrganizations()
}

// После удаления
const handleOrganizationDeleted = () => {
  organizationsStore.clearCache()
  loadOrganizations()
}

// Клик по строке таблицы
const handleRowClick = (organization) => {
  if (!organization) return

  selectedOrganization.value = organization
  modalMode.value = 'edit'
  modalVisible.value = true
}

// Изменение страницы
const handlePageChange = (page) => {
  paginationData.value.current_page = page
  loadOrganizations()
}

// Поиск
const handleSearch = () => {
  paginationData.value.current_page = 1
  loadOrganizations()
  if (isMobile.value) {
    isMobileFiltersOpen.value = false
  }
}

// Быстрые фильтры через map
const setQuickFilter = (typeKey) => {
  const typeId = organizationTypeMap[typeKey]

  if (!typeId) return

  if (selectedTypes.value.includes(typeId)) {
    selectedTypes.value = selectedTypes.value.filter((t) => t !== typeId)
  } else {
    selectedTypes.value = [...selectedTypes.value, typeId]
  }

  paginationData.value.current_page = 1
  loadOrganizations()
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

// Инициализация
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  document.addEventListener('click', handleClickOutside)
  loadOrganizations()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.all-organizations-page{
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
  align-items: center;        /* Выравнивает по вертикал */
  padding-right: 20px;
}

.table-controls-left{
  display: flex;
  align-items: center;
  width: 70%;
  gap: 20px;
  padding-left: 20px;
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

  .filter-btn--mainOrganization--active {
  background-color: #1914b0;
  color: white;
  transform: scale(1.02);
  border: none;
}

.filter-btn--contractor--active {
  background-color: #11af8a;
  color: white;
  transform: scale(1.02);
  border: none;
}

.filter-btn--subcontractor--active {
  background-color: #1a7ccc;
  color: white;
  transform: scale(1.02);
  border: none;
}

.filter-btn--customer--active {
  background-color: #16961a;
  color: white;
  transform: scale(1.02);
  border: none;
}

.filter-btn--mainOrganization--active:hover {
  background-color: #16129b;
  color: white;
  transform: scale(1.05);
  border: none;
}

.filter-btn--contractor--active:hover {
  background-color: #109b7b;
  color: white;
  transform: scale(1.05);
  border: none;
}

.filter-btn--subcontractor--active:hover {
  background-color: #106ebb;
  color: white;
  transform: scale(1.05);
  border: none;
}

.filter-btn--customer--active:hover {
  background-color: #138717;
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

.create-organization-btn {
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

.create-organization-btn:hover {
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

.create-org-btn-mobile {
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

.create-org-btn-mobile:hover {
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
  
  .create-org-btn-mobile {
    width: 28px;
    height: 28px;
  }
}
</style>