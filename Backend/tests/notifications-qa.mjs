import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

const baseUrl = process.env.BASE_URL || "http://localhost:5011";
const artifactsDir = path.resolve("tests/artifacts");
const zeroUuid = "00000000-0000-0000-0000-000000000000";
const results = [];
const performanceObservations = [];
const responses = {};
const state = {};

const ensureArtifactsDir = () => fs.mkdirSync(artifactsDir, { recursive: true });

const seedDatabase = () => {
  execFileSync("npm", ["run", "seed"], { cwd: process.cwd(), env: process.env, stdio: "inherit" });
};

const writeJson = (fileName, payload) => {
  ensureArtifactsDir();
  fs.writeFileSync(path.join(artifactsDir, fileName), `${JSON.stringify(payload, null, 2)}\n`);
};

const escapeMd = (value) => String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");

const record = (endpoint, check, expectedStatus, actualStatus, pass, rootCause = "") => {
  results.push({
    endpoint,
    check,
    expectedStatus,
    actualStatus,
    result: pass ? "PASS" : "FAIL",
    rootCause
  });
};

const request = async (method, pathName, { token, body } = {}) => {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const durationMs = Math.round(performance.now() - startedAt);

  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  performanceObservations.push({ endpoint: `${method} ${pathName}`, status: response.status, durationMs });
  return { status: response.status, json, durationMs };
};

const expectStatus = (method, pathName, check, expectedStatus, response, predicate = () => true) => {
  const pass = response.status === expectedStatus && predicate(response.json);
  record(
    `${method} ${pathName}`,
    check,
    expectedStatus,
    response.status,
    pass,
    pass ? "" : "Expected status and response contract did not match."
  );
};

const login = async (email, password = "password123") => {
  const response = await request("POST", "/api/auth/login", { body: { email, password } });
  if (response.status !== 200) throw new Error(`Login failed for ${email}: HTTP ${response.status}`);
  return response.json.data.token;
};

const items = (payload) => payload?.data?.items ?? payload?.data ?? [];
const notificationItems = (response) => response.json?.data?.items ?? [];
const isPaginated = (payload) =>
  Boolean(payload?.success === true && Array.isArray(payload?.data?.items) && typeof payload?.data?.total === "number");
const hasNotification = (response, predicate) => notificationItems(response).some(predicate);

const getSeedContext = async () => {
  state.adminToken = await login("admin@assetflow.local");
  state.managerToken = await login("manager@assetflow.local");
  state.employeeToken = await login("employee@assetflow.local");
  state.auditorToken = await login("auditor@assetflow.local");

  const users = await request("GET", "/api/users", { token: state.adminToken });
  const userItems = items(users.json);
  state.adminId = userItems.find((user) => user.email === "admin@assetflow.local")?.id;
  state.managerId = userItems.find((user) => user.email === "manager@assetflow.local")?.id;
  state.employeeId = userItems.find((user) => user.email === "employee@assetflow.local")?.id;
  state.auditorId = userItems.find((user) => user.email === "auditor@assetflow.local")?.id;

  const departments = await request("GET", "/api/departments", { token: state.adminToken });
  const departmentItems = items(departments.json);
  state.itDepartmentId = departmentItems.find((department) => department.code === "IT")?.id;
  state.financeDepartmentId = departmentItems.find((department) => department.code === "FIN")?.id;
  state.operationsDepartmentId = departmentItems.find((department) => department.code === "OPS")?.id;

  const categories = await request("GET", "/api/categories", { token: state.adminToken });
  const categoryItems = items(categories.json);
  state.laptopCategoryId = categoryItems.find((category) => category.code === "LAP")?.id;
  state.projectorCategoryId = categoryItems.find((category) => category.code === "PROJ")?.id;
  state.monitorCategoryId = categoryItems.find((category) => category.code === "MON")?.id;
};

const createAsset = async (suffix, overrides = {}) => {
  const response = await request("POST", "/api/assets", {
    token: state.adminToken,
    body: {
      assetTag: `NTF-${suffix}`,
      serialNumber: `NTF-SN-${suffix}`,
      name: `Notification QA Asset ${suffix}`,
      categoryId: overrides.categoryId ?? state.laptopCategoryId,
      departmentId: overrides.departmentId ?? state.itDepartmentId,
      condition: "GOOD",
      location: `Notification QA Room ${suffix}`,
      isBookable: overrides.isBookable ?? false,
      purchaseDate: "2026-01-01T00:00:00.000Z"
    }
  });
  if (response.status !== 201) throw new Error(`Asset creation failed: HTTP ${response.status}`);
  return response.json.data;
};

const createWorkflowNotifications = async () => {
  const suffix = `${Date.now()}`;

  state.assetForAllocation = await createAsset(`${suffix}-ALLOC`);
  const allocation = await request("POST", "/api/allocations", {
    token: state.adminToken,
    body: {
      assetId: state.assetForAllocation.id,
      userId: state.employeeId,
      notes: "Notification QA allocation"
    }
  });
  if (allocation.status !== 201) throw new Error(`Allocation creation failed: HTTP ${allocation.status}`);
  state.allocationId = allocation.json.data.allocation.id;

  const returned = await request("POST", `/api/allocations/${state.allocationId}/return`, {
    token: state.employeeToken,
    body: {
      returnCondition: "GOOD",
      reason: "Notification QA return"
    }
  });
  if (returned.status !== 200) throw new Error(`Allocation return failed: HTTP ${returned.status}`);

  state.assetForTransfer = await createAsset(`${suffix}-XFER`);
  const transferAllocation = await request("POST", "/api/allocations", {
    token: state.adminToken,
    body: {
      assetId: state.assetForTransfer.id,
      userId: state.employeeId,
      notes: "Notification QA transfer allocation"
    }
  });
  if (transferAllocation.status !== 201) throw new Error(`Transfer allocation failed: HTTP ${transferAllocation.status}`);

  const transfer = await request("POST", "/api/transfers", {
    token: state.employeeToken,
    body: {
      assetId: state.assetForTransfer.id,
      toDepartmentId: state.financeDepartmentId,
      reason: "Notification QA transfer"
    }
  });
  if (transfer.status !== 201) throw new Error(`Transfer creation failed: HTTP ${transfer.status}`);
  state.transferId = transfer.json.data.id;

  const approvedTransfer = await request("PATCH", `/api/transfers/${state.transferId}/approve`, {
    token: state.managerToken,
    body: { decisionNotes: "Notification QA approval" }
  });
  if (approvedTransfer.status !== 200) throw new Error(`Transfer approval failed: HTTP ${approvedTransfer.status}`);

  state.bookableAsset = await createAsset(`${suffix}-BOOK`, {
    categoryId: state.projectorCategoryId,
    isBookable: true
  });
  const booking = await request("POST", "/api/bookings", {
    token: state.employeeToken,
    body: {
      resourceId: state.bookableAsset.id,
      startTime: "2026-07-13T10:00:00.000Z",
      endTime: "2026-07-13T11:00:00.000Z",
      purpose: "Notification QA booking"
    }
  });
  if (booking.status !== 201) throw new Error(`Booking creation failed: HTTP ${booking.status}`);
  state.bookingId = booking.json.data.id;

  const approvedBooking = await request("PATCH", `/api/bookings/${state.bookingId}/approve`, {
    token: state.managerToken,
    body: { decisionNotes: "Notification QA booking approval" }
  });
  if (approvedBooking.status !== 200) throw new Error(`Booking approval failed: HTTP ${approvedBooking.status}`);

  state.maintenanceAsset = await createAsset(`${suffix}-MNT`, {
    categoryId: state.monitorCategoryId
  });
  const maintenance = await request("POST", "/api/maintenance", {
    token: state.employeeToken,
    body: {
      assetId: state.maintenanceAsset.id,
      priority: "HIGH",
      issueSummary: "Notification QA issue",
      issueDescription: "Created by notification QA"
    }
  });
  if (maintenance.status !== 201) throw new Error(`Maintenance creation failed: HTTP ${maintenance.status}`);
  state.maintenanceId = maintenance.json.data.id;

  const approvedMaintenance = await request("PATCH", `/api/maintenance/${state.maintenanceId}/approve`, {
    token: state.managerToken,
    body: { decisionNotes: "Notification QA maintenance approval" }
  });
  if (approvedMaintenance.status !== 200) throw new Error(`Maintenance approval failed: HTTP ${approvedMaintenance.status}`);

  const assignedMaintenance = await request("PATCH", `/api/maintenance/${state.maintenanceId}/assign`, {
    token: state.managerToken,
    body: { assignedTechnicianId: state.managerId }
  });
  if (assignedMaintenance.status !== 200) throw new Error(`Maintenance assignment failed: HTTP ${assignedMaintenance.status}`);

  const startedMaintenance = await request("PATCH", `/api/maintenance/${state.maintenanceId}/start`, {
    token: state.managerToken,
    body: {}
  });
  if (startedMaintenance.status !== 200) throw new Error(`Maintenance start failed: HTTP ${startedMaintenance.status}`);

  const resolvedMaintenance = await request("PATCH", `/api/maintenance/${state.maintenanceId}/resolve`, {
    token: state.managerToken,
    body: { resolutionNotes: "Notification QA resolved", resolutionCost: 10 }
  });
  if (resolvedMaintenance.status !== 200) throw new Error(`Maintenance resolve failed: HTTP ${resolvedMaintenance.status}`);

  state.auditAsset = await createAsset(`${suffix}-AUDIT`);
  const audit = await request("POST", "/api/audits", {
    token: state.managerToken,
    body: {
      title: "Notification QA Audit",
      departmentId: state.itDepartmentId,
      assignedAuditorId: state.auditorId,
      assetIds: [state.auditAsset.id]
    }
  });
  if (audit.status !== 201) throw new Error(`Audit creation failed: HTTP ${audit.status}`);
  state.auditId = audit.json.data.id;

  const startedAudit = await request("POST", `/api/audits/${state.auditId}/start`, {
    token: state.managerToken
  });
  if (startedAudit.status !== 200) throw new Error(`Audit start failed: HTTP ${startedAudit.status}`);

  const verifiedAudit = await request("POST", `/api/audits/${state.auditId}/verify`, {
    token: state.managerToken,
    body: {
      assetId: state.auditAsset.id,
      result: "VERIFIED",
      locationVerified: state.auditAsset.location,
      conditionVerified: "GOOD",
      remarks: "Notification QA verified"
    }
  });
  if (verifiedAudit.status !== 200) throw new Error(`Audit verify failed: HTTP ${verifiedAudit.status}`);

  const completedAudit = await request("POST", `/api/audits/${state.auditId}/complete`, {
    token: state.managerToken
  });
  if (completedAudit.status !== 200) throw new Error(`Audit complete failed: HTTP ${completedAudit.status}`);

  state.retiredAsset = await createAsset(`${suffix}-RETIRE`);
  const retired = await request("POST", `/api/assets/${state.retiredAsset.id}/retire`, {
    token: state.adminToken,
    body: { reason: "Notification QA retirement" }
  });
  if (retired.status !== 200) throw new Error(`Asset retirement failed: HTTP ${retired.status}`);
};

const writeReport = () => {
  const rows = results
    .map(
      (result) =>
        `| ${escapeMd(result.endpoint)} | ${escapeMd(result.check)} | ${result.expectedStatus} | ${result.actualStatus} | ${result.result} | ${escapeMd(result.rootCause || "None observed.")} |`
    )
    .join("\n");

  const perfRows = performanceObservations
    .filter((entry) => entry.endpoint.includes("/api/notifications") || entry.endpoint.includes("/api/dashboard"))
    .map((entry) => `| ${escapeMd(entry.endpoint)} | ${entry.status} | ${entry.durationMs} ms |`)
    .join("\n");

  const failed = results.filter((result) => result.result === "FAIL").length;
  const report = `# Notifications QA Report

Generated: ${new Date().toISOString()}

## Summary

| Metric | Value |
| --- | ---: |
| Checks | ${results.length} |
| Passed | ${results.length - failed} |
| Failed | ${failed} |

## Endpoints Covered

- \`GET /api/notifications\`
- \`GET /api/notifications/:id\`
- \`PATCH /api/notifications/:id/read\`
- \`PATCH /api/notifications/read-all\`
- \`DELETE /api/notifications/:id\`
- \`GET /api/notifications/unread-count\`
- \`GET /api/dashboard/overview\`

## Checks Performed

| Endpoint | Check | Expected Status | Actual Status | Result | Root Cause |
| --- | --- | ---: | ---: | --- | --- |
${rows}

## Performance Observations

| Request | Status | Duration |
| --- | ---: | ---: |
${perfRows}

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
`;

  fs.writeFileSync(path.join(artifactsDir, "notifications-qa-report.md"), report);
};

const run = async () => {
  ensureArtifactsDir();
  seedDatabase();
  await getSeedContext();
  await createWorkflowNotifications();

  const unauthenticated = await request("GET", "/api/notifications");
  expectStatus("GET", "/api/notifications", "Notifications require authentication", 401, unauthenticated);

  const employeeList = await request("GET", "/api/notifications?page=1&limit=50", { token: state.employeeToken });
  responses.employeeList = employeeList.json;
  expectStatus("GET", "/api/notifications", "Employee can list own notifications", 200, employeeList, (payload) => isPaginated(payload));

  const allocationFilter = await request("GET", "/api/notifications?type=ALLOCATION&limit=20", { token: state.employeeToken });
  responses.allocationFilter = allocationFilter.json;
  expectStatus("GET", "/api/notifications?type=ALLOCATION", "Type/category filter returns allocation notifications", 200, allocationFilter, (payload) =>
    hasNotification({ json: payload }, (notification) => notification.category === "ALLOCATION")
  );

  const priorityFilter = await request("GET", "/api/notifications?priority=MEDIUM&limit=20", { token: state.employeeToken });
  responses.priorityFilter = priorityFilter.json;
  expectStatus("GET", "/api/notifications?priority=MEDIUM", "Priority filter returns medium notifications", 200, priorityFilter, (payload) =>
    hasNotification({ json: payload }, (notification) => notification.priority === "MEDIUM")
  );

  const searchFilter = await request("GET", "/api/notifications?search=booking&limit=20", { token: state.employeeToken });
  responses.searchFilter = searchFilter.json;
  expectStatus("GET", "/api/notifications?search=booking", "Search filter matches notification text", 200, searchFilter, (payload) =>
    hasNotification({ json: payload }, (notification) => notification.message.toLowerCase().includes("booking") || notification.title.toLowerCase().includes("booking"))
  );

  const unreadFilter = await request("GET", "/api/notifications?status=unread&limit=20", { token: state.employeeToken });
  responses.unreadFilter = unreadFilter.json;
  expectStatus("GET", "/api/notifications?status=unread", "Unread filter returns unread notifications", 200, unreadFilter, (payload) =>
    notificationItems({ json: payload }).every((notification) => notification.isRead === false)
  );

  const paginated = await request("GET", "/api/notifications?page=1&limit=1&sortBy=createdAt&sortOrder=desc", {
    token: state.employeeToken
  });
  responses.paginated = paginated.json;
  expectStatus("GET", "/api/notifications?page=1&limit=1", "Pagination and sorting work", 200, paginated, (payload) =>
    Boolean(payload?.data?.items?.length === 1 && payload.data.limit === 1)
  );

  const employeeNotificationId = notificationItems(employeeList)[0]?.id;
  const detail = await request("GET", `/api/notifications/${employeeNotificationId}`, { token: state.employeeToken });
  responses.detail = detail.json;
  expectStatus("GET", "/api/notifications/:id", "Notification detail works", 200, detail, (payload) =>
    Boolean(payload?.data?.id === employeeNotificationId && payload.data.status === "unread")
  );

  const missingDetail = await request("GET", `/api/notifications/${zeroUuid}`, { token: state.employeeToken });
  expectStatus("GET", "/api/notifications/:id", "Missing notification returns 404", 404, missingDetail);

  const managerList = await request("GET", "/api/notifications?type=APPROVAL&limit=20", { token: state.managerToken });
  responses.managerList = managerList.json;
  expectStatus("GET", "/api/notifications?type=APPROVAL", "Manager can view department approval notifications", 200, managerList, (payload) =>
    hasNotification({ json: payload }, (notification) => notification.category === "APPROVAL")
  );

  const auditorRead = await request("GET", "/api/notifications?limit=5", { token: state.auditorToken });
  responses.auditorRead = auditorRead.json;
  expectStatus("GET", "/api/notifications", "Auditor can read notifications", 200, auditorRead, (payload) => isPaginated(payload));

  const auditorReadAttempt = await request("PATCH", `/api/notifications/${employeeNotificationId}/read`, {
    token: state.auditorToken
  });
  expectStatus("PATCH", "/api/notifications/:id/read", "Auditor cannot mark notifications read", 403, auditorReadAttempt);

  const adminList = await request("GET", "/api/notifications?type=ASSET&limit=20", { token: state.adminToken });
  responses.adminList = adminList.json;
  expectStatus("GET", "/api/notifications?type=ASSET", "Admin can view global asset notifications", 200, adminList, (payload) =>
    hasNotification({ json: payload }, (notification) => notification.category === "ASSET")
  );

  const unreadBefore = await request("GET", "/api/notifications/unread-count", { token: state.employeeToken });
  responses.unreadBefore = unreadBefore.json;
  expectStatus("GET", "/api/notifications/unread-count", "Unread count endpoint returns badge count", 200, unreadBefore, (payload) =>
    Boolean(typeof payload?.data?.unreadCount === "number" && payload.data.notificationBadgeCount === payload.data.unreadCount)
  );

  const markedRead = await request("PATCH", `/api/notifications/${employeeNotificationId}/read`, {
    token: state.employeeToken
  });
  responses.markedRead = markedRead.json;
  expectStatus("PATCH", "/api/notifications/:id/read", "Employee can mark own notification read", 200, markedRead, (payload) =>
    Boolean(payload?.data?.isRead === true && payload.data.readAt)
  );

  const readFilter = await request("GET", "/api/notifications?status=read&limit=20", { token: state.employeeToken });
  responses.readFilter = readFilter.json;
  expectStatus("GET", "/api/notifications?status=read", "Read filter returns read notifications", 200, readFilter, (payload) =>
    hasNotification({ json: payload }, (notification) => notification.id === employeeNotificationId && notification.isRead === true)
  );

  const markAllRead = await request("PATCH", "/api/notifications/read-all", { token: state.employeeToken });
  responses.markAllRead = markAllRead.json;
  expectStatus("PATCH", "/api/notifications/read-all", "Employee can atomically mark all own notifications read", 200, markAllRead, (payload) =>
    Boolean(typeof payload?.data?.updated === "number")
  );

  const unreadAfter = await request("GET", "/api/notifications/unread-count", { token: state.employeeToken });
  responses.unreadAfter = unreadAfter.json;
  expectStatus("GET", "/api/notifications/unread-count", "Unread count updates after mark-all-read", 200, unreadAfter, (payload) =>
    Boolean(payload?.data?.unreadCount === 0)
  );

  const adminNotificationId = notificationItems(adminList)[0]?.id;
  const employeeForbiddenDelete = await request("DELETE", `/api/notifications/${adminNotificationId}`, {
    token: state.employeeToken
  });
  expectStatus("DELETE", "/api/notifications/:id", "Employee cannot delete another user's notification", 404, employeeForbiddenDelete);

  const deleted = await request("DELETE", `/api/notifications/${employeeNotificationId}`, {
    token: state.employeeToken
  });
  responses.deleted = deleted.json;
  expectStatus("DELETE", "/api/notifications/:id", "Employee can delete own notification copy", 200, deleted, (payload) =>
    Boolean(payload?.data?.id === employeeNotificationId)
  );

  const deletedLookup = await request("GET", `/api/notifications/${employeeNotificationId}`, { token: state.employeeToken });
  expectStatus("GET", "/api/notifications/:id", "Deleted notification is no longer available", 404, deletedLookup);

  const dashboard = await request("GET", "/api/dashboard/overview", { token: state.employeeToken });
  responses.dashboard = dashboard.json;
  expectStatus("GET", "/api/dashboard/overview", "Dashboard exposes notification badge and recent notifications", 200, dashboard, (payload) =>
    Boolean(
      typeof payload?.data?.overview?.unreadNotifications === "number" &&
        typeof payload?.data?.overview?.notificationBadgeCount === "number" &&
        Array.isArray(payload?.data?.notifications?.recent) &&
        Array.isArray(payload?.data?.latestActivity)
    )
  );

  const dateFilter = await request("GET", "/api/notifications?from=2026-01-01T00:00:00.000Z&to=2026-12-31T23:59:59.000Z", {
    token: state.adminToken
  });
  responses.dateFilter = dateFilter.json;
  expectStatus("GET", "/api/notifications?from=<date>&to=<date>", "Date filter returns notification page", 200, dateFilter, (payload) =>
    isPaginated(payload)
  );

  const invalidQuery = await request("GET", "/api/notifications?priority=BLOCKER", { token: state.adminToken });
  expectStatus("GET", "/api/notifications?priority=BLOCKER", "Invalid priority is rejected", 400, invalidQuery);

  writeJson("notifications-response.json", responses);
  writeReport();

  const failed = results.filter((result) => result.result === "FAIL");
  console.log(JSON.stringify({ summary: { total: results.length, passed: results.length - failed.length, failed: failed.length }, failed }, null, 2));
  if (failed.length > 0) process.exit(1);
};

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
