import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

const baseUrl = process.env.BASE_URL || "http://localhost:5011";
const artifactsDir = path.resolve("tests/artifacts");
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

const request = async (method, pathName, { token } = {}) => {
  const headers = { Accept: "application/json, text/csv" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${pathName}`, { method, headers });
  const durationMs = Math.round(performance.now() - startedAt);
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  let json = null;
  if (contentType.includes("application/json")) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  performanceObservations.push({ endpoint: `${method} ${pathName}`, status: response.status, durationMs });
  return { status: response.status, json, text, contentType, durationMs };
};

const login = async (email, password = "password123") => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const json = await response.json();
  if (response.status !== 200) throw new Error(`Login failed for ${email}: HTTP ${response.status}`);
  return json.data.token;
};

const expectStatus = (method, pathName, check, expectedStatus, response, predicate = () => true) => {
  const pass = response.status === expectedStatus && predicate(response);
  record(
    `${method} ${pathName}`,
    check,
    expectedStatus,
    response.status,
    pass,
    pass ? "" : "Expected status and response contract did not match."
  );
};

const dataOf = (response) => response.json?.data;
const isSuccess = (response) => response.json?.success === true;
const isChart = (chart) => Boolean(Array.isArray(chart?.labels) && Array.isArray(chart?.datasets));
const isPaginated = (payload) =>
  Boolean(Array.isArray(payload?.items) && typeof payload?.total === "number" && typeof payload?.page === "number");

const getSeedContext = async () => {
  state.adminToken = await login("admin@assetflow.local");
  state.managerToken = await login("manager@assetflow.local");
  state.employeeToken = await login("employee@assetflow.local");
  state.auditorToken = await login("auditor@assetflow.local");

  const departments = await request("GET", "/api/departments", { token: state.adminToken });
  const departmentItems = departments.json?.data?.items ?? departments.json?.data ?? [];
  state.itDepartmentId = departmentItems.find((department) => department.code === "IT")?.id;
  state.financeDepartmentId = departmentItems.find((department) => department.code === "FIN")?.id;
};

const writeReport = () => {
  const rows = results
    .map(
      (result) =>
        `| ${escapeMd(result.endpoint)} | ${escapeMd(result.check)} | ${result.expectedStatus} | ${result.actualStatus} | ${result.result} | ${escapeMd(result.rootCause || "None observed.")} |`
    )
    .join("\n");

  const perfRows = performanceObservations
    .filter((entry) => entry.endpoint.includes("/api/reports"))
    .map((entry) => `| ${escapeMd(entry.endpoint)} | ${entry.status} | ${entry.durationMs} ms |`)
    .join("\n");

  const failed = results.filter((result) => result.result === "FAIL").length;
  const report = `# Reports QA Report

Generated: ${new Date().toISOString()}

## Summary

| Metric | Value |
| --- | ---: |
| Checks | ${results.length} |
| Passed | ${results.length - failed} |
| Failed | ${failed} |

## Endpoints Covered

- \`GET /api/reports/dashboard\`
- \`GET /api/reports/assets\`
- \`GET /api/reports/bookings\`
- \`GET /api/reports/maintenance\`
- \`GET /api/reports/audits\`
- \`GET /api/reports/utilization\`
- \`GET /api/reports/department-utilization\`
- \`GET /api/reports/idle-assets\`
- \`GET /api/reports/most-used-assets\`
- \`GET /api/reports/near-retirement\`
- \`GET /api/reports/export\`

## Checks Performed

| Endpoint | Check | Expected Status | Actual Status | Result | Root Cause |
| --- | --- | ---: | ---: | --- | --- |
${rows}

## Performance Observations

| Request | Status | Duration |
| --- | ---: | ---: |
${perfRows}

## Business Rules Verified

- Reports require authentication.
- Managers are restricted to their assigned department.
- Employees cannot request department-scoped reports and only receive own-data views.
- Analytics responses expose chart-ready \`labels\`, \`datasets\`, totals, and percentages where applicable.
- CSV, JSON, and PDF-interface export modes are available.

## Known Limitations

- PDF export returns a future-ready interface response rather than a rendered binary PDF.
- Near-retirement risk is derived from existing condition, warranty, and purchase-date fields only.
`;

  fs.writeFileSync(path.join(artifactsDir, "reports-qa-report.md"), report);
};

const run = async () => {
  ensureArtifactsDir();
  seedDatabase();
  await getSeedContext();

  const unauthenticated = await request("GET", "/api/reports/dashboard");
  expectStatus("GET", "/api/reports/dashboard", "Reports require authentication", 401, unauthenticated);

  const dashboard = await request("GET", "/api/reports/dashboard", { token: state.adminToken });
  responses.dashboard = dashboard.json;
  expectStatus("GET", "/api/reports/dashboard", "Admin receives dashboard analytics", 200, dashboard, (response) => {
    const payload = dataOf(response);
    return Boolean(isSuccess(response) && payload?.summary && isChart(payload?.charts?.bookingTrend) && isChart(payload?.charts?.utilizationByDepartment));
  });

  const assets = await request("GET", "/api/reports/assets?status=AVAILABLE&page=1&limit=5", { token: state.adminToken });
  responses.assets = assets.json;
  expectStatus("GET", "/api/reports/assets", "Asset report supports status filter and charts", 200, assets, (response) => {
    const payload = dataOf(response);
    return Boolean(isSuccess(response) && isPaginated(payload) && isChart(payload?.charts?.status) && isChart(payload?.charts?.category));
  });

  const bookings = await request(
    "GET",
    "/api/reports/bookings?from=2026-07-01T00:00:00.000Z&to=2026-07-31T23:59:59.000Z",
    { token: state.adminToken }
  );
  responses.bookings = bookings.json;
  expectStatus("GET", "/api/reports/bookings", "Booking report supports date range and chart structures", 200, bookings, (response) => {
    const payload = dataOf(response);
    return Boolean(isSuccess(response) && typeof payload?.bookingCount === "number" && isChart(payload?.charts?.trend) && isChart(payload?.charts?.status));
  });

  const maintenance = await request("GET", "/api/reports/maintenance?priority=HIGH", { token: state.adminToken });
  responses.maintenance = maintenance.json;
  expectStatus("GET", "/api/reports/maintenance", "Maintenance report supports priority filter and chart structures", 200, maintenance, (response) => {
    const payload = dataOf(response);
    return Boolean(isSuccess(response) && typeof payload?.maintenanceCount === "number" && isChart(payload?.charts?.trend) && isChart(payload?.charts?.priority));
  });

  const audits = await request("GET", "/api/reports/audits", { token: state.auditorToken });
  responses.audits = audits.json;
  expectStatus("GET", "/api/reports/audits", "Auditor receives audit analytics", 200, audits, (response) => {
    const payload = dataOf(response);
    return Boolean(isSuccess(response) && typeof payload?.auditCount === "number" && isChart(payload?.charts?.verification));
  });

  const utilization = await request("GET", "/api/reports/utilization", { token: state.adminToken });
  responses.utilization = utilization.json;
  expectStatus("GET", "/api/reports/utilization", "Utilization report returns totals and charts", 200, utilization, (response) => {
    const payload = dataOf(response);
    return Boolean(isSuccess(response) && typeof payload?.totals?.assetUtilizationPercentage === "number" && isChart(payload?.charts?.utilizationSummary));
  });

  const departmentUtilization = await request("GET", `/api/reports/department-utilization?departmentId=${state.itDepartmentId}`, {
    token: state.adminToken
  });
  responses.departmentUtilization = departmentUtilization.json;
  expectStatus("GET", "/api/reports/department-utilization", "Department utilization supports department filter", 200, departmentUtilization, (response) => {
    const payload = dataOf(response);
    return Boolean(isSuccess(response) && Array.isArray(payload?.departmentUtilization) && isChart(payload?.charts?.utilizationByDepartment));
  });

  const idleAssets = await request("GET", "/api/reports/idle-assets?limit=5", { token: state.adminToken });
  responses.idleAssets = idleAssets.json;
  expectStatus("GET", "/api/reports/idle-assets", "Idle assets report is paginated", 200, idleAssets, (response) => {
    const payload = dataOf(response);
    return Boolean(isSuccess(response) && isPaginated(payload) && typeof payload?.totals?.idleAssets === "number");
  });

  const mostUsedAssets = await request("GET", "/api/reports/most-used-assets?limit=5", { token: state.adminToken });
  responses.mostUsedAssets = mostUsedAssets.json;
  expectStatus("GET", "/api/reports/most-used-assets", "Most-used assets report is chart-ready", 200, mostUsedAssets, (response) => {
    const payload = dataOf(response);
    return Boolean(isSuccess(response) && isPaginated(payload) && isChart(payload?.charts?.mostUsedAssets));
  });

  const nearRetirement = await request("GET", "/api/reports/near-retirement?limit=5", { token: state.adminToken });
  responses.nearRetirement = nearRetirement.json;
  expectStatus("GET", "/api/reports/near-retirement", "Near-retirement report is paginated and risk-scored", 200, nearRetirement, (response) => {
    const payload = dataOf(response);
    return Boolean(isSuccess(response) && isPaginated(payload) && isChart(payload?.charts?.retirementRisk));
  });

  const employeeDashboard = await request("GET", "/api/reports/dashboard", { token: state.employeeToken });
  responses.employeeDashboard = employeeDashboard.json;
  expectStatus("GET", "/api/reports/dashboard", "Employee receives own-data dashboard analytics", 200, employeeDashboard, (response) =>
    Boolean(isSuccess(response) && dataOf(response)?.summary)
  );

  const managerForbidden = await request("GET", `/api/reports/assets?departmentId=${state.financeDepartmentId}`, {
    token: state.managerToken
  });
  expectStatus("GET", "/api/reports/assets?departmentId=<finance>", "Manager cannot access another department report", 403, managerForbidden);

  const employeeForbidden = await request("GET", `/api/reports/assets?departmentId=${state.itDepartmentId}`, {
    token: state.employeeToken
  });
  expectStatus("GET", "/api/reports/assets?departmentId=<it>", "Employee cannot request department-scoped report", 403, employeeForbidden);

  const jsonExport = await request("GET", "/api/reports/export?type=assets&format=json", { token: state.adminToken });
  responses.jsonExport = jsonExport.json;
  expectStatus("GET", "/api/reports/export?type=assets&format=json", "JSON export wraps selected report data", 200, jsonExport, (response) =>
    Boolean(isSuccess(response) && dataOf(response)?.format === "json" && dataOf(response)?.data?.items)
  );

  const csvExport = await request("GET", "/api/reports/export?type=assets&format=csv", { token: state.adminToken });
  responses.csvExport = { status: csvExport.status, contentType: csvExport.contentType, preview: csvExport.text.slice(0, 500) };
  expectStatus("GET", "/api/reports/export?type=assets&format=csv", "CSV export returns text/csv content", 200, csvExport, (response) =>
    Boolean(response.contentType.includes("text/csv") && response.text.includes("assetCode"))
  );

  const pdfExport = await request("GET", "/api/reports/export?type=dashboard&format=pdf", { token: state.adminToken });
  responses.pdfExport = pdfExport.json;
  expectStatus("GET", "/api/reports/export?type=dashboard&format=pdf", "PDF export interface is available", 200, pdfExport, (response) =>
    Boolean(isSuccess(response) && dataOf(response)?.format === "pdf" && dataOf(response)?.data?.status === "PDF_INTERFACE_READY")
  );

  const invalidExportFormat = await request("GET", "/api/reports/export?format=xlsx", { token: state.adminToken });
  expectStatus("GET", "/api/reports/export?format=xlsx", "Invalid export format is rejected", 400, invalidExportFormat);

  writeJson("reports-response.json", responses);
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
