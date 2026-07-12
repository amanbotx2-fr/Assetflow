# Database Naming Conventions

## Table Names

Use plural snake_case names.

| Good | Avoid |
| --- | --- |
| `users` | `User` |
| `maintenance_tickets` | `maintenanceTickets` |
| `audit_logs` | `AuditLog` |

## Column Names

Use snake_case names.

| Purpose | Name |
| --- | --- |
| Primary key | `id` |
| Foreign key | `asset_id` |
| Created timestamp | `created_at` |
| Updated timestamp | `updated_at` |
| Soft status | `status` |

## Foreign Keys

Use `<entity>_id`.

Examples:

- `user_id`
- `asset_id`
- `department_id`
- `category_id`
- `approved_by_id`

## Index Names

Use descriptive names when custom names are needed.

Examples:

- `idx_assets_status_department`
- `idx_bookings_asset_time_status`
- `idx_notifications_user_read`

## Enum Values

Use clear uppercase values.

Examples:

- `ACTIVE`
- `INACTIVE`
- `PENDING`
- `APPROVED`
- `REJECTED`
- `ALLOCATED`
- `AVAILABLE`

## Migration Names

Use action-based snake_case names.

Examples:

- `init_assetflow_schema`
- `add_transfer_decision_notes`
- `add_booking_conflict_indexes`

