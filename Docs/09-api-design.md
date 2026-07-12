# API Design

## Table of Contents

- [API Standards](#api-standards)
- [Headers](#headers)
- [Response Shapes](#response-shapes)
- [Health Checks](#health-checks)
- [Endpoint Contracts](#endpoint-contracts)
- [Pagination](#pagination)
- [Error Codes](#error-codes)

## API Standards

- Base path: `/api`.
- Format: JSON request and response bodies.
- Authentication: Bearer JWT for protected endpoints.
- Authorization: role and scope checks on protected actions.
- Validation: validate params, query, and body before service execution.
- Audit: write audit logs for sensitive lifecycle changes.

## Headers

| Header | Required | Purpose |
| --- | --- | --- |
| `Content-Type: application/json` | For JSON bodies | Declares request body format. |
| `Authorization: Bearer <token>` | Protected endpoints | Authenticates current user. |

## Response Shapes

Success:

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully."
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request.",
    "details": {}
  }
}
```

## Health Checks

Health routes are intentionally public and are not mounted under `/api`.

| Endpoint | Purpose | Headers | Authorization | Example Response | HTTP Codes | Related Tables |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /health` | Confirm the backend process is running. | None | Public | `{"service":"assetflow-backend","status":"ok"}` | `200` | None |
| `GET /health/db` | Confirm the backend can query PostgreSQL. | None | Public | `{"service":"assetflow-backend","database":"connected"}` | `200`, `500` | PostgreSQL connection |

## Endpoint Contracts

### Authentication

| Endpoint | Purpose | Headers | Authorization | Example Request | Example Response | Validation | Possible Errors | HTTP Codes | Related Tables |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `POST /auth/login` | Authenticate user and return JWT. | `Content-Type` | Public | `{"email":"admin@assetflow.local","password":"secret"}` | `{"token":"jwt","user":{"id":"usr_1","role":"ADMIN"}}` | Email and password required. | Invalid credentials, inactive user. | `200`, `400`, `401` | `users` |
| `GET /auth/me` | Return current user context. | `Authorization` | Any authenticated user. | None | `{"id":"usr_1","email":"admin@assetflow.local","role":"ADMIN"}` | Valid JWT required. | Missing token, invalid token. | `200`, `401` | `users`, `departments` |
| `POST /auth/logout` | Support token-clearing client workflow. | `Authorization` | Any authenticated user. | None | `{"message":"Logged out"}` | Valid JWT required. | Missing token. | `200`, `401` | None |

### Dashboard

| Endpoint | Purpose | Headers | Authorization | Example Request | Example Response | Validation | Possible Errors | HTTP Codes | Related Tables |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /dashboard/overview` | Return a single optimized dashboard payload with overview counts, alerts, quick actions, and recent lifecycle activity. | `Authorization` | Any authenticated user, scoped by role. | `?departmentId=dept_1` | `{"overview":{"availableAssets":3,"allocatedAssets":1,"maintenanceAssets":1,"activeBookings":0,"pendingTransfers":1,"upcomingReturns":1},"alerts":[],"quickActions":[],"recentActivity":[]}` | Optional `departmentId` must be a UUID. Managers can only request their own department; employees cannot use department filtering. | Missing token, invalid department scope. | `200`, `400`, `401`, `403` | `assets`, `allocations`, `transfers`, `bookings`, `maintenance_tickets`, `audit_records` |

Dashboard response fields:

| Field | Description |
| --- | --- |
| `overview.totalAssets` | Count of visible assets for the current user's dashboard scope. |
| `overview.availableAssets` | Count of visible assets with `AVAILABLE` status. |
| `overview.allocatedAssets` | Count of visible assets with `ALLOCATED` status. |
| `overview.maintenanceAssets` | Count of visible assets with `MAINTENANCE` status. |
| `overview.activeBookings` | Count of approved bookings currently in progress. |
| `overview.pendingBookings` | Count of pending booking approvals in scope. |
| `overview.pendingTransfers` | Count of pending transfer approvals in scope. |
| `overview.upcomingReturns` | Count of approved bookings with a future return/end time. |
| `alerts` | Status-based alerts derived from overdue approved bookings, pending approvals, active maintenance, and audit warning results. |
| `quickActions` | Role-based action descriptors for the frontend to map to UI actions. |
| `recentActivity` | Combined latest allocations, transfers, bookings, and maintenance tickets ordered newest first. |

### Organization Setup

| Endpoint | Purpose | Headers | Authorization | Example Request | Example Response | Validation | Possible Errors | HTTP Codes | Related Tables |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /organization/overview` | Return lightweight summary counts for the Organization Setup screen. | `Authorization` | Admin full view; Manager scoped read-only; Auditor read-only. | None | `{"departments":{"total":3},"categories":{"total":5},"employees":{"total":4}}` | Valid JWT and permitted role. | Missing token, forbidden role. | `200`, `401`, `403` | `departments`, `categories`, `users` |
| `GET /users` | List employees/users with filters and safe profile data. | `Authorization` | Admin, Manager scoped, Auditor scoped. | `?departmentId=dept_1&role=EMPLOYEE&search=Asha&page=1&limit=20` | `{"items":[{"id":"usr_2","name":"Asha","department":{"manager":{"id":"usr_3"}}}],"total":1}` | Filter IDs and enum values must be valid. Password hashes are never returned. | Forbidden, invalid filter. | `200`, `400`, `401`, `403` | `users`, `departments` |
| `POST /users` | Create employee/user. | `Content-Type`, `Authorization` | Admin. | `{"name":"Asha","email":"asha@company.com","password":"password123","role":"EMPLOYEE","departmentId":"dept_1"}` | `{"id":"usr_2","status":"ACTIVE"}` | Unique email, valid role, valid department. | Duplicate email, invalid role, missing department. | `201`, `400`, `401`, `403`, `404`, `409` | `users`, `departments`, `audit_logs` |
| `PATCH /users/:id` | Update employee/user profile, department, role, or status. | `Content-Type`, `Authorization` | Admin. | `{"departmentId":"dept_2","status":"ACTIVE"}` | `{"id":"usr_2","departmentId":"dept_2","status":"ACTIVE"}` | Valid user ID, valid department, and allowed fields. | Not found, forbidden. | `200`, `400`, `401`, `403`, `404` | `users`, `departments`, `audit_logs` |
| `GET /departments` | List departments with parent/head metadata and employee counts. | `Authorization` | Admin, Manager read-only, Auditor read-only. | `?status=ACTIVE&parentDepartmentId=dept_1&search=IT&page=1&limit=20` | `{"items":[{"id":"dept_1","name":"IT","departmentHead":{"id":"usr_3"},"employeeCount":8}],"total":1}` | Status, UUID filters, and pagination must be valid. | Invalid filter, forbidden role. | `200`, `400`, `401`, `403` | `departments`, `users`, `assets` |
| `POST /departments` | Create department. | `Content-Type`, `Authorization` | Admin. | `{"name":"Finance","code":"FIN","managerId":"usr_3","parentDepartmentId":"dept_1"}` | `{"id":"dept_2","code":"FIN","employeeCount":0}` | Unique name/code, valid active department head, valid parent department, no circular parent relationship. | Duplicate code/name, invalid head, missing parent. | `201`, `400`, `401`, `403`, `404`, `409` | `departments`, `users`, `audit_logs` |
| `PATCH /departments/:id` | Update department metadata, status, parent, or department head. | `Content-Type`, `Authorization` | Admin. | `{"managerId":"usr_3","parentDepartmentId":null}` | `{"id":"dept_2","managerId":"usr_3","parentDepartmentId":null}` | Valid department, valid active department head, and no circular parent assignment. | Not found, invalid manager, circular parent. | `200`, `400`, `401`, `403`, `404`, `409` | `departments`, `users`, `audit_logs` |
| `DELETE /departments/:id` | Soft-delete department by setting `status=INACTIVE`. | `Authorization` | Admin. | None | `{"id":"dept_2","status":"INACTIVE"}` | Valid department ID. | Not found, forbidden. | `200`, `400`, `401`, `403`, `404` | `departments`, `audit_logs` |
| `GET /categories` | List asset categories with pagination, status, description, search, and asset counts. | `Authorization` | Admin, Manager read-only, Auditor read-only. | `?status=ACTIVE&search=Laptop&page=1&limit=20` | `{"items":[{"id":"cat_1","name":"Laptop","description":"Portable computers","assetCount":2}],"total":1}` | Status/search/pagination filters must be valid. | Invalid filter, forbidden role. | `200`, `400`, `401`, `403` | `categories`, `assets` |
| `POST /categories` | Create asset category. | `Content-Type`, `Authorization` | Admin. | `{"name":"Laptop","code":"LAP"}` | `{"id":"cat_1","code":"LAP"}` | Unique name and code. | Duplicate code. | `201`, `400`, `401`, `403`, `409` | `categories`, `audit_logs` |
| `PATCH /categories/:id` | Update asset category. | `Content-Type`, `Authorization` | Admin. | `{"description":"Computing assets"}` | `{"id":"cat_1","description":"Computing assets"}` | Valid category ID and allowed fields. | Not found, duplicate code. | `200`, `400`, `401`, `403`, `404`, `409` | `categories`, `audit_logs` |
| `DELETE /categories/:id` | Soft-delete category by setting `status=INACTIVE`. | `Authorization` | Admin. | None | `{"id":"cat_1","status":"INACTIVE"}` | Valid category ID. | Not found, forbidden. | `200`, `400`, `401`, `403`, `404` | `categories`, `audit_logs` |

Organization Setup notes:

- `departmentHead` is the department `manager` relation returned as a frontend-friendly alias.
- `employeeCount`, `assetCount`, and `childDepartmentCount` are returned on department list and write responses.
- Employee manager relationship is represented through `department.manager`; there is no direct employee manager field.
- Delete endpoints are soft deletes and do not remove records from historical workflows.

### Assets and Allocations

| Endpoint | Purpose | Headers | Authorization | Example Request | Example Response | Validation | Possible Errors | HTTP Codes | Related Tables |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /assets` | List assets with frontend filters, pagination, sorting, and useful relations. | `Authorization` | Admin and Auditor read all; Manager is department-scoped; Employee can read own/bookable assets. | `?search=laptop&categoryId=uuid&departmentId=uuid&status=AVAILABLE&serialNumber=SN-LAP-001&assetTag=LAP-001&qrCode=assetflow%3Aasset%3A...&location=Store&page=1&limit=20&sortBy=name&sortOrder=asc` | `{"items":[{"id":"ast_1","assetCode":"LAP-001","assetTag":"LAP-001","serialNumber":"SN-LAP-001","category":{},"department":{},"currentAllocation":null,"maintenanceStatus":null,"createdBy":{},"updatedBy":{}}],"total":1}` | Valid UUID filters, enum status, supported sort fields: `createdAt`, `updatedAt`, `name`, `assetCode`, `serialNumber`, `status`, `location`, `purchaseDate`. | Missing token, invalid filter, forbidden department scope. | `200`, `400`, `401`, `403` | `assets`, `categories`, `departments`, `allocations`, `maintenance_tickets`, `users` |
| `GET /assets/lookup` | Single asset lookup for frontend search box by general query, asset tag/code, serial number, or QR code. | `Authorization` | Same read scope as asset list. | `?q=LAP-001`, `?assetTag=LAP-001`, `?serialNumber=SN-LAP-001`, `?qrCode=assetflow%3Aasset%3Auuid%3ALAP-001` | `{"id":"ast_1","assetCode":"LAP-001","assetTag":"LAP-001","qrCode":"assetflow:asset:uuid:LAP-001"}` | At least one lookup parameter is required. | Missing query, not found, forbidden scope. | `200`, `400`, `401`, `403`, `404` | `assets`, `categories`, `departments`, `allocations`, `maintenance_tickets` |
| `POST /assets` | Register a new asset. | `Content-Type`, `Authorization` | Admin full; Manager only in assigned department. | `{"assetTag":"LAP-003","serialNumber":"SN-LAP-003","name":"Laptop","categoryId":"uuid","departmentId":"uuid","condition":"GOOD","location":"IT Store","purchaseValue":95000,"purchaseDate":"2026-07-01T00:00:00.000Z","warrantyExpiry":"2027-07-01T00:00:00.000Z","isBookable":true}` | `{"id":"ast_1","assetCode":"LAP-003","assetTag":"LAP-003","status":"AVAILABLE","qrCode":"assetflow:asset:uuid:LAP-003"}` | `assetTag` or `assetCode` required; asset tag and serial number must be unique; category and department must exist and be active. | Duplicate tag, duplicate serial number, invalid/inactive category, invalid/inactive department, forbidden scope. | `201`, `400`, `401`, `403`, `404`, `409` | `assets`, `categories`, `departments`, `users`, `audit_logs` |
| `GET /assets/:id` | Get asset detail and lifecycle summary. | `Authorization` | Same read scope as asset list. | None | `{"id":"ast_1","assetCode":"LAP-001","assetTag":"LAP-001","status":"ALLOCATED","category":{},"department":{},"currentAllocation":{},"maintenanceStatus":null,"transfers":[],"bookings":[],"maintenanceTickets":[],"auditRecords":[]}` | Valid asset UUID. | Not found, forbidden scope. | `200`, `400`, `401`, `403`, `404` | `assets`, `allocations`, `transfers`, `bookings`, `maintenance_tickets`, `audit_records` |
| `PATCH /assets/:id` | Update asset metadata and editable identifiers. | `Content-Type`, `Authorization` | Admin full; Manager only assigned department assets. | `{"assetTag":"LAP-003A","serialNumber":"SN-LAP-003A","location":"Mumbai Office","condition":"GOOD"}` | `{"id":"ast_1","assetTag":"LAP-003A","serialNumber":"SN-LAP-003A","location":"Mumbai Office"}` | Valid asset UUID; unique tag/serial; active category/department when changed; supported asset status enum. | Not found, forbidden scope, duplicate identifiers, invalid status transition. | `200`, `400`, `401`, `403`, `404`, `409` | `assets`, `categories`, `departments`, `audit_logs` |
| `DELETE /assets/:id` | Soft-delete an asset by marking it `RETIRED`. | `Authorization` | Admin full; Manager only assigned department assets. | None | `{"id":"ast_1","status":"RETIRED"}` | Valid asset UUID; asset must not have an active allocation. | Not found, forbidden scope, active allocation conflict. | `200`, `400`, `401`, `403`, `404`, `409` | `assets`, `allocations`, `audit_logs` |
| `POST /assets/:id/allocate` | Allocate asset to user or department. | `Content-Type`, `Authorization` | Admin, Manager scoped. | `{"userId":"usr_2","notes":"Initial assignment"}` | `{"allocationId":"alc_1","assetStatus":"ALLOCATED"}` | Asset available, valid assignee, one active allocation. | Conflict, invalid assignee. | `201`, `400`, `401`, `403`, `404`, `409` | `assets`, `allocations`, `users`, `departments`, `audit_logs` |
| `POST /assets/:id/retire` | Retire asset with reason. | `Content-Type`, `Authorization` | Admin. | `{"reason":"End of life"}` | `{"id":"ast_1","status":"RETIRED"}` | No blocking active workflow unless admin override defined. | Active allocation, not found. | `200`, `400`, `401`, `403`, `404`, `409` | `assets`, `allocations`, `audit_logs` |
| `GET /assets/:id/qr` | Generate QR identity data for the asset. | `Authorization` | Admin, Manager, Auditor scoped. | None | `{"assetId":"ast_1","assetCode":"LAP-001","assetTag":"LAP-001","serialNumber":"SN-LAP-001","qrValue":"assetflow:asset:uuid:LAP-001","imageDataUrl":"data:image/png;base64,..."}` | Valid asset UUID and role scope. | Not found, forbidden. | `200`, `400`, `401`, `403`, `404` | `assets` |

Asset responses intentionally expose both `assetCode` and `assetTag`. The database field is `asset_code`; `assetTag` is an API alias for frontend terminology. QR values are generated from the asset identity and are not stored in a separate table.

### Transfers

| Endpoint | Purpose | Headers | Authorization | Example Request | Example Response | Validation | Possible Errors | HTTP Codes | Related Tables |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /transfers` | List transfer records. | `Authorization` | Admin, Manager scoped, Employee own. | `?status=PENDING` | `{"items":[{"id":"trn_1","status":"PENDING"}]}` | Valid status and scope. | Forbidden. | `200`, `400`, `401`, `403` | `transfers`, `assets`, `users`, `departments` |
| `POST /transfers` | Create transfer request. | `Content-Type`, `Authorization` | Admin, Manager scoped, Employee own. | `{"assetId":"ast_1","toUserId":"usr_4","reason":"Role change"}` | `{"id":"trn_1","status":"PENDING"}` | Valid asset, valid destination, destination differs from source. | Invalid destination, conflict. | `201`, `400`, `401`, `403`, `404`, `409` | `transfers`, `assets`, `users`, `departments`, `notifications` |
| `GET /transfers/:id` | Fetch transfer detail. | `Authorization` | Admin, Manager scoped, Employee related. | None | `{"id":"trn_1","status":"PENDING","asset":{"id":"ast_1"}}` | Valid transfer ID. | Not found, forbidden. | `200`, `400`, `401`, `403`, `404` | `transfers`, `assets`, `users`, `departments` |
| `PATCH /transfers/:id/approve` | Approve transfer and update asset responsibility. | `Content-Type`, `Authorization` | Admin, Manager scoped. | `{"decisionNotes":"Approved"}` | `{"id":"trn_1","status":"APPROVED"}` | Transfer must be pending; approver must be allowed. | Already decided, forbidden. | `200`, `400`, `401`, `403`, `404`, `409` | `transfers`, `allocations`, `assets`, `audit_logs`, `notifications` |
| `PATCH /transfers/:id/reject` | Reject pending transfer. | `Content-Type`, `Authorization` | Admin, Manager scoped. | `{"decisionNotes":"Asset still required"}` | `{"id":"trn_1","status":"REJECTED"}` | Transfer must be pending. | Already decided, forbidden. | `200`, `400`, `401`, `403`, `404`, `409` | `transfers`, `audit_logs`, `notifications` |
| `PATCH /transfers/:id/cancel` | Cancel pending transfer. | `Content-Type`, `Authorization` | Requester or Admin. | `{"reason":"No longer needed"}` | `{"id":"trn_1","status":"CANCELLED"}` | Transfer must be pending. | Forbidden, already decided. | `200`, `400`, `401`, `403`, `404` | `transfers`, `audit_logs`, `notifications` |

### Bookings

| Endpoint | Purpose | Headers | Authorization | Example Request | Example Response | Validation | Possible Errors | HTTP Codes | Related Tables |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /bookings` | List bookings. | `Authorization` | Scoped authenticated users. | `?assetId=ast_2&status=APPROVED` | `{"items":[{"id":"bkg_1","status":"APPROVED"}]}` | Valid filters and scope. | Forbidden. | `200`, `400`, `401`, `403` | `bookings`, `assets`, `users` |
| `POST /bookings` | Create booking request. | `Content-Type`, `Authorization` | Admin, Manager scoped, Employee. | `{"assetId":"ast_2","startTime":"2026-07-15T09:00:00Z","endTime":"2026-07-15T11:00:00Z","purpose":"Demo"}` | `{"id":"bkg_1","status":"PENDING"}` | Asset bookable, valid time range, no approved conflict if auto-approved. | Conflict, invalid time range. | `201`, `400`, `401`, `403`, `404`, `409` | `bookings`, `assets`, `notifications` |
| `PATCH /bookings/:id/approve` | Approve booking after conflict check. | `Content-Type`, `Authorization` | Admin, Manager scoped. | `{"decisionNotes":"Available"}` | `{"id":"bkg_1","status":"APPROVED"}` | Booking pending; no conflict at approval time. | Conflict, already decided. | `200`, `400`, `401`, `403`, `404`, `409` | `bookings`, `audit_logs`, `notifications` |
| `PATCH /bookings/:id/reject` | Reject pending booking. | `Content-Type`, `Authorization` | Admin, Manager scoped. | `{"decisionNotes":"Unavailable"}` | `{"id":"bkg_1","status":"REJECTED"}` | Booking must be pending. | Already decided. | `200`, `400`, `401`, `403`, `404`, `409` | `bookings`, `audit_logs`, `notifications` |
| `PATCH /bookings/:id/cancel` | Cancel booking. | `Content-Type`, `Authorization` | Requester, Admin, Manager scoped. | `{"reason":"No longer needed"}` | `{"id":"bkg_1","status":"CANCELLED"}` | Booking must be cancellable. | Forbidden, invalid status. | `200`, `400`, `401`, `403`, `404`, `409` | `bookings`, `audit_logs`, `notifications` |

### Maintenance

| Endpoint | Purpose | Headers | Authorization | Example Request | Example Response | Validation | Possible Errors | HTTP Codes | Related Tables |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /maintenance` | List maintenance tickets. | `Authorization` | Scoped authenticated users. | `?status=OPEN&priority=HIGH` | `{"items":[{"id":"mnt_1","status":"OPEN"}]}` | Valid filters. | Forbidden. | `200`, `400`, `401`, `403` | `maintenance_tickets`, `assets`, `users` |
| `POST /maintenance` | Create maintenance ticket. | `Content-Type`, `Authorization` | Admin, Manager scoped, Employee own. | `{"assetId":"ast_1","priority":"HIGH","issueSummary":"Battery failure"}` | `{"id":"mnt_1","status":"OPEN"}` | Valid asset, priority, summary. | Asset not accessible, invalid priority. | `201`, `400`, `401`, `403`, `404` | `maintenance_tickets`, `assets`, `audit_logs`, `notifications` |
| `GET /maintenance/:id` | Fetch maintenance ticket detail. | `Authorization` | Scoped authenticated users. | None | `{"id":"mnt_1","status":"OPEN","asset":{"id":"ast_1"}}` | Valid maintenance ticket ID. | Not found, forbidden. | `200`, `400`, `401`, `403`, `404` | `maintenance_tickets`, `assets`, `users` |
| `PATCH /maintenance/:id` | Update ticket status, assignee, or priority. | `Content-Type`, `Authorization` | Admin, Manager scoped. | `{"status":"IN_PROGRESS","assignedToId":"usr_5"}` | `{"id":"mnt_1","status":"IN_PROGRESS"}` | Valid status transition and assignee. | Invalid transition. | `200`, `400`, `401`, `403`, `404` | `maintenance_tickets`, `assets`, `audit_logs` |
| `PATCH /maintenance/:id/close` | Close ticket with resolution. | `Content-Type`, `Authorization` | Admin, Manager scoped. | `{"resolutionNotes":"Battery replaced"}` | `{"id":"mnt_1","status":"CLOSED"}` | Resolution notes required. | Missing resolution, invalid status. | `200`, `400`, `401`, `403`, `404` | `maintenance_tickets`, `assets`, `audit_logs`, `notifications` |

### Audit, Reports, and Notifications

| Endpoint | Purpose | Headers | Authorization | Example Request | Example Response | Validation | Possible Errors | HTTP Codes | Related Tables |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /audits` | List audit records. | `Authorization` | Admin, Auditor, Manager scoped. | `?result=MISSING` | `{"items":[{"id":"aud_1","result":"MISSING"}]}` | Valid result and asset filters. | Forbidden. | `200`, `400`, `401`, `403` | `audit_records`, `assets`, `users` |
| `POST /audits` | Create audit verification record. | `Content-Type`, `Authorization` | Admin, Auditor. | `{"assetId":"ast_1","result":"VERIFIED","remarks":"Found"}` | `{"id":"aud_1","result":"VERIFIED"}` | Valid asset, result, auditor scope. | Invalid result, forbidden. | `201`, `400`, `401`, `403`, `404` | `audit_records`, `assets`, `audit_logs` |
| `GET /audit-logs` | Read system audit logs. | `Authorization` | Admin, Auditor scoped. | `?entityType=Asset&entityId=ast_1` | `{"items":[{"action":"created","entityId":"ast_1"}]}` | Valid filters and scope. | Forbidden. | `200`, `400`, `401`, `403` | `audit_logs`, `users` |
| `GET /reports/summary` | Return dashboard-level backend metrics. | `Authorization` | Admin, Manager scoped. | `?departmentId=dept_1` | `{"totalAssets":120,"allocated":80,"maintenance":6}` | Valid department scope. | Forbidden. | `200`, `400`, `401`, `403` | `assets`, `allocations`, `bookings`, `maintenance_tickets`, `audit_records` |
| `GET /reports/assets` | Return asset report data. | `Authorization` | Admin, Manager scoped, Auditor scoped. | `?status=ALLOCATED` | `{"items":[{"assetCode":"LAP-001","status":"ALLOCATED"}]}` | Valid filters. | Forbidden. | `200`, `400`, `401`, `403` | `assets`, `categories`, `departments`, `allocations` |
| `GET /notifications` | List current user's notifications. | `Authorization` | Any authenticated user. | `?isRead=false` | `{"items":[{"id":"ntf_1","title":"Transfer approved"}]}` | Valid read filter. | Missing token. | `200`, `400`, `401` | `notifications` |
| `PATCH /notifications/:id/read` | Mark notification as read. | `Authorization` | Notification owner. | None | `{"id":"ntf_1","isRead":true}` | Notification must belong to current user. | Not found, forbidden. | `200`, `401`, `403`, `404` | `notifications` |
| `PATCH /notifications/read-all` | Mark all current-user notifications as read. | `Authorization` | Any authenticated user. | None | `{"updated":3}` | Valid JWT required. | Missing token. | `200`, `401` | `notifications` |

## Pagination

List endpoints should support:

| Query Parameter | Purpose |
| --- | --- |
| `page` | Page number starting at `1`. |
| `limit` | Page size. |
| `search` | Text search where supported. |
| `status` | Status filter. |
| `role` | User role filter on `GET /users`. |
| `departmentId` | Department filter on users, assets, and reports. |
| `parentDepartmentId` | Parent department filter on `GET /departments`. |
| `result` | Audit result filter on `GET /audits`. |
| `priority` | Maintenance priority filter on `GET /maintenance`. |
| `entityType` and `entityId` | Audit-log entity filters. |
| `from` and `to` | Date range filter. |

## Error Codes

| Code | Meaning |
| --- | --- |
| `UNAUTHORIZED` | Missing or invalid JWT. |
| `FORBIDDEN` | Role or scope does not allow action. |
| `VALIDATION_ERROR` | Request data is invalid. |
| `NOT_FOUND` | Resource does not exist. |
| `CONFLICT` | Request conflicts with current data. |
| `INTERNAL_ERROR` | Unexpected server failure. |
