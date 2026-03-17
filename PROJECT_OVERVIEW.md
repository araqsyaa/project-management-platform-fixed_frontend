# Project Management Platform – Full Project Overview

This document explains the tools, architecture, each page, mock vs real data, and database so you can present the project with full understanding.

---

## 1. High-level architecture: how the project is structured

**1.1** The application is split into two parts:

- **Frontend**: React (TypeScript) single-page application in the repo root. It runs in the browser (e.g. `npm run dev` → Vite dev server, usually `http://localhost:5173`).
- **Backend**: Spring Boot (Java 17) REST API in the `backend/` folder. It runs on the JVM (e.g. `mvn spring-boot:run` → `http://localhost:8080`).

**1.2** Communication: The frontend calls the backend over HTTP. All API requests go to `http://localhost:8080/api`. The frontend uses `fetch()` in `src/app/api/client.ts` and sends the auth token in the `Authorization: Bearer <token>` header for protected routes.

**1.3** Data flow in short: User actions in the UI → React components call functions from `api` or hooks from `useApi.ts` → HTTP request to backend → `ApiController` → `AppService` → JPA repositories → PostgreSQL. Responses come back as JSON and are stored in React state and/or shown in the UI.

---

## 2. Tools and technologies (stack)

**2.1 Frontend**

- **React 18** – UI library; components and hooks.
- **TypeScript** – Typing for props, state, and API types.
- **Vite 6** – Build tool and dev server (fast HMR, ESM).
- **React Router 7** – Client-side routing (e.g. `/dashboard`, `/projects/:projectId`).
- **Tailwind CSS 4** – Utility-first styling (e.g. `className="p-4 rounded-lg"`).
- **Radix UI** – Headless components (Dialog, Select, Tabs, etc.) used via `src/app/components/ui/*`.
- **Lucide React** – Icon set (e.g. `FolderKanban`, `Plus`, `User`).
- **react-dnd + react-dnd-html5-backend** – Drag-and-drop for the Kanban board (task cards between columns).
- **Recharts** – Charts on Dashboard and Reports (Bar, Line, Pie).
- **Sonner** – Toast notifications (success/error after create/update/delete).
- **date-fns** – Date formatting/parsing where used.
- **i18n** – Single file `src/app/i18n/translations.ts` with a `t` object for labels (English only; structure ready for more languages).

**2.2 Backend**

- **Java 17** – Language.
- **Spring Boot 3.2** – Framework (web, security, data).
- **Spring Web** – REST controllers and JSON (Jackson).
- **Spring Data JPA** – ORM and repositories (CRUD and custom queries).
- **Spring Security** – Security filter chain; token-based auth (no session).
- **PostgreSQL** – Main database; connection in `application.properties` (`localhost:5432/project_management`).
- **H2** – Optional in-memory DB for tests (see commented section in `application.properties`).
- **Lombok** – Reduces boilerplate (`@Data`, `@NoArgsConstructor`, etc.) on entities and config.

**2.3 How they work together**

- Vite bundles the React app and serves it (or you build with `npm run build` and serve the `dist/` folder).
- The browser loads the SPA; React Router shows the right page for the URL.
- Any data that must persist (users, projects, tasks, milestones, comments) is requested from the Spring Boot API. The backend reads/writes PostgreSQL via JPA.
- Auth: login/register return a token; the frontend stores it (see section 5) and sends it on each request; the backend validates it in `AuthFilter` and allows or blocks access to `/api/**`.

---

## 3. Database: how it works internally

**3.1** Configuration is in `backend/src/main/resources/application.properties`:

- `spring.datasource.url=jdbc:postgresql://localhost:5432/project_management` – DB name is `project_management`.
- `spring.jpa.hibernate.ddl-auto=update` – Hibernate creates or updates tables from entity classes at startup (no separate SQL migrations in this project).
- Tables are created in the public schema; names match `@Table(name = "...")` on entities.

**3.2** Main entities and tables:

| Entity    | Table        | Main fields |
|----------|--------------|-------------|
| User     | users        | id, name, email, password (hashed), role (enum), avatar |
| Team     | teams        | id, name, department |
| Project  | projects     | id, name, description, start_date, end_date, team_id (FK) |
| Milestone| milestones   | id, name, description, due_date, completed, project_id (FK) |
| Task     | tasks        | id, title, description, project_id, milestone_id, assignee_id, status, priority, deadline, created_at |
| Comment  | comments     | id, content, created_at, task_id, user_id |

**3.3** Relationships:

- **User ↔ Team**: Many-to-many via `team_members` (user_id, team_id).
- **Project**: Many-to-one to Team (`team_id`).
- **Milestone**: Many-to-one to Project (`project_id`).
- **Task**: Many-to-one to Project, Milestone (optional), and User (assignee).
- **Comment**: Many-to-one to Task and User.

**3.4** Repositories (Spring Data JPA) in `backend/.../repository/`:

- `UserRepository`, `TeamRepository`, `ProjectRepository`, `MilestoneRepository`, `TaskRepository`, `CommentRepository`.
- Custom methods like `findByProjectId`, `findByEmail`, `findByMilestoneId`, `findByTaskIdOrderByCreatedAtAsc`, etc. Spring generates SQL from method names.

**3.5** No raw SQL in the app; all persistence goes through JPA entities and repositories. `ddl-auto=update` means schema changes (new columns/tables) appear on next backend restart.

---

## 4. API layer (backend)

**4.1** Entry point: `ApiController` in `backend/.../controller/ApiController.java`. Base path: `/api`.

**4.2** Main endpoints (grouped):

- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`.
- **Users**: `GET /api/users`, `GET /api/users/{id}`.
- **Teams**: `GET /api/teams`, `GET /api/teams/{id}`, `POST /api/teams`, `POST /api/teams/{teamId}/members/{userId}`.
- **Projects**: `GET /api/projects`, `GET /api/projects/{id}`, `POST /api/projects`, `PUT /api/projects/{id}`, `GET /api/teams/{teamId}/projects`.
- **Milestones**: `GET /api/projects/{projectId}/milestones`, `GET /api/milestones/{id}`, `POST /api/projects/{projectId}/milestones`, `PUT /api/projects/{projectId}/milestones/{milestoneId}`.
- **Tasks**: `GET /api/tasks`, `GET /api/tasks/{id}`, `GET /api/projects/{projectId}/tasks`, `POST /api/tasks`, `PUT /api/tasks/{id}`, `DELETE /api/tasks/{id}`.
- **Comments**: `GET /api/tasks/{taskId}/comments`, `POST /api/tasks/{taskId}/comments` (requires auth principal).
- **Reports**: `GET /api/reports/overdue-tasks`, `GET /api/reports/projects/{projectId}/completed`, `GET /api/reports/users/{userId}/tasks`.

**4.3** Business logic lives in `AppService` (single service class). Controllers call service methods; services use repositories and the in-memory `tokenStore` (Map) for auth tokens.

**4.4** Security: `SecurityConfig` allows only `/api/auth/**` without auth; all other `/api/**` require authentication. `AuthFilter` reads the Bearer token, looks up the user id in `tokenStore`, and sets the security context. If the token is missing or invalid, the request is rejected (401/403).

---

## 5. Authentication (frontend and backend)

**5.1** Backend auth:

- **Register**: Accepts name, email, password (and optional role). Encodes password with BCrypt, saves user, creates a UUID token, stores `token → userId` in `tokenStore`, returns `{ user, token }`.
- **Login**: Finds user by email, checks password with BCrypt, creates token, stores in `tokenStore`, returns `{ user, token }`.
- **Logout**: Removes token from `tokenStore` (body/header not used in the current implementation; token could be passed in header).
- Tokens are in-memory only; restarting the backend clears all sessions.

**5.2** Frontend auth:

- **Login/Register**: `AuthContext` calls `api.auth.login()` or `api.auth.register()`, then `setToken(res.token)` and `storeUser(res.user)` from `api/client.ts`.
- **Token storage**: `api/client.ts` uses `localStorage` with keys `pm_token` (token) and `pm_user` (current user JSON). Every `request()` in client.ts adds `Authorization: Bearer <token>` if `getToken()` is not null.
- **Restore on load**: `AuthContext` runs an effect on mount that checks for a token. **Important**: In the current code it uses `localStorage.getItem('token')` instead of `getToken()` (which uses `pm_token`). So after login the token is stored under `pm_token`, but on refresh the context looks for `'token'`, finds nothing, and the user appears logged out. For consistent behavior, the context should use `getToken()` from the API client (and optionally restore user from `getStoredUser()`).

**5.3** Protected routes: `Layout` wraps all authenticated pages. It uses `useAuth()`; if `!loading && !isAuthenticated` it redirects to `/login`. So any route rendered under `Layout` requires the user to be “logged in” (according to AuthContext state).

---

## 6. Mock data vs real (backend) data

**6.1** Mock data lives in `src/app/data/mockData.ts`. It defines TypeScript types and exports arrays: `users`, `teams`, `teamMembers`, `projects`, `milestones`, `tasks`, `comments`, `attachments`, `workLogs`, `notifications`, `activityFeed`. These are sample entities (e.g. Anna Petrosyan, E-Commerce Platform, tasks in backlog/in progress/done).

**6.2** Where mock data is actually used:

- **DashboardPage**: Imports `activityFeed` from `mockData` and uses it for the “Activity Feed” list. The rest of the dashboard uses real API data: `useProjects()` and `useTasks()` for stats (total projects, active tasks) and for the “Recent Projects” list.
- **NotificationsPage**: Imports `notifications as mockNotifications` and uses it as initial state. All notifications on that page are from mock data; marking as read is local state only. There is no backend endpoint for notifications in this project.
- **UsersPage**: Imports only the **types** `Role` and `User` from `mockData`; the list of users comes from `useUsers()` (API). So users are real; only the type definition is shared with mockData.

**6.3** What is fully backed by the API (real data):

- Users (list, create via register).
- Teams (list from API).
- Projects (list, create, update).
- Milestones (list per project, create, update, get one).
- Tasks (list per project, create, update, delete).
- Comments (list per task, add comment; backend needs auth for add).

**6.4** What is mock or local only:

- **Activity feed** on Dashboard: mock `activityFeed`.
- **Notifications**: mock list; no API.
- **Charts on Dashboard**: “Recent Activity” bar chart and “Progress” line chart use hardcoded arrays (`activityData`, `progressData`), not backend data.
- **Reports**: Task counts and project progress come from `useProjects()` and `useTasks()` (real). “Efficiency” (87%) and “Completion trend” (planned vs completed) are hardcoded. Export buttons (Excel/PDF/CSV) do not call any backend; they are UI only.
- **Settings**: Profile and password changes show toasts but do not call any API; no backend for “update profile” or “change password”.

---

## 7. Page-by-page implementation logic

**7.1 Login (`/login`) – `LoginPage.tsx`**

- Form: email, password, optional “Remember me” (checkbox not wired to storage).
- On submit: calls `login(email, password)` from `useAuth()` (which calls `api.auth.login`). On success, navigates to `/dashboard`; on failure, sets error message (e.g. “Invalid email or password”).
- No Layout; standalone full-screen form.

**7.2 Register (`/register`) – `RegisterPage.tsx`**

- Form: name, email, password. On submit: calls `register(name, email, password)` from `useAuth()` (which uses `api.auth.register`). On success, navigates to `/dashboard`; on failure, shows “Registration failed. Email may already exist.” (or similar).
- No Layout; standalone full-screen form.

**7.3 Dashboard (`/dashboard`) – `DashboardPage.tsx`**

- Uses `useProjects()` and `useTasks()` to load real projects and tasks.
- **Stats cards**: Total Projects = `projects.length`, Active Tasks = tasks with status `in_progress` or `review`, Upcoming Milestones = 0 (hardcoded).
- **Charts**: Bar chart “Recent Activity” and line chart “Progress” use hardcoded `activityData` and `progressData`.
- **Activity Feed**: Renders `activityFeed` from mockData (user, action, target, timestamp).
- **Recent Projects**: First 4 projects from API; each card is clickable and navigates to `/projects/{id}`. Progress bar and deadline come from API (progress is currently 0 from `mapProject` in useApi).
- “View All” for projects navigates to `/projects`.

**7.4 Projects (`/projects`) – `ProjectsPage.tsx`**

- Uses `useProjects()` and `useTeams()` for list and filters.
- Local state: search query, filter by team, “Create Project” dialog (title, team, client, deadline).
- Filtering: by search (title/client) and team (dropdown). Filtered list is derived from `projects`.
- Create project: calls `api.createProject({ name, description, teamId, endDate })`, then appends the mapped result to local state and closes the dialog. List is backed by API; create is persisted.
- Table/cards show project title, team name (from teams API), status (fixed “active” from map), progress, deadline. Clicking a row/card navigates to `/projects/:projectId`.

**7.5 Project detail / Kanban (`/projects/:projectId`) – `ProjectDetailPage.tsx`**

- Params: `projectId` from URL. Uses `useProjects()`, `useTasks(projectId)`, `useMilestones(projectId)`, `useUsers()`.
- Loads project, tasks, milestones, users; maps API tasks to frontend shape (status lowercased, ids as strings). Tasks are grouped by status into columns: Backlog, In Progress, Review, Done.
- **Kanban**: Columns implemented with `react-dnd` (DndProvider, useDrag, useDrop). Dragging a task to another column calls `api.updateTask(taskId, { ...existing, status: newStatus })` and updates local state; toasts on success/failure.
- **Add Task**: Dialog with title, description, status, priority, assignee, due date. Submit calls `api.createTask(...)` and appends the returned task to state.
- **Edit Task**: Pencil button on each card opens the same dialog with pre-filled data; save calls `api.updateTask(editingTask.id, ...)`.
- **Remove Task**: Trash button; confirm then `api.deleteTask(taskId)` and remove from state.
- **Tabs**: “Kanban Board” and “Milestones”. Tab state is synced with URL (`?tab=milestones`). Milestones tab lists milestones (from API); each row is a link to `/projects/:projectId/milestones/:milestoneId`. “Add Milestone” links to `/projects/:projectId/milestones/new`.
- Progress bar and header show project title, deadline, and a progress value (from API; progress is 0 in current mapping).

**7.6 Milestone detail (`/projects/:projectId/milestones/new` and `/projects/:projectId/milestones/:milestoneId`) – `MilestoneDetailPage.tsx`**

- New vs edit: `milestoneId === 'new'` for create; otherwise edit.
- Loads: `api.project(projectId)`, `api.projectTasks(projectId)`, and if edit `api.milestone(milestoneId)`. Sets form (title, description, due date) and which task IDs are selected (from `task.milestone` on each task).
- Form: title (required), description (optional), due date, and a checkbox list of all project tasks (with task ID and status). Saving create: `api.createMilestone(projectId, { name, description, dueDate, taskIds })`. Saving edit: `api.updateMilestone(projectId, milestoneId, { name, description, dueDate, taskIds })`. On success, navigates to `/projects/:projectId?tab=milestones`. Backend assigns/unassigns tasks to the milestone and sets `milestone.completed` when all assigned tasks are DONE.

**7.7 Users (`/users`) – `UsersPage.tsx`**

- Uses `useUsers()` for the list (API). Types `User` and `Role` from mockData.
- Search filters the list by name/email (client-side).
- “Add User”: dialog with name, email, role. Submit calls `api.auth.register(name, email, 'password1234', backendRole)` and appends the returned user (mapped to frontend User) to state. So “users” are created via the same register endpoint with a fixed password; no dedicated “create user” API.

**7.8 Reports (`/reports`) – `ReportsPage.tsx`**

- Uses `useProjects()`, `useTasks()`, `useTeams()`. Filters (project, team) are local state; filtering is not applied to the charts in the current code (all tasks/projects used).
- Summary cards: total projects, completed tasks (status === 'done'), active tasks (in_progress), efficiency (hardcoded 87%).
- Charts: Tasks by status (Pie), Tasks by priority (Bar), Project progress (Bar), Burndown (planned vs completed – hardcoded `completionTrend`).
- Export buttons: no API calls; UI only.

**7.9 Notifications (`/notifications`) – `NotificationsPage.tsx`**

- Initial state: `mockNotifications` from mockData. “Mark as read” and “Mark all as read” only update local state. No backend; list and read state are not persisted.

**7.10 Settings (`/settings`) – `SettingsPage.tsx`**

- Displays current user from `useAuth()` (name, email, role). Form fields for name, email, new password, confirm password. “Save” profile and “Change password” show toasts but do not call any API; no backend endpoints for profile or password update.

---

## 8. Frontend API client and hooks

**8.1** `src/app/api/client.ts`:

- Defines `API_URL = 'http://localhost:8080/api'`, token/user keys (`pm_token`, `pm_user`), and a generic `request<T>(path, options)` that adds `Content-Type: application/json` and `Authorization: Bearer <token>` (if token exists), then `fetch`. On non-ok response it throws with the response text; on success it parses JSON (or returns empty object if parse fails).
- Exports `api` object with methods for auth, users, teams, projects, milestones, tasks, comments (e.g. `api.projects()`, `api.createTask(...)`, `api.deleteTask(id)`). All return Promises; types use interfaces like `ApiProject`, `ApiTask`, etc., matching backend JSON.
- Helper `toFrontendRole()` maps backend role strings (e.g. ADMIN) to frontend role keys (e.g. administrator).

**8.2** `src/app/api/useApi.ts`:

- React hooks that call the API once (or when a dependency like `projectId` changes) and keep result in state: `useProjects()`, `useUsers()`, `useTeams()`, `useTasks(projectId?)`, `useMilestones(projectId)`.
- Each hook maps backend response to a frontend shape (e.g. project `name` → `title`, numeric ids → string, status/priority lowercased). So the rest of the app uses a consistent frontend type (e.g. `project.title`, `task.status` as lowercase).
- Return shape: `{ data, loading, error }` (and for milestones possibly `refetch` in your version). No automatic refetch on window focus; refetch happens when the hook’s dependency array changes (e.g. projectId for tasks/milestones).

---

## 9. Routing and layout

**9.1** Router is defined in `src/app/routes.tsx` (createBrowserRouter):

- `/login`, `/register`: LoginPage, RegisterPage (no Layout).
- `/` (Layout): index redirects to `/dashboard`; children: `dashboard`, `projects`, `projects/:projectId`, `projects/:projectId/milestones/new`, `projects/:projectId/milestones/:milestoneId`, `users`, `reports`, `notifications`, `settings`.
- Fallback: `*` → redirect to `/dashboard`.

**9.2** Layout (`Layout.tsx`):

- Renders header (sidebar toggle, “Project Management” title, bell icon to notifications, avatar + user name/role, logout) and a sidebar with links to Dashboard, Projects, Users, Reports, Settings. Notifications link is in the header.
- Uses `useAuth()`; if not authenticated (and not loading), redirects to `/login`. Renders `<Outlet />` for the active child route. Active nav item is highlighted by pathname.

---

## 10. Important details before presenting

**10.1** Auth persistence: Fix the token key in `AuthContext` so it uses `getToken()` from the API client (or the same `pm_token` key) so that after a refresh the user stays logged in if the token is still in localStorage.

**10.2** Backend must be running: All real data (users, projects, tasks, milestones, comments) comes from the API. Start Spring Boot and PostgreSQL so the app is fully functional.

**10.3** Project progress: In `useApi`’s `mapProject`, `progress` is set to 0. The backend Project entity does not have a progress field in the current design; if you add it later, you can map it here.

**10.4** Notifications and activity: They are mock/local only; you can say “notifications and activity feed are prepared for future backend integration.”

**10.5** Settings: Profile and password changes are UI-only; you can describe them as “placeholders for future profile/password API.”

**10.6** Task IDs: Tasks have unique numeric IDs from the database; the frontend uses string ids everywhere (e.g. `String(t.id)`). Same for projects, milestones, users.

**10.7** CORS: Backend allows origins like `http://localhost:5173` and `http://localhost:3000` so the Vite dev server can call the API.

---

## 11. Quick reference: where things live

| What | Where |
|------|--------|
| Frontend entry | `src/main.tsx` → `App.tsx` (AuthProvider + RouterProvider) |
| Routes | `src/app/routes.tsx` |
| Auth state & login/register | `src/app/context/AuthContext.tsx` |
| API calls | `src/app/api/client.ts` |
| Data hooks | `src/app/api/useApi.ts` |
| Mock data | `src/app/data/mockData.ts` |
| Translations | `src/app/i18n/translations.ts` |
| UI components | `src/app/components/ui/*` (Radix-based) |
| Backend entry | `backend/.../ProjectManagementApplication.java` |
| REST API | `backend/.../controller/ApiController.java` |
| Business logic | `backend/.../service/AppService.java` |
| Entities | `backend/.../model/*.java` |
| Repositories | `backend/.../repository/*.java` |
| Security | `backend/.../config/SecurityConfig.java`, `AuthFilter.java` |
| DB config | `backend/src/main/resources/application.properties` |

This should give you a complete, detailed picture of the project for your presentation and for answering questions.
