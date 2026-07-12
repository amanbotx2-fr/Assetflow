# PostgreSQL Setup

## Purpose

This guide helps backend developers prepare a local PostgreSQL database for AssetFlow.

## Option 1: Native PostgreSQL

Verify installation:

```bash
psql --version
```

Create database:

```bash
createdb assetflow
```

Create user if needed:

```bash
createuser assetflow
```

## Option 2: Docker

```bash
docker run --name assetflow-postgres \
  -e POSTGRES_USER=assetflow \
  -e POSTGRES_PASSWORD=assetflow_password \
  -e POSTGRES_DB=assetflow \
  -p 5432:5432 \
  -d postgres:16
```

## Connection String

Use this value in `Backend/.env` for the Docker example:

```env
DATABASE_URL="postgresql://assetflow:assetflow_password@localhost:5432/assetflow"
```

## Verify Connection

```bash
psql "postgresql://assetflow:assetflow_password@localhost:5432/assetflow"
```

## Prisma Setup

```bash
cd Backend
npx prisma generate
npx prisma migrate dev
```

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Port `5432` already in use | Stop existing service or change Docker port mapping. |
| Authentication failed | Verify username, password, and database name. |
| Database does not exist | Run `createdb assetflow` or recreate Docker container. |
| Prisma cannot connect | Check `DATABASE_URL` and ensure PostgreSQL is running. |

