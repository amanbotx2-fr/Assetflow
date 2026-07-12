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

const getSeedContext = async () => {
  state.adminToken = await login("admin@assetflow.local");
  state.managerToken = await login("manager@assetflow.local");
  state.employeeToken = await login("employee@assetflow.local");
  state.auditorToken = await login("auditor@assetflow.local");

  const users = await request("GET", "/api/users", { token: state.adminToken });
  const userItems = items(users.json);
  state.managerId = userItems.find((user) => user.email === "manager@assetflow.local")?.id;
  state.auditorId = userItems.find((user) => user.email === "auditor@assetflow.local")?.id;
};

const writeReport = () => {
  const rows = results
    .map(
      (result) =>
        `| ${escapeMd(result.endpoint)} | ${escapeMd(result.check)} | ${result.expectedStatus} | ${result.actualStatus} | ${result.result} | ${escapeMd(result.rootCause || "None observed.")} |`
    )
    .join("\n");

  const perfRows = performanceObservations
    .filter((entry) => entry.endpoint.includes("/api/settings") || entry.endpoint.includes("/api/dashboard"))
    .map((entry) => `| ${escapeMd(entry.endpoint)} | ${entry.status} | ${entry.durationMs} ms |`)
    .join("\n");

  const failed = results.filter((result) => result.result === "FAIL").length;
  const report = `# Settings QA Report

Generated: ${new Date().toISOString()}

## Summary

| Metric | Value |
| --- | ---: |
| Checks | ${results.length} |
| Passed | ${results.length - failed} |
| Failed | ${failed} |

## Endpoints Covered

- \`GET /api/settings/company\`
- \`PATCH /api/settings/company\`
- \`GET /api/settings/profile\`
- \`PATCH /api/settings/profile\`
- \`GET /api/settings/roles\`
- \`GET /api/settings/permissions\`
- \`GET /api/settings/asset-configuration\`
- \`PATCH /api/settings/asset-configuration\`
- \`GET /api/settings/booking-policies\`
- \`PATCH /api/settings/booking-policies\`
- \`GET /api/settings/maintenance-policies\`
- \`PATCH /api/settings/maintenance-policies\`
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

- Company and policy mutations are admin-only.
- Managers and auditors can inspect organization settings and policies.
- Employees can read and update only their own profile/preferences.
- Role and permission metadata is read-only.
- Notification preferences are stored with user profile settings.
- Invalid payloads are rejected with validation errors.
- Invalid default maintenance technician assignment returns a conflict.
- Dashboard overview exposes company and profile settings summary.

## Known Limitations

- Settings are centralized defaults for the demo backend; existing workflow modules do not yet dynamically enforce every policy value.
- Role metadata and permissions are read-only because role editing is outside the hackathon MVP scope.
`;

  fs.writeFileSync(path.join(artifactsDir, "settings-qa-report.md"), report);
};

const run = async () => {
  ensureArtifactsDir();
  seedDatabase();
  await getSeedContext();

  const unauthenticated = await request("GET", "/api/settings/profile");
  expectStatus("GET", "/api/settings/profile", "Settings profile requires authentication", 401, unauthenticated);

  const company = await request("GET", "/api/settings/company", { token: state.adminToken });
  responses.company = company.json;
  expectStatus("GET", "/api/settings/company", "Admin can read company settings", 200, company, (payload) =>
    Boolean(payload?.data?.companyName && payload.data.workingHours)
  );

  const employeeCompany = await request("GET", "/api/settings/company", { token: state.employeeToken });
  expectStatus("GET", "/api/settings/company", "Employee cannot read organization settings", 403, employeeCompany);

  const updatedCompany = await request("PATCH", "/api/settings/company", {
    token: state.adminToken,
    body: {
      companyName: "AssetFlow QA Organization",
      logoUrl: "https://assetflow.local/logo.png",
      address: "QA Demo Office",
      timezone: "Asia/Kolkata",
      currency: "inr",
      language: "en-IN",
      workingHours: { start: "09:30", end: "18:30" },
      contactDetails: { email: "qa@assetflow.local", phone: "+91-9999999999" }
    }
  });
  responses.updatedCompany = updatedCompany.json;
  expectStatus("PATCH", "/api/settings/company", "Admin can update company settings", 200, updatedCompany, (payload) =>
    Boolean(payload?.data?.companyName === "AssetFlow QA Organization" && payload.data.currency === "INR")
  );

  const managerCompanyPatch = await request("PATCH", "/api/settings/company", {
    token: state.managerToken,
    body: { companyName: "Manager Attempt" }
  });
  expectStatus("PATCH", "/api/settings/company", "Manager cannot update company settings", 403, managerCompanyPatch);

  const invalidCompany = await request("PATCH", "/api/settings/company", {
    token: state.adminToken,
    body: { logoUrl: "not-a-url" }
  });
  expectStatus("PATCH", "/api/settings/company", "Invalid company payload is rejected", 400, invalidCompany);

  const profile = await request("GET", "/api/settings/profile", { token: state.employeeToken });
  responses.profile = profile.json;
  expectStatus("GET", "/api/settings/profile", "Employee can read own profile settings", 200, profile, (payload) =>
    Boolean(payload?.data?.user?.email === "employee@assetflow.local")
  );

  const updatedProfile = await request("PATCH", "/api/settings/profile", {
    token: state.employeeToken,
    body: {
      avatarUrl: "https://assetflow.local/avatar/employee.png",
      displayName: "Employee QA",
      theme: "DARK",
      timezone: "Asia/Kolkata",
      language: "en",
      notificationPreferences: {
        email: false,
        inApp: true,
        criticalOnly: true,
        muteCategories: ["BOOKING", "AUDIT"]
      }
    }
  });
  responses.updatedProfile = updatedProfile.json;
  expectStatus("PATCH", "/api/settings/profile", "Employee can update own profile preferences", 200, updatedProfile, (payload) =>
    Boolean(payload?.data?.theme === "DARK" && payload.data.notificationPreferences?.criticalOnly === true)
  );

  const invalidProfile = await request("PATCH", "/api/settings/profile", {
    token: state.employeeToken,
    body: { theme: "NEON" }
  });
  expectStatus("PATCH", "/api/settings/profile", "Invalid profile payload is rejected", 400, invalidProfile);

  const roles = await request("GET", "/api/settings/roles", { token: state.managerToken });
  responses.roles = roles.json;
  expectStatus("GET", "/api/settings/roles", "Manager can inspect roles", 200, roles, (payload) =>
    Boolean(Array.isArray(payload?.data?.roles) && payload.data.roles.some((role) => role.role === "ADMIN"))
  );

  const employeeRoles = await request("GET", "/api/settings/roles", { token: state.employeeToken });
  expectStatus("GET", "/api/settings/roles", "Employee cannot inspect role metadata", 403, employeeRoles);

  const permissions = await request("GET", "/api/settings/permissions", { token: state.auditorToken });
  responses.permissions = permissions.json;
  expectStatus("GET", "/api/settings/permissions", "Auditor can inspect permission matrix", 200, permissions, (payload) =>
    Boolean(payload?.data?.readOnly === true && Array.isArray(payload.data.matrix))
  );

  const assetConfiguration = await request("GET", "/api/settings/asset-configuration", { token: state.adminToken });
  responses.assetConfiguration = assetConfiguration.json;
  expectStatus("GET", "/api/settings/asset-configuration", "Admin can read asset configuration", 200, assetConfiguration, (payload) =>
    Boolean(payload?.data?.assetTagPrefix && payload.data.qrDefaults)
  );

  const updatedAssetConfiguration = await request("PATCH", "/api/settings/asset-configuration", {
    token: state.adminToken,
    body: {
      assetTagPrefix: "QA-AST",
      autoNumbering: true,
      qrDefaults: { includeCompanyName: true },
      defaultDepreciationYears: 6,
      retirementThresholdPercent: 75
    }
  });
  responses.updatedAssetConfiguration = updatedAssetConfiguration.json;
  expectStatus(
    "PATCH",
    "/api/settings/asset-configuration",
    "Admin can update asset configuration",
    200,
    updatedAssetConfiguration,
    (payload) => Boolean(payload?.data?.assetTagPrefix === "QA-AST" && payload.data.qrDefaults?.includeCompanyName === true)
  );

  const invalidAssetConfiguration = await request("PATCH", "/api/settings/asset-configuration", {
    token: state.adminToken,
    body: { assetTagPrefix: "bad prefix" }
  });
  expectStatus(
    "PATCH",
    "/api/settings/asset-configuration",
    "Invalid asset configuration payload is rejected",
    400,
    invalidAssetConfiguration
  );

  const bookingPolicies = await request("GET", "/api/settings/booking-policies", { token: state.managerToken });
  responses.bookingPolicies = bookingPolicies.json;
  expectStatus("GET", "/api/settings/booking-policies", "Manager can read booking policies", 200, bookingPolicies, (payload) =>
    Boolean(typeof payload?.data?.maxBookingDurationHours === "number")
  );

  const updatedBookingPolicies = await request("PATCH", "/api/settings/booking-policies", {
    token: state.adminToken,
    body: {
      maxBookingDurationHours: 6,
      requireApproval: true,
      advanceBookingLimitDays: 14,
      businessHours: { start: "10:00", end: "18:00" },
      allowWeekendBookings: false
    }
  });
  responses.updatedBookingPolicies = updatedBookingPolicies.json;
  expectStatus("PATCH", "/api/settings/booking-policies", "Admin can update booking policies", 200, updatedBookingPolicies, (payload) =>
    Boolean(payload?.data?.maxBookingDurationHours === 6 && payload.data.advanceBookingLimitDays === 14)
  );

  const invalidBookingPolicies = await request("PATCH", "/api/settings/booking-policies", {
    token: state.adminToken,
    body: { maxBookingDurationHours: 72, advanceBookingLimitDays: 1 }
  });
  expectStatus("PATCH", "/api/settings/booking-policies", "Invalid booking policy conflict is rejected", 400, invalidBookingPolicies);

  const maintenancePolicies = await request("GET", "/api/settings/maintenance-policies", { token: state.auditorToken });
  responses.maintenancePolicies = maintenancePolicies.json;
  expectStatus("GET", "/api/settings/maintenance-policies", "Auditor can read maintenance policies", 200, maintenancePolicies, (payload) =>
    Boolean(Array.isArray(payload?.data?.allowedPriorities))
  );

  const updatedMaintenancePolicies = await request("PATCH", "/api/settings/maintenance-policies", {
    token: state.adminToken,
    body: {
      defaultTechnicianId: state.managerId,
      autoAssignmentEnabled: true,
      allowedPriorities: ["MEDIUM", "HIGH", "CRITICAL"],
      escalationDays: 2
    }
  });
  responses.updatedMaintenancePolicies = updatedMaintenancePolicies.json;
  expectStatus(
    "PATCH",
    "/api/settings/maintenance-policies",
    "Admin can update maintenance policies",
    200,
    updatedMaintenancePolicies,
    (payload) => Boolean(payload?.data?.defaultTechnicianId === state.managerId && payload.data.autoAssignmentEnabled === true)
  );

  const missingTechnician = await request("PATCH", "/api/settings/maintenance-policies", {
    token: state.adminToken,
    body: { defaultTechnicianId: zeroUuid }
  });
  expectStatus("PATCH", "/api/settings/maintenance-policies", "Missing default technician returns 404", 404, missingTechnician);

  const invalidTechnician = await request("PATCH", "/api/settings/maintenance-policies", {
    token: state.adminToken,
    body: { defaultTechnicianId: state.auditorId }
  });
  expectStatus("PATCH", "/api/settings/maintenance-policies", "Invalid default technician role returns 409", 409, invalidTechnician);

  const auditorPatch = await request("PATCH", "/api/settings/maintenance-policies", {
    token: state.auditorToken,
    body: { escalationDays: 5 }
  });
  expectStatus("PATCH", "/api/settings/maintenance-policies", "Auditor cannot update policies", 403, auditorPatch);

  const missingRoute = await request("GET", "/api/settings/does-not-exist", { token: state.adminToken });
  expectStatus("GET", "/api/settings/does-not-exist", "Missing settings route returns 404", 404, missingRoute);

  const dashboard = await request("GET", "/api/dashboard/overview", { token: state.employeeToken });
  responses.dashboard = dashboard.json;
  expectStatus("GET", "/api/dashboard/overview", "Dashboard exposes settings summary", 200, dashboard, (payload) =>
    Boolean(payload?.data?.settings?.company?.companyName && payload.data.settings.profile?.theme)
  );

  writeJson("settings-response.json", responses);
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
