# Resource Booking QA Report

Generated: 2026-07-12T06:29:00.314Z

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
| POST /api/bookings | 409 | 2 ms |
| POST /api/bookings | 409 | 2 ms |
| POST /api/bookings | 400 | 2 ms |
| POST /api/bookings | 400 | 2 ms |
| POST /api/bookings | 404 | 2 ms |
| POST /api/bookings | 409 | 2 ms |
| GET /api/bookings/c774b6ad-d809-46c3-9101-408416637b42 | 200 | 3 ms |
| GET /api/bookings/00000000-0000-0000-0000-000000000000 | 404 | 3 ms |
| GET /api/bookings/not-a-uuid | 400 | 2 ms |
| PATCH /api/bookings/c774b6ad-d809-46c3-9101-408416637b42 | 200 | 5 ms |
| PATCH /api/bookings/c774b6ad-d809-46c3-9101-408416637b42/approve | 200 | 5 ms |
| PATCH /api/bookings/c774b6ad-d809-46c3-9101-408416637b42/reject | 409 | 2 ms |
| PATCH /api/bookings/c774b6ad-d809-46c3-9101-408416637b42/approve | 409 | 3 ms |
| POST /api/bookings | 409 | 2 ms |
| GET /api/bookings/calendar?resourceId=ddae2de4-2a2d-4115-9e97-43c4cbe08222&date=2026-07-13 | 200 | 4 ms |
| GET /api/bookings/calendar?resourceId=ddae2de4-2a2d-4115-9e97-43c4cbe08222 | 400 | 2 ms |
| GET /api/bookings/availability?resourceId=ddae2de4-2a2d-4115-9e97-43c4cbe08222&date=2026-07-13 | 200 | 4 ms |
| GET /api/bookings/availability | 400 | 2 ms |
| POST /api/bookings | 201 | 4 ms |
| PATCH /api/bookings/f3dcf468-0600-44e0-bef9-ca3af40bde6c/reject | 200 | 4 ms |
| POST /api/bookings | 201 | 4 ms |
| POST /api/bookings | 201 | 4 ms |
| PATCH /api/bookings/4c04502b-4e35-4d6d-b111-248296e2e4d3/cancel | 200 | 3 ms |
| POST /api/bookings | 201 | 3 ms |
| POST /api/bookings | 201 | 4 ms |
| DELETE /api/bookings/969f2c2e-3bb2-40dc-bf49-8dfd8f44582b | 200 | 3 ms |
| POST /api/bookings | 201 | 4 ms |
| GET /api/bookings/b8e67b03-750a-4ec1-8a00-a6e69eeb9369 | 403 | 3 ms |
| PATCH /api/bookings/b8e67b03-750a-4ec1-8a00-a6e69eeb9369/approve | 403 | 2 ms |
| PATCH /api/bookings/b8e67b03-750a-4ec1-8a00-a6e69eeb9369/approve | 403 | 2 ms |
| PATCH /api/bookings/f9b6d606-ae68-48a0-99b8-0127a129b0f0 | 409 | 2 ms |
| PATCH /api/bookings/f9b6d606-ae68-48a0-99b8-0127a129b0f0/cancel | 409 | 2 ms |
| GET /api/bookings?assetId=ddae2de4-2a2d-4115-9e97-43c4cbe08222 | 200 | 4 ms |
| GET /api/reports/bookings | 200 | 3 ms |
| GET /api/dashboard/overview | 200 | 4 ms |
| GET /api/bookings?page=1&limit=5 | 200 | 4 ms |
| GET /api/bookings/f7093bea-4724-4b66-9cb7-a123f0e90d43 | 200 | 3 ms |
| GET /api/reports/bookings | 200 | 3 ms |
| GET /api/bookings/availability?resourceId=f04b6922-b25f-4765-8824-73319f000e62&date=2026-07-12 | 200 | 7 ms |
| GET /api/bookings/calendar?resourceId=f04b6922-b25f-4765-8824-73319f000e62&date=2026-07-12 | 200 | 7 ms |
| GET /api/dashboard/overview | 200 | 8 ms |

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
