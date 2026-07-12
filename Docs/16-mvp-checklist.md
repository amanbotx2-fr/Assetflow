# Backend MVP Checklist

## Table of Contents

- [Status Legend](#status-legend)
- [Checklist](#checklist)
- [Final Acceptance](#final-acceptance)

## Status Legend

| Status | Meaning |
| --- | --- |
| Not Started | Work has not begun. |
| In Progress | Implementation or documentation is underway. |
| Blocked | Waiting on decision or dependency. |
| In Review | Pull request or review is active. |
| Done | Implemented, tested, and accepted. |

## Checklist

| Done | Feature | Priority | Owner | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| [ ] | Backend folder scaffold | Mandatory | Backend | Not Started | Source folders, config files, docs. |
| [ ] | Database folder documentation | Mandatory | Backend | Not Started | Schema, seed, migrations, backups, setup. |
| [ ] | PostgreSQL setup | Mandatory | Backend | Not Started | Local database connection verified. |
| [ ] | Prisma schema | Mandatory | Backend | Not Started | Core models defined. |
| [ ] | Initial migration | Mandatory | Backend | Not Started | Clean database migration works. |
| [ ] | Seed data | Mandatory | Backend | Not Started | Demo users, departments, categories, assets. |
| [ ] | JWT authentication | Mandatory | Backend | Not Started | Login and current user endpoints. |
| [ ] | bcrypt password hashing | Mandatory | Backend | Not Started | Secure password storage. |
| [ ] | Role authorization | Mandatory | Backend | Not Started | Admin, Manager, Employee, Auditor. |
| [ ] | User APIs | Mandatory | Backend | Not Started | Create, list, update, deactivate. |
| [ ] | Department APIs | Mandatory | Backend | Not Started | Create, list, update, deactivate. |
| [ ] | Asset APIs | Mandatory | Backend | Not Started | Create, list, detail, update, retire. |
| [ ] | Allocation workflow | Mandatory | Backend | Not Started | Assign and preserve history. |
| [ ] | Transfer workflow | Mandatory | Backend | Not Started | Request, approve, reject, cancel. |
| [ ] | Booking workflow | Mandatory | Backend | Not Started | Request, approve, reject, cancel. |
| [ ] | Booking conflict validation | Mandatory | Backend | Not Started | Prevent overlapping approved reservations. |
| [ ] | Maintenance workflow | Mandatory | Backend | Not Started | Create, update, close. |
| [ ] | Audit records | Mandatory | Backend | Not Started | Verification and discrepancies. |
| [ ] | Audit logs | Mandatory | Backend | Not Started | Sensitive lifecycle actions. |
| [ ] | Report APIs | Recommended | Backend | Not Started | Summary and filtered report endpoints. |
| [ ] | Notification APIs | Recommended | Backend | Not Started | List and read-state operations. |
| [ ] | QR generation | Recommended | Backend | Not Started | Asset QR identity records. |
| [ ] | Upload handling | Stretch | Backend | Not Started | Multer configuration and validation. |
| [ ] | API tests | Mandatory | Backend | Not Started | Success, validation, forbidden, not found. |
| [ ] | Database tests | Mandatory | Backend | Not Started | Constraints, migrations, seed. |
| [ ] | Deployment guide verified | Mandatory | Backend | Not Started | Environment, migrations, health checks. |

## Final Acceptance

- [ ] Clean clone setup path is documented.
- [ ] Backend dependencies install.
- [ ] PostgreSQL setup guide works.
- [ ] Prisma migration workflow is documented.
- [ ] Seed workflow is documented.
- [ ] API contracts are documented.
- [ ] Authorization rules are documented.
- [ ] Backend roadmap is documented.
- [ ] Testing strategy is documented.
- [ ] Deployment strategy is documented.

