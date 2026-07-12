# User Roles and Backend Permissions

## Table of Contents

- [Role Overview](#role-overview)
- [Authorization Principles](#authorization-principles)
- [Permission Matrix](#permission-matrix)
- [Data Visibility Rules](#data-visibility-rules)
- [Backend Enforcement](#backend-enforcement)

## Role Overview

| Role | Backend Responsibility |
| --- | --- |
| Admin | Full organization-level access to users, departments, assets, workflows, reports, and logs. |
| Manager | Department-scoped access to approvals, asset operations, maintenance, and reports. |
| Employee | Own-record access for assigned assets, requests, bookings, maintenance reports, and notifications. |
| Auditor | Audit-focused access to asset verification records and audit history. |

## Authorization Principles

- Backend authorization is the source of truth.
- Protected endpoints must verify JWT before role checks.
- Role checks must be combined with ownership or department scope where needed.
- Sensitive actions must create audit logs.
- Permission failures return `403 Forbidden`; authentication failures return `401 Unauthorized`.

## Permission Matrix

| Feature Area | Admin | Manager | Employee | Auditor |
| --- | --- | --- | --- | --- |
| User Management | Full | Department read | Own profile | Read scoped |
| Department Management | Full | Read assigned | Read own | Read scoped |
| Category Management | Full | Read | Read | Read |
| Asset Registry | Full | Department manage | Own/bookable read | Audit-scope read |
| Asset Creation | Full | Department scoped | None | None |
| Asset Update | Full | Department scoped | None | Audit remarks only |
| Asset Retirement | Full | Request/recommend | None | None |
| Allocation | Full | Department scoped | Read own | Read scoped |
| Transfer Request | Full | Department scoped | Own assigned assets | None |
| Transfer Approval | Full | Department scoped | None | None |
| Booking Request | Full | Department scoped | Own requests | None |
| Booking Approval | Full | Department scoped | None | None |
| Maintenance Request | Full | Department scoped | Own assigned/booked assets | Read |
| Maintenance Update | Full | Department scoped | Comments only if allowed | Read |
| Audit Record | Full | Read scoped | None | Create/update scoped |
| Reports | Full | Department scoped | Limited own data | Audit scoped |
| Notifications | Own and system review | Own | Own | Own |
| Audit Logs | Full | Department scoped | None | Audit scoped |

## Data Visibility Rules

| Rule | Description |
| --- | --- |
| Admin global access | Admin can access all organization records. |
| Manager department scope | Manager access is limited to assigned department unless elevated. |
| Employee ownership scope | Employee access is limited to records directly related to them. |
| Auditor audit scope | Auditor access is limited to audit workflows and assigned asset sets. |
| System audit logs | Detailed logs are restricted to Admin and authorized audit use cases. |

## Backend Enforcement

Recommended middleware chain:

```text
request
  -> authenticateJwt
  -> attachUserContext
  -> authorizeRole
  -> authorizeScope
  -> validatePayload
  -> controller
```

Standard forbidden response:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action."
  }
}
```

Review checklist:

- [ ] Every protected endpoint requires JWT.
- [ ] Every restricted endpoint checks role.
- [ ] Department-scoped endpoints verify department access.
- [ ] Ownership-scoped endpoints verify current user relationship.
- [ ] Sensitive changes create audit logs.

