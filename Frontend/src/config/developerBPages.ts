export type PageKey =
  | "assets"
  | "allocationTransfer"
  | "booking"
  | "maintenance"
  | "audit"
  | "reports"
  | "notifications";

export interface ShellPanel {
  title: string;
  description: string;
  placeholderItems: string[];
  span?: "standard" | "wide" | "tall";
}

export interface PageShellConfig {
  eyebrow: string;
  title: string;
  description: string;
  layoutIntent: string;
  summaryAreas: string[];
  panels: ShellPanel[];
}

export const developerBPages: Record<PageKey, PageShellConfig> = {
  assets: {
    eyebrow: "Asset Registry",
    title: "Assets",
    description: "Responsive shell for searchable asset inventory, registration, status review, and pagination.",
    layoutIntent: "List-first page with filter controls above a wide asset table region.",
    summaryAreas: ["Search and filters", "Asset table", "Register asset action", "Pagination"],
    panels: [
      {
        title: "Search and filters",
        description: "Reserved space for asset tag, category, department, status, serial number, QR code, and location filters.",
        placeholderItems: ["Keyword search", "Category selector", "Department selector", "Status selector"]
      },
      {
        title: "Asset table region",
        description: "Wide table shell for asset code, name, category, department, status, condition, allocation, and actions.",
        placeholderItems: ["Header row", "Asset row skeleton", "Status badge slots", "Action column"],
        span: "wide"
      },
      {
        title: "Registration container",
        description: "Placeholder area for the future register asset modal trigger and form mounting point.",
        placeholderItems: ["Primary action slot", "Required field summary", "QR support note"]
      },
      {
        title: "Pagination footer",
        description: "Reserved table footer for page size, total count, and next or previous controls.",
        placeholderItems: ["Result count", "Page control group", "Page size selector"]
      }
    ]
  },
  allocationTransfer: {
    eyebrow: "Asset Ownership",
    title: "Allocation & Transfer",
    description: "Responsive shell for allocation creation, transfer requests, conflict messaging, and allocation history.",
    layoutIntent: "Two-column workflow surface with selectors on one side and history on the other.",
    summaryAreas: ["Asset selector", "Employee selector", "Transfer form", "Allocation history"],
    panels: [
      {
        title: "Allocation setup",
        description: "Placeholder for asset, employee, department, and assignment reason selectors.",
        placeholderItems: ["Asset selector", "Employee selector", "Department selector", "Allocation notes"]
      },
      {
        title: "Conflict alert area",
        description: "Reserved area for availability conflicts, duplicate allocation warnings, and transfer approval constraints.",
        placeholderItems: ["Conflict state", "Resolution hint", "Validation summary"]
      },
      {
        title: "Transfer form container",
        description: "Layout space for target owner, target department, reason, and approval status.",
        placeholderItems: ["Destination selector", "Reason input", "Approval status", "Submit action slot"],
        span: "wide"
      },
      {
        title: "Allocation history",
        description: "Timeline-style region for current and previous ownership records.",
        placeholderItems: ["Current allocation", "Returned allocation", "Transferred allocation"],
        span: "tall"
      }
    ]
  },
  booking: {
    eyebrow: "Resource Scheduling",
    title: "Resource Booking",
    description: "Responsive shell for booking timeline, calendar view, availability, conflicts, and suggestions.",
    layoutIntent: "Calendar-forward page with availability and conflict panels beside the main schedule region.",
    summaryAreas: ["Timeline", "Calendar", "Availability", "Conflict detection"],
    panels: [
      {
        title: "Booking timeline",
        description: "Wide schedule region for chronological booking rows or a calendar grid.",
        placeholderItems: ["Today marker", "Requested booking", "Approved booking", "Completed booking"],
        span: "wide"
      },
      {
        title: "Availability panel",
        description: "Reserved space for available slots, occupied slots, conflicts, and next available slot.",
        placeholderItems: ["Available slot list", "Occupied slot list", "Next available slot"]
      },
      {
        title: "Booking form shell",
        description: "Placeholder for resource, date, time range, purpose, and request controls.",
        placeholderItems: ["Resource selector", "Date selector", "Time range", "Purpose field"]
      },
      {
        title: "Suggestion area",
        description: "Passive placeholder for future smart suggestions using availability data.",
        placeholderItems: ["Alternate time", "Related resource", "Conflict-free option"]
      }
    ]
  },
  maintenance: {
    eyebrow: "Service Workflow",
    title: "Maintenance",
    description: "Responsive shell for maintenance tickets, priority indicators, assignment, and lifecycle history.",
    layoutIntent: "Ticket list and detail-support layout with technician assignment space.",
    summaryAreas: ["Ticket list", "Status indicators", "Assign engineer", "History timeline"],
    panels: [
      {
        title: "Ticket list",
        description: "Wide list region for asset, issue, priority, status, reporter, technician, and timestamps.",
        placeholderItems: ["Ticket row", "Priority marker", "Status marker", "Technician column"],
        span: "wide"
      },
      {
        title: "Status and priority indicators",
        description: "Summary slots for requested, assigned, in progress, resolved, and critical work.",
        placeholderItems: ["Requested", "Assigned", "In progress", "Critical"]
      },
      {
        title: "Assign engineer shell",
        description: "Reserved layout for technician selection, assignment time, and workflow actions.",
        placeholderItems: ["Technician selector", "Assignment note", "Workflow action slot"]
      },
      {
        title: "History timeline",
        description: "Timeline region for create, approve, assign, start, resolve, and close events.",
        placeholderItems: ["Created", "Approved", "Assigned", "Resolved"],
        span: "tall"
      }
    ]
  },
  audit: {
    eyebrow: "Verification",
    title: "Audit",
    description: "Responsive shell for audit cycles, filters, logs, verification timeline, and export placement.",
    layoutIntent: "Audit list with supporting log and discrepancy regions.",
    summaryAreas: ["Audit logs", "Filters", "Timeline", "Export"],
    panels: [
      {
        title: "Audit cycle list",
        description: "Wide list region for audit title, department, status, verified assets, pending assets, and discrepancies.",
        placeholderItems: ["Audit row", "Completion count", "Discrepancy count", "Status slot"],
        span: "wide"
      },
      {
        title: "Filter area",
        description: "Reserved controls for department, status, result, asset, auditor, and date range filters.",
        placeholderItems: ["Department filter", "Result filter", "Date range", "Auditor selector"]
      },
      {
        title: "Audit log section",
        description: "Placeholder for system audit logs related to asset verification and lifecycle changes.",
        placeholderItems: ["Log timestamp", "Actor", "Entity", "Action"]
      },
      {
        title: "Export placement",
        description: "Reserved placement for export controls without implementing export behavior in Phase 1.",
        placeholderItems: ["CSV action slot", "JSON action slot", "Print slot"]
      }
    ]
  },
  reports: {
    eyebrow: "Analytics",
    title: "Reports",
    description: "Responsive shell for chart regions, statistics, filters, exports, and print placement.",
    layoutIntent: "Analytics grid with large chart regions and compact metric strips.",
    summaryAreas: ["Charts", "Statistics", "Filters", "Export and print"],
    panels: [
      {
        title: "Statistics strip",
        description: "Top-level metric placeholders for utilization, maintenance, bookings, audits, and idle assets.",
        placeholderItems: ["Utilization", "Maintenance trend", "Booking trend", "Audit completion"],
        span: "wide"
      },
      {
        title: "Chart grid",
        description: "Responsive chart slots for department utilization, maintenance trend, booking trend, and audit trend.",
        placeholderItems: ["Department chart", "Maintenance chart", "Booking chart", "Audit chart"],
        span: "wide"
      },
      {
        title: "Report filters",
        description: "Reserved controls for date range, department, status, priority, and report type.",
        placeholderItems: ["Date range", "Department", "Report type", "Status"]
      },
      {
        title: "Export and print",
        description: "Placeholder placement for CSV, JSON, future PDF, and browser print controls.",
        placeholderItems: ["CSV slot", "JSON slot", "PDF slot", "Print slot"]
      }
    ]
  },
  notifications: {
    eyebrow: "Notification Center",
    title: "Notifications",
    description: "Responsive shell for notification list, category filters, read state controls, and empty state placement.",
    layoutIntent: "Inbox-style page with filters and list content in a single focused column.",
    summaryAreas: ["Notification list", "Read toggles", "Category filters", "Empty state"],
    panels: [
      {
        title: "Notification list",
        description: "Wide list region for title, category, priority, read state, timestamp, and related entity.",
        placeholderItems: ["Unread item", "Read item", "Priority marker", "Timestamp"],
        span: "wide"
      },
      {
        title: "Read state controls",
        description: "Reserved placement for read, unread, and mark-all-read interactions.",
        placeholderItems: ["Read toggle", "Unread filter", "Mark all read slot"]
      },
      {
        title: "Category filters",
        description: "Placeholder chips for booking, allocation, transfer, maintenance, audit, system, approval, and asset.",
        placeholderItems: ["Booking", "Maintenance", "Audit", "System"]
      },
      {
        title: "Empty state container",
        description: "Dedicated region for a future empty notification state from shared components.",
        placeholderItems: ["Empty heading", "Empty helper text", "Reset filters action"]
      }
    ]
  }
};
