# Audit QA Report

Generated: 2026-07-12T07:50:53.753Z

## Summary

| Metric | Value |
| --- | ---: |
| Checks | 33 |
| Passed | 33 |
| Failed | 0 |

## Endpoints Covered

- `GET /api/audits`
- `GET /api/audits/:id`
- `POST /api/audits`
- `PATCH /api/audits/:id`
- `DELETE /api/audits/:id`
- `POST /api/audits/:id/start`
- `POST /api/audits/:id/verify`
- `POST /api/audits/:id/complete`
- `POST /api/audits/:id/close`
- `GET /api/audits/:id/discrepancies`
- `GET /api/reports/audits`

## Checks Performed

| Endpoint | Check | Expected Status | Actual Status | Result | Root Cause |
| --- | --- | ---: | ---: | --- | --- |
| GET /api/audits | Audit list requires authentication | 401 | 401 | PASS | None observed. |
| GET /api/audits | Admin can list audits | 200 | 200 | PASS | None observed. |
| POST /api/allocations | Audit QA employee asset can be allocated | 201 | 201 | PASS | None observed. |
| POST /api/audits | Manager can create department audit | 201 | 201 | PASS | None observed. |
| GET /api/audits/:id | Employee can fetch assigned audit | 200 | 200 | PASS | None observed. |
| GET /api/audits/:id | Admin can fetch audit detail | 200 | 200 | PASS | None observed. |
| GET /api/audits/:id | Missing audit returns not found | 404 | 404 | PASS | None observed. |
| GET /api/audits/:id | Invalid audit UUID is rejected | 400 | 400 | PASS | None observed. |
| PATCH /api/audits/:id | Manager can update planned audit metadata | 200 | 200 | PASS | None observed. |
| POST /api/audits/:id/complete | Planned audit cannot complete | 409 | 409 | PASS | None observed. |
| POST /api/audits/:id/start | Manager can start planned audit | 200 | 200 | PASS | None observed. |
| POST /api/audits/:id/start | Already active audit cannot start again | 409 | 409 | PASS | None observed. |
| POST /api/audits/:id/verify | Asset outside audit scope is rejected | 409 | 409 | PASS | None observed. |
| POST /api/audits/:id/verify | Employee can verify assigned asset | 200 | 200 | PASS | None observed. |
| POST /api/audits/:id/verify | Duplicate verification is rejected | 409 | 409 | PASS | None observed. |
| POST /api/audits/:id/complete | Cannot complete until every asset is reviewed | 409 | 409 | PASS | None observed. |
| POST /api/audits/:id/verify | Manager can verify damaged asset and generate discrepancy | 200 | 200 | PASS | None observed. |
| POST /api/audits/:id/verify | Auditor can verify missing asset | 200 | 200 | PASS | None observed. |
| GET /api/assets/:id | Missing verification marks asset lost | 200 | 200 | PASS | None observed. |
| GET /api/audits/:id/discrepancies | Discrepancy report returns generated findings | 200 | 200 | PASS | None observed. |
| POST /api/audits/:id/complete | Manager can complete fully verified audit | 200 | 200 | PASS | None observed. |
| POST /api/audits/:id/close | Manager can close completed audit | 200 | 200 | PASS | None observed. |
| PATCH /api/audits/:id | Closed audit cannot be modified | 409 | 409 | PASS | None observed. |
| DELETE /api/audits/:id | Manager can delete planned audit | 200 | 200 | PASS | None observed. |
| DELETE /api/audits/:id | Active audit cannot be deleted | 409 | 409 | PASS | None observed. |
| POST /api/audits/:id/start | Manager cannot start another department audit | 403 | 403 | PASS | None observed. |
| GET /api/audits/:id | Employee cannot fetch unrelated audit | 403 | 403 | PASS | None observed. |
| POST /api/audits | Legacy audit record creation remains supported | 201 | 201 | PASS | None observed. |
| GET /api/audits | Audit list supports filters | 200 | 200 | PASS | None observed. |
| GET /api/reports/audits | Audit report exposes analytics | 200 | 200 | PASS | None observed. |
| GET /api/dashboard/overview | Dashboard includes audit metrics | 200 | 200 | PASS | None observed. |
| GET /api/notifications | Audit notifications are generated | 200 | 200 | PASS | None observed. |
| GET /api/audit-logs?entityType=Audit | Audit activity logs are generated | 200 | 200 | PASS | None observed. |

## Performance Observations

| Request | Status | Duration |
| --- | ---: | ---: |
| GET /api/audits | 401 | 2 ms |
| GET /api/audits | 200 | 3 ms |
| POST /api/audits | 201 | 9 ms |
| GET /api/audits/dfa0c1b5-a2c3-45d1-ac53-7819016987bf | 200 | 4 ms |
| GET /api/audits/dfa0c1b5-a2c3-45d1-ac53-7819016987bf | 200 | 5 ms |
| GET /api/audits/00000000-0000-0000-0000-000000000000 | 404 | 3 ms |
| GET /api/audits/not-a-uuid | 400 | 2 ms |
| PATCH /api/audits/dfa0c1b5-a2c3-45d1-ac53-7819016987bf | 200 | 6 ms |
| POST /api/audits/dfa0c1b5-a2c3-45d1-ac53-7819016987bf/complete | 409 | 4 ms |
| POST /api/audits/dfa0c1b5-a2c3-45d1-ac53-7819016987bf/start | 200 | 6 ms |
| POST /api/audits/dfa0c1b5-a2c3-45d1-ac53-7819016987bf/start | 409 | 3 ms |
| POST /api/audits/dfa0c1b5-a2c3-45d1-ac53-7819016987bf/verify | 409 | 4 ms |
| POST /api/audits/dfa0c1b5-a2c3-45d1-ac53-7819016987bf/verify | 200 | 6 ms |
| POST /api/audits/dfa0c1b5-a2c3-45d1-ac53-7819016987bf/verify | 409 | 3 ms |
| POST /api/audits/dfa0c1b5-a2c3-45d1-ac53-7819016987bf/complete | 409 | 3 ms |
| POST /api/audits/dfa0c1b5-a2c3-45d1-ac53-7819016987bf/verify | 200 | 8 ms |
| POST /api/audits/dfa0c1b5-a2c3-45d1-ac53-7819016987bf/verify | 200 | 8 ms |
| GET /api/audits/dfa0c1b5-a2c3-45d1-ac53-7819016987bf/discrepancies | 200 | 6 ms |
| POST /api/audits/dfa0c1b5-a2c3-45d1-ac53-7819016987bf/complete | 200 | 8 ms |
| POST /api/audits/dfa0c1b5-a2c3-45d1-ac53-7819016987bf/close | 200 | 7 ms |
| PATCH /api/audits/dfa0c1b5-a2c3-45d1-ac53-7819016987bf | 409 | 4 ms |
| POST /api/audits | 201 | 6 ms |
| DELETE /api/audits/6f8344c5-f57f-4ccd-85ac-0e01306a0da3 | 200 | 4 ms |
| POST /api/audits | 201 | 5 ms |
| POST /api/audits/922a3378-ff05-432e-96fa-5f1c025ea229/start | 200 | 5 ms |
| DELETE /api/audits/922a3378-ff05-432e-96fa-5f1c025ea229 | 409 | 3 ms |
| POST /api/audits | 201 | 5 ms |
| POST /api/audits/affcfa2d-6857-45e7-9f80-bad7071293eb/start | 403 | 2 ms |
| GET /api/audits/affcfa2d-6857-45e7-9f80-bad7071293eb | 403 | 3 ms |
| POST /api/audits | 201 | 4 ms |
| GET /api/audits?status=CLOSED&page=1&limit=5 | 200 | 4 ms |
| GET /api/reports/audits | 200 | 4 ms |
| GET /api/dashboard/overview | 200 | 5 ms |
| GET /api/audits?page=1&limit=5 | 200 | 5 ms |
| GET /api/audits/affcfa2d-6857-45e7-9f80-bad7071293eb | 200 | 4 ms |
| GET /api/audits/affcfa2d-6857-45e7-9f80-bad7071293eb/discrepancies | 200 | 4 ms |
| GET /api/dashboard/overview | 200 | 5 ms |
| GET /api/reports/audits | 200 | 7 ms |

## Business Rules Verified

- Audit APIs require authentication and role scope.
- Managers are scoped to department audits.
- Employees can view and verify assigned assets only.
- Audit lifecycle transitions are enforced.
- Assets cannot be verified twice in one audit.
- Audits cannot complete until all assigned assets are reviewed.
- Closed audits cannot be modified.
- Discrepancies are generated for missing/damaged/wrong-location findings.
- Notifications and activity logs are generated.

## Known Limitations

- Audit scopes are captured as asset snapshots at audit creation time.
- Legacy one-off audit record creation remains supported through `POST /api/audits` with `assetId/result`.
