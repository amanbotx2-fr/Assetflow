# Resource Booking QA Report

Generated: 2026-07-12T06:44:51.958Z

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
| GET /api/bookings | 200 | 4 ms |
| GET /api/bookings | 200 | 3 ms |
| POST /api/bookings | 403 | 2 ms |
| POST /api/bookings | 201 | 5 ms |
| POST /api/bookings | 409 | 3 ms |
| POST /api/bookings | 409 | 3 ms |
| POST /api/bookings | 400 | 2 ms |
| POST /api/bookings | 400 | 2 ms |
| POST /api/bookings | 404 | 2 ms |
| POST /api/bookings | 409 | 1 ms |
| GET /api/bookings/3a30dbfe-dada-45d5-9d8d-cbf47e1cc216 | 200 | 3 ms |
| GET /api/bookings/00000000-0000-0000-0000-000000000000 | 404 | 2 ms |
| GET /api/bookings/not-a-uuid | 400 | 2 ms |
| PATCH /api/bookings/3a30dbfe-dada-45d5-9d8d-cbf47e1cc216 | 200 | 5 ms |
| PATCH /api/bookings/3a30dbfe-dada-45d5-9d8d-cbf47e1cc216/approve | 200 | 4 ms |
| PATCH /api/bookings/3a30dbfe-dada-45d5-9d8d-cbf47e1cc216/reject | 409 | 2 ms |
| PATCH /api/bookings/3a30dbfe-dada-45d5-9d8d-cbf47e1cc216/approve | 409 | 3 ms |
| POST /api/bookings | 409 | 2 ms |
| GET /api/bookings/calendar?resourceId=617f1c16-c3da-476b-8a9c-a30d36a2c245&date=2026-07-13 | 200 | 3 ms |
| GET /api/bookings/calendar?resourceId=617f1c16-c3da-476b-8a9c-a30d36a2c245 | 400 | 2 ms |
| GET /api/bookings/availability?resourceId=617f1c16-c3da-476b-8a9c-a30d36a2c245&date=2026-07-13 | 200 | 3 ms |
| GET /api/bookings/availability | 400 | 2 ms |
| POST /api/bookings | 201 | 5 ms |
| PATCH /api/bookings/69f69847-442c-4964-906a-8c09a7b1e7bd/reject | 200 | 4 ms |
| POST /api/bookings | 201 | 4 ms |
| POST /api/bookings | 201 | 4 ms |
| PATCH /api/bookings/aca54d77-770d-4fae-9416-894ffc150727/cancel | 200 | 4 ms |
| POST /api/bookings | 201 | 4 ms |
| POST /api/bookings | 201 | 4 ms |
| DELETE /api/bookings/63686002-ace2-4e71-9b2c-9794dcd5f89f | 200 | 3 ms |
| POST /api/bookings | 201 | 4 ms |
| GET /api/bookings/5cad42fb-fcb5-4e2f-9797-ad8126431483 | 403 | 3 ms |
| PATCH /api/bookings/5cad42fb-fcb5-4e2f-9797-ad8126431483/approve | 403 | 2 ms |
| PATCH /api/bookings/5cad42fb-fcb5-4e2f-9797-ad8126431483/approve | 403 | 2 ms |
| PATCH /api/bookings/8f82107f-1751-47d1-aa88-818645f867ad | 409 | 3 ms |
| PATCH /api/bookings/8f82107f-1751-47d1-aa88-818645f867ad/cancel | 409 | 2 ms |
| GET /api/bookings?assetId=617f1c16-c3da-476b-8a9c-a30d36a2c245 | 200 | 4 ms |
| GET /api/reports/bookings | 200 | 2 ms |
| GET /api/dashboard/overview | 200 | 4 ms |
| GET /api/bookings?page=1&limit=5 | 200 | 4 ms |
| GET /api/bookings/7424c855-cd02-424c-95e0-e46e65f6960f | 200 | 3 ms |
| GET /api/reports/bookings | 200 | 4 ms |
| GET /api/dashboard/overview | 200 | 4 ms |
| GET /api/bookings/calendar?resourceId=58b6465b-d58a-4a75-ad0f-1f9f98c0a624&date=2026-07-12 | 200 | 4 ms |
| GET /api/bookings/availability?resourceId=58b6465b-d58a-4a75-ad0f-1f9f98c0a624&date=2026-07-12 | 200 | 5 ms |

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
