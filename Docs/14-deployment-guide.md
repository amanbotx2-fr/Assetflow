# Backend Deployment Guide

## Table of Contents

- [Scope](#scope)
- [Local Deployment Readiness](#local-deployment-readiness)
- [Environment Variables](#environment-variables)
- [Build Process](#build-process)
- [Database Migration Deployment](#database-migration-deployment)
- [Production Strategy](#production-strategy)
- [Health Checks](#health-checks)
- [Deployment Checklist](#deployment-checklist)
- [Troubleshooting](#troubleshooting)

## Scope

This guide covers backend and database deployment only. The `Frontend/` directory is maintained separately.

## Local Deployment Readiness

Before deploying, verify:

- Backend dependencies install successfully.
- TypeScript build succeeds.
- PostgreSQL connection works.
- Prisma migrations apply cleanly.
- Seed data is optional and environment-safe.
- Required environment variables are configured.
- Smoke tests pass.

## Environment Variables

| Variable | Example | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | API server port. |
| `NODE_ENV` | `production` | Runtime mode. |
| `DATABASE_URL` | `postgresql://user:password@host:5432/assetflow` | PostgreSQL connection string. |
| `JWT_SECRET` | `use-a-secure-secret` | Token signing secret. |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime. |
| `CORS_ORIGIN` | `https://example.com` | Allowed consumer origin. |
| `UPLOAD_DIR` | `uploads` | File storage directory. |
| `MAX_FILE_SIZE_MB` | `5` | Upload limit. |

Security requirements:

- Never commit real `.env` files.
- Use strong production secrets.
- Rotate secrets if exposed.
- Restrict database network access.

## Build Process

Recommended backend build flow:

```bash
cd Backend
npm install
npm run build
```

Recommended production start:

```bash
npm start
```

## Database Migration Deployment

Production migration command:

```bash
npx prisma migrate deploy
```

Generate Prisma client:

```bash
npx prisma generate
```

Migration rules:

- Run migrations before serving traffic when schema changes are required.
- Back up production data before destructive changes.
- Do not use development migration reset commands in production.
- Keep migration logs in deployment output.

## Production Strategy

| Component | Strategy |
| --- | --- |
| Backend API | Deploy to Node-compatible hosting. |
| PostgreSQL | Use managed PostgreSQL when possible. |
| Migrations | Run through deployment job or release command. |
| Uploads | Local uploads for MVP; object storage for production scale. |
| Logs | Capture server errors and migration output. |
| Backups | Schedule database backups before demos and releases. |

## Health Checks

Recommended health endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Confirms server is running. |
| `GET /health/db` | Confirms database connection. |

Health response example:

```json
{
  "success": true,
  "data": {
    "service": "assetflow-backend",
    "database": "connected"
  }
}
```

## Deployment Checklist

- [ ] Production environment variables configured.
- [ ] PostgreSQL database provisioned.
- [ ] Database backup taken if deploying over existing data.
- [ ] `npx prisma migrate deploy` completed.
- [ ] Prisma client generated.
- [ ] Backend build completed.
- [ ] Backend process started.
- [ ] Health endpoint passes.
- [ ] Login smoke test passes.
- [ ] Protected endpoint rejects missing token.
- [ ] Logs checked for startup errors.

## Troubleshooting

| Problem | Likely Cause | Fix |
| --- | --- | --- |
| Database connection fails | Invalid `DATABASE_URL` or network restriction. | Verify credentials, host, port, and allowlist. |
| JWT verification fails | Incorrect `JWT_SECRET` or expired token. | Confirm secret and log in again. |
| Migration fails | Schema conflict or insufficient database permissions. | Review migration output and database role permissions. |
| Uploads fail | Missing upload directory or write permission. | Create directory and verify storage configuration. |
| Server starts but APIs fail | Missing environment variable. | Compare environment against `.env.example`. |

