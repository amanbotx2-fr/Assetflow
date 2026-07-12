import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

const baseUrl = process.env.BASE_URL || "http://localhost:5011";
const artifactsDir = path.resolve("tests/artifacts");
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
  if (response.status !== 200) throw new Error(`Login failed for ${email}: HTTP ${response.status}`);
  return response.json.data.token;
};

const items = (payload) => payload?.data?.items ?? payload?.data ?? [];
const isPaginated = (payload) =>
  Boolean(payload?.success === true && Array.isArray(payload?.data?.items) && typeof payload?.data?.total === "number");

const createAsset = async (suffix, departmentId = state.itDepartmentId) => {
  const response = await request("POST", "/api/assets", {
    token: state.adminToken,
    body: {
      assetTag: `AUD-QA-${suffix}`,
      serialNumber: `AUD-QA-SN-${suffix}`,
      name: `Audit QA Asset ${suffix}`,
      categoryId: state.laptopCategoryId,
      departmentId,
      condition: "GOOD",
      location: `Audit Room ${suffix}`
    }
  });
  if (response.status !== 201) throw new Error(`Failed to create audit QA asset: HTTP ${response.status}`);
  return response.json.data;
};

const createAudit = (body, token = state.managerToken) =>
  request("POST", "/api/audits", {
    token,
    body
  });

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
  state.operationsDepartmentId = departmentItems.find((department) => department.code === "OPS")?.id;

  const categories = await request("GET", "/api/categories", { token: state.adminToken });
  const categoryItems = items(categories.json);
  state.laptopCategoryId = categoryItems.find((category) => category.code === "LAP")?.id;
};

const writeReport = () => {
  const rows = results
    .map(
      (result) =>
        `| ${escapeMd(result.endpoint)} | ${escapeMd(result.check)} | ${result.expectedStatus} | ${result.actualStatus} | ${result.result} | ${escapeMd(result.rootCause || "None observed.")} |`
    )
    .join("\n");

  const perfRows = performanceObservations
    .filter((entry) => entry.endpoint.includes("/api/audits") || entry.endpoint.includes("/api/reports/audits") || entry.endpoint.includes("/api/dashboard"))
    .slice(-90)
    .map((entry) => `| ${escapeMd(entry.endpoint)} | ${entry.status} | ${entry.durationMs} ms |`)
    .join("\n");

  const failed = results.filter((result) => result.result === "FAIL").length;
  const report = `# Audit QA Report

Generated: ${new Date().toISOString()}

## Summary

| Metric | Value |
| --- | ---: |
| Checks | ${results.length} |
| Passed | ${results.length - failed} |
| Failed | ${failed} |

## Endpoints Covered

- \`GET /api/audits\`
- \`GET /api/audits/:id\`
- \`POST /api/audits\`
- \`PATCH /api/audits/:id\`
- \`DELETE /api/audits/:id\`
- \`POST /api/audits/:id/start\`
- \`POST /api/audits/:id/verify\`
- \`POST /api/audits/:id/complete\`
- \`POST /api/audits/:id/close\`
- \`GET /api/audits/:id/discrepancies\`
- \`GET /api/reports/audits\`

## Checks Performed

| Endpoint | Check | Expected Status | Actual Status | Result | Root Cause |
| --- | --- | ---: | ---: | --- | --- |
${rows}

## Performance Observations

| Request | Status | Duration |
| --- | ---: | ---: |
${perfRows}

## Business Rules Verified

- Audit APIs require authentication and role scope.
- Managers are scoped to department audits.
- Employees can view and verify assigned assets only.
- Audit lifecycle transitions are enforced.
- Assets cannot be verified twice in one audit.
- Audits cannot complete until all assigned assets are reviewed.
- Closed audits cannot be modified.
- Discrepancies are generated for missing/damaged/wrong-location findings.
- Notifications and activity logs are generated.

## Known Limitations

- Audit scopes are captured as asset snapshots at audit creation time.
- Legacy one-off audit record creation remains supported through \`POST /api/audits\` with \`assetId/result\`.
`;

  fs.writeFileSync(path.join(artifactsDir, "audit-qa-report.md"), report);
};

const refreshAuditResponse = async () => {
  const audits = await request("GET", "/api/audits?page=1&limit=5", { token: state.adminToken });
  const audit = audits.json?.data?.items?.[0];
  const detail = audit ? await request("GET", `/api/audits/${audit.id}`, { token: state.adminToken }) : null;
  const discrepancies = audit
    ? await request("GET", `/api/audits/${audit.id}/discrepancies`, { token: state.adminToken })
    : null;
  const [report, dashboard] = await Promise.all([
    request("GET", "/api/reports/audits", { token: state.adminToken }),
    request("GET", "/api/dashboard/overview", { token: state.adminToken })
  ]);

  writeJson("audit-response.json", {
    audits: audits.json,
    detail: detail?.json ?? null,
    discrepancies: discrepancies?.json ?? null,
    report: report.json,
    dashboard: dashboard.json
  });
};

const runChecks = async () => {
  await getSeedContext();
  const stamp = Date.now();

  expectStatus("GET", "/api/audits", "Audit list requires authentication", 401, await request("GET", "/api/audits"));
  expectStatus("GET", "/api/audits", "Admin can list audits", 200, await request("GET", "/api/audits", { token: state.adminToken }), isPaginated);

  const employeeAsset = await createAsset(`${stamp}-EMP`);
  const damagedAsset = await createAsset(`${stamp}-DMG`);
  const missingAsset = await createAsset(`${stamp}-MISS`);
  const outsideAsset = await createAsset(`${stamp}-OUTSIDE`, state.operationsDepartmentId);

  const allocation = await request("POST", "/api/allocations", {
    token: state.adminToken,
    body: { assetId: employeeAsset.id, userId: state.employeeId, notes: "Audit QA employee assignment" }
  });
  expectStatus("POST", "/api/allocations", "Audit QA employee asset can be allocated", 201, allocation);

  const auditCreate = await createAudit({
    title: "Audit QA Cycle",
    description: "Generated by audit QA",
    departmentId: state.itDepartmentId,
    assignedAuditorId: state.auditorId,
    assetIds: [employeeAsset.id, damagedAsset.id, missingAsset.id]
  });
  expectStatus("POST", "/api/audits", "Manager can create department audit", 201, auditCreate, (payload) => payload?.data?.status === "PLANNED" && payload?.data?.totalAssets === 3);
  state.auditId = auditCreate.json?.data?.id;

  expectStatus("GET", "/api/audits/:id", "Employee can fetch assigned audit", 200, await request("GET", `/api/audits/${state.auditId}`, { token: state.employeeToken }));
  expectStatus("GET", "/api/audits/:id", "Admin can fetch audit detail", 200, await request("GET", `/api/audits/${state.auditId}`, { token: state.adminToken }), (payload) => payload?.data?.records?.length === 3);
  expectStatus("GET", "/api/audits/:id", "Missing audit returns not found", 404, await request("GET", `/api/audits/${zeroUuid}`, { token: state.adminToken }));
  expectStatus("GET", "/api/audits/:id", "Invalid audit UUID is rejected", 400, await request("GET", "/api/audits/not-a-uuid", { token: state.adminToken }));

  expectStatus("PATCH", "/api/audits/:id", "Manager can update planned audit metadata", 200, await request("PATCH", `/api/audits/${state.auditId}`, {
    token: state.managerToken,
    body: { title: "Audit QA Cycle Updated" }
  }), (payload) => payload?.data?.title === "Audit QA Cycle Updated");

  expectStatus("POST", "/api/audits/:id/complete", "Planned audit cannot complete", 409, await request("POST", `/api/audits/${state.auditId}/complete`, { token: state.managerToken }));
  expectStatus("POST", "/api/audits/:id/start", "Manager can start planned audit", 200, await request("POST", `/api/audits/${state.auditId}/start`, { token: state.managerToken }), (payload) => payload?.data?.status === "ACTIVE");
  expectStatus("POST", "/api/audits/:id/start", "Already active audit cannot start again", 409, await request("POST", `/api/audits/${state.auditId}/start`, { token: state.managerToken }));

  expectStatus("POST", "/api/audits/:id/verify", "Asset outside audit scope is rejected", 409, await request("POST", `/api/audits/${state.auditId}/verify`, {
    token: state.adminToken,
    body: { assetId: outsideAsset.id, result: "VERIFIED", remarks: "Outside scope" }
  }));

  expectStatus("POST", "/api/audits/:id/verify", "Employee can verify assigned asset", 200, await request("POST", `/api/audits/${state.auditId}/verify`, {
    token: state.employeeToken,
    body: {
      assetId: employeeAsset.id,
      result: "VERIFIED",
      locationVerified: employeeAsset.location,
      conditionVerified: "GOOD",
      departmentVerifiedId: state.itDepartmentId,
      allocationUserVerifiedId: state.employeeId,
      remarks: "Employee verified assigned laptop"
    }
  }), (payload) => payload?.data?.result === "VERIFIED" && payload?.data?.verifiedBy?.id === state.employeeId);

  expectStatus("POST", "/api/audits/:id/verify", "Duplicate verification is rejected", 409, await request("POST", `/api/audits/${state.auditId}/verify`, {
    token: state.employeeToken,
    body: { assetId: employeeAsset.id, result: "VERIFIED" }
  }));
  expectStatus("POST", "/api/audits/:id/complete", "Cannot complete until every asset is reviewed", 409, await request("POST", `/api/audits/${state.auditId}/complete`, { token: state.managerToken }));

  expectStatus("POST", "/api/audits/:id/verify", "Manager can verify damaged asset and generate discrepancy", 200, await request("POST", `/api/audits/${state.auditId}/verify`, {
    token: state.managerToken,
    body: {
      assetId: damagedAsset.id,
      result: "DAMAGED",
      locationVerified: "Unexpected Lab",
      conditionVerified: "DAMAGED",
      departmentVerifiedId: state.itDepartmentId,
      remarks: "Cracked display"
    }
  }), (payload) => payload?.data?.result === "DAMAGED");

  expectStatus("POST", "/api/audits/:id/verify", "Auditor can verify missing asset", 200, await request("POST", `/api/audits/${state.auditId}/verify`, {
    token: state.auditorToken,
    body: {
      assetId: missingAsset.id,
      result: "MISSING",
      locationVerified: "Not found",
      remarks: "Asset not found during audit"
    }
  }), (payload) => payload?.data?.result === "MISSING");

  expectStatus("GET", "/api/assets/:id", "Missing verification marks asset lost", 200, await request("GET", `/api/assets/${missingAsset.id}`, { token: state.adminToken }), (payload) => payload?.data?.status === "LOST");

  expectStatus("GET", "/api/audits/:id/discrepancies", "Discrepancy report returns generated findings", 200, await request("GET", `/api/audits/${state.auditId}/discrepancies`, { token: state.adminToken }), (payload) => payload?.data?.items?.some((item) => item.type === "DAMAGED_ASSET") && payload?.data?.items?.some((item) => item.type === "MISSING_ASSET"));

  expectStatus("POST", "/api/audits/:id/complete", "Manager can complete fully verified audit", 200, await request("POST", `/api/audits/${state.auditId}/complete`, { token: state.managerToken }), (payload) => payload?.data?.status === "COMPLETED" && payload?.data?.completionPercentage === 100);
  expectStatus("POST", "/api/audits/:id/close", "Manager can close completed audit", 200, await request("POST", `/api/audits/${state.auditId}/close`, { token: state.managerToken }), (payload) => payload?.data?.status === "CLOSED");
  expectStatus("PATCH", "/api/audits/:id", "Closed audit cannot be modified", 409, await request("PATCH", `/api/audits/${state.auditId}`, {
    token: state.managerToken,
    body: { title: "Should fail" }
  }));

  const plannedDelete = await createAudit({
    title: "Audit QA Delete",
    departmentId: state.itDepartmentId,
    assetIds: [employeeAsset.id]
  });
  state.deleteAuditId = plannedDelete.json?.data?.id;
  expectStatus("DELETE", "/api/audits/:id", "Manager can delete planned audit", 200, await request("DELETE", `/api/audits/${state.deleteAuditId}`, { token: state.managerToken }));

  const activeDelete = await createAudit({
    title: "Audit QA Active Delete",
    departmentId: state.itDepartmentId,
    assetIds: [damagedAsset.id]
  });
  const activeDeleteId = activeDelete.json?.data?.id;
  await request("POST", `/api/audits/${activeDeleteId}/start`, { token: state.managerToken });
  expectStatus("DELETE", "/api/audits/:id", "Active audit cannot be deleted", 409, await request("DELETE", `/api/audits/${activeDeleteId}`, { token: state.managerToken }));

  const opsAudit = await createAudit({
    title: "Audit QA Ops",
    departmentId: state.operationsDepartmentId,
    assetIds: [outsideAsset.id]
  }, state.adminToken);
  state.opsAuditId = opsAudit.json?.data?.id;
  expectStatus("POST", "/api/audits/:id/start", "Manager cannot start another department audit", 403, await request("POST", `/api/audits/${state.opsAuditId}/start`, { token: state.managerToken }));
  expectStatus("GET", "/api/audits/:id", "Employee cannot fetch unrelated audit", 403, await request("GET", `/api/audits/${state.opsAuditId}`, { token: state.employeeToken }));

  expectStatus("POST", "/api/audits", "Legacy audit record creation remains supported", 201, await request("POST", "/api/audits", {
    token: state.adminToken,
    body: { assetId: damagedAsset.id, result: "VERIFIED", remarks: "Legacy compatibility" }
  }), (payload) => payload?.data?.result === "VERIFIED");

  expectStatus("GET", "/api/audits", "Audit list supports filters", 200, await request("GET", "/api/audits?status=CLOSED&page=1&limit=5", { token: state.adminToken }), isPaginated);
  expectStatus("GET", "/api/reports/audits", "Audit report exposes analytics", 200, await request("GET", "/api/reports/audits", { token: state.adminToken }), (payload) => typeof payload?.data?.completionPercentage === "number" && Array.isArray(payload?.data?.departmentCompliance));
  expectStatus("GET", "/api/dashboard/overview", "Dashboard includes audit metrics", 200, await request("GET", "/api/dashboard/overview", { token: state.adminToken }), (payload) => typeof payload?.data?.overview?.activeAudits === "number" && typeof payload?.data?.overview?.discrepanciesFound === "number");
  expectStatus("GET", "/api/notifications", "Audit notifications are generated", 200, await request("GET", "/api/notifications", { token: state.managerToken }), (payload) => JSON.stringify(payload).includes("AUDIT_STARTED") && JSON.stringify(payload).includes("AUDIT_ASSET_DAMAGED"));
  expectStatus("GET", "/api/audit-logs?entityType=Audit", "Audit activity logs are generated", 200, await request("GET", "/api/audit-logs?entityType=Audit", { token: state.adminToken }), (payload) => payload?.data?.items?.length >= 6);
};

const main = async () => {
  seedDatabase();
  await runChecks();
  await refreshAuditResponse();
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

  if (failed.length > 0) process.exit(1);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
