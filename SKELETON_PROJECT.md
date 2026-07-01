# Скелет проекта (Vue 3 + Pinia + Vue Router)

> Назначение: приложение Help Desk с разделением по ролям (admin/dispatcher/engineer/client), карточками заявок, справочниками и realtime-обновлениями через WebSocket.

---

## 1) Корень проекта
- `main.js` — входная точка: инициализация `sessionHandler`, подключение `pinia` и `router`, монтирование `App.vue`.
- `App.vue` — общий корневой компонент:
  - условный выбор `AuthLayout` / `MainLayout` по списку auth-роутов
  - показ `SessionNotifications`
  - отложенная готовность приложения через `router.isReady()`
- `package-lock.json` — lock-файл зависимостей.

---

## 2) API слой
- `api/axios.config.js` — (экземпляр/конфигурация axios; в проекте также есть `globalApiClient` в `utils/session.handler.js`).
- `api/auth.api.js` — API для auth (логин/регистрация/CSRF token и т.п.).
- `api/index.api.js` — единая точка экспорта API модулей (видно экспорт `authApi`).

---

## 3) Реалтайм и сессии
- `utils/session.handler.js`
  - глобальный обработчик сессий для axios:
    - добавление `X-CSRF-TOKEN` из `<meta name="csrf-token">`
    - перехват ответов:
      - `419` — обновление CSRF токена через `/get_token` и повтор запроса
      - `401` — logout + редирект на `login`
      - `403` — редирект на `unauthorized`
  - экспорт: `sessionHandler` (singleton)
- `utils/websocket.handler.js`
  - `WebSocketHandler` (singleton `webSocketHandler`):
    - получение ws-токена через `/get_web_socket_token`
    - подключение к WS: `ws://.../ws/token={token}`
    - подписки `on(event, callback)`, обработка `method` и event `'*'`
    - автопереподключение с ограничением попыток
    - `send(method, data)`

---

## 4) Хранилища (Pinia)
Каталог `stores/`:
- `auth.store.js`
  - состояние: `user`, `isAuthenticated`, вычисляемая `userRole`
  - методы: `login`, `loginMobile`, `logout`, `clearAuthData`, `initialize`, `synchronization`
  - роль конвертируется в `admin/dispatcher/engineer/client`
  - при логине подключает WebSocket
- `calendar.store.js` — календарь инженера.
- `classifications.store.js` — справочники классификаций.
- `notifications.store.js` — единая логика уведомлений.
- `objects.store.js` — справочник объектов.
- `organizations.store.js` — справочник организаций.
- `processes.store.js` — бизнес-процессы/шаблоны процессов.
- `support.groups.store.js` — группы поддержки.
- `tickets.store.js` — данные по заявкам.
- `users.store.js` — пользователи.

---

## 5) Утилиты
Каталог `utils/`:
- `auth.utils.js` — role mapping, localStorage helpers, события auth.
- `cashe.utils.js` — кеширование (название подразумевает кеш).
- `date.utils.js` — форматирование дат.
- `form.utils.js` — утилиты форм.
- `memory.monitor.js` — мониторинг памяти.
- `profile.utils.js` — профили.
- `select.options.utils.js` — подготовка данных для select.
- `session.handler.js` — обработка CSRF/401/419/403 (см. выше).
- `ticket.utils.js` — утилиты по заявкам.
- `websocket.handler.js` — realtime WS (см. выше).

---

## 6) Router (Vue Router)
- `router/index.js`
  - объединяет роуты всех ролей:
    - `auth.routes.js`
    - `dispatcher.routes.js`
    - `admin.routes.js`
    - `engineer.routes.js`
    - `client.routes.js`
  - глобальный `beforeEach` guard:
    - title по `to.meta.title`
    - сохранение `currentPath` в `localStorage`
    - `authStore.initialize()` перед проверками
    - публичные роуты: `login`, `forgot-password`, `unauthorized`
    - логика редиректа по роли на публичный login
    - для protected роутов:
      - проверка `to.meta.requiresAuth`
      - сравнение `to.meta.role`
- Ролевые конфиги:
  - `router/auth.routes.js` — страницы входа/восстановления.
  - `router/admin.routes.js` — `/admin/*` (admin).
  - `router/dispatcher.routes.js` — `/dispatcher/*` (dispatcher).
  - `router/engineer.routes.js` — `/engineer/*` (engineer).
  - `router/client.routes.js` — `/client/*` (client).

---

## 7) Лэйауты
Каталог `layouts/`:
- `AuthLayout.vue` — страница авторизации (фон/контейнер, header/минимальная навигация).
- `MainLayout.vue` — основной каркас приложения.

---

## 8) Компоненты UI общего назначения
Каталог `components/common/UI/`:
- `UIButton.vue` — кнопки.
- `UICard.vue` — карточки.
- `UIComboBox.vue` — комбобоксы.
- `UIIcons.vue` — иконки.
- `UIInput.vue` — инпуты.
- `UILabel.vue` — лейблы.
- `UIPagination.vue` — пагинация.
- `UIProfile.vue` — профиль.
- `UISelect.vue` — селекты.
- `UITable.vue` — таблицы.
- `UITextarea.vue` — textarea.

Каталог `components/common/AppLayout/`:
- `SidebarMenu.vue` — меню по ролям.
- `CommonHeader.vue` — общий header.
- `BreadCrumbs.vue` — хлебные крошки.
- `NotificationBell.vue` — колокольчик уведомлений.

Каталог `components/common/Filters/`:
- `UsersFilters.vue` — фильтры пользователей.

---

## 9) Модальные окна
Каталог `components/modal/`:
- `BusinessProcessCreate.vue` — создание бизнес-процесса.
- `BusinessProcessProfileModal.vue` — профиль/редактор бизнес-процесса.
- `ClassificationProfileModal.vue` — профиль классификации.
- `ObjectProfileModal.vue` — профиль объекта.
- `OrganizationProfileModal.vue` — профиль организации.
- `PasswordModal.vue` — смена/установка пароля.
- `SupportGroupProfileModal.vue` — профиль группы поддержки.
- `UserProfileModal.vue` — профиль пользователя.

Внутренние части модалок:
- `components/modal/bpparts/`
  - `BasicInfoEditor.vue`
  - `StatusEditor.vue`
  - `SupportGroupEditor.vue`
- Узлы:
  - `components/modal/nodes/DefaultNode.vue`

---

## 10) Уведомления и guards
Каталог `components/notifications/`:
- `SessionNotifications.vue` — роут/сессия уведомления.
- `SuccessNotification.vue` — успех.
- `InfoNotification.vue` — инфо.
- `DeleteNotification.vue` — удаление.
- `UnsavedChangesGuard.vue` — защита от потери несохранённых изменений.

---

## 11) Таблицы/списки сущностей
Каталог `components/tables/`:
- `TicketTable.vue` — таблица заявок.
- `UsersTable.vue` — пользователи.
- `OrganizationsTable.vue` — организации.
- `ObjectsTable.vue` — объекты.
- `SupportGroupsTable.vue` — группы поддержки.
- `ClassificationsTable.vue` — классификации.
- `BusinessProcessesTable.vue` — бизнес-процессы.

Каталог `components/tables/secondary/`:
- `MaterialsTable.vue` — материалы (в контексте заявки/карточек).
- `OrganizationsOfficesTable.vue` — офисы организаций.

---

## 12) Заявки (ticket) — карточки, фильтры, история, комментарии
Каталог `components/tickets/`:
- `TicketFilters.vue` — фильтры заявок.
- `TicketHistory.vue` — история изменений.
- `TicketComments.vue` — комментарии.

Подкаталог карточек:
- `components/tickets/TicketCard/`
  - Блоки в режиме просмотра:
    - `MainInfo.vue`
    - `ClientInfo.vue`
    - `ExecutionBlock.vue`
    - `LocationBlock.vue`
  - Блоки в режиме редактирования:
    - `ModeEdit/*`:
      - `MainInfoEdit.vue`
      - `ClientInfoEdit.vue`
      - `ExecutionBlockEdit.vue`
      - `LocationBlockEdit.vue`
    - `ModeView/*`:
      - `MainInfoView.vue`
      - `ClientInfoView.vue`
      - `ExecutionBlockView.vue`
      - `LocationBlockView.vue`

Каталог создания блоков:
- `components/tickets/TicketCreateBlocks/`
  - `RequiredBlock.vue`
  - `AdditionalBlock.vue`

---

## 13) Виды (views) — страницы по ролям
Каталог `views/`:

### 13.1 Admin
- `views/admin/analytics/`
  - `GeneralAnalytics.vue`
  - `ReportsAdmin.vue`
- `views/admin/directories/`:
  - `DBusinessProcesses.vue`
  - `DClassifications.vue`
  - `DObjects.vue`
  - `DOrganizations.vue`
  - `DSupportGroups.vue`
  - `DUsers.vue`
- `views/admin/tickets/`:
  - `AllTickets.vue`
  - `CreateTicket.vue`
  - `TicketCard.vue`

### 13.2 Auth
- `views/auth/`
  - `LoginPage.vue`
  - `ForgotPassword.vue`
  - `UnauthorizedPage.vue`

### 13.3 Client
- `views/client/analytics/`
  - `GeneralAnalytics.vue`
  - `ClientReports.vue`
- `views/client/tickets/`
  - `MyTickets.vue`
  - `CreateTicket.vue`
  - `TicketCard.vue`

### 13.4 Engineer
- `views/engineer/`
  - `MyTickets.vue`
  - `TicketCard.vue`
  - `WorkCalendar.vue`

### 13.5 Profiles
- `views/profiles/`
  - `CompanyProfiles.vue`
  - `UserProfile.vue`

### 13.6 Errors
- `views/errors/NotFound.vue`

---

## 14) Статика (assets)
Каталог `assets/`:
- `assets/images/logo.svg`
- `assets/styles/`
  - `main.css`
  - `admin.css`
  - `client.css`
  - `engineer.css`
  - `ticket-card.css`
  - `card-blocks-styles/`
    - `card-client-info.css`
    - `card-execution-block.css`
    - `card-location-block.css`
    - `card-main-info.css`

---

## 15) Итоговая картина архитектуры
- Entry: `main.js` -> `App.vue`.
- Router: `router/index.js` + role-разделённые `*.routes.js`.
- Auth/session:
  - `stores/auth.store.js` + `utils/session.handler.js` + `utils/auth.utils.js`.
- Realtime:
  - `utils/websocket.handler.js` подключается после логина.
- UI:
  - общие компоненты (`components/common/UI`, layout компоненты)
  - доменные компоненты (tickets/card/comments/history)
  - таблицы сущностей (admin/directories)
- Views:
  - отдельные страницы под роли.

