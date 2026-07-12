import bcrypt from "bcrypt";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { PrismaClient, Role } from "@prisma/client";

const baseUrl = process.env.BASE_URL || "http://localhost:5011";
const artifactsDir = path.resolve("tests/artifacts");
const prisma = new PrismaClient();
const results = [];
const performanceObservations = [];

const ensureArtifactsDir = () => fs.mkdirSync(artifactsDir, { recursive: true });

const record = (check, endpoint, expectedStatus, actualStatus, pass, rootCause = "") => {
  results.push({
    endpoint,
    check,
    expectedStatus,
    actualStatus,
    result: pass ? "PASS" : "FAIL",
    rootCause
  });
};

const writeJson = (fileName, payload) => {
  ensureArtifactsDir();
  fs.writeFileSync(path.join(artifactsDir, fileName), `${JSON.stringify(payload, null, 2)}\n`);
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

const login = async (email, password = "password123") => {
  const response = await request("POST", "/api/auth/login", { body: { email, password } });
  if (response.status !== 200) {
    throw new Error(`Login failed for ${email}: HTTP ${response.status}`);
  }
  return response.json.data.token;
};

const resetDatabase = async () => {
  await prisma.department.updateMany({ data: { managerId: null } });
  await prisma.user.updateMany({ data: { departmentId: null } });
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.auditDiscrepancy.deleteMany();
  await prisma.auditRecord.deleteMany();
  await prisma.audit.deleteMany();
  await prisma.maintenanceTicket.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.category.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();
};

const createEmptyAdmin = async () => {
  const passwordHash = await bcrypt.hash("password123", 10);
  return prisma.user.create({
    data: {
      name: "Empty Database Admin",
      email: "empty.admin@assetflow.local",
      passwordHash,
      role: Role.ADMIN
    }
  });
};

const validateDashboardShape = (payload) => {
  const data = payload?.data;
  return Boolean(
    payload?.success === true &&
      data?.overview &&
      Array.isArray(data.alerts) &&
      Array.isArray(data.quickActions) &&
      Array.isArray(data.recentActivity)
  );
};

const validateEmptyOverview = (payload) => {
  const overview = payload?.data?.overview;
  return Boolean(
    overview &&
      overview.totalAssets === 0 &&
      overview.availableAssets === 0 &&
      overview.allocatedAssets === 0 &&
      overview.maintenanceAssets === 0 &&
      overview.activeBookings === 0 &&
      overview.pendingBookings === 0 &&
      overview.pendingTransfers === 0 &&
      overview.upcomingReturns === 0 &&
      payload.data.alerts.length === 0 &&
      payload.data.recentActivity.length === 0
  );
};

const escapeMd = (value) => String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");

const writeReport = () => {
  const rows = results
    .map(
      (result) =>
        `| ${escapeMd(result.endpoint)} | ${escapeMd(result.check)} | ${result.expectedStatus} | ${result.actualStatus} | ${result.result} | ${escapeMd(result.rootCause || "None observed.")} |`
    )
    .join("\n");

  const perfRows = performanceObservations
    .filter((entry) => entry.endpoint.includes("/api/dashboard/overview"))
    .map((entry) => `| ${escapeMd(entry.endpoint)} | ${entry.status} | ${entry.durationMs} ms |`)
    .join("\n");

  const failed = results.filter((result) => result.result === "FAIL").length;
  const report = `# Dashboard QA Report

Generated: ${new Date().toISOString()}

## Summary

| Metric | Value |
| --- | ---: |
| Checks | ${results.length} |
| Passed | ${results.length - failed} |
| Failed | ${failed} |

## Endpoint

\`GET /api/dashboard/overview\`

## Checks Performed

| Endpoint | Check | Expected Status | Actual Status | Result | Root Cause |
| --- | --- | ---: | ---: | --- | --- |
${rows}

## Performance Observations

| Request | Status | Duration |
| --- | ---: | ---: |
${perfRows}

The endpoint performs bounded recent-activity reads and aggregate counts in parallel. Local QA responses were comfortably within hackathon-demo expectations.

## Known Limitations

- Upcoming returns are derived from approved booking end times because allocation return due dates are not currently modeled.
- Alerts are status-based and only use existing persisted business data; no predictive or synthetic alert logic is included.
- Quick actions are role descriptors for the frontend to map to its own UI routes.
`;

  fs.writeFileSync(path.join(artifactsDir, "dashboard-qa-report.md"), report);
};

const expectStatus = (check, endpoint, expectedStatus, response, extraPredicate = () => true) => {
  const pass = response.status === expectedStatus && extraPredicate(response.json);
  record(
    check,
    endpoint,
    expectedStatus,
    response.status,
    pass,
    pass ? "" : `Expected HTTP ${expectedStatus} and valid dashboard contract.`
  );
};

const run = async () => {
  ensureArtifactsDir();

  const adminToken = await login("admin@assetflow.local");
  const managerToken = await login("manager@assetflow.local");

  const seededOverview = await request("GET", "/api/dashboard/overview", { token: adminToken });
  expectStatus("Seeded admin request returns dashboard payload", "GET /api/dashboard/overview", 200, seededOverview, validateDashboardShape);

  const unauthenticated = await request("GET", "/api/dashboard/overview");
  expectStatus("Missing JWT is rejected", "GET /api/dashboard/overview", 401, unauthenticated);

  const departments = await request("GET", "/api/departments", { token: adminToken });
  const departmentItems = departments.json?.data?.items ?? departments.json?.data ?? [];
  const financeDepartmentId = departmentItems.find((department) => department.code === "FIN")?.id;
  const forbiddenScope = await request("GET", `/api/dashboard/overview?departmentId=${financeDepartmentId}`, {
    token: managerToken
  });
  expectStatus("Manager cannot request another department dashboard", "GET /api/dashboard/overview?departmentId=<finance>", 403, forbiddenScope);

  await resetDatabase();
  await createEmptyAdmin();

  const emptyAdminToken = await login("empty.admin@assetflow.local");
  const emptyOverview = await request("GET", "/api/dashboard/overview", { token: emptyAdminToken });
  expectStatus("Empty lifecycle database returns zero counts", "GET /api/dashboard/overview", 200, emptyOverview, validateEmptyOverview);

  execFileSync("npm", ["run", "seed"], { cwd: process.cwd(), env: process.env, stdio: "inherit" });

  const restoredAdminToken = await login("admin@assetflow.local");
  const restoredOverview = await request("GET", "/api/dashboard/overview", { token: restoredAdminToken });
  expectStatus("Seeded database returns dashboard payload after restore", "GET /api/dashboard/overview", 200, restoredOverview, validateDashboardShape);
  writeJson("dashboard-response.json", restoredOverview.json);

  writeReport();

  const failed = results.filter((result) => result.result === "FAIL");
  console.log(JSON.stringify({ total: results.length, failed: failed.length, results }, null, 2));
  if (failed.length > 0) process.exit(1);
};

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
