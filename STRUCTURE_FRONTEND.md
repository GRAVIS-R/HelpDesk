# Структура Frontend-части проекта

> Vue 3 (composition/api) + Vue Router + Pinia. Приложение Help Desk с ролевыми разделами (admin / dispatcher / engineer / client). Реалтайм-обновления — через WebSocket.

---

## 1) Общее дерево каталогов

```text
КОРЕНЬ
├── api/
│   ├── axios.config.js                 # конфиг/экземпляр axios (в проекте также есть globalApiClient в session.handler)
│   ├── auth.api.js                    # API авторизации
│   └── index.api.js                   # точка экспорта API модулей
│
├── assets/
│   ├── images/
│   │   └── logo.svg
│   └── styles/
│       ├── main.css
│       ├── admin.css
│       ├── client.css
│       ├── engineer.css
│       ├── ticket-card.css
│       └── card-blocks-styles/
│           ├── card-client-info.css
│           ├── card-execution-block.css
│           ├── card-location-block.css
│           └── card-main-info.css
│
├── components/
│   ├── calendar/
│   │   └── EngineerCalendar.vue
│   │
│   ├── common/
│   │   ├── AppLayout/
│   │   │   ├── SidebarMenu.vue
│   │   │   ├── CommonHeader.vue
│   │   │   ├── BreadCrumbs.vue
│   │   │   └── NotificationBell.vue
│   │   │
│   │   ├── Filters/
│   │   │   └── UsersFilters.vue
│   │   │
│   │   └── UI/
│   │       ├── UIButton.vue
│   │       ├── UICard.vue
│   │       ├── UIComboBox.vue
│   │       ├── UIIcons.vue
│   │       ├── UIInput.vue
│   │       ├── UILabel.vue
│   │       ├── UIPagination.vue
│   │       ├── UIProfile.vue
│   │       ├── UISelect.vue
│   │       ├── UITable.vue
│   │       └── UITextarea.vue
│   │
│   ├── modal/
│   │   ├── BusinessProcessCreate.vue
│   │   ├── BusinessProcessProfileModal.vue
│   │   ├── ClassificationProfileModal.vue
│   │   ├── ObjectProfileModal.vue
│   │   ├── OrganizationProfileModal.vue
│   │   ├── PasswordModal.vue
│   │   ├── SupportGroupProfileModal.vue
│   │   └── UserProfileModal.vue
│   │   └── bpparts/
│   │       ├── BasicInfoEditor.vue
│   │       ├── StatusEditor.vue
│   │       └── SupportGroupEditor.vue
│   │   └── nodes/
│   │       └── DefaultNode.vue
│   │
│   ├── notifications/
│   │   ├── SessionNotifications.vue
│   │   ├── SuccessNotification.vue
│   │   ├── InfoNotification.vue
│   │   ├── DeleteNotification.vue
│   │   └── UnsavedChangesGuard.vue
│   │
│   ├── tables/
│   │   ├── TicketTable.vue
│   │   ├── UsersTable.vue
│   │   ├── OrganizationsTable.vue
│   │   ├── ObjectsTable.vue
│   │   ├── SupportGroupsTable.vue
│   │   ├── ClassificationsTable.vue
│   │   └── BusinessProcessesTable.vue
│   │   └── secondary/
│   │       ├── MaterialsTable.vue
│   │       └── OrganizationsOfficesTable.vue
│   │
│   └── tickets/
│       ├── TicketComments.vue
│       ├── TicketFilters.vue
│       ├── TicketHistory.vue
│       └── TicketCard/
│           ├── MainInfo.vue
│           ├── ClientInfo.vue
│           ├── ExecutionBlock.vue
│           ├── LocationBlock.vue
│           ├── ModeEdit/
│           │   ├── MainInfoEdit.vue
│           │   ├── ClientInfoEdit.vue
│           │   ├── ExecutionBlockEdit.vue
│           │   └── LocationBlockEdit.vue
│           └── ModeView/
│               ├── MainInfoView.vue
│               ├── ClientInfoView.vue
│               ├── ExecutionBlockView.vue
│               └── LocationBlockView.vue
│
├── layouts/
│   ├── AuthLayout.vue                  # layout для auth-страниц
│   └── MainLayout.vue                  # основной layout приложения
│
├── router/
│   ├── index.js                         # склейка всех роутов + global beforeEach guard
│   ├── auth.routes.js
│   ├── admin.routes.js
│   ├── dispatcher.routes.js
│   ├── engineer.routes.js
│   └── client.routes.js
│
├── stores/
│   ├── auth.store.js
│   ├── calendar.store.js
│   ├── classifications.store.js
│   ├── notifications.store.js
│   ├── objects.store.js
│   ├── organizations.store.js
│   ├── processes.store.js
│   ├── support.groups.store.js
│   ├── tickets.store.js
│   └── users.store.js
│
├── utils/
│   ├── auth.utils.js                   # role mapping + helpers localStorage
│   ├── cashe.utils.js
│   ├── date.utils.js
│   ├── form.utils.js
│   ├── memory.monitor.js
│   ├── profile.utils.js
│   ├── select.options.utils.js
│   ├── session.handler.js             # CSRF + 401/403 обработка axios
│   ├── ticket.utils.js
│   └── websocket.handler.js          # realtime WebSocket singleton
│
├── views/
│   ├── auth/
│   │   ├── LoginPage.vue
│   │   ├── ForgotPassword.vue
│   │   └── UnauthorizedPage.vue
│   │
│   ├── admin/
│   │   ├── tickets/
│   │   │   ├── AllTickets.vue
│   │   │   ├── CreateTicket.vue
│   │   │   └── TicketCard.vue
│   │   ├── directories/
│   │   │   ├── DOrganizations.vue
│   │   │   ├── DObjects.vue
│   │   │   ├── DUsers.vue
│   │   │   ├── DSupportGroups.vue
│   │   │   ├── DClassifications.vue
│   │   │   └── DBusinessProcesses.vue
│   │   ├── analytics/
│   │   │   ├── GeneralAnalytics.vue
│   │   │   └── ReportsAdmin.vue
│   │   │
│   │   └── (другие admin страницы по ролям)
│   │
│   ├── client/
│   │   ├── tickets/
│   │   │   ├── MyTickets.vue
│   │   │   ├── CreateTicket.vue
│   │   │   └── TicketCard.vue
│   │   ├── analytics/
│   │   │   ├── GeneralAnalytics.vue
│   │   │   └── ClientReports.vue
│   │   └── (профили)
│   │
│   ├── engineer/
│   │   ├── MyTickets.vue
│   │   ├── TicketCard.vue
│   │   └── WorkCalendar.vue
│   │
│   ├── profiles/
│   │   ├── CompanyProfiles.vue
│   │   └── UserProfile.vue
│   │
│   └── errors/
│       └── NotFound.vue
│
├── App.vue
├── main.js
└── package-lock.json
```

---

## 2) Описание ключевых файлов и функционала

### Точка входа и корень
- **`main.js`**: инициализирует `sessionHandler` (CSRF/401/419/403), затем создаёт `pinia` и `router`, монтирует `App.vue` в `#app`.
- **`App.vue`**: отрисовывает `AuthLayout` или `MainLayout` в зависимости от текущего пути (auth-роуты вынесены в список), и показывает `SessionNotifications`. Использует `router.isReady()` для флага `isAppReady`.

### API
- **`api/axios.config.js`**: конфигурация axios (baseURL, креды, хедеры и т.п.).
- **`api/auth.api.js`**: API авторизации (логин/токены).
- **`api/index.api.js`**: “баррель” (re-export) API модулей.

### Сессии и CSRF (axios middleware)
- **`utils/session.handler.js`**: singleton `sessionHandler`.
  - перехватывает запросы: добавляет `X-CSRF-TOKEN` из `<meta name="csrf-token">` (только для методов, требующих CSRF: POST/PUT/PATCH/DELETE)
  - перехватывает ответы:
    - **419**: запрашивает новый CSRF токен через `/get_token` (без CSRF заголовка), обновляет meta и повторяет исходный запрос
    - **401**: чистит авторизацию и редиректит на login
    - **403**: редирект на unauthorized

### Реалтайм обновления (WebSocket)
- **`utils/websocket.handler.js`**: singleton `webSocketHandler`.
  - получает ws-токен через `/get_web_socket_token`
  - подключается к `ws://.../ws/token={token}`
  - поддерживает подписки `on(method, cb)` и общий event `'*'`
  - реализует автопереподключение с лимитом и таймаутом

### Router (разделение по ролям)
- **`router/index.js`**: собирает роуты admin/dispatcher/engineer/client + auth. В `beforeEach`:
  - выставляет `document.title`
  - синхронизирует authStore и localStorage
  - редиректит логин-пути по роли
  - для protected роутов проверяет `to.meta.requiresAuth` и `to.meta.role`

### Pinia stores
- **`stores/auth.store.js`**: управление `user`, вычисление роли, login/logout/initialize.
- остальные stores: data-layer для соответствующих доменных сущностей (tickets, calendar, directories, notifications и т.д.).

### Views
- Разделены по ролям в папках:
  - `views/admin/*`
  - `views/engineer/*`
  - `views/client/*`
  - `views/auth/*`
  - `views/profiles/*`
  - `views/errors/*`

### UI компоненты
- **`components/common/UI/*`**: базовые компоненты интерфейса (кнопки, инпуты, таблицы, селекты и т.д.).
- **`components/tickets/*`**: карточка/блоки/редактирование/просмотр заявок.
- **`components/tables/*`**: таблицы сущностей для списков.
- **`components/modal/*`**: модальные окна для создания/редактирования сущностей.
- **`components/notifications/*`**: нотификации и guard'ы (например, защита от несохранённых изменений).

---

## 3) Описание структуры (коротко)
Frontend архитектурно состоит из 5 слоёв:

1) **Entry & Root**: `main.js` + `App.vue` (инициализация и выбор layout).
2) **Routing & Access Control**: `router/*` (global guard и ролевые метаданные).
3) **Data & State**: `stores/*` (Pinia) + `utils/*` (helpers, session/websocket handlers).
4) **Transport**: `api/*` (axios-based API).
5) **Presentation**: `views/*` (страницы) + `components/*` (повторно используемые UI-компоненты) + `assets/styles/*` (глобальные стили).

