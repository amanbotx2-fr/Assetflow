# AssetFlow Backend Project Overview

## Table of Contents

- [Vision](#vision)
- [Backend Ownership](#backend-ownership)
- [Why AssetFlow Exists](#why-assetflow-exists)
- [Backend Capabilities](#backend-capabilities)
- [Technology Summary](#technology-summary)
- [Repository Structure](#repository-structure)
- [Team Workflow](#team-workflow)
- [Documentation Map](#documentation-map)

## Vision

AssetFlow is an Enterprise Asset Lifecycle Management System built for the Odoo Hackathon. This repository now serves as the backend-centered source of truth for data modeling, API contracts, authentication, authorization, business workflows, database operations, deployment, and engineering contribution standards.

The backend should provide reliable lifecycle infrastructure for asset registration, allocation, movement, booking, maintenance, audit, reports, and notifications.

## Backend Ownership

The Backend Team is the primary owner of this repository's technical documentation and service architecture.

| Area | Backend Ownership |
| --- | --- |
| Architecture | REST API architecture, service boundaries, persistence, deployment topology. |
| Database | PostgreSQL schema, Prisma workflow, migrations, indexes, seed data, backups. |
| API | Endpoint contracts, request validation, response format, status codes. |
| Security | JWT authentication, bcrypt password hashing, role authorization. |
| Business Logic | Asset lifecycle rules, approvals, status transitions, audit logging. |
| Documentation | Backend onboarding, contribution workflow, database workflow, API workflow. |

The `Frontend/` directory exists for another team and is intentionally not documented internally here.

## Why AssetFlow Exists

Organizations often track assets through spreadsheets, email threads, approval messages, and manual updates. These disconnected processes create unreliable asset ownership, weak audit trails, delayed maintenance, and poor reporting.

AssetFlow provides a centralized backend system that can answer operational questions through structured data and auditable workflows:

| Question | Backend Responsibility |
| --- | --- |
| Where is this asset now? | Store current asset status, location, assignee, and department. |
| Who is responsible for it? | Preserve allocation and transfer history. |
| Who approved this change? | Store approver, timestamp, decision notes, and audit log. |
| Is the asset available? | Enforce status rules and booking conflict checks. |
| What needs maintenance? | Track ticket priority, status, assignment, and resolution. |
| What changed over time? | Record audit logs and lifecycle history. |

## Backend Capabilities

| Capability | Description |
| --- | --- |
| Authentication | Login, JWT issuance, token verification, authenticated user context. |
| Authorization | Role-based access for Admin, Manager, Employee, and Auditor. |
| Organization Data | Departments, users, roles, and category metadata. |
| Asset Registry | Create and manage asset records, status, category, location, and ownership. |
| Asset Allocation | Assign assets to users or departments while preserving history. |
| Transfer Workflow | Request, approve, reject, complete, and audit asset movement. |
| Booking Workflow | Reserve shared assets and reject conflicting reservations. |
| Maintenance Workflow | Track reported issues, priority, assignment, progress, and closure. |
| Audit Workflow | Record verification outcomes and discrepancies. |
| Reports | Provide backend report data for inventory, maintenance, booking, and audit analysis. |
| Notifications | Store lifecycle notification records for users. |
| QR Generation | Generate QR values or images for asset identity workflows. |

## Technology Summary

| Area | Technology |
| --- | --- |
| Runtime | Node.js |
| API Framework | Express.js |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma ORM |
| Authentication | JWT, bcrypt |
| File Handling | Multer |
| QR Generation | qrcode |
| Tools | Git, GitHub, Docker, Prisma Studio, Postman, VS Code |

## Repository Structure

```text
AssetFlow/
|-- Backend/
|-- Frontend/
|-- Docs/
|-- Database/
`-- README.md
```

| Path | Purpose |
| --- | --- |
| `Backend/` | Backend service architecture, source folders, configuration, tests, and backend onboarding. |
| `Frontend/` | Maintained separately by the Frontend Team. |
| `Docs/` | Backend-focused project documentation and workflow guides. |
| `Database/` | PostgreSQL and Prisma database documentation. |
| `README.md` | Repository onboarding guide. |

## Team Workflow

1. Backend developer reads `README.md`.
2. Developer reviews `Docs/07-tech-stack.md`, `Docs/08-database-design.md`, and `Docs/09-api-design.md`.
3. Developer follows `Docs/11-contribution-guide.md` for branch and pull request workflow.
4. Database changes are planned using `Database/migration-guide.md`.
5. API changes are documented before or alongside implementation.
6. Tests are added according to `Docs/13-testing-plan.md`.
7. Deployment changes are reviewed with `Docs/14-deployment-guide.md`.

## Documentation Map

| Document | Purpose |
| --- | --- |
| `00-project-overview.md` | Backend-centered product and engineering overview. |
| `01-problem-statement.md` | Problem context and organizational need. |
| `02-mvp-requirements.md` | Backend MVP scope and acceptance criteria. |
| `03-feature-list.md` | Backend feature inventory. |
| `04-user-roles.md` | Authorization roles and permission matrix. |
| `05-user-flow.md` | Backend workflow diagrams. |
| `06-system-architecture.md` | API, service, persistence, and deployment architecture. |
| `07-tech-stack.md` | Backend technology choices, advantages, and alternatives. |
| `08-database-design.md` | Database design, standards, indexes, relationships, and Prisma workflow. |
| `09-api-design.md` | REST API contracts. |
| `10-folder-structure.md` | Repository, backend, database, and docs folder responsibilities. |
| `11-contribution-guide.md` | Git, branch, commit, pull request, and review workflow. |
| `12-development-roadmap.md` | Backend development milestones. |
| `13-testing-plan.md` | Backend, API, database, and security testing strategy. |
| `14-deployment-guide.md` | Backend and database deployment guide. |
| `15-future-scope.md` | Backend and platform growth opportunities. |
| `16-mvp-checklist.md` | Backend MVP execution checklist. |

