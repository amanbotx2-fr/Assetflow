# Maintenance QA Report

Generated: 2026-07-12T07:50:44.397Z

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
| POST /api/maintenance | 404 | 1 ms |
| POST /api/maintenance | 409 | 3 ms |
| POST /api/maintenance | 409 | 2 ms |
| GET /api/maintenance/b7cc6221-ff6e-4a89-83af-73c0a63f7a0d | 200 | 3 ms |
| GET /api/maintenance/00000000-0000-0000-0000-000000000000 | 404 | 2 ms |
| GET /api/maintenance/not-a-uuid | 400 | 2 ms |
| PATCH /api/maintenance/b7cc6221-ff6e-4a89-83af-73c0a63f7a0d | 403 | 2 ms |
| PATCH /api/maintenance/b7cc6221-ff6e-4a89-83af-73c0a63f7a0d | 200 | 4 ms |
| PATCH /api/maintenance/b7cc6221-ff6e-4a89-83af-73c0a63f7a0d/approve | 200 | 4 ms |
| PATCH /api/maintenance/b7cc6221-ff6e-4a89-83af-73c0a63f7a0d/approve | 409 | 3 ms |
| PATCH /api/maintenance/b7cc6221-ff6e-4a89-83af-73c0a63f7a0d/reject | 409 | 3 ms |
| PATCH /api/maintenance/b7cc6221-ff6e-4a89-83af-73c0a63f7a0d/start | 409 | 2 ms |
| PATCH /api/maintenance/b7cc6221-ff6e-4a89-83af-73c0a63f7a0d/assign | 200 | 5 ms |
| PATCH /api/maintenance/b7cc6221-ff6e-4a89-83af-73c0a63f7a0d/start | 200 | 4 ms |
| PATCH /api/maintenance/b7cc6221-ff6e-4a89-83af-73c0a63f7a0d/resolve | 200 | 4 ms |
| GET /api/dashboard/overview | 200 | 5 ms |
| PATCH /api/maintenance/b7cc6221-ff6e-4a89-83af-73c0a63f7a0d/close | 200 | 7 ms |
| PATCH /api/maintenance/b7cc6221-ff6e-4a89-83af-73c0a63f7a0d | 409 | 3 ms |
| DELETE /api/maintenance/b7cc6221-ff6e-4a89-83af-73c0a63f7a0d | 409 | 3 ms |
| POST /api/maintenance | 201 | 6 ms |
| PATCH /api/maintenance/a5bf8211-abf0-4242-a140-a956180a1bd9/reject | 200 | 5 ms |
| PATCH /api/maintenance/a5bf8211-abf0-4242-a140-a956180a1bd9/assign | 409 | 3 ms |
| POST /api/maintenance | 201 | 5 ms |
| POST /api/maintenance | 201 | 5 ms |
| DELETE /api/maintenance/e2885537-58d6-403d-bb4f-f1e9526eb5ac | 200 | 4 ms |
| POST /api/maintenance | 201 | 5 ms |
| PATCH /api/maintenance/709c198e-e94d-4a9f-9aac-65182f657695/approve | 200 | 4 ms |
| PATCH /api/maintenance/709c198e-e94d-4a9f-9aac-65182f657695/close | 409 | 3 ms |
| POST /api/maintenance | 201 | 5 ms |
| PATCH /api/maintenance/91b3efa5-7ef5-4881-adfa-b571a0c59ed8/approve | 403 | 3 ms |
| PATCH /api/maintenance/91b3efa5-7ef5-4881-adfa-b571a0c59ed8/approve | 403 | 2 ms |
| GET /api/maintenance/91b3efa5-7ef5-4881-adfa-b571a0c59ed8 | 403 | 2 ms |
| GET /api/maintenance?priority=HIGH&status=REQUESTED&page=1&limit=5 | 200 | 3 ms |
| GET /api/reports/maintenance | 200 | 3 ms |
| GET /api/maintenance?page=1&limit=5 | 200 | 3 ms |
| GET /api/maintenance/1f57b972-b7da-48a5-9497-6c15051aa98c | 200 | 2 ms |
| GET /api/reports/maintenance | 200 | 4 ms |
| GET /api/dashboard/overview | 200 | 5 ms |

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
