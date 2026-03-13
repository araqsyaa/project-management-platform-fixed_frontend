# Project Management Backend

Simple Spring Boot REST API (Java 17, Maven, PostgreSQL).

## Setup

1. Create PostgreSQL database: `project_management`
2. Update `application.properties` with your DB credentials
3. Run: `mvn spring-boot:run`

## API Base

`http://localhost:8080/api`

### Auth (no token required)
- `POST /auth/register` - body: `{name, email, password, role?}`
- `POST /auth/login` - body: `{email, password}` → returns `{user, token}`

### Protected (add header: `Authorization: Bearer <token>`)
- `GET /users`, `GET /users/{id}`
- `GET /teams`, `GET /teams/{id}`, `POST /teams`, `POST /teams/{id}/members/{userId}`
- `GET /projects`, `GET /projects/{id}`, `POST /projects`, `PUT /projects/{id}`
- `GET /projects/{id}/milestones`, `POST /projects/{id}/milestones`
- `GET /tasks`, `GET /tasks/{id}`, `POST /tasks`, `PUT /tasks/{id}`
- `GET /projects/{id}/tasks`, `GET /users/{id}/tasks`
- `GET /tasks/{id}/comments`, `POST /tasks/{id}/comments` - body: `{content}`
- `GET /reports/overdue-tasks`, `GET /reports/projects/{id}/completed`, `GET /reports/users/{id}/tasks`

## What’s included / simplified

**Included:** Users & roles, Teams, Projects, Milestones, Tasks (status/priority), Comments, Auth, Basic reports.

**Simplified or skipped:** File attachments (no storage), Task dependencies, Work logs, Notifications, Kanban/Gantt logic (handled in frontend).
