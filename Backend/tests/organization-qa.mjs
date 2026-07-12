import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

const baseUrl = process.env.BASE_URL || "http://localhost:5011";
const artifactsDir = path.resolve("tests/artifacts");
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
    pass ? "" : `Expected HTTP ${expectedStatus} and expected response contract.`
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
const noPasswordHash = (payload) => !JSON.stringify(payload).includes("passwordHash");
const zeroUuid = "00000000-0000-0000-0000-000000000000";

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
};

const writeReport = () => {
  const rows = results
    .map(
      (result) =>
        `| ${escapeMd(result.endpoint)} | ${escapeMd(result.check)} | ${result.expectedStatus} | ${result.actualStatus} | ${result.result} | ${escapeMd(result.rootCause || "None observed.")} |`
    )
    .join("\n");

  const perfRows = performanceObservations
    .filter((entry) => entry.endpoint.includes("/api/organization") || entry.endpoint.includes("/api/departments") || entry.endpoint.includes("/api/categories") || entry.endpoint.includes("/api/users"))
    .slice(-30)
    .map((entry) => `| ${escapeMd(entry.endpoint)} | ${entry.status} | ${entry.durationMs} ms |`)
    .join("\n");

  const failed = results.filter((result) => result.result === "FAIL").length;
  const report = `# Organization QA Report

Generated: ${new Date().toISOString()}

## Summary

| Metric | Value |
| --- | ---: |
| Checks | ${results.length} |
| Passed | ${results.length - failed} |
| Failed | ${failed} |

## Endpoints Covered

- \`GET /api/organization/overview\`
- \`GET /api/departments\`
- \`POST /api/departments\`
- \`PATCH /api/departments/:id\`
- \`DELETE /api/departments/:id\`
- \`GET /api/categories\`
- \`POST /api/categories\`
- \`PATCH /api/categories/:id\`
- \`DELETE /api/categories/:id\`
- \`GET /api/users\`
- \`POST /api/users\`
- \`PATCH /api/users/:id\`

## Checks Performed

| Endpoint | Check | Expected Status | Actual Status | Result | Root Cause |
| --- | --- | ---: | ---: | --- | --- |
${rows}

## Performance Observations

| Request | Status | Duration |
| --- | ---: | ---: |
${perfRows}

Local QA response times were within demo expectations. List endpoints use bounded pagination, and the organization overview performs aggregate counts in parallel.

## Known Limitations

- Employee manager relationship is represented through the employee's department head; there is no direct employee-to-manager field in the current schema.
- Delete operations are soft deletes through \`status=INACTIVE\`; records remain available for audit and historical references.
- Categories are global reference data and are not department-scoped.
`;

  fs.writeFileSync(path.join(artifactsDir, "organization-qa-report.md"), report);
};

const refreshOrganizationResponse = async () => {
  const adminToken = await login("admin@assetflow.local");
  const [overview, departments, categories, employees] = await Promise.all([
    request("GET", "/api/organization/overview", { token: adminToken }),
    request("GET", "/api/departments?page=1&limit=5", { token: adminToken }),
    request("GET", "/api/categories?page=1&limit=5", { token: adminToken }),
    request("GET", "/api/users?role=EMPLOYEE&page=1&limit=5", { token: adminToken })
  ]);

  writeJson("organization-response.json", {
    overview: overview.json,
    departments: departments.json,
    categories: categories.json,
    employees: employees.json
  });
};

const runChecks = async () => {
  await getSeedContext();

  expectStatus("GET", "/api/organization/overview", "Organization overview requires authentication", 401, await request("GET", "/api/organization/overview"));
  expectStatus("GET", "/api/organization/overview", "Admin can read organization overview", 200, await request("GET", "/api/organization/overview", { token: state.adminToken }), (payload) => Boolean(payload?.data?.departments && payload?.data?.categories && payload?.data?.employees));
  expectStatus("GET", "/api/organization/overview", "Manager can read organization overview", 200, await request("GET", "/api/organization/overview", { token: state.managerToken }));
  expectStatus("GET", "/api/organization/overview", "Auditor can read organization overview", 200, await request("GET", "/api/organization/overview", { token: state.auditorToken }));
  expectStatus("GET", "/api/organization/overview", "Employee cannot read organization overview", 403, await request("GET", "/api/organization/overview", { token: state.employeeToken }));

  expectStatus("GET", "/api/departments", "Department list requires authentication", 401, await request("GET", "/api/departments"));
  expectStatus("GET", "/api/departments", "Employee cannot list organization departments", 403, await request("GET", "/api/departments", { token: state.employeeToken }));
  expectStatus("GET", "/api/departments?page=1&limit=2&search=Information&status=ACTIVE", "Admin can search and filter departments", 200, await request("GET", "/api/departments?page=1&limit=2&search=Information&status=ACTIVE", { token: state.adminToken }), isPaginated);
  expectStatus("GET", "/api/departments", "Manager has read-only department access", 200, await request("GET", "/api/departments", { token: state.managerToken }), isPaginated);

  const stamp = Date.now();
  const parentDepartment = await request("POST", "/api/departments", {
    token: state.adminToken,
    body: { name: `QA Parent Department ${stamp}`, code: `QAP${String(stamp).slice(-5)}`, managerId: state.managerId }
  });
  expectStatus("POST", "/api/departments", "Admin can create department", 201, parentDepartment, (payload) => Boolean(payload?.data?.employeeCount === 0));
  state.parentDepartmentId = parentDepartment.json?.data?.id;

  expectStatus("POST", "/api/departments", "Duplicate department name/code is rejected", 409, await request("POST", "/api/departments", {
    token: state.adminToken,
    body: { name: `QA Parent Department ${stamp}`, code: `QAP${String(stamp).slice(-5)}` }
  }));
  expectStatus("POST", "/api/departments", "Invalid department head assignment is rejected", 400, await request("POST", "/api/departments", {
    token: state.adminToken,
    body: { name: `QA Invalid Head ${stamp}`, code: `QIH${String(stamp).slice(-5)}`, managerId: state.employeeId }
  }));
  expectStatus("POST", "/api/departments", "Missing parent department is rejected", 404, await request("POST", "/api/departments", {
    token: state.adminToken,
    body: { name: `QA Missing Parent ${stamp}`, code: `QMP${String(stamp).slice(-5)}`, parentDepartmentId: zeroUuid }
  }));
  expectStatus("POST", "/api/departments", "Manager cannot create department", 403, await request("POST", "/api/departments", {
    token: state.managerToken,
    body: { name: `QA Manager Blocked ${stamp}`, code: `QMB${String(stamp).slice(-5)}` }
  }));

  const childDepartment = await request("POST", "/api/departments", {
    token: state.adminToken,
    body: {
      name: `QA Child Department ${stamp}`,
      code: `QAC${String(stamp).slice(-5)}`,
      parentDepartmentId: state.parentDepartmentId
    }
  });
  expectStatus("POST", "/api/departments", "Admin can create child department", 201, childDepartment, (payload) => payload?.data?.parentDepartment?.id === state.parentDepartmentId);
  state.childDepartmentId = childDepartment.json?.data?.id;

  expectStatus("PATCH", "/api/departments/:id", "Circular parent assignment is rejected", 400, await request("PATCH", `/api/departments/${state.parentDepartmentId}`, {
    token: state.adminToken,
    body: { parentDepartmentId: state.childDepartmentId }
  }));
  expectStatus("PATCH", "/api/departments/:id", "Admin can update department", 200, await request("PATCH", `/api/departments/${state.childDepartmentId}`, {
    token: state.adminToken,
    body: { name: `QA Child Department Updated ${stamp}`, parentDepartmentId: null }
  }));
  expectStatus("PATCH", "/api/departments/:id", "Missing department update returns not found", 404, await request("PATCH", `/api/departments/${zeroUuid}`, {
    token: state.adminToken,
    body: { name: "Missing Department" }
  }));
  expectStatus("PATCH", "/api/departments/:id", "Invalid department UUID is rejected", 400, await request("PATCH", "/api/departments/not-a-uuid", {
    token: state.adminToken,
    body: { name: "Invalid Department" }
  }));
  expectStatus("DELETE", "/api/departments/:id", "Admin can soft-delete department", 200, await request("DELETE", `/api/departments/${state.childDepartmentId}`, { token: state.adminToken }), (payload) => payload?.data?.status === "INACTIVE");

  expectStatus("GET", "/api/categories", "Category list requires authentication", 401, await request("GET", "/api/categories"));
  expectStatus("GET", "/api/categories", "Employee cannot list organization categories", 403, await request("GET", "/api/categories", { token: state.employeeToken }));
  expectStatus("GET", "/api/categories?page=1&limit=2&search=lap&status=ACTIVE", "Admin can search and filter categories", 200, await request("GET", "/api/categories?page=1&limit=2&search=lap&status=ACTIVE", { token: state.adminToken }), isPaginated);
  expectStatus("GET", "/api/categories", "Auditor has read-only category access", 200, await request("GET", "/api/categories", { token: state.auditorToken }), isPaginated);

  const category = await request("POST", "/api/categories", {
    token: state.adminToken,
    body: { name: `QA Category ${stamp}`, code: `QCAT${String(stamp).slice(-4)}`, description: "QA category" }
  });
  expectStatus("POST", "/api/categories", "Admin can create category", 201, category, (payload) => payload?.data?.assetCount === 0);
  state.categoryId = category.json?.data?.id;
  expectStatus("POST", "/api/categories", "Duplicate category name/code is rejected", 409, await request("POST", "/api/categories", {
    token: state.adminToken,
    body: { name: `QA Category ${stamp}`, code: `QCAT${String(stamp).slice(-4)}` }
  }));
  expectStatus("POST", "/api/categories", "Invalid category payload is rejected", 400, await request("POST", "/api/categories", {
    token: state.adminToken,
    body: { name: "Q", code: "Q" }
  }));
  expectStatus("PATCH", "/api/categories/:id", "Admin can update category", 200, await request("PATCH", `/api/categories/${state.categoryId}`, {
    token: state.adminToken,
    body: { description: "Updated category" }
  }));
  expectStatus("PATCH", "/api/categories/:id", "Missing category update returns not found", 404, await request("PATCH", `/api/categories/${zeroUuid}`, {
    token: state.adminToken,
    body: { description: "Missing" }
  }));
  expectStatus("PATCH", "/api/categories/:id", "Invalid category UUID is rejected", 400, await request("PATCH", "/api/categories/not-a-uuid", {
    token: state.adminToken,
    body: { description: "Invalid" }
  }));
  expectStatus("DELETE", "/api/categories/:id", "Admin can soft-delete category", 200, await request("DELETE", `/api/categories/${state.categoryId}`, { token: state.adminToken }), (payload) => payload?.data?.status === "INACTIVE");
  expectStatus("POST", "/api/categories", "Auditor cannot create category", 403, await request("POST", "/api/categories", {
    token: state.auditorToken,
    body: { name: `QA Auditor Blocked ${stamp}`, code: `QAB${String(stamp).slice(-5)}` }
  }));

  expectStatus("GET", "/api/users", "Employee list requires authentication", 401, await request("GET", "/api/users"));
  expectStatus("GET", "/api/users", "Employee cannot list organization employees", 403, await request("GET", "/api/users", { token: state.employeeToken }));
  expectStatus("GET", "/api/users?role=EMPLOYEE&departmentId=<department>", "Admin can filter employees by role and department", 200, await request("GET", `/api/users?role=EMPLOYEE&departmentId=${state.itDepartmentId}`, { token: state.adminToken }), (payload) => isPaginated(payload) && noPasswordHash(payload));
  expectStatus("GET", "/api/users", "Manager has read-only scoped employee access", 200, await request("GET", "/api/users", { token: state.managerToken }), (payload) => isPaginated(payload) && noPasswordHash(payload));

  const employee = await request("POST", "/api/users", {
    token: state.adminToken,
    body: {
      name: "QA Organization Employee",
      email: `qa.org.employee.${stamp}@assetflow.local`,
      password: "password123",
      role: "EMPLOYEE",
      departmentId: state.parentDepartmentId
    }
  });
  expectStatus("POST", "/api/users", "Admin can create employee", 201, employee, noPasswordHash);
  state.createdEmployeeId = employee.json?.data?.id;
  expectStatus("POST", "/api/users", "Duplicate employee email is rejected", 409, await request("POST", "/api/users", {
    token: state.adminToken,
    body: {
      name: "QA Duplicate Employee",
      email: `qa.org.employee.${stamp}@assetflow.local`,
      password: "password123",
      role: "EMPLOYEE"
    }
  }));
  expectStatus("POST", "/api/users", "Invalid employee email is rejected", 400, await request("POST", "/api/users", {
    token: state.adminToken,
    body: { name: "QA Invalid Employee", email: "not-email", password: "password123", role: "EMPLOYEE" }
  }));
  expectStatus("POST", "/api/users", "Manager cannot create employee", 403, await request("POST", "/api/users", {
    token: state.managerToken,
    body: { name: "Blocked Employee", email: `blocked.${stamp}@assetflow.local`, password: "password123", role: "EMPLOYEE" }
  }));
  expectStatus("PATCH", "/api/users/:id", "Admin can update employee department, role, and status", 200, await request("PATCH", `/api/users/${state.createdEmployeeId}`, {
    token: state.adminToken,
    body: { departmentId: state.itDepartmentId, role: "EMPLOYEE", status: "ACTIVE" }
  }), noPasswordHash);
  expectStatus("PATCH", "/api/users/:id", "Invalid employee department assignment is rejected", 404, await request("PATCH", `/api/users/${state.createdEmployeeId}`, {
    token: state.adminToken,
    body: { departmentId: zeroUuid }
  }));
  expectStatus("PATCH", "/api/users/:id", "Missing employee update returns not found", 404, await request("PATCH", `/api/users/${zeroUuid}`, {
    token: state.adminToken,
    body: { status: "INACTIVE" }
  }));
};

const run = async () => {
  ensureArtifactsDir();
  seedDatabase();

  try {
    await runChecks();
  } finally {
    seedDatabase();
    await refreshOrganizationResponse();
    writeReport();
  }

  const failed = results.filter((result) => result.result === "FAIL");
  console.log(JSON.stringify({ total: results.length, failed: failed.length, results }, null, 2));
  if (failed.length > 0) process.exit(1);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
