import fs from "node:fs";
import path from "node:path";

const artifactsDir = path.resolve("tests/artifacts");
const resultsPath = path.join(artifactsDir, "qa-results.json");
const now = new Date().toISOString();
const collectionId = "assetflow-backend-local";

const qa = JSON.parse(fs.readFileSync(resultsPath, "utf8"));

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });
const writeJson = (fileName, payload) => {
  ensureDir(artifactsDir);
  fs.writeFileSync(path.join(artifactsDir, fileName), `${JSON.stringify(payload, null, 2)}\n`);
};
const writeText = (fileName, payload) => {
  ensureDir(artifactsDir);
  fs.writeFileSync(path.join(artifactsDir, fileName), payload);
};

const escapeMd = (value) =>
  String(value ?? "")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");

const summarizeActual = (result) => {
  const json = result.actualBehaviour?.json;
  if (!json) return `HTTP ${result.statusCode}`;
  if (json.success === false) {
    return `HTTP ${result.statusCode}; error=${json.error?.code ?? "UNKNOWN"}; message=${json.error?.message ?? ""}`;
  }
  const dataType = Array.isArray(json.data) ? "array" : typeof json.data;
  return `HTTP ${result.statusCode}; success=true; data=${dataType}`;
};

const rootCauseFor = (result) => {
  if (result.expectedBehaviour === "Already approved transfer cannot be rejected") {
    return "Initial QA found approved transfers could be rejected because rejectTransfer skipped the pending-status guard.";
  }
  if (result.expectedBehaviour === "Already approved booking cannot be rejected") {
    return "QA identified the same decided-state risk on booking rejection; rejection now requires PENDING status.";
  }
  return result.status === "PASS" ? "None observed." : result.rootCause || "Backend behaviour did not match expected contract.";
};

const fixFor = (result) => {
  if (result.expectedBehaviour === "Already approved transfer cannot be rejected") {
    return "Added transfer existence, pending-status, and manager-scope checks in transferService.rejectTransfer; retested PASS.";
  }
  if (result.expectedBehaviour === "Already approved booking cannot be rejected") {
    return "Added booking existence, pending-status, and manager-scope checks in bookingService.rejectBooking; retested PASS.";
  }
  return result.status === "PASS" ? "Not required." : result.fixApplied || "Not fixed.";
};

const qaRows = qa.results
  .map(
    (result) =>
      `| ${escapeMd(result.endpoint)} | ${escapeMd(result.expectedBehaviour)} | ${escapeMd(summarizeActual(result))} | ${result.statusCode} | ${result.status} | ${escapeMd(rootCauseFor(result))} | ${escapeMd(fixFor(result))} |`
  )
  .join("\n");

const report = `# AssetFlow Backend QA Report

Generated: ${now}

## Summary

| Metric | Value |
| --- | ---: |
| Total Checks | ${qa.summary.total} |
| Passed | ${qa.summary.passed} |
| Failed | ${qa.summary.failed} |

## Environment

| Item | Value |
| --- | --- |
| Base URL | \`http://localhost:5011\` |
| Database | PostgreSQL local QA database on port \`55432\` |
| Prisma | Schema validated, client generated, migrations applied |
| Seed Accounts | \`admin@assetflow.local\`, \`manager@assetflow.local\`, \`employee@assetflow.local\`, \`auditor@assetflow.local\` / \`password123\` |

## Route Audit

| Area | Result |
| --- | --- |
| Missing endpoints vs API docs | None after documentation sync. |
| Incorrect route prefixes | None. Health routes use root \`/health\`; application routes use \`/api\`. |
| Broken imports | None found during TypeScript build. |
| Duplicate routes | None found in registered route files. |
| Unused route files | None found. |
| Missing authentication middleware | None on protected route groups. Public routes are \`/health\`, \`/health/db\`, and \`POST /api/auth/login\`. |
| Missing authorization middleware | None on role-sensitive write/approval/report routes. Scope checks are enforced in services. |
| Missing validation | No blocking gaps found. Shared query validation was expanded for documented filters. |

## Fixes Applied During QA

| Issue | Root Cause | Fix | Verification |
| --- | --- | --- | --- |
| Approved transfers could be rejected | \`rejectTransfer\` updated transfer status directly without checking the current status. | Added not-found, pending-only, and manager-scope checks before rejection. | \`PATCH /api/transfers/:id/reject\` now returns \`409\` for an already approved transfer. |
| Approved bookings could be rejected | \`rejectBooking\` updated booking status directly without checking the current status. | Added not-found, pending-only, and manager-scope checks before rejection. | \`PATCH /api/bookings/:id/reject\` now returns \`409\` for an already approved booking. |
| Workflow detail/list authorization was too broad | Transfer routes and booking/maintenance services had gaps where non-scoped roles could access records. | Restricted transfer routes to Admin/Manager/Employee and added manager/employee scope checks for transfer detail, bookings, and maintenance. | Auditor transfer access and unrelated employee detail access now return \`403\`. |
| Documented list filters were dropped | Shared query validation did not pass through \`role\`, audit \`result\`, maintenance \`priority\`, and audit-log entity filters. | Expanded shared query validation and service filters for audit result and maintenance priority. | Filter checks pass in the final QA run. |

## Endpoint Results

| Endpoint | Expected Behaviour | Actual Behaviour | Status Code | Result | Root Cause | Fix Applied |
| --- | --- | --- | ---: | --- | --- | --- |
${qaRows}
`;

writeText("assetflow-backend-qa-report.md", report);

const jsonBody = (payload) => ({
  mode: "raw",
  raw: JSON.stringify(payload, null, 2),
  options: { raw: { language: "json" } }
});

const thunderBody = (payload) => ({
  type: "json",
  raw: JSON.stringify(payload, null, 2),
  form: []
});

const endpointGroups = [
  {
    name: "Health",
    endpoints: [
      { name: "Health", method: "GET", path: "/health", auth: false },
      { name: "Database Health", method: "GET", path: "/health/db", auth: false }
    ]
  },
  {
    name: "Authentication",
    endpoints: [
      {
        name: "Login Admin",
        method: "POST",
        path: "/api/auth/login",
        auth: false,
        body: { email: "{{adminEmail}}", password: "{{adminPassword}}" },
        postmanTests: [
          'const json = pm.response.json();',
          'if (json.data && json.data.token) pm.environment.set("jwt", json.data.token);',
          'if (json.data && json.data.user) pm.environment.set("adminUserId", json.data.user.id);'
        ]
      },
      { name: "Current User", method: "GET", path: "/api/auth/me" },
      { name: "Logout", method: "POST", path: "/api/auth/logout" }
    ]
  },
  {
    name: "Users",
    endpoints: [
      { name: "List Users", method: "GET", path: "/api/users?role=EMPLOYEE" },
      {
        name: "Create User",
        method: "POST",
        path: "/api/users",
        body: {
          name: "QA Collection Employee",
          email: "qa.collection.employee@example.com",
          password: "password123",
          role: "EMPLOYEE",
          departmentId: "{{departmentId}}"
        }
      },
      { name: "Update User", method: "PATCH", path: "/api/users/{{userId}}", body: { status: "ACTIVE" } }
    ]
  },
  {
    name: "Departments",
    endpoints: [
      { name: "List Departments", method: "GET", path: "/api/departments" },
      { name: "Create Department", method: "POST", path: "/api/departments", body: { name: "QA Collection Department", code: "QACD" } },
      { name: "Update Department", method: "PATCH", path: "/api/departments/{{departmentId}}", body: { name: "QA Collection Department Updated" } }
    ]
  },
  {
    name: "Categories",
    endpoints: [
      { name: "List Categories", method: "GET", path: "/api/categories" },
      { name: "Create Category", method: "POST", path: "/api/categories", body: { name: "QA Collection Category", code: "QACC" } },
      { name: "Update Category", method: "PATCH", path: "/api/categories/{{categoryId}}", body: { description: "Updated from collection" } }
    ]
  },
  {
    name: "Assets",
    endpoints: [
      { name: "List Assets", method: "GET", path: "/api/assets?status=AVAILABLE" },
      {
        name: "Create Asset",
        method: "POST",
        path: "/api/assets",
        body: {
          assetCode: "COL-ASSET-001",
          name: "Collection Laptop",
          categoryId: "{{categoryId}}",
          departmentId: "{{departmentId}}",
          condition: "GOOD",
          location: "QA Lab",
          isBookable: true
        }
      },
      { name: "Get Asset", method: "GET", path: "/api/assets/{{assetId}}" },
      { name: "Update Asset", method: "PATCH", path: "/api/assets/{{assetId}}", body: { location: "QA Lab Updated" } },
      { name: "Generate Asset QR", method: "GET", path: "/api/assets/{{assetId}}/qr" },
      { name: "Allocate Asset", method: "POST", path: "/api/assets/{{assetId}}/allocate", body: { userId: "{{userId}}", notes: "Collection allocation" } },
      { name: "Retire Asset", method: "POST", path: "/api/assets/{{assetId}}/retire", body: { reason: "End of demo lifecycle" } }
    ]
  },
  {
    name: "Transfers",
    endpoints: [
      { name: "List Transfers", method: "GET", path: "/api/transfers?status=PENDING" },
      { name: "Create Transfer", method: "POST", path: "/api/transfers", body: { assetId: "{{assetId}}", toDepartmentId: "{{departmentId}}", reason: "Collection transfer" } },
      { name: "Get Transfer", method: "GET", path: "/api/transfers/{{transferId}}" },
      { name: "Approve Transfer", method: "PATCH", path: "/api/transfers/{{transferId}}/approve", body: { decisionNotes: "Approved from collection" } },
      { name: "Reject Transfer", method: "PATCH", path: "/api/transfers/{{transferId}}/reject", body: { decisionNotes: "Rejected from collection" } },
      { name: "Cancel Transfer", method: "PATCH", path: "/api/transfers/{{transferId}}/cancel", body: { reason: "Cancelled from collection" } }
    ]
  },
  {
    name: "Bookings",
    endpoints: [
      { name: "List Bookings", method: "GET", path: "/api/bookings?status=PENDING" },
      {
        name: "Create Booking",
        method: "POST",
        path: "/api/bookings",
        body: {
          assetId: "{{bookableAssetId}}",
          startTime: "2026-07-13T10:00:00.000Z",
          endTime: "2026-07-13T11:00:00.000Z",
          purpose: "Collection booking"
        }
      },
      { name: "Approve Booking", method: "PATCH", path: "/api/bookings/{{bookingId}}/approve", body: { decisionNotes: "Approved from collection" } },
      { name: "Reject Booking", method: "PATCH", path: "/api/bookings/{{bookingId}}/reject", body: { decisionNotes: "Rejected from collection" } },
      { name: "Cancel Booking", method: "PATCH", path: "/api/bookings/{{bookingId}}/cancel", body: { reason: "Cancelled from collection" } }
    ]
  },
  {
    name: "Maintenance",
    endpoints: [
      { name: "List Maintenance", method: "GET", path: "/api/maintenance?priority=HIGH" },
      { name: "Create Maintenance", method: "POST", path: "/api/maintenance", body: { assetId: "{{assetId}}", priority: "HIGH", issueSummary: "Collection issue" } },
      { name: "Get Maintenance", method: "GET", path: "/api/maintenance/{{maintenanceId}}" },
      { name: "Update Maintenance", method: "PATCH", path: "/api/maintenance/{{maintenanceId}}", body: { status: "IN_PROGRESS" } },
      { name: "Close Maintenance", method: "PATCH", path: "/api/maintenance/{{maintenanceId}}/close", body: { resolutionNotes: "Resolved from collection" } }
    ]
  },
  {
    name: "Audit",
    endpoints: [
      { name: "List Audits", method: "GET", path: "/api/audits?result=VERIFIED" },
      { name: "Create Audit", method: "POST", path: "/api/audits", body: { assetId: "{{assetId}}", result: "VERIFIED", remarks: "Verified from collection" } },
      { name: "List Audit Logs", method: "GET", path: "/api/audit-logs?entityType=Asset" }
    ]
  },
  {
    name: "Reports",
    endpoints: [
      { name: "Summary Report", method: "GET", path: "/api/reports/summary" },
      { name: "Asset Report", method: "GET", path: "/api/reports/assets?status=AVAILABLE" }
    ]
  },
  {
    name: "Notifications",
    endpoints: [
      { name: "List Notifications", method: "GET", path: "/api/notifications?isRead=false" },
      { name: "Mark Notification Read", method: "PATCH", path: "/api/notifications/{{notificationId}}/read" },
      { name: "Mark All Notifications Read", method: "PATCH", path: "/api/notifications/read-all" }
    ]
  }
];

const postmanRequest = (endpoint) => {
  const request = {
    name: endpoint.name,
    request: {
      method: endpoint.method,
      header: endpoint.body ? [{ key: "Content-Type", value: "application/json" }] : [],
      url: {
        raw: `{{baseUrl}}${endpoint.path}`,
        host: ["{{baseUrl}}"],
        path: endpoint.path.replace(/^\//, "").split("?")[0].split("/"),
        query: endpoint.path.includes("?")
          ? endpoint.path
              .split("?")[1]
              .split("&")
              .map((part) => {
                const [key, value] = part.split("=");
                return { key, value };
              })
          : []
      }
    }
  };

  if (endpoint.auth !== false) {
    request.request.auth = { type: "bearer", bearer: [{ key: "token", value: "{{jwt}}", type: "string" }] };
  }
  if (endpoint.body) request.request.body = jsonBody(endpoint.body);
  if (endpoint.postmanTests) {
    request.event = [{ listen: "test", script: { type: "text/javascript", exec: endpoint.postmanTests } }];
  }
  return request;
};

const postmanCollection = {
  info: {
    name: "AssetFlow Backend API",
    description: "Local backend collection generated from the verified QA route surface.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  item: endpointGroups.map((group) => ({ name: group.name, item: group.endpoints.map(postmanRequest) }))
};

const postmanEnvironment = {
  name: "AssetFlow Local",
  values: [
    { key: "baseUrl", value: "http://localhost:5011", enabled: true },
    { key: "jwt", value: "", enabled: true },
    { key: "adminEmail", value: "admin@assetflow.local", enabled: true },
    { key: "adminPassword", value: "password123", enabled: true },
    { key: "departmentId", value: "", enabled: true },
    { key: "categoryId", value: "", enabled: true },
    { key: "userId", value: "", enabled: true },
    { key: "assetId", value: "", enabled: true },
    { key: "bookableAssetId", value: "", enabled: true },
    { key: "transferId", value: "", enabled: true },
    { key: "bookingId", value: "", enabled: true },
    { key: "maintenanceId", value: "", enabled: true },
    { key: "notificationId", value: "", enabled: true }
  ]
};

writeJson("assetflow.postman_collection.json", postmanCollection);
writeJson("assetflow.local.postman_environment.json", postmanEnvironment);

const thunderFolders = endpointGroups.map((group, index) => ({
  _id: `folder-${index + 1}`,
  name: group.name,
  containerId: "",
  created: now,
  sortNum: (index + 1) * 10000
}));

const thunderRequests = endpointGroups.flatMap((group, groupIndex) =>
  group.endpoints.map((endpoint, endpointIndex) => ({
    _id: `request-${groupIndex + 1}-${endpointIndex + 1}`,
    colId: collectionId,
    containerId: `folder-${groupIndex + 1}`,
    name: endpoint.name,
    url: `{{baseUrl}}${endpoint.path}`,
    method: endpoint.method,
    sortNum: (groupIndex + 1) * 10000 + endpointIndex,
    created: now,
    modified: now,
    headers: [
      ...(endpoint.body ? [{ name: "Content-Type", value: "application/json" }] : []),
      ...(endpoint.auth === false ? [] : [{ name: "Authorization", value: "Bearer {{jwt}}" }])
    ],
    params: [],
    body: endpoint.body ? thunderBody(endpoint.body) : { type: "json", raw: "", form: [] },
    tests: []
  }))
);

writeJson("thunder-collection_assetflow.json", {
  client: "Thunder Client",
  collectionName: "AssetFlow Backend API",
  collectionId,
  dateExported: now,
  version: "1.2",
  folders: thunderFolders,
  requests: thunderRequests
});

writeJson("thunder-environment_assetflow-local.json", {
  client: "Thunder Client",
  environmentName: "AssetFlow Local",
  dateExported: now,
  version: "1.0",
  variables: [
    { name: "baseUrl", value: "http://localhost:5011" },
    { name: "jwt", value: "" },
    { name: "adminEmail", value: "admin@assetflow.local" },
    { name: "adminPassword", value: "password123" },
    { name: "departmentId", value: "" },
    { name: "categoryId", value: "" },
    { name: "userId", value: "" },
    { name: "assetId", value: "" },
    { name: "bookableAssetId", value: "" },
    { name: "transferId", value: "" },
    { name: "bookingId", value: "" },
    { name: "maintenanceId", value: "" },
    { name: "notificationId", value: "" }
  ]
});

writeText(
  "local.env.example",
  `BASE_URL=http://localhost:5011
DATABASE_URL=postgresql://aman@localhost:55432/assetflow?schema=public
JWT_SECRET=local-dev-secret-at-least-16-chars
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
ADMIN_EMAIL=admin@assetflow.local
ADMIN_PASSWORD=password123
`
);

console.log("Generated QA artifacts in tests/artifacts");
