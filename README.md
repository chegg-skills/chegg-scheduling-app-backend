# Chegg Scheduling App

A full-stack meeting and event scheduling platform. Coaches and team admins manage events, availability, and session logs; students book sessions through a public-facing booking flow.

## Repository Structure

```
chegg-scheduling-app/
├── backend/               # Node.js/Express REST API (port 4000)
├── frontend/              # React SPA (port 3000 in dev)
└── notification-service/  # RabbitMQ consumer for async email notifications
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | Node.js, Express, TypeScript |
| ORM | Prisma (PostgreSQL) |
| Auth | JWT (cookies) + OIDC/SSO via `openid-client` |
| Frontend | React, Vite, MUI, React Query, React Hook Form |
| Notifications | RabbitMQ, Nodemailer |
| Testing | Jest + Supertest (integration tests) |

---

## Prerequisites

- Node.js 20+
- PostgreSQL (two databases: `chegg_dev` and `chegg_test`)
- RabbitMQ (optional — set `NOTIFICATIONS_ENABLED=false` to skip)

---

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd chegg-scheduling-app

cd backend && npm install
cd ../frontend && npm install
cd ../notification-service && npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` in each service directory and fill in values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp notification-service/.env.example notification-service/.env
```

Key backend variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Secret for signing JWTs (change in production) |
| `BOOTSTRAP_SECRET` | One-time secret for creating the first SUPER_ADMIN |
| `RABBITMQ_URL` | RabbitMQ connection (optional) |
| `NOTIFICATIONS_ENABLED` | Set `false` to disable RabbitMQ dependency |
| `OIDC_ISSUER_URL` | Okta/OIDC discovery URL (optional — SSO only) |

### 3. Run database migrations

```bash
cd backend
npx prisma migrate dev
```

### 4. Start all services

```bash
# Terminal 1 — API
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev

# Terminal 3 — Notification service (optional)
cd notification-service && npm run start:dev
```

Frontend: http://localhost:3000 · API: http://localhost:4000

### 5. Bootstrap the first admin

On a fresh install, create the initial SUPER_ADMIN account:

```bash
curl -X POST http://localhost:4000/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin1234","secret":"<BOOTSTRAP_SECRET>"}'
```

This endpoint permanently disables itself once any user exists.

---

## Commands

### Backend

```bash
npm run dev              # Start with hot reload
npm run build            # Compile TypeScript
npm run test             # Run all tests (serially)
npm run test:integration # Integration tests only
npm run test:coverage    # Coverage report
npm run seed:demo        # Populate demo data
npx prisma migrate dev   # Create and run migrations
npx prisma studio        # Open Prisma GUI
```

### Frontend

```bash
npm run dev          # Start Vite dev server
npm run build        # Type-check + bundle
npm run type-check   # TypeScript check only
npm run lint         # ESLint
```

### Notification Service

```bash
npm run start:dev        # Start with hot reload
npm run build            # Compile TypeScript
npm run prisma:migrate   # Run migrations
```

---

## Key Features

- **Invitation-gated registration** — no public self-signup; admins invite users by email
- **SSO / OIDC** — Okta integration via `openid-client`; SSO-only invites block password sign-in
- **Role-based access control** — `SUPER_ADMIN`, `TEAM_ADMIN`, `COACH` roles; re-queried from DB on every request
- **Event types** — four interaction types (`ONE_TO_ONE`, `ONE_TO_MANY`, `MANY_TO_ONE`, `MANY_TO_MANY`) with auto-derived scheduling and leadership strategies
- **Granular availability** — per-weekday time ranges (`weeklyAvailability`) enforced on schedule slot creation and updates
- **Recurring slots** — create repeating slots with `WEEKLY`, `BI_WEEKLY`, `MONTHLY`, `TWICE_A_MONTH`, or `THRICE_A_WEEK` frequency (max 50 occurrences, all-or-nothing batch insert)
- **Session log** — coaches and admins log post-session notes and per-student attendance; booking statuses auto-transition to `COMPLETED` / `NO_SHOW`
- **Public booking flow** — multi-step wizard (team → event → slot → confirm) with OIDC-aligned timezone handling and a built-in troubleshooting dialog
- **Reschedule flow** — token-authenticated public reschedule page with coach re-assignment and notification fanout
- **Async notifications** — RabbitMQ-backed email fanout to students, coaches, co-coaches, and team admins with per-recipient timezone formatting

---

## Testing

All tests are integration tests that run against a live `chegg_test` PostgreSQL database.

```bash
cd backend

# Full suite
npm test -- --runInBand

# Single file
npx jest tests/integration/events.test.ts --runInBand
```

Test coverage spans: auth, SSO error paths, invites (`requiresSso`), events, bookings, availability, granular availability, recurrence, session log, teams, users, reports, and stats.

---

## Architecture Overview

```
backend/src/
├── domain/          # Feature modules (auth, events, bookings, teams, invite, ...)
│   └── <feature>/   # controller + service + repository per domain
├── shared/
│   ├── middleware/  # auth (JWT), validation (Zod), rate limiting, CSRF
│   ├── db/          # Prisma client singleton
│   ├── error/       # Standardized error classes
│   ├── notifications/ # RabbitMQ publisher
│   └── utils/       # Date helpers, JWT utils, pagination
└── routes/          # Aggregator — mounts all domain routes under /api

frontend/src/
├── pages/           # Lazy-loaded route pages
├── components/      # UI components grouped by domain
├── hooks/queries/   # React Query server-state hooks
├── api/             # Axios API wrappers per domain
└── context/         # Auth, confirm dialog, booking-view contexts
```

See [`CLAUDE.md`](CLAUDE.md) for full architecture documentation including interaction type design, booking mode enforcement, timezone handling, SSO callback decision tree, and notification service internals.
