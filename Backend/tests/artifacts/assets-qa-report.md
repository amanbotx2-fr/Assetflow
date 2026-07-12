# Assets QA Report

Generated: 2026-07-12T08:27:44.297Z

## Summary

| Metric | Value |
| --- | ---: |
| Checks | 49 |
| Passed | 49 |
| Failed | 0 |

## Endpoints Covered

- `GET /api/assets`
- `GET /api/assets/lookup`
- `GET /api/assets/:id`
- `POST /api/assets`
- `PATCH /api/assets/:id`
- `DELETE /api/assets/:id`
- `GET /api/assets/:id/qr`

## Checks Performed

| Endpoint | Check | Expected Status | Actual Status | Result | Root Cause |
| --- | --- | ---: | ---: | --- | --- |
| GET /api/assets | Asset list requires authentication | 401 | 401 | PASS | None observed. |
| GET /api/assets | Admin can list assets with useful relations | 200 | 200 | PASS | None observed. |
| GET /api/assets?search=LAP | Search filter matches asset name or tag | 200 | 200 | PASS | None observed. |
| GET /api/assets?page=1&limit=2&sortBy=name&sortOrder=asc | Pagination and sorting work | 200 | 200 | PASS | None observed. |
| GET /api/assets?categoryId=:id | Category filter works | 200 | 200 | PASS | None observed. |
| GET /api/assets?departmentId=:id | Department filter works | 200 | 200 | PASS | None observed. |
| GET /api/assets?status=AVAILABLE | Status filter validates and works | 200 | 200 | PASS | None observed. |
| GET /api/assets?serialNumber=SN-LAP-001 | Serial number filter works | 200 | 200 | PASS | None observed. |
| GET /api/assets?assetTag=LAP-001 | Asset tag filter works | 200 | 200 | PASS | None observed. |
| GET /api/assets?location=Store | Location filter works | 200 | 200 | PASS | None observed. |
| GET /api/assets?status=NOT_REAL | Invalid status is rejected | 400 | 400 | PASS | None observed. |
| GET /api/assets | Manager can list department-scoped assets | 200 | 200 | PASS | None observed. |
| GET /api/assets?departmentId=:other | Manager cannot filter another department | 403 | 403 | PASS | None observed. |
| GET /api/assets | Employee has read-only asset list access | 200 | 200 | PASS | None observed. |
| GET /api/assets | Auditor has read-only asset list access | 200 | 200 | PASS | None observed. |
| POST /api/assets | Admin can register asset using assetTag | 201 | 201 | PASS | None observed. |
| POST /api/assets | Duplicate asset tag is rejected | 409 | 409 | PASS | None observed. |
| POST /api/assets | Duplicate serial number is rejected | 409 | 409 | PASS | None observed. |
| POST /api/assets | Missing required asset tag is rejected | 400 | 400 | PASS | None observed. |
| POST /api/assets | Invalid category is rejected | 404 | 404 | PASS | None observed. |
| POST /api/assets | Invalid department is rejected | 404 | 404 | PASS | None observed. |
| POST /api/assets | Employee cannot create asset | 403 | 403 | PASS | None observed. |
| POST /api/assets | Inactive category is rejected | 400 | 400 | PASS | None observed. |
| POST /api/assets | Inactive department is rejected | 400 | 400 | PASS | None observed. |
| POST /api/assets | Manager can create asset in assigned department | 201 | 201 | PASS | None observed. |
| POST /api/assets | Manager cannot create asset in another department | 403 | 403 | PASS | None observed. |
| GET /api/assets/:id | Admin can fetch asset detail | 200 | 200 | PASS | None observed. |
| GET /api/assets/:id | Missing asset returns not found | 404 | 404 | PASS | None observed. |
| GET /api/assets/:id | Invalid asset UUID is rejected | 400 | 400 | PASS | None observed. |
| GET /api/assets/:id | Manager cannot fetch another department asset | 403 | 403 | PASS | None observed. |
| PATCH /api/assets/:id | Admin can update asset metadata and identifiers | 200 | 200 | PASS | None observed. |
| PATCH /api/assets/:id | Duplicate serial update is rejected | 409 | 409 | PASS | None observed. |
| PATCH /api/assets/:id | Invalid status update is rejected | 400 | 400 | PASS | None observed. |
| PATCH /api/assets/:id | Missing asset update returns not found | 404 | 404 | PASS | None observed. |
| PATCH /api/assets/:id | Manager cannot update another department asset | 403 | 403 | PASS | None observed. |
| PATCH /api/assets/:id | Auditor cannot update asset | 403 | 403 | PASS | None observed. |
| GET /api/assets/lookup | Lookup requires a search value | 400 | 400 | PASS | None observed. |
| GET /api/assets/lookup?assetTag=:tag | Lookup by asset tag works | 200 | 200 | PASS | None observed. |
| GET /api/assets/lookup?serialNumber=:serial | Lookup by serial number works | 200 | 200 | PASS | None observed. |
| GET /api/assets/lookup?qrCode=:qr | Lookup by generated QR code works | 200 | 200 | PASS | None observed. |
| GET /api/assets/lookup?q=:query | Lookup by general query works | 200 | 200 | PASS | None observed. |
| GET /api/assets/lookup?q=:missing | Lookup missing asset returns not found | 404 | 404 | PASS | None observed. |
| GET /api/assets?qrCode=:qr | QR code list filter works | 200 | 200 | PASS | None observed. |
| GET /api/assets/:id/qr | Admin can generate QR payload | 200 | 200 | PASS | None observed. |
| GET /api/assets/:id/qr | Employee cannot generate QR payload | 403 | 403 | PASS | None observed. |
| DELETE /api/assets/:id | Admin can soft-delete asset | 200 | 200 | PASS | None observed. |
| DELETE /api/assets/:id | Deleting allocated asset is rejected | 409 | 409 | PASS | None observed. |
| DELETE /api/assets/:id | Employee cannot delete asset | 403 | 403 | PASS | None observed. |
| DELETE /api/assets/:id | Missing asset delete returns not found | 404 | 404 | PASS | None observed. |

## Performance Observations

| Request | Status | Duration |
| --- | ---: | ---: |
| GET /api/assets | 200 | 4 ms |
| GET /api/assets | 200 | 4 ms |
| POST /api/assets | 201 | 7 ms |
| POST /api/assets | 409 | 2 ms |
| POST /api/assets | 409 | 2 ms |
| POST /api/assets | 400 | 2 ms |
| POST /api/assets | 404 | 2 ms |
| POST /api/assets | 404 | 2 ms |
| POST /api/assets | 403 | 2 ms |
| POST /api/assets | 400 | 2 ms |
| POST /api/assets | 400 | 2 ms |
| POST /api/assets | 201 | 6 ms |
| POST /api/assets | 403 | 2 ms |
| GET /api/assets/5cac4b64-49a7-49b2-b7da-fcce554b79fd | 200 | 4 ms |
| GET /api/assets/00000000-0000-0000-0000-000000000000 | 404 | 3 ms |
| GET /api/assets/not-a-uuid | 400 | 2 ms |
| GET /api/assets/23dcd25b-c345-46a6-b08b-ec2fb60abca7 | 403 | 4 ms |
| PATCH /api/assets/5cac4b64-49a7-49b2-b7da-fcce554b79fd | 200 | 5 ms |
| PATCH /api/assets/5cac4b64-49a7-49b2-b7da-fcce554b79fd | 409 | 2 ms |
| PATCH /api/assets/5cac4b64-49a7-49b2-b7da-fcce554b79fd | 400 | 2 ms |
| PATCH /api/assets/00000000-0000-0000-0000-000000000000 | 404 | 2 ms |
| PATCH /api/assets/23dcd25b-c345-46a6-b08b-ec2fb60abca7 | 403 | 2 ms |
| PATCH /api/assets/5cac4b64-49a7-49b2-b7da-fcce554b79fd | 403 | 2 ms |
| GET /api/assets/lookup | 400 | 2 ms |
| GET /api/assets/lookup?assetTag=QA-ASSET-UPD-1783844863779 | 200 | 4 ms |
| GET /api/assets/lookup?serialNumber=QA-SN-UPD-1783844863779 | 200 | 3 ms |
| GET /api/assets/lookup?qrCode=assetflow%3Aasset%3A5cac4b64-49a7-49b2-b7da-fcce554b79fd%3AQA-ASSET-UPD-1783844863779 | 200 | 4 ms |
| GET /api/assets/lookup?q=QA%20Asset%20Laptop | 200 | 3 ms |
| GET /api/assets/lookup?q=DOES-NOT-EXIST | 404 | 3 ms |
| GET /api/assets?qrCode=assetflow%3Aasset%3A5cac4b64-49a7-49b2-b7da-fcce554b79fd%3AQA-ASSET-UPD-1783844863779 | 200 | 4 ms |
| GET /api/assets/5cac4b64-49a7-49b2-b7da-fcce554b79fd/qr | 200 | 7 ms |
| GET /api/assets/5cac4b64-49a7-49b2-b7da-fcce554b79fd/qr | 403 | 2 ms |
| DELETE /api/assets/5cac4b64-49a7-49b2-b7da-fcce554b79fd | 200 | 5 ms |
| DELETE /api/assets/e1805b6f-6668-4734-9798-e7fdb2cf0423 | 409 | 3 ms |
| DELETE /api/assets/e1805b6f-6668-4734-9798-e7fdb2cf0423 | 403 | 2 ms |
| DELETE /api/assets/00000000-0000-0000-0000-000000000000 | 404 | 2 ms |
| GET /api/assets?page=1&limit=5&sortBy=name&sortOrder=asc | 200 | 5 ms |
| GET /api/assets/ef151009-b8ec-49d0-a419-f17a9f5e7e67 | 200 | 4 ms |
| GET /api/assets/lookup?assetTag=MON-001 | 200 | 3 ms |
| GET /api/assets/ef151009-b8ec-49d0-a419-f17a9f5e7e67/qr | 200 | 6 ms |

Asset list, lookup, and detail endpoints use bounded pagination/selects with eager-loaded relations for category, department, current allocation, maintenance status, creator, and updater. Local response times were within demo expectations.

## Known Limitations

- Asset tag is stored internally as `assetCode`; responses also expose `assetTag` for frontend naming.
- QR code lookup uses the generated QR value `assetflow:asset:<assetId>:<assetCode>`; no separate QR table is stored.
- Asset delete is a soft delete implemented as `status=RETIRED`; historical records remain queryable.
- Employee read access follows the documented ownership policy: bookable assets and actively assigned assets.
