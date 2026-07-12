# Maintenance QA Report

Generated: 2026-07-12T06:45:03.522Z

## Summary

| Metric | Value |
| --- | ---: |
| Checks | 42 |
| Passed | 42 |
| Failed | 0 |

## Endpoints Covered

- `GET /api/maintenance`
- `GET /api/maintenance/:id`
- `POST /api/maintenance`
- `PATCH /api/maintenance/:id`
- `DELETE /api/maintenance/:id`
- `PATCH /api/maintenance/:id/approve`
- `PATCH /api/maintenance/:id/reject`
- `PATCH /api/maintenance/:id/assign`
- `PATCH /api/maintenance/:id/start`
- `PATCH /api/maintenance/:id/resolve`
- `PATCH /api/maintenance/:id/close`
- `GET /api/reports/maintenance`

## Checks Performed

| Endpoint | Check | Expected Status | Actual Status | Result | Root Cause |
| --- | --- | ---: | ---: | --- | --- |
| GET /api/maintenance | Maintenance list requires authentication | 401 | 401 | PASS | None observed. |
| GET /api/maintenance | Admin can list maintenance tickets | 200 | 200 | PASS | None observed. |
| GET /api/maintenance | Auditor can list maintenance read-only | 200 | 200 | PASS | None observed. |
| POST /api/maintenance | Auditor cannot create maintenance | 403 | 403 | PASS | None observed. |
| POST /api/maintenance | Employee can create own maintenance ticket | 201 | 201 | PASS | None observed. |
| GET /api/assets/:id | Creating maintenance moves asset to maintenance | 200 | 200 | PASS | None observed. |
| POST /api/maintenance | Duplicate active maintenance is rejected | 409 | 409 | PASS | None observed. |
| POST /api/maintenance | Invalid maintenance payload is rejected | 400 | 400 | PASS | None observed. |
| POST /api/maintenance | Unknown asset returns not found | 404 | 404 | PASS | None observed. |
| POST /api/maintenance | Lost assets cannot enter maintenance | 409 | 409 | PASS | None observed. |
| POST /api/maintenance | Retired assets cannot enter maintenance | 409 | 409 | PASS | None observed. |
| GET /api/maintenance/:id | Employee can fetch own maintenance ticket | 200 | 200 | PASS | None observed. |
| GET /api/maintenance/:id | Missing maintenance ticket returns not found | 404 | 404 | PASS | None observed. |
| GET /api/maintenance/:id | Invalid maintenance UUID is rejected | 400 | 400 | PASS | None observed. |
| PATCH /api/maintenance/:id | Employee cannot update maintenance ticket | 403 | 403 | PASS | None observed. |
| PATCH /api/maintenance/:id | Admin can update maintenance metadata | 200 | 200 | PASS | None observed. |
| PATCH /api/maintenance/:id/approve | Manager can approve department maintenance | 200 | 200 | PASS | None observed. |
| PATCH /api/maintenance/:id/approve | Maintenance cannot be approved twice | 409 | 409 | PASS | None observed. |
| PATCH /api/maintenance/:id/reject | Approved maintenance cannot be rejected | 409 | 409 | PASS | None observed. |
| PATCH /api/maintenance/:id/start | Cannot start without technician assignment | 409 | 409 | PASS | None observed. |
| PATCH /api/maintenance/:id/assign | Manager can assign technician | 200 | 200 | PASS | None observed. |
| PATCH /api/maintenance/:id/start | Manager can start assigned maintenance | 200 | 200 | PASS | None observed. |
| PATCH /api/maintenance/:id/resolve | Manager can resolve in-progress maintenance | 200 | 200 | PASS | None observed. |
| GET /api/dashboard/overview | Dashboard includes maintenance counters | 200 | 200 | PASS | None observed. |
| PATCH /api/maintenance/:id/close | Manager can close resolved maintenance | 200 | 200 | PASS | None observed. |
| GET /api/assets/:id | Closing maintenance restores asset state | 200 | 200 | PASS | None observed. |
| PATCH /api/maintenance/:id | Closed maintenance cannot be modified | 409 | 409 | PASS | None observed. |
| DELETE /api/maintenance/:id | Closed maintenance cannot be deleted | 409 | 409 | PASS | None observed. |
| PATCH /api/maintenance/:id/reject | Admin can reject requested maintenance | 200 | 200 | PASS | None observed. |
| GET /api/assets/:id | Rejected maintenance restores asset state | 200 | 200 | PASS | None observed. |
| PATCH /api/maintenance/:id/assign | Rejected maintenance cannot be assigned | 409 | 409 | PASS | None observed. |
| POST /api/maintenance | Rejected maintenance frees asset for new request | 201 | 201 | PASS | None observed. |
| DELETE /api/maintenance/:id | Admin can delete requested maintenance | 200 | 200 | PASS | None observed. |
| GET /api/assets/:id | Deleting requested maintenance restores asset state | 200 | 200 | PASS | None observed. |
| PATCH /api/maintenance/:id/close | Approved maintenance cannot close before resolved | 409 | 409 | PASS | None observed. |
| PATCH /api/maintenance/:id/approve | Manager cannot approve another department maintenance | 403 | 403 | PASS | None observed. |
| PATCH /api/maintenance/:id/approve | Auditor cannot approve maintenance | 403 | 403 | PASS | None observed. |
| GET /api/maintenance/:id | Employee cannot fetch unrelated maintenance | 403 | 403 | PASS | None observed. |
| GET /api/maintenance | Maintenance list supports filters | 200 | 200 | PASS | None observed. |
| GET /api/reports/maintenance | Maintenance report exposes repair metrics | 200 | 200 | PASS | None observed. |
| GET /api/notifications | Maintenance notifications are generated | 200 | 200 | PASS | None observed. |
| GET /api/audit-logs?entityType=MaintenanceTicket | Maintenance activity logs are generated | 200 | 200 | PASS | None observed. |

## Performance Observations

| Request | Status | Duration |
| --- | ---: | ---: |
| GET /api/maintenance | 401 | 2 ms |
| GET /api/maintenance | 200 | 3 ms |
| GET /api/maintenance | 200 | 3 ms |
| POST /api/maintenance | 403 | 2 ms |
| POST /api/maintenance | 201 | 6 ms |
| POST /api/maintenance | 409 | 2 ms |
| POST /api/maintenance | 400 | 2 ms |
| POST /api/maintenance | 404 | 2 ms |
| POST /api/maintenance | 409 | 3 ms |
| POST /api/maintenance | 409 | 2 ms |
| GET /api/maintenance/6f4df85c-f78b-45d2-bc5c-b70298992ebc | 200 | 2 ms |
| GET /api/maintenance/00000000-0000-0000-0000-000000000000 | 404 | 2 ms |
| GET /api/maintenance/not-a-uuid | 400 | 2 ms |
| PATCH /api/maintenance/6f4df85c-f78b-45d2-bc5c-b70298992ebc | 403 | 2 ms |
| PATCH /api/maintenance/6f4df85c-f78b-45d2-bc5c-b70298992ebc | 200 | 4 ms |
| PATCH /api/maintenance/6f4df85c-f78b-45d2-bc5c-b70298992ebc/approve | 200 | 4 ms |
| PATCH /api/maintenance/6f4df85c-f78b-45d2-bc5c-b70298992ebc/approve | 409 | 2 ms |
| PATCH /api/maintenance/6f4df85c-f78b-45d2-bc5c-b70298992ebc/reject | 409 | 2 ms |
| PATCH /api/maintenance/6f4df85c-f78b-45d2-bc5c-b70298992ebc/start | 409 | 2 ms |
| PATCH /api/maintenance/6f4df85c-f78b-45d2-bc5c-b70298992ebc/assign | 200 | 4 ms |
| PATCH /api/maintenance/6f4df85c-f78b-45d2-bc5c-b70298992ebc/start | 200 | 4 ms |
| PATCH /api/maintenance/6f4df85c-f78b-45d2-bc5c-b70298992ebc/resolve | 200 | 4 ms |
| GET /api/dashboard/overview | 200 | 5 ms |
| PATCH /api/maintenance/6f4df85c-f78b-45d2-bc5c-b70298992ebc/close | 200 | 7 ms |
| PATCH /api/maintenance/6f4df85c-f78b-45d2-bc5c-b70298992ebc | 409 | 2 ms |
| DELETE /api/maintenance/6f4df85c-f78b-45d2-bc5c-b70298992ebc | 409 | 3 ms |
| POST /api/maintenance | 201 | 5 ms |
| PATCH /api/maintenance/8cd99769-9fca-4541-9f11-eee110606c07/reject | 200 | 4 ms |
| PATCH /api/maintenance/8cd99769-9fca-4541-9f11-eee110606c07/assign | 409 | 2 ms |
| POST /api/maintenance | 201 | 4 ms |
| POST /api/maintenance | 201 | 5 ms |
| DELETE /api/maintenance/79b6bd75-f7e2-41cc-baf5-85eec038f182 | 200 | 4 ms |
| POST /api/maintenance | 201 | 4 ms |
| PATCH /api/maintenance/ddc8822c-b7bf-4144-bcd1-2d662712d358/approve | 200 | 4 ms |
| PATCH /api/maintenance/ddc8822c-b7bf-4144-bcd1-2d662712d358/close | 409 | 3 ms |
| POST /api/maintenance | 201 | 4 ms |
| PATCH /api/maintenance/dec7584f-261d-4cd0-b72b-3a90c03fdcae/approve | 403 | 2 ms |
| PATCH /api/maintenance/dec7584f-261d-4cd0-b72b-3a90c03fdcae/approve | 403 | 2 ms |
| GET /api/maintenance/dec7584f-261d-4cd0-b72b-3a90c03fdcae | 403 | 2 ms |
| GET /api/maintenance?priority=HIGH&status=REQUESTED&page=1&limit=5 | 200 | 3 ms |
| GET /api/reports/maintenance | 200 | 3 ms |
| GET /api/maintenance?page=1&limit=5 | 200 | 3 ms |
| GET /api/maintenance/77748de1-ad62-40c7-934a-cdd2cd61162c | 200 | 2 ms |
| GET /api/reports/maintenance | 200 | 2 ms |
| GET /api/dashboard/overview | 200 | 4 ms |

## Business Rules Verified

- Maintenance endpoints require authentication and role scope.
- Employees can create and read their own tickets.
- Managers can manage tickets only for their department.
- Auditors are read-only.
- Duplicate and active maintenance tickets are rejected.
- Retired and lost assets cannot enter maintenance.
- Invalid lifecycle transitions are rejected.
- Tickets cannot start without technician assignment.
- Resolved/closed workflows restore asset state.
- Notifications and audit logs are generated.

## Known Limitations

- The backend keeps legacy `OPEN` support; new requests use `REQUESTED`.
- Asset under-maintenance state is represented by the existing `MAINTENANCE` asset status.
- There is no scheduled preventive-maintenance calendar in the hackathon MVP.
