# Backend MVP Requirements

## Table of Contents

- [MVP Definition](#mvp-definition)
- [Priority Levels](#priority-levels)
- [Requirements Summary](#requirements-summary)
- [Detailed Requirements](#detailed-requirements)
- [Non-Functional Requirements](#non-functional-requirements)
- [Out of Scope](#out-of-scope)

## MVP Definition

The backend MVP must provide secure, documented, and testable APIs for the core AssetFlow lifecycle: organization setup, authentication, assets, allocations, transfers, bookings, maintenance, audits, reports, notifications, and database operations.

## Priority Levels

| Priority | Meaning |
| --- | --- |
| Mandatory | Required for the backend MVP and demo workflow. |
| Recommended | Improves operational quality, visibility, or maintainability. |
| Stretch Goal | Valuable after the mandatory backend flow is complete. |

## Requirements Summary

| Area | Requirement | Priority |
| --- | --- | --- |
| Authentication | Login, password hashing, JWT issuance, current user lookup. | Mandatory |
| Authorization | Role checks for Admin, Manager, Employee, Auditor. | Mandatory |
| Database | Prisma schema, migrations, seed data, indexes, relationships. | Mandatory |
| Organization | Department, user, and category APIs. | Mandatory |
| Assets | Create, read, update, filter, retire, and history APIs. | Mandatory |
| Allocations | Assign assets and preserve allocation history. | Mandatory |
| Transfers | Request, approve, reject, cancel, and audit transfers. | Mandatory |
| Bookings | Create reservations and enforce conflict validation. | Mandatory |
| Maintenance | Create tickets, update status, close with resolution. | Mandatory |
| Audit | Record verification outcomes and discrepancies. | Mandatory |
| Reports | Provide dashboard and report data endpoints. | Recommended |
| Notifications | Store and read user lifecycle notifications. | Recommended |
| QR Codes | Generate asset QR values or images. | Recommended |
| Uploads | Store asset or maintenance attachments using Multer. | Stretch Goal |

## Detailed Requirements

### Authentication

Acceptance criteria:

- User login validates email and password.
- Password hashes are stored using bcrypt.
- Successful login returns JWT and safe user data.
- Protected APIs reject missing or invalid tokens.
- Current user endpoint returns role and department context.

### Authorization

Acceptance criteria:

- Admin has organization-wide access.
- Manager access is scoped to assigned departments where applicable.
- Employee access is limited to own assignments, requests, bookings, and notifications.
- Auditor access is limited to audit workflows and scoped records.
- Forbidden actions return `403`.

### Database Foundation

Acceptance criteria:

- PostgreSQL is the development database.
- Prisma schema defines all mandatory models.
- Migrations are versioned.
- Seed data includes demo roles, users, departments, categories, and assets.
- Foreign keys protect relationship integrity.
- Indexes exist for common filters and lookup fields.

### Asset Registry

Acceptance criteria:

- Asset code is unique.
- Asset APIs support filtering by status, category, department, assignee, and search text.
- Asset detail includes current state and lifecycle history.
- Asset status transitions are validated by backend logic.

### Allocation Workflow

Acceptance criteria:

- Available assets can be allocated to a user or department.
- Only one active allocation exists for a non-shared asset.
- Reallocation closes the previous active allocation through a transaction.
- Allocation actions create audit log entries.

### Transfer Workflow

Acceptance criteria:

- Transfer requests capture source, destination, reason, requester, and status.
- Approval and rejection require authorized roles.
- Approved transfers update allocation or location using a transaction.
- Rejected transfers preserve decision notes.

### Booking Workflow

Acceptance criteria:

- Bookings require asset, requester, start time, end time, and purpose.
- End time must be after start time.
- Approved bookings for the same asset cannot overlap.
- Cancelled and rejected bookings are excluded from conflict checks.

### Maintenance Workflow

Acceptance criteria:

- Maintenance tickets capture asset, reporter, issue, priority, and status.
- Status updates are restricted to authorized roles.
- Closing a ticket requires resolution notes.
- Asset status reflects major maintenance states where applicable.

### Audit Workflow

Acceptance criteria:

- Audit records capture asset, auditor, result, remarks, and timestamp.
- Supported results include verified, missing, damaged, misplaced, and needs review.
- Audit records do not silently modify asset ownership.
- Discrepancies are visible through report APIs.

### Reports and Notifications

Acceptance criteria:

- Report endpoints provide counts and filtered datasets for backend consumers.
- Notifications are linked to users and relevant lifecycle entities.
- Unread notification count is queryable.
- Notifications can be marked as read.

## Non-Functional Requirements

| Area | Requirement |
| --- | --- |
| Security | Hash passwords, verify JWTs, enforce roles, validate input. |
| Reliability | Use transactions for multi-table lifecycle changes. |
| Consistency | Use standard response and error formats. |
| Observability | Store audit logs for sensitive workflow actions. |
| Maintainability | Keep controller, service, repository, validator, and utility responsibilities separate. |
| Performance | Add indexes for common filters, joins, and lookup fields. |
| Documentation | Keep API and database docs synchronized with implementation. |

## Out of Scope

- Advanced procurement workflows.
- Hardware integrations.
- Enterprise identity provider integration.
- Custom workflow builder.
- Native app responsibilities.
- Presentation-layer implementation details.

