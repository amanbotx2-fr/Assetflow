# Migration Guide

## Purpose

This guide defines how schema changes move from local development to shared environments.

## Local Migration Workflow

```bash
cd Backend
npx prisma format
npx prisma migrate dev --name <change-name>
npx prisma generate
```

## Migration Naming

Use descriptive snake_case names:

```text
add_asset_bookings
add_maintenance_ticket_priority
index_booking_conflicts
rename_asset_owner_fields
```

## Pull Request Requirements

Every migration pull request should include:

- Reason for schema change.
- Migration name.
- Tables affected.
- Data migration notes if applicable.
- Rollback considerations.
- Documentation updates.
- Test evidence.

## Production Migration Workflow

```bash
cd Backend
npx prisma migrate deploy
npx prisma generate
```

## Rules

- Do not edit migrations that have already been applied in shared environments.
- Do not run reset commands in production.
- Back up production data before destructive changes.
- Keep schema and docs synchronized.
- Review indexes for high-use query paths.

## Rollback Guidance

Prisma migrations are forward-first. For rollback:

- Prefer a new corrective migration.
- Restore from backup for severe data corruption.
- Document manual steps if data transformation is involved.

