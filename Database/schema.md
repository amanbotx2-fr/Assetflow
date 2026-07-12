# Database Schema Guide

## Purpose

This document explains the planned AssetFlow PostgreSQL schema. The implementation source of truth will be `Backend/prisma/schema.prisma`; this document explains intent, relationships, and standards.

## Schema Principles

- Normalize core records.
- Preserve lifecycle history.
- Use foreign keys for relationships.
- Use transactions for multi-table changes.
- Store timestamps in UTC.
- Prefer status-based deactivation over destructive deletion.

## Core Tables

| Table | Purpose |
| --- | --- |
| `users` | Accounts, roles, department membership, active state. |
| `departments` | Organization units and manager assignment. |
| `categories` | Asset type classification. |
| `assets` | Current asset identity, status, location, category, department. |
| `allocations` | Asset assignment history. |
| `transfers` | Transfer requests and decisions. |
| `bookings` | Shared asset reservations. |
| `maintenance_tickets` | Asset service and repair tickets. |
| `audit_records` | Asset verification outcomes. |
| `audit_logs` | Append-only system activity trail. |
| `notifications` | User-specific lifecycle alerts. |
| `reports` | Generated report metadata when needed. |
| `qr_codes` | QR identity values for assets. |

## Relationships

| Relationship | Type | Notes |
| --- | --- | --- |
| Department to users | One-to-many | Department membership. |
| Department to assets | One-to-many | Owning department. |
| Category to assets | One-to-many | Asset classification. |
| Asset to allocations | One-to-many | Assignment history. |
| Asset to transfers | One-to-many | Movement history. |
| Asset to bookings | One-to-many | Reservation history. |
| Asset to maintenance tickets | One-to-many | Service history. |
| Asset to audit records | One-to-many | Verification history. |
| Asset to QR code | One-to-one | Active asset identity. |
| User to notifications | One-to-many | Notification recipient. |

## Constraint Standards

| Constraint | Standard |
| --- | --- |
| Primary keys | Use stable generated IDs. |
| Unique user email | Required for login. |
| Unique asset code | Required for asset lookup. |
| Unique department code | Required for stable references. |
| Foreign keys | Required for related records. |
| Required timestamps | Use `created_at` and `updated_at` where applicable. |

## Index Standards

Add indexes for:

- Login lookup: `users.email`.
- Asset filters: `assets.status`, `assets.department_id`, `assets.category_id`.
- Current allocation lookup: `allocations.asset_id`, `allocations.status`.
- Booking conflict checks: `bookings.asset_id`, `bookings.start_time`, `bookings.end_time`, `bookings.status`.
- Maintenance queues: `maintenance_tickets.status`, `maintenance_tickets.priority`.
- Audit timelines: `audit_logs.entity_type`, `audit_logs.entity_id`, `audit_logs.created_at`.
- Notifications: `notifications.user_id`, `notifications.is_read`.

## Transaction Standards

Use transactions for:

- Allocation creation and asset status update.
- Transfer approval and allocation update.
- Booking approval with conflict re-check.
- Maintenance closure and asset status update.
- Asset retirement and related lifecycle cleanup.

