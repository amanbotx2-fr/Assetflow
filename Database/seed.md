# Seed Data Guide

## Purpose

Seed data gives backend developers a reliable local dataset for development, testing, and demos.

## Seed Goals

- Create realistic records.
- Support all user roles.
- Exercise every core lifecycle workflow.
- Avoid production secrets.
- Be repeatable from a clean database.

## Recommended Seed Records

| Area | Minimum Records |
| --- | --- |
| Users | Admin, Manager, Employee, Auditor. |
| Departments | IT, Finance, Operations. |
| Categories | Laptop, Monitor, Projector, Vehicle, Furniture. |
| Assets | At least 10 assets across statuses. |
| Allocations | Active and returned examples. |
| Transfers | Pending, approved, rejected examples. |
| Bookings | Pending and approved examples. |
| Maintenance | Open, in progress, closed examples. |
| Audit Records | Verified and discrepancy examples. |
| Notifications | Read and unread examples. |

## Seed Safety Rules

- Use known local-only passwords.
- Hash seeded passwords through bcrypt.
- Do not use real employee data.
- Do not seed production databases unless explicitly approved.
- Keep seed records compatible with current migrations.

## Workflow

```bash
cd Backend
npm run seed
```

Expected behavior:

- Seed script can run after migrations.
- Seed script should avoid duplicate records where practical.
- Seed script should report created or skipped records.

