# Backend Testing Plan

## Table of Contents

- [Testing Goals](#testing-goals)
- [Test Types](#test-types)
- [Authentication Tests](#authentication-tests)
- [Authorization Tests](#authorization-tests)
- [API Tests](#api-tests)
- [Database Tests](#database-tests)
- [Business Rule Tests](#business-rule-tests)
- [Deployment Smoke Tests](#deployment-smoke-tests)
- [Acceptance Criteria](#acceptance-criteria)

## Testing Goals

Backend testing should prove that APIs are secure, data changes are valid, lifecycle workflows are consistent, and database migrations are reliable.

## Test Types

| Type | Purpose |
| --- | --- |
| Unit tests | Validate isolated helpers and business rule functions. |
| Service tests | Validate workflow logic and transaction behavior. |
| Repository tests | Validate database query behavior. |
| API tests | Validate endpoint status codes, payloads, and authorization. |
| Migration tests | Validate schema can migrate from a clean database. |
| Smoke tests | Validate deployed backend health and core workflows. |

## Authentication Tests

| Test | Expected Result |
| --- | --- |
| Valid login | Returns `200`, JWT, and safe user data. |
| Invalid password | Returns `401`. |
| Inactive user login | Returns `401`. |
| Missing token on protected endpoint | Returns `401`. |
| Invalid token | Returns `401`. |
| Password hash exposure | Password hash is never returned. |

## Authorization Tests

| Scenario | Expected Result |
| --- | --- |
| Employee creates user | `403 Forbidden`. |
| Employee approves transfer | `403 Forbidden`. |
| Manager accesses another department without permission | `403 Forbidden`. |
| Auditor updates non-audit asset fields | `403 Forbidden`. |
| Admin accesses system audit logs | `200 OK`. |

## API Tests

| Endpoint Area | Coverage |
| --- | --- |
| Auth | Login, current user, invalid token. |
| Users | Create, update, duplicate email, role validation. |
| Departments | Create, update, duplicate code. |
| Assets | Create, filter, detail, update, retire. |
| Allocations | Allocate, duplicate active allocation prevention. |
| Transfers | Request, approve, reject, cancel. |
| Bookings | Create, approve, conflict rejection, cancel. |
| Maintenance | Create, update, close with resolution. |
| Audit | Create verification record, list discrepancies. |
| Reports | Summary and filtered report data. |
| Notifications | List, mark read, unread count. |

## Database Tests

| Test | Expected Result |
| --- | --- |
| Unique user email | Duplicate email rejected. |
| Unique asset code | Duplicate asset code rejected. |
| Foreign keys | Invalid related IDs rejected. |
| Booking overlap index/query | Conflicting approved booking rejected. |
| Active allocation rule | Only one active allocation for non-shared asset. |
| Audit log insert | Sensitive lifecycle action writes log. |
| Migration from clean database | Schema applies successfully. |
| Seed data | Seed script creates valid demo records. |

## Business Rule Tests

| Rule | Expected Result |
| --- | --- |
| Booking end before start | Validation error. |
| Transfer to same destination | Validation error. |
| Approving already rejected transfer | Conflict error. |
| Closing maintenance without resolution | Validation error. |
| Retiring actively allocated asset | Conflict unless explicit override exists. |
| Employee requesting unrelated asset transfer | Forbidden. |

## Deployment Smoke Tests

After deployment:

- [ ] Health endpoint returns success.
- [ ] Database connection is available.
- [ ] Login works with demo admin.
- [ ] Protected endpoint rejects missing token.
- [ ] Asset list endpoint returns data.
- [ ] Migration status is current.
- [ ] No real secrets are exposed in logs.

## Acceptance Criteria

- [ ] Mandatory APIs have success and failure coverage.
- [ ] Authorization failures are tested.
- [ ] Database constraints are tested.
- [ ] Transactional workflows are tested.
- [ ] Migration and seed workflow is documented and verified.
- [ ] Deployment smoke test checklist passes.

