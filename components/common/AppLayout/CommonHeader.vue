<!-- src/components/common/AppLayout/CommonHeader.vue -->
<template>
  <template v-if="!isMobile">
  <header class="app-header" role="banner">
    <div class="interface-and-crumbs" aria-hidden="true">
      <!-- Имя панели по роли -->
      <div class="name-of-interface">
        <span v-if="userRole === 'admin'">Панель администратора</span>
        <span v-else-if="userRole === 'dispatcher'">Панель диспетчера</span>
        <span v-else-if="userRole === 'engineer'">Панель инженера</span>
        <span v-else-if="userRole === 'client'">Клиентский портал</span>
        <span v-else>Панель</span>
      </div>
    </div>
    <!-- Правая часть: уведомления и профиль -->
    <div class="header-right">
      <slot name="actions"></slot>
    </div>
  </header>
  </template>
  <template v-else>
  <header class="app-header-mobile" role="banner">

    <!-- Правая часть: уведомления и профиль -->
    <div class="header-right">
      <slot name="actions"></slot>
    </div>
  </header>
  </template>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { getUserRole } from '@/utils/auth.utils'

const userRole = getUserRole()
const isMobile = ref(false)
// Проверка мобильного устройства
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 900
}

// Добавляем обработчики
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
:root {
  --sidebar-header-height: 55px;
}

/* Основной контейнер шапки */
.app-header {
  position: fixed;
  top: 0;
  left: var(--sidebar-width, 250px);
  width: calc(100% - var(--sidebar-width, 250px));
  height: 54px;
  min-height: var(--sidebar-header-height);
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-sizing: border-box;
  background: linear-gradient(135deg, #031432 0%, #0a1a3a 100%);
  z-index: 1199;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.app-header-mobile {
  position: fixed;
  top: 0;
  left: var(--sidebar-width, 20px);
  width: calc(100% - var(--sidebar-width, 20px));
  height: 54px;
  min-height: var(--sidebar-header-height);
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  box-sizing: border-box;
  background: linear-gradient(135deg, #031432 0%, #0a1a3a 100%);
  z-index: 1199;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Название интерфейса */
.name-of-interface {
  margin-bottom: 0px;
  margin-left: 15%;
  min-width: 240px;
  font-size: 18px;
  max-width: 100%;
  font-weight: 500;
  color: #E5E4E2;
  line-height: var(--sidebar-header-height);
  height: var(--sidebar-header-height);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

/* Мелкая адаптация при сжатии экрана */
@media (max-width: 1200px) {
  .app-header-mobile {
    left: var(--sidebar-width-collapsed, 80px);
    width: calc(100% - var(--sidebar-width-collapsed, 80px));
    padding: 0 14px;
  }
  .name-of-interface { 
    min-width: 120px;
    font-size: 16px;
    margin-left: 8%;
  }
}

/* Мобильный режим — сайдбар скрыт, шапка занимает всю ширину */
@media (max-width: 900px) {
  .app-header-mobile {
    left: 0;
    width: 100%;
    padding: 0 12px;
    height: 50px;
    min-height: 50px;
  }

  .name-of-interface {
    font-size: 14px;
    margin-left: 50px;
    white-space: normal;
    max-width: 100%;
    line-height: 1.3;
    height: auto;
    display: flex;
    align-items: center;
  }

  .header-right {
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .app-header-mobile {
    padding: 0 10px;
    height: 50px;
    min-height: 50px;
  }

  .name-of-interface {
    font-size: 14px;
    max-width: 100%;
  }
}
</style>