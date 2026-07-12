# AssetFlow Backend

## Purpose

The `Backend/` directory contains the planned Node.js, Express.js, TypeScript, Prisma, and PostgreSQL backend service for AssetFlow.

No API implementation is included in this scaffold yet. This folder establishes the architecture, package configuration, environment example, source boundaries, and documentation needed for backend development.

## Architecture

```text
HTTP request
  -> routes
  -> middleware
  -> controllers
  -> services
  -> repositories
  -> Prisma
  -> PostgreSQL
```

## Folder Responsibilities

| Folder | Responsibility |
| --- | --- |
| `src/config/` | Runtime configuration and environment helpers. |
| `src/controllers/` | HTTP request handlers. |
| `src/middleware/` | Authentication, authorization, validation, upload, and error middleware. |
| `src/models/` | Backend domain model notes or DTO definitions if needed. |
| `src/routes/` | Express route declarations. |
| `src/services/` | Business logic and transaction orchestration. |
| `src/repositories/` | Prisma query access. |
| `src/validators/` | Request validation definitions. |
| `src/utils/` | Shared helpers. |
| `src/types/` | Shared backend TypeScript types. |
| `prisma/` | Prisma schema, migrations, and seed entry points. |
| `scripts/` | Operational scripts. |
| `tests/` | Backend tests. |
| `uploads/` | Local upload storage for development. |

## Setup

```bash
npm install
cp .env.example .env
npx prisma generate
```

Run migrations when `prisma/schema.prisma` exists:

```bash
npx prisma migrate dev
```

## Development Rules

- Keep controllers thin.
- Put business logic in services.
- Use repositories for database access where practical.
- Validate input before service execution.
- Use transactions for multi-table lifecycle changes.
- Never return password hashes.
- Never commit real environment files.

