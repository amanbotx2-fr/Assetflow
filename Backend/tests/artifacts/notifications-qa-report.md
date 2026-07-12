# Notifications QA Report

Generated: 2026-07-12T08:29:16.622Z

## Summary

| Metric | Value |
| --- | ---: |
| Checks | 24 |
| Passed | 24 |
| Failed | 0 |

## Endpoints Covered

- `GET /api/notifications`
- `GET /api/notifications/:id`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`
- `DELETE /api/notifications/:id`
- `GET /api/notifications/unread-count`
- `GET /api/dashboard/overview`

## Checks Performed

| Endpoint | Check | Expected Status | Actual Status | Result | Root Cause |
| --- | --- | ---: | ---: | --- | --- |
| GET /api/notifications | Notifications require authentication | 401 | 401 | PASS | None observed. |
| GET /api/notifications | Employee can list own notifications | 200 | 200 | PASS | None observed. |
| GET /api/notifications?type=ALLOCATION | Type/category filter returns allocation notifications | 200 | 200 | PASS | None observed. |
| GET /api/notifications?priority=MEDIUM | Priority filter returns medium notifications | 200 | 200 | PASS | None observed. |
| GET /api/notifications?search=booking | Search filter matches notification text | 200 | 200 | PASS | None observed. |
| GET /api/notifications?status=unread | Unread filter returns unread notifications | 200 | 200 | PASS | None observed. |
| GET /api/notifications?page=1&limit=1 | Pagination and sorting work | 200 | 200 | PASS | None observed. |
| GET /api/notifications/:id | Notification detail works | 200 | 200 | PASS | None observed. |
| GET /api/notifications/:id | Missing notification returns 404 | 404 | 404 | PASS | None observed. |
| GET /api/notifications?type=APPROVAL | Manager can view department approval notifications | 200 | 200 | PASS | None observed. |
| GET /api/notifications | Auditor can read notifications | 200 | 200 | PASS | None observed. |
| PATCH /api/notifications/:id/read | Auditor cannot mark notifications read | 403 | 403 | PASS | None observed. |
| GET /api/notifications?type=ASSET | Admin can view global asset notifications | 200 | 200 | PASS | None observed. |
| GET /api/notifications/unread-count | Unread count endpoint returns badge count | 200 | 200 | PASS | None observed. |
| PATCH /api/notifications/:id/read | Employee can mark own notification read | 200 | 200 | PASS | None observed. |
| GET /api/notifications?status=read | Read filter returns read notifications | 200 | 200 | PASS | None observed. |
| PATCH /api/notifications/read-all | Employee can atomically mark all own notifications read | 200 | 200 | PASS | None observed. |
| GET /api/notifications/unread-count | Unread count updates after mark-all-read | 200 | 200 | PASS | None observed. |
| DELETE /api/notifications/:id | Employee cannot delete another user's notification | 404 | 404 | PASS | None observed. |
| DELETE /api/notifications/:id | Employee can delete own notification copy | 200 | 200 | PASS | None observed. |
| GET /api/notifications/:id | Deleted notification is no longer available | 404 | 404 | PASS | None observed. |
| GET /api/dashboard/overview | Dashboard exposes notification badge and recent notifications | 200 | 200 | PASS | None observed. |
| GET /api/notifications?from=<date>&to=<date> | Date filter returns notification page | 200 | 200 | PASS | None observed. |
| GET /api/notifications?priority=BLOCKER | Invalid priority is rejected | 400 | 400 | PASS | None observed. |

## Performance Observations

| Request | Status | Duration |
| --- | ---: | ---: |
| GET /api/notifications | 401 | 2 ms |
| GET /api/notifications?page=1&limit=50 | 200 | 2 ms |
| GET /api/notifications?type=ALLOCATION&limit=20 | 200 | 2 ms |
| GET /api/notifications?priority=MEDIUM&limit=20 | 200 | 2 ms |
| GET /api/notifications?search=booking&limit=20 | 200 | 2 ms |
| GET /api/notifications?status=unread&limit=20 | 200 | 2 ms |
| GET /api/notifications?page=1&limit=1&sortBy=createdAt&sortOrder=desc | 200 | 2 ms |
| GET /api/notifications/8e200232-e066-4250-a3aa-84dc3e245c0a | 200 | 2 ms |
| GET /api/notifications/00000000-0000-0000-0000-000000000000 | 404 | 2 ms |
| GET /api/notifications?type=APPROVAL&limit=20 | 200 | 2 ms |
| GET /api/notifications?limit=5 | 200 | 2 ms |
| PATCH /api/notifications/8e200232-e066-4250-a3aa-84dc3e245c0a/read | 403 | 2 ms |
| GET /api/notifications?type=ASSET&limit=20 | 200 | 2 ms |
| GET /api/notifications/unread-count | 200 | 2 ms |
| PATCH /api/notifications/8e200232-e066-4250-a3aa-84dc3e245c0a/read | 200 | 4 ms |
| GET /api/notifications?status=read&limit=20 | 200 | 2 ms |
| PATCH /api/notifications/read-all | 200 | 2 ms |
| GET /api/notifications/unread-count | 200 | 2 ms |
| DELETE /api/notifications/32a30272-1255-4ca3-bd92-f95668b171aa | 404 | 2 ms |
| DELETE /api/notifications/8e200232-e066-4250-a3aa-84dc3e245c0a | 200 | 2 ms |
| GET /api/notifications/8e200232-e066-4250-a3aa-84dc3e245c0a | 404 | 2 ms |
| GET /api/dashboard/overview | 200 | 7 ms |
| GET /api/notifications?from=2026-01-01T00:00:00.000Z&to=2026-12-31T23:59:59.000Z | 200 | 3 ms |
| GET /api/notifications?priority=BLOCKER | 400 | 2 ms |

## Business Rules Verified

- Notification list and detail require authentication.
- Employee access is scoped to the employee's own notifications.
- Manager access includes department notifications.
- Auditor access is read-only.
- Mark-all-read is atomic and updates unread counts.
- Delete removes only the selected notification row.
- Filters work for category/type, priority, read status, date range, search, pagination, and sorting.
- Dashboard exposes unread count, badge count, recent notifications, and critical alerts.

## Known Limitations

- Notifications are stored as per-user copies; deleting a row removes that recipient's copy only.
- Duplicate prevention is applied to unread notifications with the same recipient, type, and related entity.
