# Contribution Guide

## Table of Contents

- [First Time Setup](#first-time-setup)
- [Branch Strategy](#branch-strategy)
- [Git Workflow](#git-workflow)
- [Commit Convention](#commit-convention)
- [Pull Requests](#pull-requests)
- [Code Review](#code-review)
- [Issue Workflow](#issue-workflow)
- [Database Workflow](#database-workflow)
- [API Workflow](#api-workflow)
- [Coding Standards](#coding-standards)

## First Time Setup

1. Clone the repository.

```bash
git clone <repository-url>
cd AssetFlow
```

2. Install backend dependencies.

```bash
cd Backend
npm install
```

3. Create `.env`.

```bash
cp .env.example .env
```

4. Set up PostgreSQL using `Database/postgres-setup.md`.

5. Run Prisma commands.

```bash
npx prisma generate
npx prisma migrate dev
```

6. Seed the database when a seed script is available.

```bash
npm run seed
```

7. Run the backend when the server entry point is available.

```bash
npm run dev
```

## Branch Strategy

Recommended branch flow:

```text
main
  -> develop
     -> feature/<feature-name>
        -> Pull Request
           -> Code Review
              -> Merge
```

Branch examples:

| Branch | Purpose |
| --- | --- |
| `feature/auth` | Authentication work. |
| `feature/assets` | Asset registry APIs. |
| `feature/database` | Schema, migrations, seed data. |
| `feature/notifications` | Notification APIs. |
| `bugfix/login` | Login bug fix. |
| `hotfix/api` | Urgent API production fix. |
| `docs/database-guide` | Documentation update. |

## Git Workflow

Start from `develop`:

```bash
git checkout develop
```

Switches your local working branch to `develop`.

```bash
git pull origin develop
```

Downloads the latest shared changes from the remote `develop` branch.

```bash
git checkout -b feature/xyz
```

Creates a new feature branch from the latest `develop`.

Make your changes, then inspect status:

```bash
git status
```

Shows changed, staged, and untracked files.

```bash
git add .
```

Stages all intended changes. Review carefully before using this command.

```bash
git commit -m "feat(scope): short description"
```

Creates a local commit with a conventional message.

```bash
git push origin feature/xyz
```

Pushes your branch to GitHub so a pull request can be opened.

After review approval, merge through GitHub according to team rules.

## Commit Convention

Use this format:

```text
type(scope): description
```

Allowed types:

| Type | Use |
| --- | --- |
| `feat` | New feature. |
| `fix` | Bug fix. |
| `docs` | Documentation change. |
| `refactor` | Internal code restructuring without behavior change. |
| `style` | Formatting-only change. |
| `test` | Test additions or changes. |
| `build` | Build or dependency changes. |
| `ci` | Continuous integration changes. |

Examples:

```text
feat(auth): implement JWT login
fix(asset): resolve allocation status bug
docs(api): update transfer endpoints
refactor(database): simplify asset repository queries
test(auth): add invalid token coverage
```

## Pull Requests

Pull request checklist:

- [ ] Branch is based on latest `develop`.
- [ ] Scope is focused and described clearly.
- [ ] API changes are documented in `Docs/09-api-design.md`.
- [ ] Database changes include migration notes.
- [ ] Tests or manual verification notes are included.
- [ ] No secrets are committed.
- [ ] Reviewers are assigned.

## Code Review

Reviewers should check:

- Authorization rules are enforced server-side.
- Business logic belongs in services, not controllers.
- Prisma access is organized through repositories where practical.
- Transactions protect multi-table lifecycle changes.
- Errors follow the standard response shape.
- Tests cover success and failure paths.
- Documentation matches behavior.

## Issue Workflow

Recommended issue states:

| State | Meaning |
| --- | --- |
| Backlog | Valid work not yet scheduled. |
| Ready | Requirements are clear enough to begin. |
| In Progress | A developer is actively working on it. |
| In Review | Pull request is open. |
| Done | Merged and verified. |
| Blocked | Waiting on decision or dependency. |

## Database Workflow

- Discuss schema changes before implementing them.
- Update Prisma schema.
- Create migration with a descriptive name.
- Update `Database/schema.md` and `Docs/08-database-design.md`.
- Update seed data when needed.
- Test migrations from a clean database.
- Include migration notes in the pull request.

## API Workflow

- Define or update endpoint contract first.
- Confirm authorization and related tables.
- Implement validation before service logic.
- Add service and repository behavior.
- Add tests for success, validation failure, forbidden access, and not found cases.
- Update Postman collection if maintained.

## Coding Standards

- Use TypeScript for backend source files.
- Keep controllers thin.
- Keep business rules in services.
- Use repositories for database access when queries are non-trivial.
- Validate inputs before service execution.
- Use consistent response and error helpers.
- Never return password hashes.
- Never commit `.env` files or production secrets.

