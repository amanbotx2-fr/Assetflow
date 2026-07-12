import fs from "node:fs";
import path from "node:path";

const baseUrl = process.env.BASE_URL || "http://localhost:5011";

const results = [];
const state = {};

const record = (name, method, path, expected, actual, pass, rootCause = "", fixApplied = "") => {
  results.push({
    endpoint: `${method} ${path}`,
    expectedBehaviour: name,
    actualBehaviour: actual,
    statusCode: actual?.status ?? null,
    status: pass ? "PASS" : "FAIL",
    rootCause,
    fixApplied
  });
};

const request = async (method, path, { token, body, expected = [], name } = {}) => {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  const pass = expected.includes(response.status);
  record(name || `${method} ${path}`, method, path, expected.join(", "), { status: response.status, json }, pass);
  return { response, json, pass };
};

const pickFirst = (payload) => payload?.data?.items?.[0] ?? payload?.data?.[0];

const run = async () => {
  await request("GET", "/health", { expected: [200], name: "Health endpoint returns service status" });
  await request("GET", "/health/db", { expected: [200], name: "Database health endpoint confirms connection" });

  await request("GET", "/api/assets", { expected: [401], name: "Protected endpoint rejects missing JWT" });

  const adminLogin = await request("POST", "/api/auth/login", {
    expected: [200],
    name: "Admin can login",
    body: { email: "admin@assetflow.local", password: "password123" }
  });
  state.adminToken = adminLogin.json?.data?.token;

  const employeeLogin = await request("POST", "/api/auth/login", {
    expected: [200],
    name: "Employee can login",
    body: { email: "employee@assetflow.local", password: "password123" }
  });
  state.employeeToken = employeeLogin.json?.data?.token;

  const auditorLogin = await request("POST", "/api/auth/login", {
    expected: [200],
    name: "Auditor can login",
    body: { email: "auditor@assetflow.local", password: "password123" }
  });
  state.auditorToken = auditorLogin.json?.data?.token;

  await request("POST", "/api/auth/login", {
    expected: [400],
    name: "Login validation rejects invalid email",
    body: { email: "not-an-email", password: "password123" }
  });

  await request("POST", "/api/auth/login", {
    expected: [401],
    name: "Login rejects bad password",
    body: { email: "admin@assetflow.local", password: "wrong" }
  });

  await request("GET", "/api/auth/me", {
    token: state.adminToken,
    expected: [200],
    name: "Authenticated user profile resolves from JWT"
  });

  await request("POST", "/api/auth/logout", {
    token: state.adminToken,
    expected: [200],
    name: "Logout endpoint returns success"
  });

  const users = await request("GET", "/api/users", {
    token: state.adminToken,
    expected: [200],
    name: "Admin can list users"
  });
  state.employeeId = users.json?.data?.items?.find((user) => user.email === "employee@assetflow.local")?.id;
  state.managerId = users.json?.data?.items?.find((user) => user.email === "manager@assetflow.local")?.id;

  await request("GET", "/api/users", {
    token: state.employeeToken,
    expected: [403],
    name: "Employee cannot list all users"
  });

  await request("GET", "/api/users?role=EMPLOYEE", {
    token: state.adminToken,
    expected: [200],
    name: "Admin can filter users by role"
  });

  const newDepartment = await request("POST", "/api/departments", {
    token: state.adminToken,
    expected: [201],
    name: "Admin can create department",
    body: { name: `QA Department ${Date.now()}`, code: `QA${Date.now().toString().slice(-5)}` }
  });
  state.departmentId = newDepartment.json?.data?.id;

  await request("POST", "/api/departments", {
    token: state.employeeToken,
    expected: [403],
    name: "Employee cannot create department",
    body: { name: `Blocked Department ${Date.now()}`, code: `BLK${Date.now().toString().slice(-5)}` }
  });

  await request("GET", "/api/departments", {
    token: state.adminToken,
    expected: [200],
    name: "Authenticated user can list departments"
  });

  await request("PATCH", `/api/departments/${state.departmentId}`, {
    token: state.adminToken,
    expected: [200],
    name: "Admin can update department",
    body: { name: `QA Department Updated ${Date.now()}` }
  });

  const newUser = await request("POST", "/api/users", {
    token: state.adminToken,
    expected: [201],
    name: "Admin can create employee",
    body: {
      name: "QA Employee",
      email: `qa.employee.${Date.now()}@assetflow.local`,
      password: "password123",
      role: "EMPLOYEE",
      departmentId: state.departmentId
    }
  });
  state.qaUserId = newUser.json?.data?.id;

  await request("PATCH", `/api/users/${state.qaUserId}`, {
    token: state.adminToken,
    expected: [200],
    name: "Admin can update user",
    body: { status: "ACTIVE" }
  });

  const newCategory = await request("POST", "/api/categories", {
    token: state.adminToken,
    expected: [201],
    name: "Admin can create category",
    body: { name: `QA Category ${Date.now()}`, code: `QAC${Date.now().toString().slice(-5)}` }
  });
  state.categoryId = newCategory.json?.data?.id;

  await request("GET", "/api/categories", {
    token: state.adminToken,
    expected: [200],
    name: "Authenticated user can list categories"
  });

  await request("PATCH", `/api/categories/${state.categoryId}`, {
    token: state.adminToken,
    expected: [200],
    name: "Admin can update category",
    body: { description: "Updated by QA" }
  });

  const createdAsset = await request("POST", "/api/assets", {
    token: state.adminToken,
    expected: [201],
    name: "Admin can create asset",
    body: {
      assetCode: `QA-ASSET-${Date.now()}`,
      name: "QA Test Laptop",
      categoryId: state.categoryId,
      departmentId: state.departmentId,
      condition: "GOOD",
      location: "QA Lab",
      isBookable: true
    }
  });
  state.assetId = createdAsset.json?.data?.id;

  const assets = await request("GET", "/api/assets", {
    token: state.adminToken,
    expected: [200],
    name: "Authenticated user can list assets"
  });
  state.seedBookableAssetId = assets.json?.data?.items?.find((asset) => asset.isBookable)?.id;

  await request("GET", `/api/assets/${state.assetId}`, {
    token: state.adminToken,
    expected: [200],
    name: "Authenticated user can fetch asset detail"
  });

  await request("PATCH", `/api/assets/${state.assetId}`, {
    token: state.adminToken,
    expected: [200],
    name: "Admin can update asset",
    body: { location: "QA Lab Updated" }
  });

  await request("GET", `/api/assets/${state.assetId}/qr`, {
    token: state.adminToken,
    expected: [200],
    name: "Admin can generate asset QR payload"
  });

  await request("POST", `/api/assets/${state.assetId}/allocate`, {
    token: state.adminToken,
    expected: [201],
    name: "Admin can allocate available asset",
    body: { userId: state.qaUserId, notes: "QA allocation" }
  });

  await request("POST", `/api/assets/${state.assetId}/allocate`, {
    token: state.adminToken,
    expected: [409],
    name: "Asset cannot be allocated twice",
    body: { userId: state.employeeId, notes: "Duplicate allocation attempt" }
  });

  const transfer = await request("POST", "/api/transfers", {
    token: state.adminToken,
    expected: [201],
    name: "Admin can request transfer",
    body: { assetId: state.assetId, toUserId: state.managerId, reason: "QA transfer" }
  });
  state.transferId = transfer.json?.data?.id;

  await request("GET", "/api/transfers", {
    token: state.adminToken,
    expected: [200],
    name: "Admin can list transfers"
  });

  await request("GET", "/api/transfers", {
    token: state.auditorToken,
    expected: [200],
    name: "Auditor can list transfers read-only"
  });

  await request("GET", `/api/transfers/${state.transferId}`, {
    token: state.adminToken,
    expected: [200],
    name: "Admin can fetch transfer detail"
  });

  await request("GET", `/api/transfers/${state.transferId}`, {
    token: state.employeeToken,
    expected: [403],
    name: "Employee cannot fetch unrelated transfer detail"
  });

  await request("PATCH", `/api/transfers/${state.transferId}/approve`, {
    token: state.adminToken,
    expected: [200],
    name: "Admin can approve pending transfer",
    body: { decisionNotes: "Approved by QA" }
  });

  await request("PATCH", `/api/transfers/${state.transferId}/reject`, {
    token: state.adminToken,
    expected: [409],
    name: "Already approved transfer cannot be rejected",
    body: { decisionNotes: "Should fail" }
  });

  const pendingTransfer = await request("POST", "/api/transfers", {
    token: state.adminToken,
    expected: [201],
    name: "Admin can create cancellable transfer",
    body: { assetId: state.assetId, toDepartmentId: state.departmentId, reason: "QA cancellation path" }
  });
  state.pendingTransferId = pendingTransfer.json?.data?.id;

  await request("PATCH", `/api/transfers/${state.pendingTransferId}/cancel`, {
    token: state.adminToken,
    expected: [200],
    name: "Requester/admin can cancel pending transfer",
    body: { reason: "Cancelled by QA" }
  });

  const bookingStart = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const bookingEnd = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();
  const booking = await request("POST", "/api/bookings", {
    token: state.adminToken,
    expected: [201],
    name: "Admin can request booking for bookable asset",
    body: { assetId: state.seedBookableAssetId, startTime: bookingStart, endTime: bookingEnd, purpose: "QA booking" }
  });
  state.bookingId = booking.json?.data?.id;

  await request("GET", "/api/bookings", {
    token: state.adminToken,
    expected: [200],
    name: "Authenticated user can list bookings"
  });

  await request("PATCH", `/api/bookings/${state.bookingId}/approve`, {
    token: state.adminToken,
    expected: [200],
    name: "Admin can approve booking"
  });

  await request("PATCH", `/api/bookings/${state.bookingId}/reject`, {
    token: state.adminToken,
    expected: [409],
    name: "Already approved booking cannot be rejected",
    body: { decisionNotes: "Should fail" }
  });

  await request("POST", "/api/bookings", {
    token: state.adminToken,
    expected: [409],
    name: "Overlapping approved booking is rejected",
    body: { assetId: state.seedBookableAssetId, startTime: bookingStart, endTime: bookingEnd, purpose: "Overlap" }
  });

  const rejectBooking = await request("POST", "/api/bookings", {
    token: state.adminToken,
    expected: [201],
    name: "Admin can create booking for rejection path",
    body: {
      assetId: state.seedBookableAssetId,
      startTime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 27 * 60 * 60 * 1000).toISOString(),
      purpose: "Reject path"
    }
  });
  state.rejectBookingId = rejectBooking.json?.data?.id;

  await request("PATCH", `/api/bookings/${state.rejectBookingId}/reject`, {
    token: state.adminToken,
    expected: [200],
    name: "Admin can reject booking",
    body: { decisionNotes: "Rejected by QA" }
  });

  const cancelBooking = await request("POST", "/api/bookings", {
    token: state.adminToken,
    expected: [201],
    name: "Admin can create booking for cancel path",
    body: {
      assetId: state.seedBookableAssetId,
      startTime: new Date(Date.now() + 28 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 29 * 60 * 60 * 1000).toISOString(),
      purpose: "Cancel path"
    }
  });
  state.cancelBookingId = cancelBooking.json?.data?.id;

  await request("PATCH", `/api/bookings/${state.cancelBookingId}/cancel`, {
    token: state.adminToken,
    expected: [200],
    name: "Requester/admin can cancel booking",
    body: { reason: "Cancelled by QA" }
  });

  const maintenance = await request("POST", "/api/maintenance", {
    token: state.adminToken,
    expected: [201],
    name: "Admin can create maintenance ticket",
    body: { assetId: state.seedBookableAssetId, priority: "HIGH", issueSummary: "QA issue" }
  });
  state.maintenanceId = maintenance.json?.data?.id;

  await request("GET", "/api/maintenance", {
    token: state.adminToken,
    expected: [200],
    name: "Authenticated user can list maintenance tickets"
  });

  await request("GET", "/api/maintenance?priority=HIGH", {
    token: state.adminToken,
    expected: [200],
    name: "Authenticated user can filter maintenance by priority"
  });

  await request("GET", `/api/maintenance/${state.maintenanceId}`, {
    token: state.adminToken,
    expected: [200],
    name: "Authenticated user can fetch maintenance detail"
  });

  await request("GET", `/api/maintenance/${state.maintenanceId}`, {
    token: state.employeeToken,
    expected: [403],
    name: "Employee cannot fetch unrelated maintenance detail"
  });

  await request("PATCH", `/api/maintenance/${state.maintenanceId}`, {
    token: state.adminToken,
    expected: [200],
    name: "Admin can update maintenance ticket",
    body: { status: "IN_PROGRESS" }
  });

  await request("PATCH", `/api/maintenance/${state.maintenanceId}/close`, {
    token: state.adminToken,
    expected: [200],
    name: "Admin can close maintenance ticket",
    body: { resolutionNotes: "Resolved by QA" }
  });

  const audit = await request("POST", "/api/audits", {
    token: state.adminToken,
    expected: [201],
    name: "Admin can create audit record",
    body: { assetId: state.seedBookableAssetId, result: "VERIFIED", remarks: "Verified by QA" }
  });
  state.auditId = audit.json?.data?.id;

  await request("GET", "/api/audits", {
    token: state.adminToken,
    expected: [200],
    name: "Admin can list audit records"
  });

  await request("GET", "/api/audits?result=VERIFIED", {
    token: state.adminToken,
    expected: [200],
    name: "Admin can filter audit records by result"
  });

  await request("GET", "/api/audit-logs", {
    token: state.adminToken,
    expected: [200],
    name: "Admin can list audit logs"
  });

  await request("GET", "/api/audit-logs?entityType=Asset", {
    token: state.adminToken,
    expected: [200],
    name: "Admin can filter audit logs by entity type"
  });

  await request("GET", "/api/reports/summary", {
    token: state.adminToken,
    expected: [200],
    name: "Admin can fetch summary report"
  });

  await request("GET", "/api/reports/assets", {
    token: state.adminToken,
    expected: [200],
    name: "Admin can fetch asset report"
  });

  const notifications = await request("GET", "/api/notifications", {
    token: state.adminToken,
    expected: [200],
    name: "Authenticated user can list notifications"
  });
  state.notificationId = notifications.json?.data?.items?.[0]?.id;

  if (state.notificationId) {
    await request("PATCH", `/api/notifications/${state.notificationId}/read`, {
      token: state.adminToken,
      expected: [200],
      name: "Notification owner can mark notification read"
    });
  }

  await request("PATCH", "/api/notifications/read-all", {
    token: state.adminToken,
    expected: [200],
    name: "Notification owner can mark all notifications read"
  });

  await request("POST", `/api/assets/${state.assetId}/retire`, {
    token: state.adminToken,
    expected: [409],
    name: "Retiring actively allocated asset is rejected",
    body: { reason: "QA should fail because active allocation exists" }
  });

  const summary = {
    total: results.length,
    passed: results.filter((result) => result.status === "PASS").length,
    failed: results.filter((result) => result.status === "FAIL").length
  };

  const payload = { summary, results };
  if (process.env.QA_OUTPUT) {
    fs.mkdirSync(path.dirname(process.env.QA_OUTPUT), { recursive: true });
    fs.writeFileSync(process.env.QA_OUTPUT, `${JSON.stringify(payload, null, 2)}\n`);
  }

  console.log(JSON.stringify({
    summary,
    failed: results.filter((result) => result.status === "FAIL")
  }, null, 2));
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
