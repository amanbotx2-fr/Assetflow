# AssetFlow ERP

Enterprise Asset Management System built for modern organizations.

![License](https://img.shields.io/badge/license-TBD-lightgrey)
![Node](https://img.shields.io/badge/node-20%2B-5FA04E)
![Vite](https://img.shields.io/badge/frontend-Vite-646CFF)
![Express](https://img.shields.io/badge/backend-Express-111827)
![Prisma](https://img.shields.io/badge/orm-Prisma-2D3748)
![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL-4169E1)
![JWT](https://img.shields.io/badge/auth-JWT-0F172A)

AssetFlow ERP is a full-stack asset lifecycle platform for registering, allocating, booking, maintaining, auditing, and reporting on organizational assets. It is designed as a practical ERP-style system with role-based access, a PostgreSQL-backed REST API, and a responsive static Vite frontend.

## Overview

Organizations often track assets through spreadsheets, email approvals, disconnected booking processes, and manual audits. AssetFlow centralizes those workflows into a single application so teams can answer operational questions quickly:

- Which assets are available, allocated, booked, under maintenance, or retired?
- Who owns or uses a given asset right now?
- Which transfers, bookings, maintenance tickets, and audits need action?
- What is the current utilization and lifecycle health of the asset base?

The project is built for hackathon-speed delivery while still keeping clean backend boundaries, real authentication, seed data, and a usable frontend.

## Features

| Area | What is included |
| --- | --- |
| Authentication | JWT login, employee self-registration, current-user session endpoint, logout flow |
| Role-Based Access | Admin, Manager, Employee, and Auditor authorization paths |
| Dashboard | Operational summary, alerts, recent activity, notifications, lifecycle metrics |
| Organization Management | Departments, categories, users, employee directory, overview stats |
| Asset Tracking | Asset list, registration, filters, lookup, status badges, QR-ready asset identifiers |
| Allocation & Transfer | Active allocation tracking, returns, transfer requests, approvals, rejections |
| Resource Booking | Bookable assets, booking workflow, approvals, calendar and availability APIs |
| Maintenance | Ticket lifecycle, assignment, progress, resolution, cost and status tracking |
| Audits | Audit cycles, asset verification, discrepancy tracking, audit logs |
| Reports & Analytics | Dashboard analytics, utilization, idle assets, near-retirement assets, exports |
| Notifications | Notification center, unread count, read/delete flows |
| Responsive UI | Static Vite multi-page frontend with shared layout, sidebar, navbar, and page shells |
| REST API | Express routes with validation, pagination, filtering, and consistent JSON responses |
| Database | PostgreSQL with Prisma migrations, UUID primary keys, relations, and seed data |

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Vite, TypeScript checks, static HTML, modular JavaScript, shared CSS design system |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma ORM |
| Authentication | JWT, bcrypt |
| Validation | Zod |
| Files & QR | Multer, qrcode |
| Tooling | npm, Prisma Studio, Postman-compatible REST APIs |

## Project Structure

```text
AssetFlow/
├── Backend/
│   ├── prisma/              # Prisma schema, migrations, seed script
│   ├── src/
│   │   ├── config/          # Environment and Prisma client setup
│   │   ├── controllers/     # Thin Express controllers
│   │   ├── middleware/      # Auth, RBAC, validation, error handling
│   │   ├── repositories/    # Shared persistence helpers
│   │   ├── routes/          # REST route registration
│   │   ├── services/        # Business logic and workflow rules
│   │   ├── types/           # TypeScript declarations
│   │   ├── utils/           # Response, JWT, password, pagination helpers
│   │   └── validators/      # Zod schemas
│   ├── tests/               # QA scripts and artifacts
│   └── uploads/             # Local upload placeholder
├── Frontend/
│   ├── js/                  # API, auth, layout, page rendering logic
│   ├── styles/              # Design tokens, layout, components, utilities
│   ├── *.html               # Static multi-page Vite entrypoints
│   └── vite.config.ts       # Multi-page Vite build inputs
├── Database/                # PostgreSQL and Prisma operating guides
├── Docs/                    # Architecture, API, roadmap, testing, screenshots
└── README.md
```

## Screenshots

Screenshots below were captured from the local application with seeded data at `1440x1000`.

### Login

![Login](Docs/screenshots/login.png)

### Dashboard

![Dashboard](Docs/screenshots/dashboard.png)

### Organization

![Organization](Docs/screenshots/organization.png)

### Assets

![Assets](Docs/screenshots/assets.png)

### Allocation & Transfer

![Allocation & Transfer](Docs/screenshots/allocation.png)

### Resource Booking

![Resource Booking](Docs/screenshots/booking.png)

### Maintenance

![Maintenance](Docs/screenshots/maintenance.png)

### Audit

![Audit](Docs/screenshots/audit.png)

### Reports

![Reports](Docs/screenshots/reports.png)

### Notifications

![Notifications](Docs/screenshots/notifications.png)

## Local Setup

### Prerequisites

| Tool | Version used for verification | Notes |
| --- | --- | --- |
| Node.js | `v26.3.1` | Node 20+ is recommended. |
| npm | `11.16.0` | Installed with Node. |
| PostgreSQL | Local PostgreSQL on `localhost:5432` | Required for Prisma and backend APIs. |

### 1. Clone

```bash
git clone <repository-url>
cd AssetFlow
```

If your local folder name differs, run the remaining commands from the repository root that contains `Backend/` and `Frontend/`.

### 2. Prepare PostgreSQL

The backend example environment uses a local database named `assetflow` and a local user named `assetflow`.

```bash
psql postgres -c "CREATE USER assetflow WITH PASSWORD 'assetflow_password';"
psql postgres -c "CREATE DATABASE assetflow OWNER assetflow;"
```

If you already have a preferred local PostgreSQL user, create only the database and update `Backend/.env` accordingly.

### 3. Install and Run Backend

```bash
cd Backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:deploy
npm run seed
npm run dev
```

Backend URL:

```text
http://localhost:5000
```

API base URL:

```text
http://localhost:5000/api
```

Health checks:

```text
http://localhost:5000/health
http://localhost:5000/health/db
```

### 4. Install and Run Frontend

Open a second terminal:

```bash
cd Frontend
npm install
cp .env.example .env
npm run dev
```

Frontend URL:

```text
http://localhost:3000
```

If Vite starts on another port because `3000` is busy, update `Backend/.env`:

```env
CORS_ORIGIN="http://localhost:<vite-port>"
```

Then restart the backend.

## Demo Credentials

The seed script creates these accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@assetflow.local` | `password123` |
| Manager | `manager@assetflow.local` | `password123` |
| Employee | `employee@assetflow.local` | `password123` |
| Auditor | `auditor@assetflow.local` | `password123` |

Employee self-registration is also available from the login page.

## Environment Variables

### Backend

`Backend/.env.example`

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://assetflow:assetflow_password@localhost:5432/assetflow"
JWT_SECRET="replace-with-a-secure-local-secret"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:3000"
UPLOAD_DIR="uploads"
MAX_FILE_SIZE_MB=5
```

| Variable | Purpose |
| --- | --- |
| `PORT` | Express server port. |
| `NODE_ENV` | Runtime mode: `development`, `test`, or `production`. |
| `DATABASE_URL` | PostgreSQL connection string consumed by Prisma. |
| `JWT_SECRET` | Secret used to sign and verify JWTs. Use a strong private value outside demos. |
| `JWT_EXPIRES_IN` | Token lifetime passed to `jsonwebtoken`. |
| `CORS_ORIGIN` | Allowed frontend origin for browser requests. |
| `UPLOAD_DIR` | Local directory for upload handling. |
| `MAX_FILE_SIZE_MB` | Upload size limit. |

### Frontend

`Frontend/.env.example`

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Backend API base URL used by frontend API helpers. |

Never commit real `.env` files.

## API Overview

All application APIs are mounted under `/api`.

| Module | Representative Endpoints |
| --- | --- |
| Authentication | `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me`, `POST /api/auth/logout` |
| Dashboard | `GET /api/dashboard/overview` |
| Organization | `GET /api/organization/overview`, `GET /api/departments`, `GET /api/categories`, `GET /api/users` |
| Assets | `GET /api/assets`, `POST /api/assets`, `GET /api/assets/lookup`, `GET /api/assets/:id`, `PATCH /api/assets/:id`, `DELETE /api/assets/:id` |
| Allocation | `GET /api/allocations`, `POST /api/allocations`, `POST /api/allocations/:id/return` |
| Transfers | `GET /api/transfers`, `POST /api/transfers`, `PATCH /api/transfers/:id/approve`, `PATCH /api/transfers/:id/reject` |
| Bookings | `GET /api/bookings`, `POST /api/bookings`, `GET /api/bookings/calendar`, `GET /api/bookings/availability` |
| Maintenance | `GET /api/maintenance`, `POST /api/maintenance`, workflow actions such as approve, assign, start, resolve, close |
| Audits | `GET /api/audits`, `POST /api/audits`, `POST /api/audits/:id/verify`, `GET /api/audits/:id/discrepancies` |
| Reports | `GET /api/reports/dashboard`, `GET /api/reports/assets`, `GET /api/reports/utilization`, `GET /api/reports/export` |
| Notifications | `GET /api/notifications`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/read-all` |
| Settings | `GET /api/settings/company`, `GET /api/settings/profile`, `GET /api/settings/roles`, `GET /api/settings/permissions` |

For detailed request and response contracts, see [Docs/09-api-design.md](Docs/09-api-design.md).

## Database

AssetFlow uses PostgreSQL with Prisma ORM.

Common commands:

```bash
cd Backend
npm run prisma:generate   # Generate Prisma Client
npm run prisma:deploy     # Apply committed migrations
npm run prisma:migrate    # Create/apply a local development migration
npm run seed              # Reset and seed demo data
npm run prisma:studio     # Open Prisma Studio
```

Important database references:

- [Database/schema.md](Database/schema.md)
- [Database/migration-guide.md](Database/migration-guide.md)
- [Database/seed.md](Database/seed.md)
- [Database/postgres-setup.md](Database/postgres-setup.md)

## Development Workflow

1. Create a branch from the latest working branch.
2. Keep backend business logic in services and database access in Prisma-backed modules.
3. Keep frontend page behavior in `Frontend/js/` and shared styling in `Frontend/styles/`.
4. Validate changes before opening a pull request:

```bash
cd Backend
npm run build
npx prisma validate

cd ../Frontend
npm run build
npm run lint
```

5. Include screenshots when frontend UI changes.
6. Update [Docs/09-api-design.md](Docs/09-api-design.md) when API contracts change.

## Verified Commands

These commands were run successfully while preparing this README:

```bash
cd Backend
npm install
npm run prisma:generate
npm run prisma:deploy
npm run seed
npm run build
npx prisma validate
npm run dev
```

```bash
cd Frontend
npm install
npm run build
npm run lint
npm run dev
```

Runtime checks verified:

- Login with seeded admin credentials.
- `GET /api/auth/me` with JWT.
- Dashboard overview API.
- Protected route returns `401` without a token.
- Employee registration from the UI.
- Login with the newly registered employee.
- Dashboard loads after registration/login.
- Navigation pages render with a valid admin session.

## Future Roadmap

- [ ] Add a formal `LICENSE` file.
- [ ] Add CI checks for backend build, Prisma validation, and frontend build.
- [ ] Add OpenAPI documentation or an exported Postman collection.
- [ ] Add automated browser smoke tests for the static frontend.
- [ ] Add production deployment documentation.
- [ ] Add richer chart visualizations for reports.
- [ ] Add email delivery for notification workflows.
- [ ] Add mobile-first refinements for dense data tables.

## Documentation

- [Project Overview](Docs/00-project-overview.md)
- [Feature List](Docs/03-feature-list.md)
- [User Roles](Docs/04-user-roles.md)
- [System Architecture](Docs/06-system-architecture.md)
- [Database Design](Docs/08-database-design.md)
- [API Design](Docs/09-api-design.md)
- [Testing Plan](Docs/13-testing-plan.md)
- [Deployment Guide](Docs/14-deployment-guide.md)

## License

No license file is currently present in this repository. Add a `LICENSE` file before publishing AssetFlow as a public open-source project.

## Author

AssetFlow Hackathon Team.
