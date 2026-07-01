<template>
  <!-- Основной контент страницы -->
  <div class="all-objects-page">
    <UIIcons ref="uiIcons" />
    <DeleteNotification ref="deleteNotification" />
    <SuccessNotification ref="successObjectModal" />
    <!-- Панель с кнопками над таблицей -->

    <div class="table-controls">
      <div class="table-controls-left">
        <button 
          v-if="canDeleteObject"
          type="button" 
          class="btn danger" 
          @click.stop="deleteSelectedObjects" 
          :disabled="!selectedObjectIds || selectedObjectIds.length === 0"
          :title="getDeleteButtonTitle"
        >
          <Icon :icon="uiIcons?.icons.deleteOutline" width="22" height="22" />
        </button>
        
          <div class="search-section">
            <UIInput
              v-model="searchQuery"
              placeholder="Поиск по объектам..."
              type="text"
              :max-length="30"
              @keyup.enter="handleSearch"
              class="search-input"
              customClass="search-ui-input"
            />
            <button class="search-btn" @click="handleSearch">
              <Icon :icon="uiIcons?.icons.objectSearch" width="24" height="24" />
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
              <span v-if="selectedOrganizations && selectedOrganizations.length > 0" class="filter-badge">
                {{ selectedOrganizations.length }}
              </span>
            </button>

            <!-- Выпадающее окно фильтров для мобильных -->
            <Teleport to="body">
            <div v-if="isMobileFiltersOpen" class="mobile-filters-dropdown" :style="dropdownStyle" @click.stop>
              <div class="dropdown-content">
                <!-- Комбобокс для выбора организаций -->
                <div class="mobile-combobox-wrapper">
                  <UIComboBox
                    ref="organizationsFilterInput"
                    v-model="selectedOrganizations"
                    :return-object="true"
                    :options="[]"
                    option-label="name"
                    option-value="id"
                    placeholder="Выберите организации"
                    :search-debounce="500"
                    :max-length="30"
                    :multiple="true"
                    :load-options="getOrgOptions"
                    @update:model-value="handleOrganizationsFilterChange"
                  />
                </div>
                <!-- Список выбранных организаций -->
                <div v-if="selectedOrganizations && selectedOrganizations.length > 0" class="selected-filters-list">
                  <div class="selected-filters-items">
                    <div 
                      v-for="org in selectedOrganizations" 
                      :key="org.id" 
                      class="selected-filter-item"
                    >
                      <span class="selected-filter-label">{{ org.name }}</span>
                      <button 
                        type="button" 
                        class="remove-filter-item-btn"
                        @click="removeOrganizationFilter(org.id)"
                        title="Убрать фильтр"
                      >
                        <Icon :icon="uiIcons?.icons.close" width="16" height="16" />
                      </button>
                    </div>
                  </div>
                </div>
                <div v-else class="no-filters-message">
                  <span>Нет выбранных фильтров</span>
                </div>
              </div>
            </div>
            </Teleport>
          </div>

          <!-- Кнопка создания объекта (мобильная версия) -->
          <UIButton
            v-if="canCreateObject && viewMode === 'cards' && isMobile"
            class="create-object-btn-mobile"
            @click="openCreateModal"
          >
            <span class="btn-content">
              <Icon :icon="uiIcons?.icons.objectCreate" width="20" height="20" />
            </span>
          </UIButton>

        <!-- Десктопный фильтр по организациям -->
        <div class="organizations-filter" v-if="!isMobile">
          <UIComboBox
            ref="organizationsFilterInput"
            v-model="selectedOrganizations"
            :return-object="true"
            :options="[]"
            option-label="name"
            option-value="id"
            placeholder="Выберите организации"
            :search-debounce="500"
            :max-length="30"
            :multiple="true"
            :load-options="getOrgOptions"
            @update:model-value="handleOrganizationsFilterChange"
          />
        </div>

        <!-- Активные фильтры (выпадающий список) - только для десктопа -->
        <div class="active-filters-dropdown" v-if="selectedOrganizations && selectedOrganizations.length > 0 && !isMobile">
          <button 
            type="button" 
            class="filters-dropdown-btn"
            @click="toggleFiltersDropdown"
          >
            <Icon :icon="uiIcons?.icons.filter" width="18" height="18" class="filter-icon"/>
            <span>Активные фильтры</span>
            <span class="filters-count">{{ selectedOrganizations.length }}</span>
            <Icon 
              :icon="uiIcons?.icons.arrowDown" 
              width="18" 
              height="18" 
              class="dropdown-arrow"
              :class="{ 'dropdown-arrow-open': isFiltersDropdownOpen }"
            />
          </button>
          
          <div v-if="isFiltersDropdownOpen" class="filters-dropdown-menu" @click.stop>
            <div class="dropdown-header">
              <span>Выбранные организации ({{ selectedOrganizations ? selectedOrganizations.length : 0 }})</span>
              <button 
                v-if="selectedOrganizations && selectedOrganizations.length > 0" 
                class="clear-all-btn"
                @click="clearAllFilters"
              >
                Очистить все
              </button>
            </div>
            <div class="dropdown-list">
              <div 
                v-for="org in selectedOrganizations" 
                :key="org.id" 
                class="filter-item"
              >
                <span class="filter-item-label">{{ org.name }}</span>
                <button 
                  type="button" 
                  class="remove-filter-btn"
                  @click="removeOrganizationFilter(org.id)"
                  title="Убрать фильтр"
                >
                  <Icon :icon="uiIcons?.icons.close" width="18" height="18" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="table-controls-right" v-if="viewMode === 'table' && !isMobile">
        <UIButton
          class="create-object-btn"
          @click="openCreateModal"
          v-if="canCreateObject"
        >
          <span class="btn-content">
            <Icon :icon="uiIcons?.icons.objectCreate" width="22" height="22" />
            <span>Создать объект</span>
          </span>
        </UIButton>
      </div>
    </div>













    <!-- Таблица объектов -->
    <div class="table-section">
      <ObjectsTable
        :objects="objects || []"
        :loading="loading"
        :view-mode="viewMode"
        :pagination="paginationData"
        :selectedObjectIds="selectedObjectIds || []"
        @update:selectedObjectIds="handleSelectionChange"
        @rowClick="handleRowClick"
        @pageChange="handlePageChange"
      />
    </div>

    <!-- Модалка профиля -->
    <ObjectProfileModal
      v-model="modalVisible"
      :mode="modalMode"
      :object="selectedObject"
      @saved="handleObjectSaved"
      @deleted="handleObjectDeleted"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted, nextTick } from 'vue'
import { getUserRole } from '@/utils/auth.utils'
import { useObjectsStore } from '@/stores/objects.store'
import ObjectsTable from '@/components/tables/ObjectsTable.vue'
import UIInput from '@/components/common/UI/UIInput.vue'
import UIButton from '@/components/common/UI/UIButton.vue'
import UIComboBox from '@/components/common/UI/UIComboBox.vue'
import ObjectProfileModal from '@/components/modal/ObjectProfileModal.vue'
import DeleteNotification from '@/components/notifications/DeleteNotification.vue'
import SuccessNotification from '@/components/notifications/SuccessNotification.vue'
import { Icon } from '@iconify/vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'
import { getOrgOptions } from '@/utils/select.options.utils'
import { webSocketHandler } from '@/utils/websocket.handler'

const uiIcons = ref()
const objectsStore = useObjectsStore()
const deleteNotification = ref()
const successObjectModal = ref()
const organizationsFilterInput = ref()

// Состояние
const searchQuery = ref('')
// Массив выбранных организаций для фильтра (всегда массив)
const selectedOrganizations = ref([])

const objects = ref([])
const loading = ref(false)
const isMobile = ref(false)
const selectedObjectIds = ref([])
const selectedObject = ref(null)
const modalVisible = ref(false)
const modalMode = ref('create')
const viewMode = ref('table')
const isFiltersDropdownOpen = ref(false)
const isMobileFiltersOpen = ref(false)
const mobileFiltersWrapperRef = ref(null)
const dropdownStyle = ref({})

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
    zIndex: 9998
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

// Права доступа
const canCreateObject = computed(() => {
  return getUserRole() === 'admin'
})

const canDeleteObject = computed(() => {
  return getUserRole() === 'admin'
})

const canFilterByOrganizations = computed(() => {
  return getUserRole() === 'admin'
})

// Текст подсказки для кнопки удаления
const getDeleteButtonTitle = computed(() => {
  if (!selectedObjectIds.value || selectedObjectIds.value.length === 0) {
    return 'Выберите объекты для удаления'
  }
  return `Удалить выбранные объекты (${selectedObjectIds.value.length})`
})

// Обработка изменения выбранных объектов
const handleSelectionChange = (newSelection) => {
  selectedObjectIds.value = newSelection || []
}

// Загрузка объектов
const loadObjects = async (url) => {
  loading.value = true

  try {
    // Получаем ID организаций из массива
    const organizationsIds = selectedOrganizations.value && Array.isArray(selectedOrganizations.value)
      ? selectedOrganizations.value.filter(org => org && org.id).map(org => org.id)
      : []

    console.log('IDs организаций для фильтрации:', organizationsIds)

    
    const params = {
      search: searchQuery.value || '',
      organizations: organizationsIds,
    }
    if(url){
      params.url = url
    }

    console.log('Параметры загрузки объектов: ', params)

    const response = await objectsStore.fetchObjects(params)
    console.log('Ответ от API:', response)

    if (response && response.data) {
      if (response.data.data) {
        objects.value = response.data.data || []
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
        objects.value = []
        console.warn('Неожиданный формат ответа:', response.data)
      }

      console.log('Загружено объектов:', objects.value.length)
    } else {
      console.warn('Пустой ответ от API')
      objects.value = []
    }
  } catch (error) {
    console.error('Ошибка загрузки объектов:', error)
    objects.value = []
  } finally {
    loading.value = false
  }
}

// Множественное удаление выбранных объектов
const deleteSelectedObjects = async () => {
  if (!selectedObjectIds.value || selectedObjectIds.value.length === 0) return
  
  const confirmed = await deleteNotification.value?.open({
    title: 'Подтверждение массового удаления',
    mainMessage: `Вы действительно хотите удалить выбранные объекты?`,
    secondaryMessage: `Выбрано объектов: ${selectedObjectIds.value.length}. Это действие необратимо.`,
    confirmText: 'Удалить'
  })
  
  if (!confirmed) return
  
  loading.value = true
  
  try {
    const payload = { objects: selectedObjectIds.value }
    const result = await objectsStore.deleteObjects(payload)
    
    if (!result.validator_fails && !result.errors) {
      const confirmed2 = await successObjectModal.value.open({
        title: '',
        mainMessage: 'Объекты успешно удалены',
        type: 'success',
      })
      if (confirmed2) {
        selectedObjectIds.value = []
        await loadObjects()
      }
    } else {
      console.error('Ошибка при удалении объектов:', result)
      await successObjectModal.value.open({
        title: '',
        mainMessage: 'Ошибка при удалении объектов',
        type: 'notSuccess',
      })
    }
  } catch (error) {
    console.error('Ошибка при удалении объектов:', error)
    await successObjectModal.value.open({
      title: '',
      mainMessage: 'Ошибка при удалении объектов',
      type: 'notSuccess',
    })
  } finally {
    loading.value = false
  }
}

// Переключение выпадающего списка фильтров
const toggleFiltersDropdown = () => {
  isFiltersDropdownOpen.value = !isFiltersDropdownOpen.value
}

// Удаление фильтра по организации
const removeOrganizationFilter = (orgId) => {
  if (!selectedOrganizations.value || !Array.isArray(selectedOrganizations.value)) {
    selectedOrganizations.value = []
    return
  }
  selectedOrganizations.value = selectedOrganizations.value.filter(org => org && org.id !== orgId)
  paginationData.value.current_page = 1
  loadObjects()
}

// Очистка всех фильтров
const clearAllFilters = () => {
  selectedOrganizations.value = []
  paginationData.value.current_page = 1
  loadObjects()
  isFiltersDropdownOpen.value = false
  isMobileFiltersOpen.value = false
}

// Открыть модалку создания
const openCreateModal = () => {
  selectedObject.value = null
  modalMode.value = 'create'
  modalVisible.value = true
}

// После сохранения
const handleObjectSaved = () => {
  objectsStore.clearCache()
  loadObjects()
}

// После удаления
const handleObjectDeleted = () => {
  objectsStore.clearCache()
  loadObjects()
}

// Клик по строке таблицы
const handleRowClick = (object) => {
  if (!object) return
  selectedObject.value = object
  modalMode.value = 'edit'
  modalVisible.value = true
}

// Обработчик изменения страницы - принимает URL
const handlePageChange = async (url) => {
  if (!url) return
  loadObjects(url)
}

// Поиск
const handleSearch = () => {
  paginationData.value.current_page = 1
  loadObjects()
  if (isMobile.value) {
    isMobileFiltersOpen.value = false
  }
}

// Фильтр по организациям (вызывается при изменении в комбобоксе)
const handleOrganizationsFilterChange = (value) => {
  console.log('handleOrganizationsFilterChange received value:', value)
  
  // Убеждаемся что value - массив
  if (value && Array.isArray(value)) {
    selectedOrganizations.value = value
  } else if (value && !Array.isArray(value)) {
    selectedOrganizations.value = [value]
  } else {
    selectedOrganizations.value = []
  }
  
  console.log('selectedOrganizations после обработки:', selectedOrganizations.value)
  
  paginationData.value.current_page = 1
  loadObjects()
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

// Функция обновления данных
const refreshObjects = () => {
  console.log('🔄 Получено WebSocket уведомление, обновляем таблицу')
  loadObjects()  // или fetchObjects()
}

// Инициализация
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  selectedOrganizations.value = []
  loadObjects()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.all-objects-page{
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.table-controls {
  display: flex;
  position: sticky;
  top: 10px;
  gap: 20px;
  border-bottom: 3px solid rgb(210, 210, 210);
  width: 100%;
  padding-bottom: 10px;
}

.table-controls-left {
  display: flex;
  align-items: center;
  width: 70%;
  gap: 20px;
  padding-left: 20px;
  flex-wrap: wrap;
}

.table-controls-right {
  align-content: end;
  width: 30%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding-right: 20px;
}

.search-filter-create-section {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.table-section {
  padding: 10px;
  margin: 0 20px 0 20px;
  flex: 1;
  overflow: hidden;
  min-height: 0; 
}

.btn { 
  padding: 4px 4px; 
  border-radius: 50%; 
  cursor: pointer; 
  border: 1px solid rgba(0,0,0,0.08);
  transition: all 0.2s;
  display: flex;
  align-items: center;
}

.btn.danger:disabled {
  background: #b8b8b8; 
  color: #f0f0f0; 
  cursor: not-allowed;
  transform: none;
}

.btn:disabled:hover {
  transform: none;
}

.btn:hover:not(:disabled) {
  transform: scale(1.03);
  background: #c52727; 
}

.btn.danger { 
  background: #ef4444; 
  color: #fff; 
  border: none; 
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
  padding: 1px 6px 0px 4px;
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

.organizations-filter {
  min-width: 250px;
  max-width: 350px;
}

.organizations-filter :deep(.ui-combobox-wrapper) {
  width: 100%;
}

/* Стили для выпадающего списка активных фильтров (десктоп) */
.active-filters-dropdown {
  position: relative;
}

.filters-dropdown-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  color: #495057;
  transition: all 0.2s;
  white-space: nowrap;
}

.filters-dropdown-btn:hover {
  background-color: #e9ecef;
  border-color: #ced4da;
}

.filters-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  background-color: #319ef8;
  color: white;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  padding: 0 5px;
}

.dropdown-arrow {
  transition: transform 0.2s;
}

.dropdown-arrow-open {
  transform: rotate(180deg);
}

.filter-icon {
  color: #319ef8;
}

.filters-dropdown-menu {
  position: absolute;
  top: calc(100% + 5px);
  right: 0;
  min-width: 280px;
  max-width: 350px;
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  font-size: 12px;
  font-weight: 500;
  color: #495057;
}

.clear-all-btn {
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.clear-all-btn:hover {
  background-color: rgba(220, 53, 69, 0.1);
  text-decoration: underline;
}

.dropdown-list {
  max-height: 300px;
  overflow-y: auto;
}

.filter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.filter-item:hover {
  background-color: #f8f9fa;
}

.filter-item-label {
  font-size: 13px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}

.remove-filter-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px;
  border-radius: 50%;
  color: #888;
  transition: all 0.2s;
  flex-shrink: 0;
}

.remove-filter-btn:hover {
  color: #dc3545;
  background-color: rgba(220, 53, 69, 0.1);
  transform: scale(1.1);
}

/* Кнопка создания (десктоп) */
.create-object-btn {
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

.create-object-btn:hover {
  background: #28a23e;
  transform: scale(1.02);
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
  top: 0px;
  left: 15px;
  background: #dc3545;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: bold;
  min-width: 16px;
  text-align: center;
}

.mobile-filters-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.mobile-filters-dropdown {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  animation: fadeIn 0.2s ease;
  z-index: 9998;
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

.dropdown-content {
  padding: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.mobile-combobox-wrapper {
  margin-bottom: 16px;
}

.mobile-combobox-wrapper :deep(.ui-combobox-wrapper) {
  width: 100%;
}

.selected-filters-list {
  margin-top: 12px;
  border-top: 1px solid #e5e7eb;
  padding-top: 12px;
}

.selected-filters-header {
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.selected-filters-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.selected-filter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  background-color: #f2f6ff;
  border-radius: 6px;
  font-size: 12px;
  color: #192436;
}

.selected-filter-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 8px;
}

.remove-filter-item-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px;
  border-radius: 50%;
  color: #888;
  transition: all 0.2s;
  flex-shrink: 0;
}

.remove-filter-item-btn:hover {
  color: #dc3545;
  background-color: rgba(220, 53, 69, 0.1);
}

.no-filters-message {
  text-align: center;
  padding: 20px;
  color: #9ca3af;
  font-size: 13px;
}

.clear-filters-btn {
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.clear-filters-btn:hover {
  background-color: rgba(220, 53, 69, 0.1);
  text-decoration: underline;
}

/* Мобильная кнопка создания */
.create-object-btn-mobile {
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

.create-object-btn-mobile:hover {
  background: #28a23e;
  transform: scale(1.05);
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

  .search-section {
    max-width: 250px;
  }

  .organizations-filter {
    min-width: 200px;
  }
  
  .filters-dropdown-menu {
    right: auto;
    left: 0;
    min-width: 260px;
  }
}

@media (max-width: 1024px) {
  .search-btn {
    padding: 1px 4px;
    font-size: 11px;
  }
  .table-controls-left {
    gap: 12px;
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
}

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
  
  .organizations-filter {
    display: none;
  }
  
  .active-filters-dropdown {
    display: none;
  }
  
  .table-controls-right {
    display: none;
  }
}

@media (max-width: 480px) {
  .mobile-filter-btn {
    width: 28px;
    height: 28px;
  }
  
  .create-object-btn-mobile {
    width: 28px;
    height: 28px;
  }
}
</style>