# AssetFlow Backend QA Report

Generated: 2026-07-12T05:17:38.772Z

## Summary

| Metric | Value |
| --- | ---: |
| Total Checks | 65 |
| Passed | 65 |
| Failed | 0 |

## Environment

| Item | Value |
| --- | --- |
| Base URL | `http://localhost:5011` |
| Database | PostgreSQL local QA database on port `55432` |
| Prisma | Schema validated, client generated, migrations applied |
| Seed Accounts | `admin@assetflow.local`, `manager@assetflow.local`, `employee@assetflow.local`, `auditor@assetflow.local` / `password123` |

## Route Audit

| Area | Result |
| --- | --- |
| Missing endpoints vs API docs | None after documentation sync. |
| Incorrect route prefixes | None. Health routes use root `/health`; application routes use `/api`. |
| Broken imports | None found during TypeScript build. |
| Duplicate routes | None found in registered route files. |
| Unused route files | None found. |
| Missing authentication middleware | None on protected route groups. Public routes are `/health`, `/health/db`, and `POST /api/auth/login`. |
| Missing authorization middleware | None on role-sensitive write/approval/report routes. Scope checks are enforced in services. |
| Missing validation | No blocking gaps found. Shared query validation was expanded for documented filters. |

## Fixes Applied During QA

| Issue | Root Cause | Fix | Verification |
| --- | --- | --- | --- |
| Approved transfers could be rejected | `rejectTransfer` updated transfer status directly without checking the current status. | Added not-found, pending-only, and manager-scope checks before rejection. | `PATCH /api/transfers/:id/reject` now returns `409` for an already approved transfer. |
| Approved bookings could be rejected | `rejectBooking` updated booking status directly without checking the current status. | Added not-found, pending-only, and manager-scope checks before rejection. | `PATCH /api/bookings/:id/reject` now returns `409` for an already approved booking. |
| Workflow detail/list authorization was too broad | Transfer routes and booking/maintenance services had gaps where non-scoped roles could access records. | Restricted transfer routes to Admin/Manager/Employee and added manager/employee scope checks for transfer detail, bookings, and maintenance. | Auditor transfer access and unrelated employee detail access now return `403`. |
| Documented list filters were dropped | Shared query validation did not pass through `role`, audit `result`, maintenance `priority`, and audit-log entity filters. | Expanded shared query validation and service filters for audit result and maintenance priority. | Filter checks pass in the final QA run. |

## Endpoint Results

| Endpoint | Expected Behaviour | Actual Behaviour | Status Code | Result | Root Cause | Fix Applied |
| --- | --- | --- | ---: | --- | --- | --- |
| GET /health | Health endpoint returns service status | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| GET /health/db | Database health endpoint confirms connection | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| GET /api/assets | Protected endpoint rejects missing JWT | HTTP 401; error=UNAUTHORIZED; message=Authentication required. | 401 | PASS | None observed. | Not required. |
| POST /api/auth/login | Admin can login | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| POST /api/auth/login | Employee can login | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| POST /api/auth/login | Auditor can login | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| POST /api/auth/login | Login validation rejects invalid email | HTTP 400; error=VALIDATION_ERROR; message=Invalid body. | 400 | PASS | None observed. | Not required. |
| POST /api/auth/login | Login rejects bad password | HTTP 401; error=UNAUTHORIZED; message=Invalid email or password. | 401 | PASS | None observed. | Not required. |
| GET /api/auth/me | Authenticated user profile resolves from JWT | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| POST /api/auth/logout | Logout endpoint returns success | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| GET /api/users | Admin can list users | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| GET /api/users | Employee cannot list all users | HTTP 403; error=FORBIDDEN; message=You do not have permission to perform this action. | 403 | PASS | None observed. | Not required. |
| GET /api/users?role=EMPLOYEE | Admin can filter users by role | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| POST /api/departments | Admin can create department | HTTP 201; success=true; data=object | 201 | PASS | None observed. | Not required. |
| POST /api/departments | Employee cannot create department | HTTP 403; error=FORBIDDEN; message=You do not have permission to perform this action. | 403 | PASS | None observed. | Not required. |
| GET /api/departments | Authenticated user can list departments | HTTP 200; success=true; data=array | 200 | PASS | None observed. | Not required. |
| PATCH /api/departments/528a43ca-a674-4a0a-9925-6f15604970ca | Admin can update department | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| POST /api/users | Admin can create employee | HTTP 201; success=true; data=object | 201 | PASS | None observed. | Not required. |
| PATCH /api/users/e68edf67-0e82-49df-b2b8-cf901d2fa30f | Admin can update user | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| POST /api/categories | Admin can create category | HTTP 201; success=true; data=object | 201 | PASS | None observed. | Not required. |
| GET /api/categories | Authenticated user can list categories | HTTP 200; success=true; data=array | 200 | PASS | None observed. | Not required. |
| PATCH /api/categories/9e3ec76f-5f49-4128-8ab2-4721b49e7867 | Admin can update category | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| POST /api/assets | Admin can create asset | HTTP 201; success=true; data=object | 201 | PASS | None observed. | Not required. |
| GET /api/assets | Authenticated user can list assets | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| GET /api/assets/7c853b12-2318-47cf-882b-1dfb79f98375 | Authenticated user can fetch asset detail | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| PATCH /api/assets/7c853b12-2318-47cf-882b-1dfb79f98375 | Admin can update asset | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| GET /api/assets/7c853b12-2318-47cf-882b-1dfb79f98375/qr | Admin can generate asset QR payload | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| POST /api/assets/7c853b12-2318-47cf-882b-1dfb79f98375/allocate | Admin can allocate available asset | HTTP 201; success=true; data=object | 201 | PASS | None observed. | Not required. |
| POST /api/assets/7c853b12-2318-47cf-882b-1dfb79f98375/allocate | Asset cannot be allocated twice | HTTP 409; error=CONFLICT; message=Asset already has an active allocation. | 409 | PASS | None observed. | Not required. |
| POST /api/transfers | Admin can request transfer | HTTP 201; success=true; data=object | 201 | PASS | None observed. | Not required. |
| GET /api/transfers | Admin can list transfers | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| GET /api/transfers | Auditor cannot list transfers | HTTP 403; error=FORBIDDEN; message=You do not have permission to perform this action. | 403 | PASS | None observed. | Not required. |
| GET /api/transfers/aef5dd12-b645-461a-872b-213d6ada1220 | Admin can fetch transfer detail | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| GET /api/transfers/aef5dd12-b645-461a-872b-213d6ada1220 | Employee cannot fetch unrelated transfer detail | HTTP 403; error=FORBIDDEN; message=Employees can only access transfers related to them. | 403 | PASS | None observed. | Not required. |
| PATCH /api/transfers/aef5dd12-b645-461a-872b-213d6ada1220/approve | Admin can approve pending transfer | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| PATCH /api/transfers/aef5dd12-b645-461a-872b-213d6ada1220/reject | Already approved transfer cannot be rejected | HTTP 409; error=CONFLICT; message=Only pending transfers can be rejected. | 409 | PASS | Initial QA found approved transfers could be rejected because rejectTransfer skipped the pending-status guard. | Added transfer existence, pending-status, and manager-scope checks in transferService.rejectTransfer; retested PASS. |
| POST /api/transfers | Admin can create cancellable transfer | HTTP 201; success=true; data=object | 201 | PASS | None observed. | Not required. |
| PATCH /api/transfers/5ed1481b-df90-4d48-8e5e-06558c3400c4/cancel | Requester/admin can cancel pending transfer | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| POST /api/bookings | Admin can request booking for bookable asset | HTTP 201; success=true; data=object | 201 | PASS | None observed. | Not required. |
| GET /api/bookings | Authenticated user can list bookings | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| PATCH /api/bookings/4c56a9b1-176e-4274-b35c-ce80353ed939/approve | Admin can approve booking | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| PATCH /api/bookings/4c56a9b1-176e-4274-b35c-ce80353ed939/reject | Already approved booking cannot be rejected | HTTP 409; error=CONFLICT; message=Only pending bookings can be rejected. | 409 | PASS | QA identified the same decided-state risk on booking rejection; rejection now requires PENDING status. | Added booking existence, pending-status, and manager-scope checks in bookingService.rejectBooking; retested PASS. |
| POST /api/bookings | Overlapping approved booking is rejected | HTTP 409; error=CONFLICT; message=Booking overlaps with an approved booking. | 409 | PASS | None observed. | Not required. |
| POST /api/bookings | Admin can create booking for rejection path | HTTP 201; success=true; data=object | 201 | PASS | None observed. | Not required. |
| PATCH /api/bookings/cf1212b5-3420-4bde-a749-4510bf6c96c0/reject | Admin can reject booking | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| POST /api/bookings | Admin can create booking for cancel path | HTTP 201; success=true; data=object | 201 | PASS | None observed. | Not required. |
| PATCH /api/bookings/e8179ac1-6dac-4f47-ad07-0eb3bb59987b/cancel | Requester/admin can cancel booking | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| POST /api/maintenance | Admin can create maintenance ticket | HTTP 201; success=true; data=object | 201 | PASS | None observed. | Not required. |
| GET /api/maintenance | Authenticated user can list maintenance tickets | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| GET /api/maintenance?priority=HIGH | Authenticated user can filter maintenance by priority | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| GET /api/maintenance/54c5d9fa-8f0e-42a4-ad2a-bae1489f02e3 | Authenticated user can fetch maintenance detail | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| GET /api/maintenance/54c5d9fa-8f0e-42a4-ad2a-bae1489f02e3 | Employee cannot fetch unrelated maintenance detail | HTTP 403; error=FORBIDDEN; message=Employees can only access maintenance tickets related to them. | 403 | PASS | None observed. | Not required. |
| PATCH /api/maintenance/54c5d9fa-8f0e-42a4-ad2a-bae1489f02e3 | Admin can update maintenance ticket | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| PATCH /api/maintenance/54c5d9fa-8f0e-42a4-ad2a-bae1489f02e3/close | Admin can close maintenance ticket | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| POST /api/audits | Admin can create audit record | HTTP 201; success=true; data=object | 201 | PASS | None observed. | Not required. |
| GET /api/audits | Admin can list audit records | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| GET /api/audits?result=VERIFIED | Admin can filter audit records by result | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| GET /api/audit-logs | Admin can list audit logs | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| GET /api/audit-logs?entityType=Asset | Admin can filter audit logs by entity type | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| GET /api/reports/summary | Admin can fetch summary report | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| GET /api/reports/assets | Admin can fetch asset report | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| GET /api/notifications | Authenticated user can list notifications | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| PATCH /api/notifications/da82788d-8aba-4942-bdf6-e7e37808fa12/read | Notification owner can mark notification read | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| PATCH /api/notifications/read-all | Notification owner can mark all notifications read | HTTP 200; success=true; data=object | 200 | PASS | None observed. | Not required. |
| POST /api/assets/7c853b12-2318-47cf-882b-1dfb79f98375/retire | Retiring actively allocated asset is rejected | HTTP 409; error=CONFLICT; message=Return or transfer the asset before retirement. | 409 | PASS | None observed. | Not required. |
