# Dashboard QA Report

Generated: 2026-07-12T07:06:32.019Z

## Summary

| Metric | Value |
| --- | ---: |
| Checks | 5 |
| Passed | 5 |
| Failed | 0 |

## Endpoint

`GET /api/dashboard/overview`

## Checks Performed

| Endpoint | Check | Expected Status | Actual Status | Result | Root Cause |
| --- | --- | ---: | ---: | --- | --- |
| GET /api/dashboard/overview | Seeded admin request returns dashboard payload | 200 | 200 | PASS | None observed. |
| GET /api/dashboard/overview | Missing JWT is rejected | 401 | 401 | PASS | None observed. |
| GET /api/dashboard/overview?departmentId=<finance> | Manager cannot request another department dashboard | 403 | 403 | PASS | None observed. |
| GET /api/dashboard/overview | Empty lifecycle database returns zero counts | 200 | 200 | PASS | None observed. |
| GET /api/dashboard/overview | Seeded database returns dashboard payload after restore | 200 | 200 | PASS | None observed. |

## Performance Observations

| Request | Status | Duration |
| --- | ---: | ---: |
| GET /api/dashboard/overview | 200 | 7 ms |
| GET /api/dashboard/overview | 401 | 2 ms |
| GET /api/dashboard/overview?departmentId=6485a6a8-9664-42ad-9ebc-32cd48fbb6b6 | 403 | 2 ms |
| GET /api/dashboard/overview | 200 | 5 ms |
| GET /api/dashboard/overview | 200 | 6 ms |

The endpoint performs bounded recent-activity reads and aggregate counts in parallel. Local QA responses were comfortably within hackathon-demo expectations.

## Known Limitations

- Upcoming returns are derived from approved booking end times because allocation return due dates are not currently modeled.
- Alerts are status-based and only use existing persisted business data; no predictive or synthetic alert logic is included.
- Quick actions are role descriptors for the frontend to map to its own UI routes.
