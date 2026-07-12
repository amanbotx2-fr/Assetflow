# Organization QA Report

Generated: 2026-07-12T07:20:46.359Z

## Summary

| Metric | Value |
| --- | ---: |
| Checks | 43 |
| Passed | 43 |
| Failed | 0 |

## Endpoints Covered

- `GET /api/organization/overview`
- `GET /api/departments`
- `POST /api/departments`
- `PATCH /api/departments/:id`
- `DELETE /api/departments/:id`
- `GET /api/categories`
- `POST /api/categories`
- `PATCH /api/categories/:id`
- `DELETE /api/categories/:id`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`

## Checks Performed

| Endpoint | Check | Expected Status | Actual Status | Result | Root Cause |
| --- | --- | ---: | ---: | --- | --- |
| GET /api/organization/overview | Organization overview requires authentication | 401 | 401 | PASS | None observed. |
| GET /api/organization/overview | Admin can read organization overview | 200 | 200 | PASS | None observed. |
| GET /api/organization/overview | Manager can read organization overview | 200 | 200 | PASS | None observed. |
| GET /api/organization/overview | Auditor can read organization overview | 200 | 200 | PASS | None observed. |
| GET /api/organization/overview | Employee cannot read organization overview | 403 | 403 | PASS | None observed. |
| GET /api/departments | Department list requires authentication | 401 | 401 | PASS | None observed. |
| GET /api/departments | Employee cannot list organization departments | 403 | 403 | PASS | None observed. |
| GET /api/departments?page=1&limit=2&search=Information&status=ACTIVE | Admin can search and filter departments | 200 | 200 | PASS | None observed. |
| GET /api/departments | Manager has read-only department access | 200 | 200 | PASS | None observed. |
| POST /api/departments | Admin can create department | 201 | 201 | PASS | None observed. |
| POST /api/departments | Duplicate department name/code is rejected | 409 | 409 | PASS | None observed. |
| POST /api/departments | Invalid department head assignment is rejected | 400 | 400 | PASS | None observed. |
| POST /api/departments | Missing parent department is rejected | 404 | 404 | PASS | None observed. |
| POST /api/departments | Manager cannot create department | 403 | 403 | PASS | None observed. |
| POST /api/departments | Admin can create child department | 201 | 201 | PASS | None observed. |
| PATCH /api/departments/:id | Circular parent assignment is rejected | 400 | 400 | PASS | None observed. |
| PATCH /api/departments/:id | Admin can update department | 200 | 200 | PASS | None observed. |
| PATCH /api/departments/:id | Missing department update returns not found | 404 | 404 | PASS | None observed. |
| PATCH /api/departments/:id | Invalid department UUID is rejected | 400 | 400 | PASS | None observed. |
| DELETE /api/departments/:id | Admin can soft-delete department | 200 | 200 | PASS | None observed. |
| GET /api/categories | Category list requires authentication | 401 | 401 | PASS | None observed. |
| GET /api/categories | Employee cannot list organization categories | 403 | 403 | PASS | None observed. |
| GET /api/categories?page=1&limit=2&search=lap&status=ACTIVE | Admin can search and filter categories | 200 | 200 | PASS | None observed. |
| GET /api/categories | Auditor has read-only category access | 200 | 200 | PASS | None observed. |
| POST /api/categories | Admin can create category | 201 | 201 | PASS | None observed. |
| POST /api/categories | Duplicate category name/code is rejected | 409 | 409 | PASS | None observed. |
| POST /api/categories | Invalid category payload is rejected | 400 | 400 | PASS | None observed. |
| PATCH /api/categories/:id | Admin can update category | 200 | 200 | PASS | None observed. |
| PATCH /api/categories/:id | Missing category update returns not found | 404 | 404 | PASS | None observed. |
| PATCH /api/categories/:id | Invalid category UUID is rejected | 400 | 400 | PASS | None observed. |
| DELETE /api/categories/:id | Admin can soft-delete category | 200 | 200 | PASS | None observed. |
| POST /api/categories | Auditor cannot create category | 403 | 403 | PASS | None observed. |
| GET /api/users | Employee list requires authentication | 401 | 401 | PASS | None observed. |
| GET /api/users | Employee cannot list organization employees | 403 | 403 | PASS | None observed. |
| GET /api/users?role=EMPLOYEE&departmentId=<department> | Admin can filter employees by role and department | 200 | 200 | PASS | None observed. |
| GET /api/users | Manager has read-only scoped employee access | 200 | 200 | PASS | None observed. |
| POST /api/users | Admin can create employee | 201 | 201 | PASS | None observed. |
| POST /api/users | Duplicate employee email is rejected | 409 | 409 | PASS | None observed. |
| POST /api/users | Invalid employee email is rejected | 400 | 400 | PASS | None observed. |
| POST /api/users | Manager cannot create employee | 403 | 403 | PASS | None observed. |
| PATCH /api/users/:id | Admin can update employee department, role, and status | 200 | 200 | PASS | None observed. |
| PATCH /api/users/:id | Invalid employee department assignment is rejected | 404 | 404 | PASS | None observed. |
| PATCH /api/users/:id | Missing employee update returns not found | 404 | 404 | PASS | None observed. |

## Performance Observations

| Request | Status | Duration |
| --- | ---: | ---: |
| PATCH /api/departments/00000000-0000-0000-0000-000000000000 | 404 | 3 ms |
| PATCH /api/departments/not-a-uuid | 400 | 2 ms |
| DELETE /api/departments/537ecfff-bfe1-4763-818b-313fe5062f09 | 200 | 3 ms |
| GET /api/categories | 401 | 2 ms |
| GET /api/categories | 403 | 2 ms |
| GET /api/categories?page=1&limit=2&search=lap&status=ACTIVE | 200 | 2 ms |
| GET /api/categories | 200 | 1 ms |
| POST /api/categories | 201 | 3 ms |
| POST /api/categories | 409 | 2 ms |
| POST /api/categories | 400 | 2 ms |
| PATCH /api/categories/69e875cd-b182-4bf5-89ec-0e16395ef021 | 200 | 3 ms |
| PATCH /api/categories/00000000-0000-0000-0000-000000000000 | 404 | 2 ms |
| PATCH /api/categories/not-a-uuid | 400 | 2 ms |
| DELETE /api/categories/69e875cd-b182-4bf5-89ec-0e16395ef021 | 200 | 3 ms |
| POST /api/categories | 403 | 2 ms |
| GET /api/users | 401 | 1 ms |
| GET /api/users | 403 | 2 ms |
| GET /api/users?role=EMPLOYEE&departmentId=8101fe22-829d-4119-b5a1-9040ffaaf5c7 | 200 | 2 ms |
| GET /api/users | 200 | 2 ms |
| POST /api/users | 201 | 47 ms |
| POST /api/users | 409 | 46 ms |
| POST /api/users | 400 | 2 ms |
| POST /api/users | 403 | 2 ms |
| PATCH /api/users/b2c3af54-8ecc-487d-9356-4b09dc377af2 | 200 | 4 ms |
| PATCH /api/users/b2c3af54-8ecc-487d-9356-4b09dc377af2 | 404 | 2 ms |
| PATCH /api/users/00000000-0000-0000-0000-000000000000 | 404 | 2 ms |
| GET /api/organization/overview | 200 | 3 ms |
| GET /api/departments?page=1&limit=5 | 200 | 4 ms |
| GET /api/categories?page=1&limit=5 | 200 | 4 ms |
| GET /api/users?role=EMPLOYEE&page=1&limit=5 | 200 | 4 ms |

Local QA response times were within demo expectations. List endpoints use bounded pagination, and the organization overview performs aggregate counts in parallel.

## Known Limitations

- Employee manager relationship is represented through the employee's department head; there is no direct employee-to-manager field in the current schema.
- Delete operations are soft deletes through `status=INACTIVE`; records remain available for audit and historical references.
- Categories are global reference data and are not department-scoped.
