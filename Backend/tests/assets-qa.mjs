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
const hasAssetRelations = (asset) =>
  Boolean(asset?.category && "currentAllocation" in asset && "maintenanceStatus" in asset && asset?.createdBy);

const getSeedContext = async () => {
  state.adminToken = await login("admin@assetflow.local");
  state.managerToken = await login("manager@assetflow.local");
  state.employeeToken = await login("employee@assetflow.local");
  state.auditorToken = await login("auditor@assetflow.local");

  const departments = await request("GET", "/api/departments", { token: state.adminToken });
  const departmentItems = items(departments.json);
  state.itDepartmentId = departmentItems.find((department) => department.code === "IT")?.id;
  state.operationsDepartmentId = departmentItems.find((department) => department.code === "OPS")?.id;

  const categories = await request("GET", "/api/categories", { token: state.adminToken });
  const categoryItems = items(categories.json);
  state.laptopCategoryId = categoryItems.find((category) => category.code === "LAP")?.id;
  state.monitorCategoryId = categoryItems.find((category) => category.code === "MON")?.id;

  const assets = await request("GET", "/api/assets", { token: state.adminToken });
  const assetItems = items(assets.json);
  state.allocatedAssetId = assetItems.find((asset) => asset.assetCode === "LAP-001")?.id;
  state.operationsAssetId = assetItems.find((asset) => asset.department?.code === "OPS")?.id;
};

const writeReport = () => {
  const rows = results
    .map(
      (result) =>
        `| ${escapeMd(result.endpoint)} | ${escapeMd(result.check)} | ${result.expectedStatus} | ${result.actualStatus} | ${result.result} | ${escapeMd(result.rootCause || "None observed.")} |`
    )
    .join("\n");

  const perfRows = performanceObservations
    .filter((entry) => entry.endpoint.includes("/api/assets"))
    .slice(-40)
    .map((entry) => `| ${escapeMd(entry.endpoint)} | ${entry.status} | ${entry.durationMs} ms |`)
    .join("\n");

  const failed = results.filter((result) => result.result === "FAIL").length;
  const report = `# Assets QA Report

Generated: ${new Date().toISOString()}

## Summary

| Metric | Value |
| --- | ---: |
| Checks | ${results.length} |
| Passed | ${results.length - failed} |
| Failed | ${failed} |

## Endpoints Covered

- \`GET /api/assets\`
- \`GET /api/assets/lookup\`
- \`GET /api/assets/:id\`
- \`POST /api/assets\`
- \`PATCH /api/assets/:id\`
- \`DELETE /api/assets/:id\`
- \`GET /api/assets/:id/qr\`

## Checks Performed

| Endpoint | Check | Expected Status | Actual Status | Result | Root Cause |
| --- | --- | ---: | ---: | --- | --- |
${rows}

## Performance Observations

| Request | Status | Duration |
| --- | ---: | ---: |
${perfRows}

Asset list, lookup, and detail endpoints use bounded pagination/selects with eager-loaded relations for category, department, current allocation, maintenance status, creator, and updater. Local response times were within demo expectations.

## Known Limitations

- Asset tag is stored internally as \`assetCode\`; responses also expose \`assetTag\` for frontend naming.
- QR code lookup uses the generated QR value \`assetflow:asset:<assetId>:<assetCode>\`; no separate QR table is stored.
- Asset delete is a soft delete implemented as \`status=RETIRED\`; historical records remain queryable.
- Employee read access follows the documented ownership policy: bookable assets and actively assigned assets.
`;

  fs.writeFileSync(path.join(artifactsDir, "assets-qa-report.md"), report);
};

const refreshAssetsResponse = async () => {
  const adminToken = await login("admin@assetflow.local");
  const list = await request("GET", "/api/assets?page=1&limit=5&sortBy=name&sortOrder=asc", { token: adminToken });
  const firstAsset = list.json?.data?.items?.[0];
  const detail = firstAsset ? await request("GET", `/api/assets/${firstAsset.id}`, { token: adminToken }) : null;
  const lookup = firstAsset
    ? await request("GET", `/api/assets/lookup?assetTag=${encodeURIComponent(firstAsset.assetTag)}`, {
        token: adminToken
      })
    : null;
  const qr = firstAsset ? await request("GET", `/api/assets/${firstAsset.id}/qr`, { token: adminToken }) : null;

  writeJson("assets-response.json", {
    list: list.json,
    detail: detail?.json ?? null,
    lookup: lookup?.json ?? null,
    qr: qr?.json ?? null
  });
};

const runChecks = async () => {
  await getSeedContext();

  expectStatus("GET", "/api/assets", "Asset list requires authentication", 401, await request("GET", "/api/assets"));
  expectStatus("GET", "/api/assets", "Admin can list assets with useful relations", 200, await request("GET", "/api/assets", { token: state.adminToken }), (payload) => isPaginated(payload) && hasAssetRelations(payload.data.items[0]));
  expectStatus("GET", "/api/assets?search=LAP", "Search filter matches asset name or tag", 200, await request("GET", "/api/assets?search=LAP", { token: state.adminToken }), isPaginated);
  expectStatus("GET", "/api/assets?page=1&limit=2&sortBy=name&sortOrder=asc", "Pagination and sorting work", 200, await request("GET", "/api/assets?page=1&limit=2&sortBy=name&sortOrder=asc", { token: state.adminToken }), (payload) => isPaginated(payload) && payload.data.limit === 2);
  expectStatus("GET", "/api/assets?categoryId=:id", "Category filter works", 200, await request("GET", `/api/assets?categoryId=${state.laptopCategoryId}`, { token: state.adminToken }), isPaginated);
  expectStatus("GET", "/api/assets?departmentId=:id", "Department filter works", 200, await request("GET", `/api/assets?departmentId=${state.itDepartmentId}`, { token: state.adminToken }), isPaginated);
  expectStatus("GET", "/api/assets?status=AVAILABLE", "Status filter validates and works", 200, await request("GET", "/api/assets?status=AVAILABLE", { token: state.adminToken }), isPaginated);
  expectStatus("GET", "/api/assets?serialNumber=SN-LAP-001", "Serial number filter works", 200, await request("GET", "/api/assets?serialNumber=SN-LAP-001", { token: state.adminToken }), isPaginated);
  expectStatus("GET", "/api/assets?assetTag=LAP-001", "Asset tag filter works", 200, await request("GET", "/api/assets?assetTag=LAP-001", { token: state.adminToken }), isPaginated);
  expectStatus("GET", "/api/assets?location=Store", "Location filter works", 200, await request("GET", "/api/assets?location=Store", { token: state.adminToken }), isPaginated);
  expectStatus("GET", "/api/assets?status=NOT_REAL", "Invalid status is rejected", 400, await request("GET", "/api/assets?status=NOT_REAL", { token: state.adminToken }));

  expectStatus("GET", "/api/assets", "Manager can list department-scoped assets", 200, await request("GET", "/api/assets", { token: state.managerToken }), isPaginated);
  expectStatus("GET", "/api/assets?departmentId=:other", "Manager cannot filter another department", 403, await request("GET", `/api/assets?departmentId=${state.operationsDepartmentId}`, { token: state.managerToken }));
  expectStatus("GET", "/api/assets", "Employee has read-only asset list access", 200, await request("GET", "/api/assets", { token: state.employeeToken }), isPaginated);
  expectStatus("GET", "/api/assets", "Auditor has read-only asset list access", 200, await request("GET", "/api/assets", { token: state.auditorToken }), isPaginated);

  const stamp = Date.now();
  const createBody = {
    assetTag: `QA-ASSET-${stamp}`,
    serialNumber: `QA-SN-${stamp}`,
    name: "QA Asset Laptop",
    description: "Created by assets QA",
    categoryId: state.laptopCategoryId,
    departmentId: state.itDepartmentId,
    condition: "GOOD",
    location: "QA Lab",
    purchaseValue: 1200,
    purchaseDate: "2026-07-01T00:00:00.000Z",
    warrantyExpiry: "2027-07-01T00:00:00.000Z",
    isBookable: true
  };

  const createdAsset = await request("POST", "/api/assets", {
    token: state.adminToken,
    body: createBody
  });
  expectStatus("POST", "/api/assets", "Admin can register asset using assetTag", 201, createdAsset, (payload) => payload?.data?.assetTag === createBody.assetTag);
  state.createdAssetId = createdAsset.json?.data?.id;
  state.createdAssetQrCode = createdAsset.json?.data?.qrCode;

  expectStatus("POST", "/api/assets", "Duplicate asset tag is rejected", 409, await request("POST", "/api/assets", {
    token: state.adminToken,
    body: { ...createBody, serialNumber: `QA-SN-DUP-${stamp}` }
  }));
  expectStatus("POST", "/api/assets", "Duplicate serial number is rejected", 409, await request("POST", "/api/assets", {
    token: state.adminToken,
    body: { ...createBody, assetTag: `QA-ASSET-DUP-${stamp}` }
  }));
  expectStatus("POST", "/api/assets", "Missing required asset tag is rejected", 400, await request("POST", "/api/assets", {
    token: state.adminToken,
    body: { ...createBody, assetTag: undefined, assetCode: undefined }
  }));
  expectStatus("POST", "/api/assets", "Invalid category is rejected", 404, await request("POST", "/api/assets", {
    token: state.adminToken,
    body: { ...createBody, assetTag: `QA-BAD-CAT-${stamp}`, serialNumber: `QA-BAD-CAT-SN-${stamp}`, categoryId: zeroUuid }
  }));
  expectStatus("POST", "/api/assets", "Invalid department is rejected", 404, await request("POST", "/api/assets", {
    token: state.adminToken,
    body: { ...createBody, assetTag: `QA-BAD-DEPT-${stamp}`, serialNumber: `QA-BAD-DEPT-SN-${stamp}`, departmentId: zeroUuid }
  }));
  expectStatus("POST", "/api/assets", "Employee cannot create asset", 403, await request("POST", "/api/assets", {
    token: state.employeeToken,
    body: { ...createBody, assetTag: `QA-EMP-${stamp}`, serialNumber: `QA-EMP-SN-${stamp}` }
  }));

  const tempCategory = await request("POST", "/api/categories", {
    token: state.adminToken,
    body: { name: `QA Deleted Category ${stamp}`, code: `QADC${String(stamp).slice(-4)}` }
  });
  const tempCategoryId = tempCategory.json?.data?.id;
  await request("DELETE", `/api/categories/${tempCategoryId}`, { token: state.adminToken });
  expectStatus("POST", "/api/assets", "Inactive category is rejected", 400, await request("POST", "/api/assets", {
    token: state.adminToken,
    body: { ...createBody, assetTag: `QA-INACTIVE-CAT-${stamp}`, serialNumber: `QA-INACTIVE-CAT-SN-${stamp}`, categoryId: tempCategoryId }
  }));

  const tempDepartment = await request("POST", "/api/departments", {
    token: state.adminToken,
    body: { name: `QA Deleted Department ${stamp}`, code: `QADD${String(stamp).slice(-4)}` }
  });
  const tempDepartmentId = tempDepartment.json?.data?.id;
  await request("DELETE", `/api/departments/${tempDepartmentId}`, { token: state.adminToken });
  expectStatus("POST", "/api/assets", "Inactive department is rejected", 400, await request("POST", "/api/assets", {
    token: state.adminToken,
    body: { ...createBody, assetTag: `QA-INACTIVE-DEPT-${stamp}`, serialNumber: `QA-INACTIVE-DEPT-SN-${stamp}`, departmentId: tempDepartmentId }
  }));

  const managerCreatedAsset = await request("POST", "/api/assets", {
    token: state.managerToken,
    body: {
      assetTag: `QA-MGR-${stamp}`,
      serialNumber: `QA-MGR-SN-${stamp}`,
      name: "Manager QA Asset",
      categoryId: state.monitorCategoryId,
      departmentId: state.itDepartmentId
    }
  });
  expectStatus("POST", "/api/assets", "Manager can create asset in assigned department", 201, managerCreatedAsset, (payload) => payload?.data?.departmentId === state.itDepartmentId);
  expectStatus("POST", "/api/assets", "Manager cannot create asset in another department", 403, await request("POST", "/api/assets", {
    token: state.managerToken,
    body: {
      assetTag: `QA-MGR-BLOCKED-${stamp}`,
      serialNumber: `QA-MGR-BLOCKED-SN-${stamp}`,
      name: "Manager Blocked Asset",
      categoryId: state.monitorCategoryId,
      departmentId: state.operationsDepartmentId
    }
  }));

  expectStatus("GET", "/api/assets/:id", "Admin can fetch asset detail", 200, await request("GET", `/api/assets/${state.createdAssetId}`, { token: state.adminToken }), (payload) => hasAssetRelations(payload?.data));
  expectStatus("GET", "/api/assets/:id", "Missing asset returns not found", 404, await request("GET", `/api/assets/${zeroUuid}`, { token: state.adminToken }));
  expectStatus("GET", "/api/assets/:id", "Invalid asset UUID is rejected", 400, await request("GET", "/api/assets/not-a-uuid", { token: state.adminToken }));
  expectStatus("GET", "/api/assets/:id", "Manager cannot fetch another department asset", 403, await request("GET", `/api/assets/${state.operationsAssetId}`, { token: state.managerToken }));

  const updatedAsset = await request("PATCH", `/api/assets/${state.createdAssetId}`, {
    token: state.adminToken,
    body: {
      assetTag: `QA-ASSET-UPD-${stamp}`,
      serialNumber: `QA-SN-UPD-${stamp}`,
      location: "QA Lab Updated",
      condition: "FAIR"
    }
  });
  expectStatus("PATCH", "/api/assets/:id", "Admin can update asset metadata and identifiers", 200, updatedAsset, (payload) => payload?.data?.serialNumber === `QA-SN-UPD-${stamp}`);
  expectStatus("PATCH", "/api/assets/:id", "Duplicate serial update is rejected", 409, await request("PATCH", `/api/assets/${state.createdAssetId}`, {
    token: state.adminToken,
    body: { serialNumber: "SN-LAP-001" }
  }));
  expectStatus("PATCH", "/api/assets/:id", "Invalid status update is rejected", 400, await request("PATCH", `/api/assets/${state.createdAssetId}`, {
    token: state.adminToken,
    body: { status: "NOT_REAL" }
  }));
  expectStatus("PATCH", "/api/assets/:id", "Missing asset update returns not found", 404, await request("PATCH", `/api/assets/${zeroUuid}`, {
    token: state.adminToken,
    body: { location: "Nowhere" }
  }));
  expectStatus("PATCH", "/api/assets/:id", "Manager cannot update another department asset", 403, await request("PATCH", `/api/assets/${state.operationsAssetId}`, {
    token: state.managerToken,
    body: { location: "Blocked" }
  }));
  expectStatus("PATCH", "/api/assets/:id", "Auditor cannot update asset", 403, await request("PATCH", `/api/assets/${state.createdAssetId}`, {
    token: state.auditorToken,
    body: { location: "Blocked" }
  }));

  expectStatus("GET", "/api/assets/lookup", "Lookup requires a search value", 400, await request("GET", "/api/assets/lookup", { token: state.adminToken }));
  expectStatus("GET", "/api/assets/lookup?assetTag=:tag", "Lookup by asset tag works", 200, await request("GET", `/api/assets/lookup?assetTag=${encodeURIComponent(`QA-ASSET-UPD-${stamp}`)}`, { token: state.adminToken }), (payload) => payload?.data?.id === state.createdAssetId);
  expectStatus("GET", "/api/assets/lookup?serialNumber=:serial", "Lookup by serial number works", 200, await request("GET", `/api/assets/lookup?serialNumber=${encodeURIComponent(`QA-SN-UPD-${stamp}`)}`, { token: state.adminToken }), (payload) => payload?.data?.id === state.createdAssetId);
  expectStatus("GET", "/api/assets/lookup?qrCode=:qr", "Lookup by generated QR code works", 200, await request("GET", `/api/assets/lookup?qrCode=${encodeURIComponent(updatedAsset.json.data.qrCode)}`, { token: state.adminToken }), (payload) => payload?.data?.id === state.createdAssetId);
  expectStatus("GET", "/api/assets/lookup?q=:query", "Lookup by general query works", 200, await request("GET", "/api/assets/lookup?q=QA%20Asset%20Laptop", { token: state.adminToken }), (payload) => payload?.data?.id === state.createdAssetId);
  expectStatus("GET", "/api/assets/lookup?q=:missing", "Lookup missing asset returns not found", 404, await request("GET", "/api/assets/lookup?q=DOES-NOT-EXIST", { token: state.adminToken }));

  expectStatus("GET", "/api/assets?qrCode=:qr", "QR code list filter works", 200, await request("GET", `/api/assets?qrCode=${encodeURIComponent(updatedAsset.json.data.qrCode)}`, { token: state.adminToken }), (payload) => isPaginated(payload) && payload.data.total >= 1);
  expectStatus("GET", "/api/assets/:id/qr", "Admin can generate QR payload", 200, await request("GET", `/api/assets/${state.createdAssetId}/qr`, { token: state.adminToken }), (payload) => Boolean(payload?.data?.imageDataUrl && payload?.data?.qrValue));
  expectStatus("GET", "/api/assets/:id/qr", "Employee cannot generate QR payload", 403, await request("GET", `/api/assets/${state.createdAssetId}/qr`, { token: state.employeeToken }));

  expectStatus("DELETE", "/api/assets/:id", "Admin can soft-delete asset", 200, await request("DELETE", `/api/assets/${state.createdAssetId}`, { token: state.adminToken }), (payload) => payload?.data?.status === "RETIRED");
  expectStatus("DELETE", "/api/assets/:id", "Deleting allocated asset is rejected", 409, await request("DELETE", `/api/assets/${state.allocatedAssetId}`, { token: state.adminToken }));
  expectStatus("DELETE", "/api/assets/:id", "Employee cannot delete asset", 403, await request("DELETE", `/api/assets/${state.allocatedAssetId}`, { token: state.employeeToken }));
  expectStatus("DELETE", "/api/assets/:id", "Missing asset delete returns not found", 404, await request("DELETE", `/api/assets/${zeroUuid}`, { token: state.adminToken }));
};

const main = async () => {
  seedDatabase();
  await runChecks();
  seedDatabase();
  await refreshAssetsResponse();
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
