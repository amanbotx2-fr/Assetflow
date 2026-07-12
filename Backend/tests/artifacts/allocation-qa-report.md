# Allocation & Transfer QA Report

Generated: 2026-07-12T07:35:53.919Z

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
| POST /api/allocations | 409 | 3 ms |
| POST /api/allocations | 400 | 2 ms |
| POST /api/allocations | 403 | 2 ms |
| POST /api/allocations | 403 | 2 ms |
| POST /api/allocations | 409 | 2 ms |
| POST /api/allocations | 409 | 2 ms |
| POST /api/allocations | 409 | 3 ms |
| POST /api/allocations | 404 | 2 ms |
| POST /api/allocations | 403 | 2 ms |
| GET /api/allocations/89b888e4-4908-4b17-a89f-f2545ff9bdbf | 200 | 3 ms |
| GET /api/allocations/89b888e4-4908-4b17-a89f-f2545ff9bdbf | 200 | 3 ms |
| GET /api/allocations/00000000-0000-0000-0000-000000000000 | 404 | 2 ms |
| GET /api/allocations/not-a-uuid | 400 | 2 ms |
| PATCH /api/allocations/89b888e4-4908-4b17-a89f-f2545ff9bdbf | 200 | 5 ms |
| PATCH /api/allocations/89b888e4-4908-4b17-a89f-f2545ff9bdbf | 403 | 1 ms |
| PATCH /api/allocations/89b888e4-4908-4b17-a89f-f2545ff9bdbf | 404 | 3 ms |
| PATCH /api/allocations/00000000-0000-0000-0000-000000000000 | 404 | 2 ms |
| POST /api/allocations/89b888e4-4908-4b17-a89f-f2545ff9bdbf/return | 200 | 6 ms |
| POST /api/allocations/89b888e4-4908-4b17-a89f-f2545ff9bdbf/return | 409 | 3 ms |
| PATCH /api/allocations/89b888e4-4908-4b17-a89f-f2545ff9bdbf | 409 | 3 ms |
| POST /api/allocations/89b888e4-4908-4b17-a89f-f2545ff9bdbf/return | 400 | 2 ms |
| POST /api/allocations | 201 | 6 ms |
| GET /api/transfers | 401 | 2 ms |
| GET /api/transfers | 200 | 3 ms |
| POST /api/transfers | 201 | 6 ms |
| GET /api/transfers?assetId=43ecf707-3eed-41b7-b940-742d38cc0d91&status=PENDING | 200 | 3 ms |
| POST /api/transfers | 409 | 3 ms |
| GET /api/transfers?status=PENDING&page=1&limit=2&sortBy=requestedAt&sortOrder=desc | 200 | 3 ms |
| GET /api/transfers/adc52a8d-cf5a-434d-b1e7-16e2ce9c97b2 | 200 | 3 ms |
| GET /api/transfers/adc52a8d-cf5a-434d-b1e7-16e2ce9c97b2 | 200 | 3 ms |
| PATCH /api/transfers/adc52a8d-cf5a-434d-b1e7-16e2ce9c97b2/approve | 200 | 8 ms |
| PATCH /api/transfers/adc52a8d-cf5a-434d-b1e7-16e2ce9c97b2/reject | 409 | 3 ms |
| PATCH /api/transfers/adc52a8d-cf5a-434d-b1e7-16e2ce9c97b2/approve | 409 | 3 ms |
| GET /api/allocations?assetId=43ecf707-3eed-41b7-b940-742d38cc0d91&status=ACTIVE | 200 | 3 ms |
| POST /api/transfers | 201 | 6 ms |
| PATCH /api/transfers/d1282f61-5f4b-4912-858c-517e083d97ca/reject | 200 | 5 ms |
| PATCH /api/transfers/d1282f61-5f4b-4912-858c-517e083d97ca/approve | 409 | 3 ms |
| POST /api/transfers | 403 | 3 ms |
| POST /api/transfers | 409 | 2 ms |
| POST /api/transfers | 404 | 2 ms |
| POST /api/transfers | 400 | 3 ms |
| POST /api/allocations | 201 | 5 ms |
| POST /api/allocations | 409 | 5 ms |
| GET /api/allocations?page=1&limit=5 | 200 | 3 ms |
| GET /api/allocations/fe96e0d0-2f9a-4abe-af6d-962fb3421f96 | 200 | 3 ms |
| GET /api/transfers?page=1&limit=5 | 200 | 3 ms |
| GET /api/transfers/56bed25a-caa8-466e-b70c-0a44d2409a7e | 200 | 3 ms |

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
