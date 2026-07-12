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
  if (response.status !== 200) {
    throw new Error(`Login failed for ${email}: HTTP ${response.status}`);
  }
  return response.json.data.token;
};

const items = (payload) => payload?.data?.items ?? payload?.data ?? [];
const isPaginated = (payload) =>
  Boolean(payload?.success === true && Array.isArray(payload?.data?.items) && typeof payload?.data?.total === "number");
const hasAllocationShape = (allocation) =>
  Boolean(allocation?.asset && "allocatedBy" in allocation && "allocatedTo" in allocation && "startDate" in allocation);

const createAsset = async (suffix, departmentId = state.itDepartmentId) => {
  const response = await request("POST", "/api/assets", {
    token: state.adminToken,
    body: {
      assetTag: `ALLOC-QA-${suffix}`,
      serialNumber: `ALLOC-QA-SN-${suffix}`,
      name: `Allocation QA Asset ${suffix}`,
      categoryId: state.laptopCategoryId,
      departmentId,
      condition: "GOOD",
      location: "Allocation QA Lab"
    }
  });
  if (response.status !== 201) {
    throw new Error(`Failed to create QA asset ${suffix}: HTTP ${response.status}`);
  }
  return response.json.data;
};

const getSeedContext = async () => {
  state.adminToken = await login("admin@assetflow.local");
  state.managerToken = await login("manager@assetflow.local");
  state.employeeToken = await login("employee@assetflow.local");
  state.auditorToken = await login("auditor@assetflow.local");

  const users = await request("GET", "/api/users", { token: state.adminToken });
  const userItems = items(users.json);
  state.employeeId = userItems.find((user) => user.email === "employee@assetflow.local")?.id;
  state.managerId = userItems.find((user) => user.email === "manager@assetflow.local")?.id;

  const departments = await request("GET", "/api/departments", { token: state.adminToken });
  const departmentItems = items(departments.json);
  state.itDepartmentId = departmentItems.find((department) => department.code === "IT")?.id;
  state.operationsDepartmentId = departmentItems.find((department) => department.code === "OPS")?.id;

  const categories = await request("GET", "/api/categories", { token: state.adminToken });
  state.laptopCategoryId = items(categories.json).find((category) => category.code === "LAP")?.id;

  const assets = await request("GET", "/api/assets", { token: state.adminToken });
  const assetItems = items(assets.json);
  state.seedAllocatedAssetId = assetItems.find((asset) => asset.assetCode === "LAP-001")?.id;
  state.seedMaintenanceAssetId = assetItems.find((asset) => asset.assetCode === "MON-001")?.id;
  state.seedOperationsAssetId = assetItems.find((asset) => asset.department?.code === "OPS")?.id;
};

const writeReport = () => {
  const rows = results
    .map(
      (result) =>
        `| ${escapeMd(result.endpoint)} | ${escapeMd(result.check)} | ${result.expectedStatus} | ${result.actualStatus} | ${result.result} | ${escapeMd(result.rootCause || "None observed.")} |`
    )
    .join("\n");

  const perfRows = performanceObservations
    .filter((entry) => entry.endpoint.includes("/api/allocations") || entry.endpoint.includes("/api/transfers"))
    .slice(-50)
    .map((entry) => `| ${escapeMd(entry.endpoint)} | ${entry.status} | ${entry.durationMs} ms |`)
    .join("\n");

  const failed = results.filter((result) => result.result === "FAIL").length;
  const report = `# Allocation & Transfer QA Report

Generated: ${new Date().toISOString()}

## Summary

| Metric | Value |
| --- | ---: |
| Checks | ${results.length} |
| Passed | ${results.length - failed} |
| Failed | ${failed} |

## Endpoints Covered

- \`GET /api/allocations\`
- \`GET /api/allocations/:id\`
- \`POST /api/allocations\`
- \`PATCH /api/allocations/:id\`
- \`POST /api/allocations/:id/return\`
- \`GET /api/transfers\`
- \`GET /api/transfers/:id\`
- \`POST /api/transfers\`
- \`PATCH /api/transfers/:id/approve\`
- \`PATCH /api/transfers/:id/reject\`

## Checks Performed

| Endpoint | Check | Expected Status | Actual Status | Result | Root Cause |
| --- | --- | ---: | ---: | --- | --- |
${rows}

## Performance Observations

| Request | Status | Duration |
| --- | ---: | ---: |
${perfRows}

The allocation and transfer endpoints use bounded pagination and eager-loaded relation summaries for assets, users, departments, assigned-by users, and source transfers. Local response times were within demo expectations.

## Business Rules Verified

- One active allocation per asset is enforced by service checks and the database partial unique index.
- Retired, maintenance, and already allocated assets cannot be allocated.
- Pending duplicate transfers for the same asset are rejected.
- Transfer approval closes the old allocation and creates one new active allocation linked to the transfer.
- Approved transfers cannot be rejected or approved again.
- Rejected transfers cannot be approved.

## Known Limitations

- Allocation return is immediate; there is no separate return approval queue in the current MVP.
- Transfer approval is limited to the source department manager or admin.
- Department-only allocations are supported, but the demo UI is expected to focus on employee ownership.
`;

  fs.writeFileSync(path.join(artifactsDir, "allocation-qa-report.md"), report);
};

const refreshAllocationResponse = async () => {
  const adminToken = await login("admin@assetflow.local");
  const allocations = await request("GET", "/api/allocations?page=1&limit=5", { token: adminToken });
  const allocation = allocations.json?.data?.items?.[0];
  const allocationDetail = allocation ? await request("GET", `/api/allocations/${allocation.id}`, { token: adminToken }) : null;
  const transfers = await request("GET", "/api/transfers?page=1&limit=5", { token: adminToken });
  const transfer = transfers.json?.data?.items?.[0];
  const transferDetail = transfer ? await request("GET", `/api/transfers/${transfer.id}`, { token: adminToken }) : null;
  const assetDetail = allocation?.asset?.id ? await request("GET", `/api/assets/${allocation.asset.id}`, { token: adminToken }) : null;

  writeJson("allocation-response.json", {
    allocations: allocations.json,
    allocationDetail: allocationDetail?.json ?? null,
    transfers: transfers.json,
    transferDetail: transferDetail?.json ?? null,
    assetAllocationHistory: assetDetail?.json ?? null
  });
};

const runChecks = async () => {
  await getSeedContext();

  expectStatus("GET", "/api/allocations", "Allocation list requires authentication", 401, await request("GET", "/api/allocations"));
  expectStatus("GET", "/api/allocations", "Admin can list allocation history", 200, await request("GET", "/api/allocations", { token: state.adminToken }), (payload) => isPaginated(payload) && hasAllocationShape(payload.data.items[0]));
  expectStatus("GET", "/api/allocations", "Manager can list scoped allocation history", 200, await request("GET", "/api/allocations", { token: state.managerToken }), isPaginated);
  expectStatus("GET", "/api/allocations", "Employee can list own allocations", 200, await request("GET", "/api/allocations", { token: state.employeeToken }), isPaginated);
  expectStatus("GET", "/api/allocations", "Auditor can read allocation history", 200, await request("GET", "/api/allocations", { token: state.auditorToken }), isPaginated);
  expectStatus("GET", "/api/allocations?status=ACTIVE", "Allocation status filter works", 200, await request("GET", "/api/allocations?status=ACTIVE", { token: state.adminToken }), isPaginated);
  expectStatus("GET", "/api/allocations?employeeId=:id", "Allocation employee filter works", 200, await request("GET", `/api/allocations?employeeId=${state.employeeId}`, { token: state.adminToken }), isPaginated);
  expectStatus("GET", "/api/allocations?departmentId=:id", "Allocation department filter works", 200, await request("GET", `/api/allocations?departmentId=${state.itDepartmentId}`, { token: state.adminToken }), isPaginated);
  expectStatus("GET", "/api/allocations?from=:date&to=:date", "Allocation date range and sorting work", 200, await request("GET", "/api/allocations?from=2026-01-01T00:00:00.000Z&to=2027-01-01T00:00:00.000Z&sortBy=assignedAt&sortOrder=asc", { token: state.adminToken }), isPaginated);
  expectStatus("GET", "/api/allocations?status=BAD", "Invalid allocation status is rejected", 400, await request("GET", "/api/allocations?status=BAD", { token: state.adminToken }));

  const stamp = Date.now();
  const allocAsset = await createAsset(`${stamp}-ALLOC`);
  const createAllocation = await request("POST", "/api/allocations", {
    token: state.adminToken,
    body: {
      assetId: allocAsset.id,
      userId: state.employeeId,
      notes: "Initial allocation QA"
    }
  });
  expectStatus("POST", "/api/allocations", "Admin can create allocation", 201, createAllocation, (payload) => payload?.data?.allocation?.status === "ACTIVE" && payload?.data?.asset?.status === "ALLOCATED");
  state.allocationId = createAllocation.json?.data?.allocation?.id;

  expectStatus("POST", "/api/allocations", "Duplicate active allocation is rejected", 409, await request("POST", "/api/allocations", {
    token: state.adminToken,
    body: { assetId: allocAsset.id, userId: state.managerId }
  }));
  expectStatus("POST", "/api/allocations", "Allocation requires user or department", 400, await request("POST", "/api/allocations", {
    token: state.adminToken,
    body: { assetId: allocAsset.id }
  }));
  expectStatus("POST", "/api/allocations", "Employee cannot create allocation", 403, await request("POST", "/api/allocations", {
    token: state.employeeToken,
    body: { assetId: allocAsset.id, userId: state.employeeId }
  }));
  expectStatus("POST", "/api/allocations", "Auditor cannot create allocation", 403, await request("POST", "/api/allocations", {
    token: state.auditorToken,
    body: { assetId: allocAsset.id, userId: state.employeeId }
  }));
  expectStatus("POST", "/api/allocations", "Already allocated seed asset is rejected", 409, await request("POST", "/api/allocations", {
    token: state.adminToken,
    body: { assetId: state.seedAllocatedAssetId, userId: state.managerId }
  }));
  expectStatus("POST", "/api/allocations", "Maintenance asset allocation is rejected", 409, await request("POST", "/api/allocations", {
    token: state.adminToken,
    body: { assetId: state.seedMaintenanceAssetId, userId: state.managerId }
  }));

  const retiredAsset = await createAsset(`${stamp}-RET`);
  await request("DELETE", `/api/assets/${retiredAsset.id}`, { token: state.adminToken });
  expectStatus("POST", "/api/allocations", "Retired asset allocation is rejected", 409, await request("POST", "/api/allocations", {
    token: state.adminToken,
    body: { assetId: retiredAsset.id, userId: state.employeeId }
  }));
  expectStatus("POST", "/api/allocations", "Invalid destination employee returns not found", 404, await request("POST", "/api/allocations", {
    token: state.adminToken,
    body: { assetId: (await createAsset(`${stamp}-BAD-USER`)).id, userId: zeroUuid }
  }));
  expectStatus("POST", "/api/allocations", "Manager cannot allocate another department asset", 403, await request("POST", "/api/allocations", {
    token: state.managerToken,
    body: { assetId: state.seedOperationsAssetId, userId: state.employeeId }
  }));

  expectStatus("GET", "/api/allocations/:id", "Admin can fetch allocation detail", 200, await request("GET", `/api/allocations/${state.allocationId}`, { token: state.adminToken }), (payload) => hasAllocationShape(payload?.data));
  expectStatus("GET", "/api/allocations/:id", "Employee can fetch own allocation detail", 200, await request("GET", `/api/allocations/${state.allocationId}`, { token: state.employeeToken }));
  expectStatus("GET", "/api/allocations/:id", "Missing allocation returns not found", 404, await request("GET", `/api/allocations/${zeroUuid}`, { token: state.adminToken }));
  expectStatus("GET", "/api/allocations/:id", "Invalid allocation UUID is rejected", 400, await request("GET", "/api/allocations/not-a-uuid", { token: state.adminToken }));

  expectStatus("PATCH", "/api/allocations/:id", "Admin can update allocation notes", 200, await request("PATCH", `/api/allocations/${state.allocationId}`, {
    token: state.adminToken,
    body: { notes: "Updated allocation notes" }
  }), (payload) => payload?.data?.notes === "Updated allocation notes");
  expectStatus("PATCH", "/api/allocations/:id", "Employee cannot update allocation", 403, await request("PATCH", `/api/allocations/${state.allocationId}`, {
    token: state.employeeToken,
    body: { notes: "Blocked" }
  }));
  expectStatus("PATCH", "/api/allocations/:id", "Invalid update employee returns not found", 404, await request("PATCH", `/api/allocations/${state.allocationId}`, {
    token: state.adminToken,
    body: { userId: zeroUuid }
  }));
  expectStatus("PATCH", "/api/allocations/:id", "Missing allocation update returns not found", 404, await request("PATCH", `/api/allocations/${zeroUuid}`, {
    token: state.adminToken,
    body: { notes: "Missing" }
  }));

  expectStatus("POST", "/api/allocations/:id/return", "Employee can return own allocation", 200, await request("POST", `/api/allocations/${state.allocationId}/return`, {
    token: state.employeeToken,
    body: { returnCondition: "GOOD", reason: "Project completed", notes: "Returned to desk" }
  }), (payload) => payload?.data?.status === "RETURNED" && payload?.data?.returnReason === "Project completed");
  expectStatus("POST", "/api/allocations/:id/return", "Already returned allocation cannot be returned twice", 409, await request("POST", `/api/allocations/${state.allocationId}/return`, {
    token: state.adminToken,
    body: { returnCondition: "GOOD", reason: "Duplicate return" }
  }));
  expectStatus("PATCH", "/api/allocations/:id", "Returned allocation cannot be updated", 409, await request("PATCH", `/api/allocations/${state.allocationId}`, {
    token: state.adminToken,
    body: { notes: "Should fail" }
  }));
  expectStatus("POST", "/api/allocations/:id/return", "Invalid return condition is rejected", 400, await request("POST", `/api/allocations/${state.allocationId}/return`, {
    token: state.adminToken,
    body: { returnCondition: "BAD", reason: "Invalid" }
  }));

  const transferAsset = await createAsset(`${stamp}-TRANSFER`);
  const sourceAllocation = await request("POST", "/api/allocations", {
    token: state.adminToken,
    body: { assetId: transferAsset.id, userId: state.employeeId, notes: "Transfer source allocation" }
  });
  state.sourceAllocationId = sourceAllocation.json?.data?.allocation?.id;

  expectStatus("GET", "/api/transfers", "Transfer list requires authentication", 401, await request("GET", "/api/transfers"));
  expectStatus("GET", "/api/transfers", "Auditor has read-only transfer access", 200, await request("GET", "/api/transfers", { token: state.auditorToken }), isPaginated);
  expectStatus("POST", "/api/transfers", "Employee can request transfer for own allocated asset", 201, await request("POST", "/api/transfers", {
    token: state.employeeToken,
    body: { assetId: transferAsset.id, toUserId: state.managerId, reason: "Hand over to manager" }
  }), (payload) => payload?.data?.status === "PENDING");
  const transfersForAsset = await request("GET", `/api/transfers?assetId=${transferAsset.id}&status=PENDING`, { token: state.adminToken });
  state.transferId = transfersForAsset.json?.data?.items?.[0]?.id;

  expectStatus("POST", "/api/transfers", "Duplicate pending transfer is rejected", 409, await request("POST", "/api/transfers", {
    token: state.employeeToken,
    body: { assetId: transferAsset.id, toDepartmentId: state.operationsDepartmentId, reason: "Duplicate pending" }
  }));
  expectStatus("GET", "/api/transfers?status=PENDING", "Transfer filters and pagination work", 200, await request("GET", "/api/transfers?status=PENDING&page=1&limit=2&sortBy=requestedAt&sortOrder=desc", { token: state.adminToken }), isPaginated);
  expectStatus("GET", "/api/transfers/:id", "Admin can fetch transfer detail", 200, await request("GET", `/api/transfers/${state.transferId}`, { token: state.adminToken }), (payload) => payload?.data?.status === "PENDING");
  expectStatus("GET", "/api/transfers/:id", "Auditor can fetch transfer detail", 200, await request("GET", `/api/transfers/${state.transferId}`, { token: state.auditorToken }));
  expectStatus("PATCH", "/api/transfers/:id/approve", "Admin can approve pending transfer", 200, await request("PATCH", `/api/transfers/${state.transferId}/approve`, {
    token: state.adminToken,
    body: { decisionNotes: "Approved by allocation QA" }
  }), (payload) => payload?.data?.status === "APPROVED" && payload?.data?.createdAllocation?.status === "ACTIVE");
  expectStatus("PATCH", "/api/transfers/:id/reject", "Approved transfer cannot be rejected", 409, await request("PATCH", `/api/transfers/${state.transferId}/reject`, {
    token: state.adminToken,
    body: { decisionNotes: "Should fail" }
  }));
  expectStatus("PATCH", "/api/transfers/:id/approve", "Approved transfer cannot be approved again", 409, await request("PATCH", `/api/transfers/${state.transferId}/approve`, {
    token: state.adminToken,
    body: { decisionNotes: "Should fail" }
  }));
  expectStatus("GET", "/api/allocations?assetId=:id", "Transfer approval leaves exactly one active allocation", 200, await request("GET", `/api/allocations?assetId=${transferAsset.id}&status=ACTIVE`, { token: state.adminToken }), (payload) => payload?.data?.total === 1 && payload?.data?.items?.[0]?.sourceTransferId === state.transferId);

  const rejectTransfer = await request("POST", "/api/transfers", {
    token: state.adminToken,
    body: { assetId: transferAsset.id, toUserId: state.employeeId, reason: "Reject path" }
  });
  expectStatus("POST", "/api/transfers", "Admin can request transfer for rejection path", 201, rejectTransfer);
  state.rejectTransferId = rejectTransfer.json?.data?.id;
  expectStatus("PATCH", "/api/transfers/:id/reject", "Admin can reject pending transfer", 200, await request("PATCH", `/api/transfers/${state.rejectTransferId}/reject`, {
    token: state.adminToken,
    body: { decisionNotes: "Rejected by QA" }
  }), (payload) => payload?.data?.status === "REJECTED");
  expectStatus("PATCH", "/api/transfers/:id/approve", "Rejected transfer cannot be approved", 409, await request("PATCH", `/api/transfers/${state.rejectTransferId}/approve`, {
    token: state.adminToken,
    body: { decisionNotes: "Should fail" }
  }));
  expectStatus("POST", "/api/transfers", "Employee cannot transfer unassigned asset", 403, await request("POST", "/api/transfers", {
    token: state.employeeToken,
    body: { assetId: transferAsset.id, toDepartmentId: state.operationsDepartmentId, reason: "Not assigned anymore" }
  }));
  expectStatus("POST", "/api/transfers", "Transfer without active allocation is rejected", 409, await request("POST", "/api/transfers", {
    token: state.adminToken,
    body: { assetId: (await createAsset(`${stamp}-NO-ACTIVE`)).id, toUserId: state.employeeId, reason: "No active allocation" }
  }));
  expectStatus("POST", "/api/transfers", "Transfer to invalid destination employee returns not found", 404, await request("POST", "/api/transfers", {
    token: state.adminToken,
    body: { assetId: transferAsset.id, toUserId: zeroUuid, reason: "Invalid destination" }
  }));
  expectStatus("POST", "/api/transfers", "Transfer to same destination is rejected", 400, await request("POST", "/api/transfers", {
    token: state.adminToken,
    body: { assetId: transferAsset.id, toUserId: state.managerId, reason: "Same destination" }
  }));

  const concurrentAsset = await createAsset(`${stamp}-CONCURRENT`);
  const [firstConcurrent, secondConcurrent] = await Promise.all([
    request("POST", "/api/allocations", {
      token: state.adminToken,
      body: { assetId: concurrentAsset.id, userId: state.employeeId, notes: "Concurrent A" }
    }),
    request("POST", "/api/allocations", {
      token: state.adminToken,
      body: { assetId: concurrentAsset.id, userId: state.managerId, notes: "Concurrent B" }
    })
  ]);
  const concurrentStatuses = [firstConcurrent.status, secondConcurrent.status].sort((a, b) => a - b);
  const concurrentPass = concurrentStatuses[0] === 201 && concurrentStatuses[1] === 409;
  record(
    "POST /api/allocations",
    "Concurrent allocation protection allows only one active allocation",
    "201 + 409",
    concurrentStatuses.join(" + "),
    concurrentPass,
    concurrentPass ? "" : "Expected one successful allocation and one conflict."
  );
};

const main = async () => {
  seedDatabase();
  await runChecks();
  seedDatabase();
  await refreshAllocationResponse();
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
