# Database Documentation

## Purpose

The `Database/` folder documents PostgreSQL and Prisma operating standards for AssetFlow. It is owned by the Backend Team and should be updated whenever schema, migration, seed, backup, or naming decisions change.

## Folder Contents

| File | Purpose |
| --- | --- |
| `schema.md` | Table responsibilities, relationships, constraints, and indexing guidance. |
| `seed.md` | Seed data strategy for local development and demos. |
| `migration-guide.md` | Migration workflow from schema change to deployment. |
| `naming-conventions.md` | Database, Prisma, index, enum, and migration naming rules. |
| `backup-guide.md` | Backup, restore, and verification process. |
| `postgres-setup.md` | Local PostgreSQL installation and setup. |

## Workflow

Recommended database workflow:

1. Review the required schema change.
2. Update `Backend/prisma/schema.prisma`.
3. Run `npx prisma format`.
4. Create migration with `npx prisma migrate dev --name <change-name>`.
5. Run `npx prisma generate`.
6. Update seed data if needed.
7. Update this folder's documentation.
8. Test affected API and database behavior.
9. Include migration notes in the pull request.

## How Prisma Interacts with PostgreSQL

Prisma acts as the typed database access layer between backend services and PostgreSQL.

```text
Backend service
  -> Prisma Client
  -> PostgreSQL query
  -> PostgreSQL result
  -> typed Prisma result
  -> backend response
```

Prisma is responsible for:

- Defining database models through `schema.prisma`.
- Creating migrations from schema changes.
- Generating a typed client for backend code.
- Applying migrations to local and production databases.
- Supporting inspection through Prisma Studio.

PostgreSQL remains the source of truth for:

- Stored data.
- Foreign key enforcement.
- Unique constraints.
- Transactions.
- Indexes.
- Query execution.

