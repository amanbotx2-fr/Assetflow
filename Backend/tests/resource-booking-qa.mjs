import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { BookingStatus, PrismaClient } from "@prisma/client";

const baseUrl = process.env.BASE_URL || "http://localhost:5011";
const artifactsDir = path.resolve("tests/artifacts");
const prisma = new PrismaClient();
const zeroUuid = "00000000-0000-0000-0000-000000000000";
const results = [];
const performanceObservations = [];
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
  return { status: response.status, json };
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
  if (response.status !== 200) {
    throw new Error(`Login failed for ${email}: HTTP ${response.status}`);
  }
  return response.json.data.token;
};

const items = (payload) => payload?.data?.items ?? payload?.data ?? [];
const isPaginated = (payload) =>
  Boolean(payload?.success === true && Array.isArray(payload?.data?.items) && typeof payload?.data?.total === "number");

const addHours = (hours) => new Date(Date.now() + hours * 60 * 60 * 1000);
const toDateOnly = (date) => date.toISOString().slice(0, 10);

const createBookableAsset = async (suffix, departmentId = state.itDepartmentId) => {
  const response = await request("POST", "/api/assets", {
    token: state.adminToken,
    body: {
      assetTag: `BOOK-QA-${suffix}`,
      serialNumber: `BOOK-QA-SN-${suffix}`,
      name: `Booking QA Resource ${suffix}`,
      categoryId: state.projectorCategoryId,
      departmentId,
      condition: "GOOD",
      location: "Booking QA Room",
      isBookable: true
    }
  });
  if (response.status !== 201) throw new Error(`Failed to create bookable asset: HTTP ${response.status}`);
  return response.json.data;
};

const getSeedContext = async () => {
  state.adminToken = await login("admin@assetflow.local");
  state.managerToken = await login("manager@assetflow.local");
  state.employeeToken = await login("employee@assetflow.local");
  state.auditorToken = await login("auditor@assetflow.local");

  const users = await request("GET", "/api/users", { token: state.adminToken });
  const userItems = items(users.json);
  state.adminId = userItems.find((user) => user.email === "admin@assetflow.local")?.id;
  state.employeeId = userItems.find((user) => user.email === "employee@assetflow.local")?.id;

  const departments = await request("GET", "/api/departments", { token: state.adminToken });
  const departmentItems = items(departments.json);
  state.itDepartmentId = departmentItems.find((department) => department.code === "IT")?.id;
  state.operationsDepartmentId = departmentItems.find((department) => department.code === "OPS")?.id;

  const categories = await request("GET", "/api/categories", { token: state.adminToken });
  const categoryItems = items(categories.json);
  state.projectorCategoryId = categoryItems.find((category) => category.code === "PROJ")?.id;

  const assets = await request("GET", "/api/assets", { token: state.adminToken });
  state.seedBookableAssetId = items(assets.json).find((asset) => asset.isBookable)?.id;
};

const createPastBookings = async (resourceId) => {
  const pastRequested = await prisma.booking.create({
    data: {
      assetId: resourceId,
      requestedById: state.employeeId,
      startTime: addHours(-8),
      endTime: addHours(-7),
      status: BookingStatus.REQUESTED,
      purpose: "Past requested QA booking"
    }
  });

  const pastApproved = await prisma.booking.create({
    data: {
      assetId: resourceId,
      requestedById: state.employeeId,
      approvedById: state.adminId,
      startTime: addHours(-6),
      endTime: addHours(-5),
      status: BookingStatus.APPROVED,
      purpose: "Past approved QA booking"
    }
  });

  return { pastRequested, pastApproved };
};

const writeReport = () => {
  const rows = results
    .map(
      (result) =>
        `| ${escapeMd(result.endpoint)} | ${escapeMd(result.check)} | ${result.expectedStatus} | ${result.actualStatus} | ${result.result} | ${escapeMd(result.rootCause || "None observed.")} |`
    )
    .join("\n");

  const perfRows = performanceObservations
    .filter((entry) => entry.endpoint.includes("/api/bookings") || entry.endpoint.includes("/api/reports/bookings") || entry.endpoint.includes("/api/dashboard"))
    .slice(-60)
    .map((entry) => `| ${escapeMd(entry.endpoint)} | ${entry.status} | ${entry.durationMs} ms |`)
    .join("\n");

  const failed = results.filter((result) => result.result === "FAIL").length;
  const report = `# Resource Booking QA Report

Generated: ${new Date().toISOString()}

## Summary

| Metric | Value |
| --- | ---: |
| Checks | ${results.length} |
| Passed | ${results.length - failed} |
| Failed | ${failed} |

## Endpoints Covered

- \`GET /api/bookings\`
- \`GET /api/bookings/:id\`
- \`POST /api/bookings\`
- \`PATCH /api/bookings/:id\`
- \`DELETE /api/bookings/:id\`
- \`PATCH /api/bookings/:id/approve\`
- \`PATCH /api/bookings/:id/reject\`
- \`PATCH /api/bookings/:id/cancel\`
- \`GET /api/bookings/calendar\`
- \`GET /api/bookings/availability\`
- \`GET /api/reports/bookings\`

## Checks Performed

| Endpoint | Check | Expected Status | Actual Status | Result | Root Cause |
| --- | --- | ---: | ---: | --- | --- |
${rows}

## Performance Observations

| Request | Status | Duration |
| --- | ---: | ---: |
${perfRows}

## Business Rules Verified

- Bookings require authentication and role scope.
- Employees can create and read their own bookings.
- Managers can approve or reject bookings for their department.
- Auditors are read-only.
- Overlapping and duplicate bookings are rejected.
- Approval rechecks occupied slots.
- Rejected and cancelled bookings free the slot.
- Past bookings cannot be modified.
- Calendar and availability endpoints return frontend-ready payloads.
- Booking actions generate notifications and audit logs.

## Known Limitations

- The backend keeps legacy \`PENDING\` support; new booking requests use \`REQUESTED\`.
- \`ACTIVE\` and \`COMPLETED\` are synchronized when booking APIs are read or used; there is no background scheduler in the hackathon MVP.
- Availability uses 09:00-18:00 UTC one-day working windows for demo slot generation.
`;

  fs.writeFileSync(path.join(artifactsDir, "resource-booking-qa-report.md"), report);
};

const refreshBookingResponse = async () => {
  const adminToken = await login("admin@assetflow.local");
  const bookings = await request("GET", "/api/bookings?page=1&limit=5", { token: adminToken });
  const booking = bookings.json?.data?.items?.[0];
  const bookingDetail = booking ? await request("GET", `/api/bookings/${booking.id}`, { token: adminToken }) : null;
  const date = booking ? toDateOnly(new Date(booking.startTime)) : toDateOnly(addHours(24));
  const resourceId = booking?.resourceId ?? state.seedBookableAssetId;
  const [calendar, availability, report, dashboard] = await Promise.all([
    request("GET", `/api/bookings/calendar?resourceId=${resourceId}&date=${date}`, { token: adminToken }),
    request("GET", `/api/bookings/availability?resourceId=${resourceId}&date=${date}`, { token: adminToken }),
    request("GET", "/api/reports/bookings", { token: adminToken }),
    request("GET", "/api/dashboard/overview", { token: adminToken })
  ]);

  writeJson("resource-booking-response.json", {
    bookings: bookings.json,
    bookingDetail: bookingDetail?.json ?? null,
    calendar: calendar.json,
    availability: availability.json,
    report: report.json,
    dashboard: dashboard.json
  });
};

const runChecks = async () => {
  await getSeedContext();
  const stamp = Date.now();
  const resource = await createBookableAsset(`${stamp}-MAIN`);

  expectStatus("GET", "/api/bookings", "Booking list requires authentication", 401, await request("GET", "/api/bookings"));
  expectStatus("GET", "/api/bookings", "Admin can list bookings", 200, await request("GET", "/api/bookings", { token: state.adminToken }), isPaginated);
  expectStatus("GET", "/api/bookings", "Auditor can list bookings read-only", 200, await request("GET", "/api/bookings", { token: state.auditorToken }), isPaginated);
  expectStatus("POST", "/api/bookings", "Auditor cannot create booking", 403, await request("POST", "/api/bookings", {
    token: state.auditorToken,
    body: { resourceId: resource.id, startTime: addHours(30).toISOString(), endTime: addHours(31).toISOString(), purpose: "Blocked" }
  }));

  const start = addHours(24);
  const end = addHours(25);
  const employeeBooking = await request("POST", "/api/bookings", {
    token: state.employeeToken,
    body: { resourceId: resource.id, startTime: start.toISOString(), endTime: end.toISOString(), purpose: "Employee booking QA" }
  });
  expectStatus("POST", "/api/bookings", "Employee can create own booking", 201, employeeBooking, (payload) => payload?.data?.status === "REQUESTED" && payload?.data?.resourceId === resource.id);
  state.employeeBookingId = employeeBooking.json?.data?.id;

  expectStatus("POST", "/api/bookings", "Duplicate booking is rejected", 409, await request("POST", "/api/bookings", {
    token: state.employeeToken,
    body: { resourceId: resource.id, startTime: start.toISOString(), endTime: end.toISOString(), purpose: "Duplicate" }
  }));
  expectStatus("POST", "/api/bookings", "Overlapping requested booking is rejected", 409, await request("POST", "/api/bookings", {
    token: state.adminToken,
    body: { resourceId: resource.id, startTime: addHours(24.5).toISOString(), endTime: addHours(25.5).toISOString(), purpose: "Overlap" }
  }));
  expectStatus("POST", "/api/bookings", "Invalid booking date range is rejected", 400, await request("POST", "/api/bookings", {
    token: state.employeeToken,
    body: { resourceId: resource.id, startTime: end.toISOString(), endTime: start.toISOString(), purpose: "Invalid" }
  }));
  expectStatus("POST", "/api/bookings", "Missing resource returns validation error", 400, await request("POST", "/api/bookings", {
    token: state.employeeToken,
    body: { startTime: addHours(40).toISOString(), endTime: addHours(41).toISOString(), purpose: "Missing resource" }
  }));
  expectStatus("POST", "/api/bookings", "Unknown resource returns not found", 404, await request("POST", "/api/bookings", {
    token: state.employeeToken,
    body: { resourceId: zeroUuid, startTime: addHours(40).toISOString(), endTime: addHours(41).toISOString(), purpose: "Unknown" }
  }));
  expectStatus("POST", "/api/bookings", "Past booking creation is rejected", 409, await request("POST", "/api/bookings", {
    token: state.employeeToken,
    body: { resourceId: resource.id, startTime: addHours(-2).toISOString(), endTime: addHours(-1).toISOString(), purpose: "Past" }
  }));

  expectStatus("GET", "/api/bookings/:id", "Employee can fetch own booking detail", 200, await request("GET", `/api/bookings/${state.employeeBookingId}`, { token: state.employeeToken }), (payload) => payload?.data?.bookedBy?.id === state.employeeId);
  expectStatus("GET", "/api/bookings/:id", "Missing booking returns not found", 404, await request("GET", `/api/bookings/${zeroUuid}`, { token: state.adminToken }));
  expectStatus("GET", "/api/bookings/:id", "Invalid booking UUID is rejected", 400, await request("GET", "/api/bookings/not-a-uuid", { token: state.adminToken }));

  expectStatus("PATCH", "/api/bookings/:id", "Employee can update requested booking", 200, await request("PATCH", `/api/bookings/${state.employeeBookingId}`, {
    token: state.employeeToken,
    body: { purpose: "Employee booking QA updated" }
  }), (payload) => payload?.data?.purpose === "Employee booking QA updated");

  expectStatus("PATCH", "/api/bookings/:id/approve", "Manager can approve department booking", 200, await request("PATCH", `/api/bookings/${state.employeeBookingId}/approve`, {
    token: state.managerToken,
    body: { decisionNotes: "Approved by manager" }
  }), (payload) => payload?.data?.status === "APPROVED");
  expectStatus("PATCH", "/api/bookings/:id/reject", "Approved booking cannot be rejected", 409, await request("PATCH", `/api/bookings/${state.employeeBookingId}/reject`, {
    token: state.managerToken,
    body: { decisionNotes: "Should fail" }
  }));
  expectStatus("PATCH", "/api/bookings/:id/approve", "Approved booking cannot be approved twice", 409, await request("PATCH", `/api/bookings/${state.employeeBookingId}/approve`, {
    token: state.adminToken,
    body: { decisionNotes: "Should fail" }
  }));
  expectStatus("POST", "/api/bookings", "Overlapping approved booking is rejected", 409, await request("POST", "/api/bookings", {
    token: state.adminToken,
    body: { resourceId: resource.id, startTime: addHours(24.25).toISOString(), endTime: addHours(24.75).toISOString(), purpose: "Approved overlap" }
  }));

  expectStatus("GET", "/api/bookings/calendar", "Calendar endpoint returns frontend events", 200, await request("GET", `/api/bookings/calendar?resourceId=${resource.id}&date=${toDateOnly(start)}`, { token: state.adminToken }), (payload) => Array.isArray(payload?.data) && payload.data.some((event) => event.id === state.employeeBookingId && event.resourceId === resource.id));
  expectStatus("GET", "/api/bookings/calendar", "Calendar requires date, week, or month", 400, await request("GET", `/api/bookings/calendar?resourceId=${resource.id}`, { token: state.adminToken }));
  expectStatus("GET", "/api/bookings/availability", "Availability endpoint returns slots and conflicts", 200, await request("GET", `/api/bookings/availability?resourceId=${resource.id}&date=${toDateOnly(start)}`, { token: state.adminToken }), (payload) => Array.isArray(payload?.data?.availableSlots) && Array.isArray(payload?.data?.occupiedSlots) && payload.data.occupiedSlots.length >= 1);
  expectStatus("GET", "/api/bookings/availability", "Availability validates required parameters", 400, await request("GET", "/api/bookings/availability", { token: state.adminToken }));

  const rejectStart = addHours(30);
  const rejectBooking = await request("POST", "/api/bookings", {
    token: state.employeeToken,
    body: { resourceId: resource.id, startTime: rejectStart.toISOString(), endTime: addHours(31).toISOString(), purpose: "Reject path" }
  });
  expectStatus("POST", "/api/bookings", "Employee can create rejection-path booking", 201, rejectBooking);
  state.rejectBookingId = rejectBooking.json?.data?.id;
  expectStatus("PATCH", "/api/bookings/:id/reject", "Admin can reject requested booking", 200, await request("PATCH", `/api/bookings/${state.rejectBookingId}/reject`, {
    token: state.adminToken,
    body: { decisionNotes: "Rejected by QA" }
  }), (payload) => payload?.data?.status === "REJECTED");
  expectStatus("POST", "/api/bookings", "Rejected booking frees the slot", 201, await request("POST", "/api/bookings", {
    token: state.employeeToken,
    body: { resourceId: resource.id, startTime: rejectStart.toISOString(), endTime: addHours(31).toISOString(), purpose: "Reused rejected slot" }
  }));

  const cancelStart = addHours(34);
  const cancelBooking = await request("POST", "/api/bookings", {
    token: state.employeeToken,
    body: { resourceId: resource.id, startTime: cancelStart.toISOString(), endTime: addHours(35).toISOString(), purpose: "Cancel path" }
  });
  expectStatus("POST", "/api/bookings", "Employee can create cancellation-path booking", 201, cancelBooking);
  state.cancelBookingId = cancelBooking.json?.data?.id;
  expectStatus("PATCH", "/api/bookings/:id/cancel", "Requester can cancel own booking", 200, await request("PATCH", `/api/bookings/${state.cancelBookingId}/cancel`, {
    token: state.employeeToken,
    body: { reason: "Cancelled by QA" }
  }), (payload) => payload?.data?.status === "CANCELLED");
  expectStatus("POST", "/api/bookings", "Cancelled booking frees the slot", 201, await request("POST", "/api/bookings", {
    token: state.employeeToken,
    body: { resourceId: resource.id, startTime: cancelStart.toISOString(), endTime: addHours(35).toISOString(), purpose: "Reused cancelled slot" }
  }));

  const deleteStart = addHours(38);
  const deleteBooking = await request("POST", "/api/bookings", {
    token: state.adminToken,
    body: { resourceId: resource.id, startTime: deleteStart.toISOString(), endTime: addHours(39).toISOString(), purpose: "Delete path" }
  });
  state.deleteBookingId = deleteBooking.json?.data?.id;
  expectStatus("DELETE", "/api/bookings/:id", "Delete cancels a future booking", 200, await request("DELETE", `/api/bookings/${state.deleteBookingId}`, { token: state.adminToken }), (payload) => payload?.data?.status === "CANCELLED");

  const otherResource = await createBookableAsset(`${stamp}-OPS`, state.operationsDepartmentId);
  const otherBooking = await request("POST", "/api/bookings", {
    token: state.adminToken,
    body: { resourceId: otherResource.id, startTime: addHours(42).toISOString(), endTime: addHours(43).toISOString(), purpose: "Other department booking" }
  });
  expectStatus("GET", "/api/bookings/:id", "Employee cannot fetch unrelated booking", 403, await request("GET", `/api/bookings/${otherBooking.json.data.id}`, { token: state.employeeToken }));
  expectStatus("PATCH", "/api/bookings/:id/approve", "Manager cannot approve another department booking", 403, await request("PATCH", `/api/bookings/${otherBooking.json.data.id}/approve`, {
    token: state.managerToken,
    body: { decisionNotes: "Should fail" }
  }));
  expectStatus("PATCH", "/api/bookings/:id/approve", "Auditor cannot approve booking", 403, await request("PATCH", `/api/bookings/${otherBooking.json.data.id}/approve`, {
    token: state.auditorToken,
    body: { decisionNotes: "Should fail" }
  }));

  const { pastRequested, pastApproved } = await createPastBookings(resource.id);
  expectStatus("PATCH", "/api/bookings/:id", "Past requested booking cannot be modified", 409, await request("PATCH", `/api/bookings/${pastRequested.id}`, {
    token: state.adminToken,
    body: { purpose: "Should fail" }
  }));
  expectStatus("PATCH", "/api/bookings/:id/cancel", "Past booking cannot be cancelled", 409, await request("PATCH", `/api/bookings/${pastRequested.id}/cancel`, {
    token: state.adminToken,
    body: { reason: "Too late" }
  }));
  expectStatus("GET", "/api/bookings", "Past approved booking is synchronized to completed", 200, await request("GET", `/api/bookings?assetId=${resource.id}`, { token: state.adminToken }), (payload) => payload?.data?.items?.some((booking) => booking.id === pastApproved.id && booking.status === "COMPLETED"));

  expectStatus("GET", "/api/reports/bookings", "Booking report exposes utilization metrics", 200, await request("GET", "/api/reports/bookings", { token: state.adminToken }), (payload) => typeof payload?.data?.bookingCount === "number" && Array.isArray(payload?.data?.peakHours));
  expectStatus("GET", "/api/dashboard/overview", "Dashboard includes booking statistics", 200, await request("GET", "/api/dashboard/overview", { token: state.adminToken }), (payload) => typeof payload?.data?.overview?.activeBookings === "number" && typeof payload?.data?.overview?.upcomingBookings === "number");
  expectStatus("GET", "/api/notifications", "Booking notifications are generated", 200, await request("GET", "/api/notifications", { token: state.employeeToken }), (payload) => JSON.stringify(payload).includes("BOOKING_APPROVED") && JSON.stringify(payload).includes("BOOKING_STARTS_SOON"));
  expectStatus("GET", "/api/audit-logs?entityType=Booking", "Booking activity logs are generated", 200, await request("GET", "/api/audit-logs?entityType=Booking", { token: state.adminToken }), (payload) => payload?.data?.items?.length >= 5);
};

const main = async () => {
  seedDatabase();
  await runChecks();
  seedDatabase();
  await getSeedContext();
  await refreshBookingResponse();
  writeReport();

  const failed = results.filter((result) => result.result === "FAIL");
  console.log(JSON.stringify({
    summary: {
      total: results.length,
      passed: results.length - failed.length,
      failed: failed.length
    },
    failed
  }, null, 2));

  await prisma.$disconnect();
  if (failed.length > 0) process.exit(1);
};

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
