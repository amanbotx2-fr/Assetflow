# AssetFlow

AssetFlow is a unified Enterprise Asset Lifecycle Management platform that enables organizations to track, allocate, book, maintain, audit, and monitor assets through a centralized system with real-time operational visibility and complete lifecycle traceability.

This repository is currently organized as a backend-first project. The Backend Team owns architecture, database design, API contracts, authentication, authorization, business logic, Prisma, PostgreSQL, deployment, and project documentation.

The system is designed with scalability, security, and maintainability in mind, enabling seamless integration with future frontend applications and external services.

## Project Overview

AssetFlow replaces disconnected asset tracking processes with a structured backend platform built around:

- Secure user authentication.
- Role-based authorization.
- Normalized PostgreSQL data.
- REST API contracts.
- Asset lifecycle workflows.
- Audit-ready historical records.
- Backend reporting data.
- Maintainable contribution and database workflows.

## Repository Structure

```text
AssetFlow/
|-- Backend/
|-- Frontend/
|-- Docs/
|-- Database/
`-- README.md
```

| Path | Owner | Purpose |
| --- | --- | --- |
| `Backend/` | Backend Team | API service architecture, source folders, tests, configuration, Prisma workspace, and uploads. |
| `Frontend/` | Frontend Team | Maintained separately by the Frontend Team. |
| `Docs/` | Backend Team | Backend architecture, API, database, testing, deployment, and contribution documentation. |
| `Database/` | Backend Team | PostgreSQL and Prisma operating guides. |
| `README.md` | Backend Team | Repository onboarding guide. |

## Team Responsibilities

### Backend Team

Responsible for:

- Backend architecture.
- Database design.
- API development.
- Authentication.
- Authorization.
- Business logic.
- Prisma.
- PostgreSQL.
- Deployment.
- Documentation.

### Frontend Team

Responsible for the `Frontend/` directory and its own implementation documentation.

## Prerequisites

Install these tools before contributing:

| Tool | Required | Purpose |
| --- | --- | --- |
| Git | Yes | Version control. |
| Node.js | Yes | Backend runtime and package tooling. |
| PostgreSQL | Yes | Local database. |
| VS Code | Recommended | Editor and project navigation. |
| Docker | Optional | Local PostgreSQL container or deployment support. |
| Prisma | Project dependency | ORM, migrations, generated client, database inspection. |
| Postman | Recommended | API testing. |

## Installing Software

### Git

Verify installation:

```bash
git --version
```

### Node.js

Use an active LTS version when possible.

```bash
node --version
npm --version
```

### PostgreSQL

Verify the PostgreSQL command line tools:

```bash
psql --version
```

Local database setup is documented in [Database/postgres-setup.md](Database/postgres-setup.md).

### VS Code

Recommended extensions:

- Prisma.
- ESLint.
- Prettier.
- GitLens.

### Docker Optional

Verify Docker:

```bash
docker --version
```

Docker can be used to run PostgreSQL locally if a native PostgreSQL install is not preferred.

### Prisma

Prisma is installed as a backend project dependency. Common commands are run through `npx`:

```bash
npx prisma --version
```

## Repository Setup

### Clone

```bash
git clone <repository-url>
cd AssetFlow
```

### Install

```bash
cd Backend
npm install
```

### Setup Database

Create a PostgreSQL database named `assetflow` or choose a name that matches your `.env` connection string.

```bash
createdb assetflow
```

Create backend environment file:

```bash
cp .env.example .env
```

Update `DATABASE_URL` inside `Backend/.env`.

### Run Migrations

```bash
cd Backend
npx prisma migrate dev
npx prisma generate
```

### Seed Database

When a seed script is available:

```bash
npm run seed
```

See [Database/seed.md](Database/seed.md) for seed standards.

### Run Backend

When the backend server entry point is available:

```bash
cd Backend
npm run dev
```

Expected local API base:

```text
http://localhost:5000/api
```

### Run Frontend

In a second terminal:

```bash
cd Frontend
npm install
cp .env.example .env
npm run dev
```

The frontend defaults to:

```text
http://localhost:3000
```

If port `3000` is busy, Vite will choose the next open port. Update backend `CORS_ORIGIN` if you use a different frontend port.

## Environment Variables

Backend environment variables:

| Variable | Example | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | Backend server port. |
| `NODE_ENV` | `development` | Runtime environment. |
| `DATABASE_URL` | `postgresql://assetflow:password@localhost:5432/assetflow` | PostgreSQL connection string. |
| `JWT_SECRET` | `replace-with-secure-secret` | JWT signing secret. |
| `JWT_EXPIRES_IN` | `7d` | JWT lifetime. |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed consumer origin. |
| `UPLOAD_DIR` | `uploads` | Local upload directory. |
| `MAX_FILE_SIZE_MB` | `5` | Upload size limit. |

Never commit real `.env` files.

Frontend environment variables:

| Variable | Example | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:5000/api` | Backend API base URL consumed by the static Vite frontend. |

## Project Structure

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

## Contribution Guide

Full guide: [Docs/11-contribution-guide.md](Docs/11-contribution-guide.md).

### Branch Naming

Use short, descriptive branch names:

| Type | Example |
| --- | --- |
| Feature | `feature/auth` |
| Feature | `feature/assets` |
| Feature | `feature/database` |
| Feature | `feature/notifications` |
| Bug fix | `bugfix/login` |
| Hotfix | `hotfix/api` |
| Documentation | `docs/api-design` |

### Commit Naming

Use conventional commits:

```text
feat(auth): implement JWT login
fix(asset): resolve allocation bug
docs(api): update transfer endpoints
refactor(database): simplify repository queries
test(auth): add invalid token coverage
```

Allowed prefixes:

- `feat:`
- `fix:`
- `docs:`
- `refactor:`
- `style:`
- `test:`
- `build:`
- `ci:`

### Pull Requests

Every pull request should include:

- Summary of changes.
- Linked issue or task.
- API contract updates when endpoints change.
- Database documentation updates when schema changes.
- Test notes.
- Migration notes when applicable.

### Code Review

Reviewers should verify:

- Authorization is enforced server-side.
- Controllers stay thin.
- Services own business workflows.
- Database changes use migrations.
- Multi-table lifecycle changes use transactions.
- Errors follow the standard response shape.
- Documentation matches behavior.

### Issue Workflow

Recommended states:

| State | Meaning |
| --- | --- |
| Backlog | Accepted but not scheduled. |
| Ready | Clear enough to start. |
| In Progress | Actively being worked on. |
| In Review | Pull request is open. |
| Done | Merged and verified. |
| Blocked | Waiting on a dependency or decision. |

## Database Workflow

1. Discuss schema changes before implementation.
2. Update `Backend/prisma/schema.prisma`.
3. Run `npx prisma format`.
4. Create migration with `npx prisma migrate dev --name <change-name>`.
5. Run `npx prisma generate`.
6. Update seed data if needed.
7. Update `Database/schema.md` and `Docs/08-database-design.md`.
8. Test affected APIs and database constraints.

## API Workflow

1. Document endpoint contract in `Docs/09-api-design.md`.
2. Define authorization and related tables.
3. Add validation.
4. Implement controller, service, and repository behavior.
5. Add tests for success, validation failure, forbidden access, and missing records.
6. Update Postman collection if maintained.

## Coding Standards

- Use TypeScript for backend source.
- Keep controllers focused on HTTP concerns.
- Keep business rules in services.
- Keep database queries organized through repositories where practical.
- Validate request data before service execution.
- Use transactions for multi-table lifecycle operations.
- Never return password hashes.
- Never commit secrets.
- Keep documentation updated with behavior changes.

## Useful Commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install backend dependencies. |
| `npm run dev` | Start backend development server when entry point exists. |
| `npm run build` | Compile backend TypeScript when source exists. |
| `npm test` | Run backend tests when test setup exists. |
| `npx prisma format` | Format Prisma schema. |
| `npx prisma migrate dev` | Create/apply local migration. |
| `npx prisma migrate deploy` | Apply migrations in deployment. |
| `npx prisma generate` | Generate Prisma client. |
| `npx prisma studio` | Open database inspector. |

## Troubleshooting

| Problem | Likely Cause | Fix |
| --- | --- | --- |
| `DATABASE_URL` error | Missing or invalid environment variable. | Check `Backend/.env`. |
| PostgreSQL connection refused | Database service is not running. | Start PostgreSQL or Docker container. |
| Prisma client missing | Client not generated. | Run `npx prisma generate`. |
| Migration failure | Schema conflict or invalid database state. | Review migration output and database guide. |
| JWT errors | Missing or inconsistent `JWT_SECRET`. | Check environment variables and log in again. |
| Port already in use | Another process is using backend port. | Change `PORT` or stop the conflicting process. |

## Resources

- [Node.js Documentation](https://nodejs.org/docs)
- [Express Documentation](https://expressjs.com)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Postman Documentation](https://learning.postman.com/docs)

## Documentation Links

| Document | Purpose |
| --- | --- |
| [Project Overview](Docs/00-project-overview.md) | Backend-centered project overview. |
| [Problem Statement](Docs/01-problem-statement.md) | Asset management problem context. |
| [MVP Requirements](Docs/02-mvp-requirements.md) | Backend MVP requirements. |
| [Feature List](Docs/03-feature-list.md) | Backend feature inventory. |
| [User Roles](Docs/04-user-roles.md) | Role permissions and authorization. |
| [Workflow Diagrams](Docs/05-user-flow.md) | Backend workflow diagrams. |
| [System Architecture](Docs/06-system-architecture.md) | Backend architecture. |
| [Tech Stack](Docs/07-tech-stack.md) | Backend technology choices. |
| [Database Design](Docs/08-database-design.md) | Database design and Prisma workflow. |
| [API Design](Docs/09-api-design.md) | REST API contracts. |
| [Folder Structure](Docs/10-folder-structure.md) | Repository folder responsibilities. |
| [Contribution Guide](Docs/11-contribution-guide.md) | Git and review workflow. |
| [Roadmap](Docs/12-development-roadmap.md) | Backend roadmap. |
| [Testing Plan](Docs/13-testing-plan.md) | Backend testing strategy. |
| [Deployment Guide](Docs/14-deployment-guide.md) | Backend deployment. |
| [Future Scope](Docs/15-future-scope.md) | Backend growth opportunities. |
| [MVP Checklist](Docs/16-mvp-checklist.md) | Backend MVP tracking. |
| [Database README](Database/README.md) | Database workflow overview. |

## License

License to be finalized by the project team.

## Contributors

| Name | Responsibility |
| --- | --- |
| TBD | Backend architecture |
| TBD | Database design |
| TBD | API development |
| TBD | Testing and deployment |
