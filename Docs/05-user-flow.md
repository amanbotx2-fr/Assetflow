# Backend Workflow Diagrams

## Table of Contents

- [Authentication Workflow](#authentication-workflow)
- [Asset Lifecycle Workflow](#asset-lifecycle-workflow)
- [Transfer Workflow](#transfer-workflow)
- [Booking Workflow](#booking-workflow)
- [Maintenance Workflow](#maintenance-workflow)
- [Audit Workflow](#audit-workflow)

## Authentication Workflow

```mermaid
flowchart TD
    A[POST /auth/login] --> B[Validate Payload]
    B --> C[Find User by Email]
    C --> D{User Active?}
    D -->|No| E[Return 401]
    D -->|Yes| F[Compare Password with bcrypt]
    F --> G{Password Valid?}
    G -->|No| E
    G -->|Yes| H[Issue JWT]
    H --> I[Return Safe User Profile]
```

## Asset Lifecycle Workflow

```mermaid
flowchart TD
    A[Asset Created] --> B[Status: Available]
    B --> C{Lifecycle Action}
    C -->|Allocate| D[Create Allocation]
    D --> E[Status: Allocated]
    E --> F{Next Action}
    F -->|Transfer| G[Transfer Workflow]
    F -->|Maintenance| H[Maintenance Workflow]
    F -->|Audit| I[Audit Workflow]
    F -->|Return| J[Close Allocation]
    J --> B
    G --> E
    H --> E
    I --> E
    C -->|Retire| K[Status: Retired]
```

## Transfer Workflow

```mermaid
flowchart TD
    A[Create Transfer Request] --> B[Status: Pending]
    B --> C[Notify Approver Record]
    C --> D{Decision}
    D -->|Approve| E[Begin Transaction]
    E --> F[Close Previous Allocation if Needed]
    F --> G[Create or Update Allocation]
    G --> H[Set Transfer Approved or Completed]
    H --> I[Write Audit Log]
    D -->|Reject| J[Store Rejection Notes]
    J --> K[Write Audit Log]
    D -->|Cancel| L[Set Cancelled]
    L --> K
```

## Booking Workflow

```mermaid
flowchart TD
    A[Create Booking Request] --> B[Validate Time Range]
    B --> C{Asset Bookable?}
    C -->|No| D[Return 400]
    C -->|Yes| E[Check Approved Booking Conflicts]
    E --> F{Conflict Exists?}
    F -->|Yes| G[Return 409]
    F -->|No| H[Create Pending Booking]
    H --> I{Approval Decision}
    I -->|Approve| J[Re-check Conflicts]
    J --> K[Set Approved]
    I -->|Reject| L[Set Rejected]
    I -->|Cancel| M[Set Cancelled]
```

## Maintenance Workflow

```mermaid
flowchart TD
    A[Create Maintenance Ticket] --> B[Status: Open]
    B --> C[Assign Owner if Needed]
    C --> D[Status: Assigned]
    D --> E[Status: In Progress]
    E --> F{Resolved?}
    F -->|No| E
    F -->|Yes| G[Add Resolution Notes]
    G --> H[Status: Resolved]
    H --> I[Status: Closed]
    I --> J[Write Audit Log]
```

## Audit Workflow

```mermaid
flowchart TD
    A[Select Asset for Audit] --> B[Create Audit Record]
    B --> C{Verification Result}
    C -->|Verified| D[Store Verified Result]
    C -->|Missing| E[Store Missing Discrepancy]
    C -->|Damaged| F[Store Damaged Discrepancy]
    C -->|Misplaced| G[Store Misplaced Discrepancy]
    C -->|Needs Review| H[Store Review Notes]
    D --> I[Write Audit Log]
    E --> I
    F --> I
    G --> I
    H --> I
```

