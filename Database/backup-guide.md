# Backup Guide

## Purpose

Backups protect AssetFlow data before risky operations, demos, deployments, and schema changes.

## When to Back Up

- Before production migrations.
- Before destructive data changes.
- Before demo data refresh.
- Before importing bulk records.
- Before major release testing.

## Local Backup

```bash
pg_dump "$DATABASE_URL" > assetflow_backup.sql
```

## Local Restore

```bash
psql "$DATABASE_URL" < assetflow_backup.sql
```

## Managed Database Backups

For hosted PostgreSQL:

- Enable scheduled backups.
- Confirm retention period.
- Test restore process before relying on it.
- Restrict access to backup files.

## Verification Checklist

- [ ] Backup command completed without errors.
- [ ] Backup file exists and is non-empty.
- [ ] Restore process has been tested in a non-production database.
- [ ] Backup location is secure.
- [ ] Team knows which backup was taken before deployment.

