# Reports QA Report

Generated: 2026-07-12T08:29:02.393Z

## Summary

| Metric | Value |
| --- | ---: |
| Checks | 18 |
| Passed | 18 |
| Failed | 0 |

## Endpoints Covered

- `GET /api/reports/dashboard`
- `GET /api/reports/assets`
- `GET /api/reports/bookings`
- `GET /api/reports/maintenance`
- `GET /api/reports/audits`
- `GET /api/reports/utilization`
- `GET /api/reports/department-utilization`
- `GET /api/reports/idle-assets`
- `GET /api/reports/most-used-assets`
- `GET /api/reports/near-retirement`
- `GET /api/reports/export`

## Checks Performed

| Endpoint | Check | Expected Status | Actual Status | Result | Root Cause |
| --- | --- | ---: | ---: | --- | --- |
| GET /api/reports/dashboard | Reports require authentication | 401 | 401 | PASS | None observed. |
| GET /api/reports/dashboard | Admin receives dashboard analytics | 200 | 200 | PASS | None observed. |
| GET /api/reports/assets | Asset report supports status filter and charts | 200 | 200 | PASS | None observed. |
| GET /api/reports/bookings | Booking report supports date range and chart structures | 200 | 200 | PASS | None observed. |
| GET /api/reports/maintenance | Maintenance report supports priority filter and chart structures | 200 | 200 | PASS | None observed. |
| GET /api/reports/audits | Auditor receives audit analytics | 200 | 200 | PASS | None observed. |
| GET /api/reports/utilization | Utilization report returns totals and charts | 200 | 200 | PASS | None observed. |
| GET /api/reports/department-utilization | Department utilization supports department filter | 200 | 200 | PASS | None observed. |
| GET /api/reports/idle-assets | Idle assets report is paginated | 200 | 200 | PASS | None observed. |
| GET /api/reports/most-used-assets | Most-used assets report is chart-ready | 200 | 200 | PASS | None observed. |
| GET /api/reports/near-retirement | Near-retirement report is paginated and risk-scored | 200 | 200 | PASS | None observed. |
| GET /api/reports/dashboard | Employee receives own-data dashboard analytics | 200 | 200 | PASS | None observed. |
| GET /api/reports/assets?departmentId=<finance> | Manager cannot access another department report | 403 | 403 | PASS | None observed. |
| GET /api/reports/assets?departmentId=<it> | Employee cannot request department-scoped report | 403 | 403 | PASS | None observed. |
| GET /api/reports/export?type=assets&format=json | JSON export wraps selected report data | 200 | 200 | PASS | None observed. |
| GET /api/reports/export?type=assets&format=csv | CSV export returns text/csv content | 200 | 200 | PASS | None observed. |
| GET /api/reports/export?type=dashboard&format=pdf | PDF export interface is available | 200 | 200 | PASS | None observed. |
| GET /api/reports/export?format=xlsx | Invalid export format is rejected | 400 | 400 | PASS | None observed. |

## Performance Observations

| Request | Status | Duration |
| --- | ---: | ---: |
| GET /api/reports/dashboard | 401 | 2 ms |
| GET /api/reports/dashboard | 200 | 10 ms |
| GET /api/reports/assets?status=AVAILABLE&page=1&limit=5 | 200 | 4 ms |
| GET /api/reports/bookings?from=2026-07-01T00:00:00.000Z&to=2026-07-31T23:59:59.000Z | 200 | 3 ms |
| GET /api/reports/maintenance?priority=HIGH | 200 | 2 ms |
| GET /api/reports/audits | 200 | 3 ms |
| GET /api/reports/utilization | 200 | 3 ms |
| GET /api/reports/department-utilization?departmentId=154672e5-d1d2-4e7e-9e76-5ac63ea19f10 | 200 | 3 ms |
| GET /api/reports/idle-assets?limit=5 | 200 | 4 ms |
| GET /api/reports/most-used-assets?limit=5 | 200 | 3 ms |
| GET /api/reports/near-retirement?limit=5 | 200 | 3 ms |
| GET /api/reports/dashboard | 200 | 10 ms |
| GET /api/reports/assets?departmentId=e59879f3-be4c-4a92-9fc9-6d238273baa6 | 403 | 2 ms |
| GET /api/reports/assets?departmentId=154672e5-d1d2-4e7e-9e76-5ac63ea19f10 | 403 | 2 ms |
| GET /api/reports/export?type=assets&format=json | 200 | 3 ms |
| GET /api/reports/export?type=assets&format=csv | 200 | 4 ms |
| GET /api/reports/export?type=dashboard&format=pdf | 200 | 2 ms |
| GET /api/reports/export?format=xlsx | 400 | 2 ms |

## Business Rules Verified

- Reports require authentication.
- Managers are restricted to their assigned department.
- Employees cannot request department-scoped reports and only receive own-data views.
- Analytics responses expose chart-ready `labels`, `datasets`, totals, and percentages where applicable.
- CSV, JSON, and PDF-interface export modes are available.

## Known Limitations

- PDF export returns a future-ready interface response rather than a rendered binary PDF.
- Near-retirement risk is derived from existing condition, warranty, and purchase-date fields only.
