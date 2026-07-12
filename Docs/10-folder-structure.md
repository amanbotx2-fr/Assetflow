# Folder Structure

## Table of Contents

- [Repository Root](#repository-root)
- [Backend Folder](#backend-folder)
- [Database Folder](#database-folder)
- [Docs Folder](#docs-folder)
- [Folder Ownership](#folder-ownership)

## Repository Root

```text
AssetFlow/
|-- Backend/
|-- Frontend/
|-- Docs/
|-- Database/
`-- README.md
```

| Path | Responsibility |
| --- | --- |
| `Backend/` | Backend source layout, configuration, tests, uploads, Prisma workspace, and backend documentation. |
| `Frontend/` | Maintained by the Frontend Team. Internal structure is intentionally not documented here. |
| `Docs/` | Backend-focused architecture, API, database, testing, deployment, and contribution documentation. |
| `Database/` | PostgreSQL and Prisma operating guides. |
| `README.md` | Repository onboarding guide. |

## Backend Folder

```text
Backend/
|-- src/
|   |-- config/
|   |-- controllers/
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   |-- services/
|   |-- repositories/
|   |-- validators/
|   |-- utils/
|   `-- types/
|-- prisma/
|-- scripts/
|-- tests/
|-- uploads/
|-- package.json
|-- tsconfig.json
|-- .env.example
|-- .gitignore
`-- README.md
```

| Path | Responsibility |
| --- | --- |
| `src/config/` | Environment loading, runtime configuration, database client configuration. |
| `src/controllers/` | HTTP request handlers that call services and return response shapes. |
| `src/middleware/` | Authentication, authorization, validation, upload, and error middleware. |
| `src/models/` | Backend domain model notes or DTO definitions if used outside Prisma. |
| `src/routes/` | Express route declarations and middleware wiring. |
| `src/services/` | Business workflows and transaction boundaries. |
| `src/repositories/` | Prisma query wrappers and persistence access. |
| `src/validators/` | Request payload, params, and query validation definitions. |
| `src/utils/` | Shared helpers such as password hashing, JWT, QR, response, and date utilities. |
| `src/types/` | Shared backend TypeScript types. |
| `prisma/` | Prisma schema, migrations, and seed entry points. |
| `scripts/` | Operational scripts for seed, maintenance, or data utilities. |
| `tests/` | Backend unit, integration, API, and database tests. |
| `uploads/` | Local development upload storage. |

## Database Folder

```text
Database/
|-- README.md
|-- schema.md
|-- seed.md
|-- migration-guide.md
|-- naming-conventions.md
|-- backup-guide.md
`-- postgres-setup.md
```

| File | Responsibility |
| --- | --- |
| `README.md` | Database folder purpose, workflow, and Prisma/PostgreSQL relationship. |
| `schema.md` | Table responsibilities, relationships, and schema standards. |
| `seed.md` | Seed data plan and standards. |
| `migration-guide.md` | Migration creation, review, deployment, and rollback guidance. |
| `naming-conventions.md` | Table, column, enum, index, and migration naming rules. |
| `backup-guide.md` | Backup, restore, and verification procedure. |
| `postgres-setup.md` | Local PostgreSQL setup guide. |

## Docs Folder

The `Docs/` folder contains project-level backend documentation. It should not contain presentation-layer implementation details.

| File | Responsibility |
| --- | --- |
| `00-project-overview.md` | Backend-centered overview. |
| `06-system-architecture.md` | REST API, service, Prisma, and PostgreSQL architecture. |
| `07-tech-stack.md` | Backend technology rationale. |
| `08-database-design.md` | Database design and standards. |
| `09-api-design.md` | API endpoint contracts. |
| `11-contribution-guide.md` | Professional contribution process. |
| `12-development-roadmap.md` | Backend delivery milestones. |
| `13-testing-plan.md` | Backend, API, and database testing. |
| `14-deployment-guide.md` | Backend and database deployment. |

## Folder Ownership

| Folder | Owner | Notes |
| --- | --- | --- |
| `Backend/` | Backend Team | Primary implementation area for APIs and business workflows. |
| `Database/` | Backend Team | Database planning, migrations, seeds, backups, and standards. |
| `Docs/` | Backend Team | Backend project documentation and contribution workflow. |
| `Frontend/` | Frontend Team | Maintained separately. |

