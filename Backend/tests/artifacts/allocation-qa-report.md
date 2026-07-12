# Allocation & Transfer QA Report

Generated: 2026-07-12T06:28:51.521Z

## Summary

| Metric | Value |
| --- | ---: |
| Checks | 51 |
| Passed | 51 |
| Failed | 0 |

## Endpoints Covered

- `GET /api/allocations`
- `GET /api/allocations/:id`
- `POST /api/allocations`
- `PATCH /api/allocations/:id`
- `POST /api/allocations/:id/return`
- `GET /api/transfers`
- `GET /api/transfers/:id`
- `POST /api/transfers`
- `PATCH /api/transfers/:id/approve`
- `PATCH /api/transfers/:id/reject`

## Checks Performed

| Endpoint | Check | Expected Status | Actual Status | Result | Root Cause |
| --- | --- | ---: | ---: | --- | --- |
| GET /api/allocations | Allocation list requires authentication | 401 | 401 | PASS | None observed. |
| GET /api/allocations | Admin can list allocation history | 200 | 200 | PASS | None observed. |
| GET /api/allocations | Manager can list scoped allocation history | 200 | 200 | PASS | None observed. |
| GET /api/allocations | Employee can list own allocations | 200 | 200 | PASS | None observed. |
| GET /api/allocations | Auditor can read allocation history | 200 | 200 | PASS | None observed. |
| GET /api/allocations?status=ACTIVE | Allocation status filter works | 200 | 200 | PASS | None observed. |
| GET /api/allocations?employeeId=:id | Allocation employee filter works | 200 | 200 | PASS | None observed. |
| GET /api/allocations?departmentId=:id | Allocation department filter works | 200 | 200 | PASS | None observed. |
| GET /api/allocations?from=:date&to=:date | Allocation date range and sorting work | 200 | 200 | PASS | None observed. |
| GET /api/allocations?status=BAD | Invalid allocation status is rejected | 400 | 400 | PASS | None observed. |
| POST /api/allocations | Admin can create allocation | 201 | 201 | PASS | None observed. |
| POST /api/allocations | Duplicate active allocation is rejected | 409 | 409 | PASS | None observed. |
| POST /api/allocations | Allocation requires user or department | 400 | 400 | PASS | None observed. |
| POST /api/allocations | Employee cannot create allocation | 403 | 403 | PASS | None observed. |
| POST /api/allocations | Auditor cannot create allocation | 403 | 403 | PASS | None observed. |
| POST /api/allocations | Already allocated seed asset is rejected | 409 | 409 | PASS | None observed. |
| POST /api/allocations | Maintenance asset allocation is rejected | 409 | 409 | PASS | None observed. |
| POST /api/allocations | Retired asset allocation is rejected | 409 | 409 | PASS | None observed. |
| POST /api/allocations | Invalid destination employee returns not found | 404 | 404 | PASS | None observed. |
| POST /api/allocations | Manager cannot allocate another department asset | 403 | 403 | PASS | None observed. |
| GET /api/allocations/:id | Admin can fetch allocation detail | 200 | 200 | PASS | None observed. |
| GET /api/allocations/:id | Employee can fetch own allocation detail | 200 | 200 | PASS | None observed. |
| GET /api/allocations/:id | Missing allocation returns not found | 404 | 404 | PASS | None observed. |
| GET /api/allocations/:id | Invalid allocation UUID is rejected | 400 | 400 | PASS | None observed. |
| PATCH /api/allocations/:id | Admin can update allocation notes | 200 | 200 | PASS | None observed. |
| PATCH /api/allocations/:id | Employee cannot update allocation | 403 | 403 | PASS | None observed. |
| PATCH /api/allocations/:id | Invalid update employee returns not found | 404 | 404 | PASS | None observed. |
| PATCH /api/allocations/:id | Missing allocation update returns not found | 404 | 404 | PASS | None observed. |
| POST /api/allocations/:id/return | Employee can return own allocation | 200 | 200 | PASS | None observed. |
| POST /api/allocations/:id/return | Already returned allocation cannot be returned twice | 409 | 409 | PASS | None observed. |
| PATCH /api/allocations/:id | Returned allocation cannot be updated | 409 | 409 | PASS | None observed. |
| POST /api/allocations/:id/return | Invalid return condition is rejected | 400 | 400 | PASS | None observed. |
| GET /api/transfers | Transfer list requires authentication | 401 | 401 | PASS | None observed. |
| GET /api/transfers | Auditor has read-only transfer access | 200 | 200 | PASS | None observed. |
| POST /api/transfers | Employee can request transfer for own allocated asset | 201 | 201 | PASS | None observed. |
| POST /api/transfers | Duplicate pending transfer is rejected | 409 | 409 | PASS | None observed. |
| GET /api/transfers?status=PENDING | Transfer filters and pagination work | 200 | 200 | PASS | None observed. |
| GET /api/transfers/:id | Admin can fetch transfer detail | 200 | 200 | PASS | None observed. |
| GET /api/transfers/:id | Auditor can fetch transfer detail | 200 | 200 | PASS | None observed. |
| PATCH /api/transfers/:id/approve | Admin can approve pending transfer | 200 | 200 | PASS | None observed. |
| PATCH /api/transfers/:id/reject | Approved transfer cannot be rejected | 409 | 409 | PASS | None observed. |
| PATCH /api/transfers/:id/approve | Approved transfer cannot be approved again | 409 | 409 | PASS | None observed. |
| GET /api/allocations?assetId=:id | Transfer approval leaves exactly one active allocation | 200 | 200 | PASS | None observed. |
| POST /api/transfers | Admin can request transfer for rejection path | 201 | 201 | PASS | None observed. |
| PATCH /api/transfers/:id/reject | Admin can reject pending transfer | 200 | 200 | PASS | None observed. |
| PATCH /api/transfers/:id/approve | Rejected transfer cannot be approved | 409 | 409 | PASS | None observed. |
| POST /api/transfers | Employee cannot transfer unassigned asset | 403 | 403 | PASS | None observed. |
| POST /api/transfers | Transfer without active allocation is rejected | 409 | 409 | PASS | None observed. |
| POST /api/transfers | Transfer to invalid destination employee returns not found | 404 | 404 | PASS | None observed. |
| POST /api/transfers | Transfer to same destination is rejected | 400 | 400 | PASS | None observed. |
| POST /api/allocations | Concurrent allocation protection allows only one active allocation | 201 + 409 | 201 + 409 | PASS | None observed. |

## Performance Observations

| Request | Status | Duration |
| --- | ---: | ---: |
| GET /api/allocations?from=2026-01-01T00:00:00.000Z&to=2027-01-01T00:00:00.000Z&sortBy=assignedAt&sortOrder=asc | 200 | 3 ms |
| GET /api/allocations?status=BAD | 400 | 2 ms |
| POST /api/allocations | 201 | 5 ms |
| POST /api/allocations | 409 | 2 ms |
| POST /api/allocations | 400 | 2 ms |
| POST /api/allocations | 403 | 2 ms |
| POST /api/allocations | 403 | 2 ms |
| POST /api/allocations | 409 | 2 ms |
| POST /api/allocations | 409 | 2 ms |
| POST /api/allocations | 409 | 2 ms |
| POST /api/allocations | 404 | 2 ms |
| POST /api/allocations | 403 | 2 ms |
| GET /api/allocations/374fab85-b44f-4877-90ae-d8a1d4ca9ffc | 200 | 3 ms |
| GET /api/allocations/374fab85-b44f-4877-90ae-d8a1d4ca9ffc | 200 | 3 ms |
| GET /api/allocations/00000000-0000-0000-0000-000000000000 | 404 | 2 ms |
| GET /api/allocations/not-a-uuid | 400 | 2 ms |
| PATCH /api/allocations/374fab85-b44f-4877-90ae-d8a1d4ca9ffc | 200 | 5 ms |
| PATCH /api/allocations/374fab85-b44f-4877-90ae-d8a1d4ca9ffc | 403 | 2 ms |
| PATCH /api/allocations/374fab85-b44f-4877-90ae-d8a1d4ca9ffc | 404 | 3 ms |
| PATCH /api/allocations/00000000-0000-0000-0000-000000000000 | 404 | 2 ms |
| POST /api/allocations/374fab85-b44f-4877-90ae-d8a1d4ca9ffc/return | 200 | 6 ms |
| POST /api/allocations/374fab85-b44f-4877-90ae-d8a1d4ca9ffc/return | 409 | 3 ms |
| PATCH /api/allocations/374fab85-b44f-4877-90ae-d8a1d4ca9ffc | 409 | 3 ms |
| POST /api/allocations/374fab85-b44f-4877-90ae-d8a1d4ca9ffc/return | 400 | 2 ms |
| POST /api/allocations | 201 | 6 ms |
| GET /api/transfers | 401 | 2 ms |
| GET /api/transfers | 200 | 3 ms |
| POST /api/transfers | 201 | 5 ms |
| GET /api/transfers?assetId=92451079-022b-47aa-b298-f601217330f7&status=PENDING | 200 | 3 ms |
| POST /api/transfers | 409 | 3 ms |
| GET /api/transfers?status=PENDING&page=1&limit=2&sortBy=requestedAt&sortOrder=desc | 200 | 3 ms |
| GET /api/transfers/74fa387d-4fa7-4118-816e-232f1c669ab9 | 200 | 3 ms |
| GET /api/transfers/74fa387d-4fa7-4118-816e-232f1c669ab9 | 200 | 3 ms |
| PATCH /api/transfers/74fa387d-4fa7-4118-816e-232f1c669ab9/approve | 200 | 7 ms |
| PATCH /api/transfers/74fa387d-4fa7-4118-816e-232f1c669ab9/reject | 409 | 3 ms |
| PATCH /api/transfers/74fa387d-4fa7-4118-816e-232f1c669ab9/approve | 409 | 3 ms |
| GET /api/allocations?assetId=92451079-022b-47aa-b298-f601217330f7&status=ACTIVE | 200 | 3 ms |
| POST /api/transfers | 201 | 5 ms |
| PATCH /api/transfers/503773be-cff3-4fc0-918c-0b3b5be535c0/reject | 200 | 5 ms |
| PATCH /api/transfers/503773be-cff3-4fc0-918c-0b3b5be535c0/approve | 409 | 3 ms |
| POST /api/transfers | 403 | 2 ms |
| POST /api/transfers | 409 | 2 ms |
| POST /api/transfers | 404 | 2 ms |
| POST /api/transfers | 400 | 2 ms |
| POST /api/allocations | 201 | 4 ms |
| POST /api/allocations | 409 | 4 ms |
| GET /api/allocations?page=1&limit=5 | 200 | 3 ms |
| GET /api/allocations/2627f0cc-e8c3-4727-9e64-29273303d379 | 200 | 3 ms |
| GET /api/transfers?page=1&limit=5 | 200 | 3 ms |
| GET /api/transfers/d1e3f1c2-b5bd-4b20-8a2f-1cf63343e350 | 200 | 3 ms |

The allocation and transfer endpoints use bounded pagination and eager-loaded relation summaries for assets, users, departments, assigned-by users, and source transfers. Local response times were within demo expectations.

## Business Rules Verified

- One active allocation per asset is enforced by service checks and the database partial unique index.
- Retired, maintenance, and already allocated assets cannot be allocated.
- Pending duplicate transfers for the same asset are rejected.
- Transfer approval closes the old allocation and creates one new active allocation linked to the transfer.
- Approved transfers cannot be rejected or approved again.
- Rejected transfers cannot be approved.

## Known Limitations

- Allocation return is immediate; there is no separate return approval queue in the current MVP.
- Transfer approval is limited to the source department manager or admin.
- Department-only allocations are supported, but the demo UI is expected to focus on employee ownership.
