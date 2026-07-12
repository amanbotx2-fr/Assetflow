# Resource Booking QA Report

Generated: 2026-07-12T07:04:08.959Z

## Summary

| Metric | Value |
| --- | ---: |
| Checks | 40 |
| Passed | 40 |
| Failed | 0 |

## Endpoints Covered

- `GET /api/bookings`
- `GET /api/bookings/:id`
- `POST /api/bookings`
- `PATCH /api/bookings/:id`
- `DELETE /api/bookings/:id`
- `PATCH /api/bookings/:id/approve`
- `PATCH /api/bookings/:id/reject`
- `PATCH /api/bookings/:id/cancel`
- `GET /api/bookings/calendar`
- `GET /api/bookings/availability`
- `GET /api/reports/bookings`

## Checks Performed

| Endpoint | Check | Expected Status | Actual Status | Result | Root Cause |
| --- | --- | ---: | ---: | --- | --- |
| GET /api/bookings | Booking list requires authentication | 401 | 401 | PASS | None observed. |
| GET /api/bookings | Admin can list bookings | 200 | 200 | PASS | None observed. |
| GET /api/bookings | Auditor can list bookings read-only | 200 | 200 | PASS | None observed. |
| POST /api/bookings | Auditor cannot create booking | 403 | 403 | PASS | None observed. |
| POST /api/bookings | Employee can create own booking | 201 | 201 | PASS | None observed. |
| POST /api/bookings | Duplicate booking is rejected | 409 | 409 | PASS | None observed. |
| POST /api/bookings | Overlapping requested booking is rejected | 409 | 409 | PASS | None observed. |
| POST /api/bookings | Invalid booking date range is rejected | 400 | 400 | PASS | None observed. |
| POST /api/bookings | Missing resource returns validation error | 400 | 400 | PASS | None observed. |
| POST /api/bookings | Unknown resource returns not found | 404 | 404 | PASS | None observed. |
| POST /api/bookings | Past booking creation is rejected | 409 | 409 | PASS | None observed. |
| GET /api/bookings/:id | Employee can fetch own booking detail | 200 | 200 | PASS | None observed. |
| GET /api/bookings/:id | Missing booking returns not found | 404 | 404 | PASS | None observed. |
| GET /api/bookings/:id | Invalid booking UUID is rejected | 400 | 400 | PASS | None observed. |
| PATCH /api/bookings/:id | Employee can update requested booking | 200 | 200 | PASS | None observed. |
| PATCH /api/bookings/:id/approve | Manager can approve department booking | 200 | 200 | PASS | None observed. |
| PATCH /api/bookings/:id/reject | Approved booking cannot be rejected | 409 | 409 | PASS | None observed. |
| PATCH /api/bookings/:id/approve | Approved booking cannot be approved twice | 409 | 409 | PASS | None observed. |
| POST /api/bookings | Overlapping approved booking is rejected | 409 | 409 | PASS | None observed. |
| GET /api/bookings/calendar | Calendar endpoint returns frontend events | 200 | 200 | PASS | None observed. |
| GET /api/bookings/calendar | Calendar requires date, week, or month | 400 | 400 | PASS | None observed. |
| GET /api/bookings/availability | Availability endpoint returns slots and conflicts | 200 | 200 | PASS | None observed. |
| GET /api/bookings/availability | Availability validates required parameters | 400 | 400 | PASS | None observed. |
| POST /api/bookings | Employee can create rejection-path booking | 201 | 201 | PASS | None observed. |
| PATCH /api/bookings/:id/reject | Admin can reject requested booking | 200 | 200 | PASS | None observed. |
| POST /api/bookings | Rejected booking frees the slot | 201 | 201 | PASS | None observed. |
| POST /api/bookings | Employee can create cancellation-path booking | 201 | 201 | PASS | None observed. |
| PATCH /api/bookings/:id/cancel | Requester can cancel own booking | 200 | 200 | PASS | None observed. |
| POST /api/bookings | Cancelled booking frees the slot | 201 | 201 | PASS | None observed. |
| DELETE /api/bookings/:id | Delete cancels a future booking | 200 | 200 | PASS | None observed. |
| GET /api/bookings/:id | Employee cannot fetch unrelated booking | 403 | 403 | PASS | None observed. |
| PATCH /api/bookings/:id/approve | Manager cannot approve another department booking | 403 | 403 | PASS | None observed. |
| PATCH /api/bookings/:id/approve | Auditor cannot approve booking | 403 | 403 | PASS | None observed. |
| PATCH /api/bookings/:id | Past requested booking cannot be modified | 409 | 409 | PASS | None observed. |
| PATCH /api/bookings/:id/cancel | Past booking cannot be cancelled | 409 | 409 | PASS | None observed. |
| GET /api/bookings | Past approved booking is synchronized to completed | 200 | 200 | PASS | None observed. |
| GET /api/reports/bookings | Booking report exposes utilization metrics | 200 | 200 | PASS | None observed. |
| GET /api/dashboard/overview | Dashboard includes booking statistics | 200 | 200 | PASS | None observed. |
| GET /api/notifications | Booking notifications are generated | 200 | 200 | PASS | None observed. |
| GET /api/audit-logs?entityType=Booking | Booking activity logs are generated | 200 | 200 | PASS | None observed. |

## Performance Observations

| Request | Status | Duration |
| --- | ---: | ---: |
| GET /api/bookings | 401 | 2 ms |
| GET /api/bookings | 200 | 3 ms |
| GET /api/bookings | 200 | 3 ms |
| POST /api/bookings | 403 | 2 ms |
| POST /api/bookings | 201 | 5 ms |
| POST /api/bookings | 409 | 3 ms |
| POST /api/bookings | 409 | 2 ms |
| POST /api/bookings | 400 | 2 ms |
| POST /api/bookings | 400 | 2 ms |
| POST /api/bookings | 404 | 2 ms |
| POST /api/bookings | 409 | 2 ms |
| GET /api/bookings/702b1d76-1033-4459-b10d-fe3e738b1de7 | 200 | 3 ms |
| GET /api/bookings/00000000-0000-0000-0000-000000000000 | 404 | 3 ms |
| GET /api/bookings/not-a-uuid | 400 | 2 ms |
| PATCH /api/bookings/702b1d76-1033-4459-b10d-fe3e738b1de7 | 200 | 5 ms |
| PATCH /api/bookings/702b1d76-1033-4459-b10d-fe3e738b1de7/approve | 200 | 4 ms |
| PATCH /api/bookings/702b1d76-1033-4459-b10d-fe3e738b1de7/reject | 409 | 1 ms |
| PATCH /api/bookings/702b1d76-1033-4459-b10d-fe3e738b1de7/approve | 409 | 3 ms |
| POST /api/bookings | 409 | 2 ms |
| GET /api/bookings/calendar?resourceId=ab507d18-dfa0-498d-a7b4-033c31f6ff01&date=2026-07-13 | 200 | 4 ms |
| GET /api/bookings/calendar?resourceId=ab507d18-dfa0-498d-a7b4-033c31f6ff01 | 400 | 2 ms |
| GET /api/bookings/availability?resourceId=ab507d18-dfa0-498d-a7b4-033c31f6ff01&date=2026-07-13 | 200 | 3 ms |
| GET /api/bookings/availability | 400 | 2 ms |
| POST /api/bookings | 201 | 5 ms |
| PATCH /api/bookings/8f12a110-a090-4658-84a9-68df35cb19ed/reject | 200 | 4 ms |
| POST /api/bookings | 201 | 4 ms |
| POST /api/bookings | 201 | 4 ms |
| PATCH /api/bookings/a1e67fc9-1d1d-4812-abf4-b6adfd4f51dc/cancel | 200 | 4 ms |
| POST /api/bookings | 201 | 4 ms |
| POST /api/bookings | 201 | 4 ms |
| DELETE /api/bookings/912c78c9-30d8-404b-b228-374b8b4699a7 | 200 | 4 ms |
| POST /api/bookings | 201 | 4 ms |
| GET /api/bookings/c716fce4-83bc-44ec-bbd4-a806783f863e | 403 | 3 ms |
| PATCH /api/bookings/c716fce4-83bc-44ec-bbd4-a806783f863e/approve | 403 | 3 ms |
| PATCH /api/bookings/c716fce4-83bc-44ec-bbd4-a806783f863e/approve | 403 | 2 ms |
| PATCH /api/bookings/7b979e02-e226-488e-b315-5a4721cab052 | 409 | 3 ms |
| PATCH /api/bookings/7b979e02-e226-488e-b315-5a4721cab052/cancel | 409 | 2 ms |
| GET /api/bookings?assetId=ab507d18-dfa0-498d-a7b4-033c31f6ff01 | 200 | 4 ms |
| GET /api/reports/bookings | 200 | 2 ms |
| GET /api/dashboard/overview | 200 | 5 ms |
| GET /api/bookings?page=1&limit=5 | 200 | 4 ms |
| GET /api/bookings/49d340cc-aca3-41f9-941e-4e23b7a28695 | 200 | 3 ms |
| GET /api/reports/bookings | 200 | 5 ms |
| GET /api/dashboard/overview | 200 | 5 ms |
| GET /api/bookings/availability?resourceId=3d2d06d1-0fbf-4804-aedb-b1314c2cea8c&date=2026-07-12 | 200 | 6 ms |
| GET /api/bookings/calendar?resourceId=3d2d06d1-0fbf-4804-aedb-b1314c2cea8c&date=2026-07-12 | 200 | 6 ms |

## Business Rules Verified

- Bookings require authentication and role scope.
- Employees can create and read their own bookings.
- Managers can approve or reject bookings for their department.
- Auditors are read-only.
- Overlapping and duplicate bookings are rejected.
- Approval rechecks occupied slots.
- Rejected and cancelled bookings free the slot.
- Past bookings cannot be modified.
- Calendar and availability endpoints return frontend-ready payloads.
- Booking actions generate notifications and audit logs.

## Known Limitations

- The backend keeps legacy `PENDING` support; new booking requests use `REQUESTED`.
- `ACTIVE` and `COMPLETED` are synchronized when booking APIs are read or used; there is no background scheduler in the hackathon MVP.
- Availability uses 09:00-18:00 UTC one-day working windows for demo slot generation.
