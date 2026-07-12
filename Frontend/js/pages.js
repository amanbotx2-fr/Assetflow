import {
  apiFetch,
  badge,
  escapeHtml,
  formatCurrency,
  formatDate,
  formatDateTime,
  getErrorMessage,
  normalizeList,
  normalizePagination,
  titleCase,
  unwrap
} from "./api.js";
import { refreshIcons, renderState, setActions, showToast } from "./layout.js";

const pageSize = 10;

function valueFrom(item, path, defaultValue = "Not set") {
  const value = path.split(".").reduce((current, key) => current?.[key], item);
  return value ?? defaultValue;
}

function asNumber(value) {
  return Number(value || 0);
}

function assetTag(asset) {
  return asset.assetTag || asset.assetCode || asset.serialNumber || asset.id;
}

function emptyPanel(message, detail = "No backend records matched this view.") {
  return `
    <div class="panel">
      <div class="panel__body text-center">
        <div class="state-icon status-info"><i data-lucide="inbox"></i></div>
        <h3 class="panel__title mt-3">${escapeHtml(message)}</h3>
        <p class="entity-meta">${escapeHtml(detail)}</p>
      </div>
    </div>
  `;
}

function metricCards(metrics) {
  return `
    <div class="metric-grid ${metrics.length > 4 ? "metric-grid--six" : ""} mb-6">
      ${metrics.map((metric) => `
        <article class="metric-card">
          <div class="metric-card__top">
            <div class="metric-card__label">${escapeHtml(metric.label)}</div>
            <span class="icon-box"><i data-lucide="${metric.icon}"></i></span>
          </div>
          <strong class="metric-card__value">${escapeHtml(metric.value)}</strong>
          <span class="entity-meta">${escapeHtml(metric.meta || "")}</span>
        </article>
      `).join("")}
    </div>
  `;
}

function table(headers, rows, emptyText) {
  if (!rows.length) return emptyPanel(emptyText);
  return `
    <div class="table-shell">
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
          <tbody>${rows.join("")}</tbody>
        </table>
      </div>
    </div>
  `;
}

function pagination(meta) {
  const page = meta.page || 1;
  const totalPages = meta.totalPages || Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || pageSize)));
  return `
    <div class="pagination-row">
      <span class="entity-meta">Page ${page} of ${totalPages}, ${meta.total || 0} records</span>
      <div class="pagination-buttons">
        <button class="page-button" type="button" data-page-prev ${page <= 1 ? "disabled" : ""}><i data-lucide="chevron-left"></i></button>
        <button class="page-button active" type="button">${page}</button>
        <button class="page-button" type="button" data-page-next ${page >= totalPages ? "disabled" : ""}><i data-lucide="chevron-right"></i></button>
      </div>
    </div>
  `;
}

function bindPager(container, meta, onChange) {
  container.querySelector("[data-page-prev]")?.addEventListener("click", () => onChange(Math.max(1, (meta.page || 1) - 1)));
  container.querySelector("[data-page-next]")?.addEventListener("click", () => onChange(Math.min(meta.totalPages || 1, (meta.page || 1) + 1)));
}

function chip(label, count, color = "status-info") {
  return `<span class="chip"><span class="status-dot ${color}"></span>${escapeHtml(label)}<span class="chip__count">${escapeHtml(count)}</span></span>`;
}

function toIsoFromDateTime(date, time) {
  if (!date || !time) return "";
  return new Date(`${date}T${time}`).toISOString();
}

function createOptionRows(items, labelPath = "name") {
  return items.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(valueFrom(item, labelPath, item.name || item.id))}</option>`).join("");
}

async function fetchList(path, keys, query = {}) {
  const response = await apiFetch(path, { query });
  return {
    payload: response,
    items: normalizeList(response, keys),
    pagination: normalizePagination(response, unwrap(response))
  };
}

export const pageRenderers = {
  dashboard: renderDashboard,
  organization: renderOrganization,
  assets: renderAssets,
  allocation: renderAllocation,
  booking: renderBooking,
  maintenance: renderMaintenance,
  audit: renderAudit,
  reports: renderReports,
  notifications: renderNotifications
};

export async function renderDashboard(content) {
  setActions(`
    <a class="btn-base btn-secondary" href="reports.html"><i data-lucide="bar-chart-3"></i> View Reports</a>
    <a class="btn-base btn-primary" href="assets.html"><i data-lucide="plus"></i> Register Asset</a>
  `);
  renderState(content, "loading", "Loading dashboard from backend");

  const data = unwrap(await apiFetch("/dashboard/overview"));
  const overview = data.overview || {};
  const alerts = data.alerts || [];
  const activity = data.recentActivity || data.latestActivity || [];
  const notifications = data.notifications?.recent || [];

  content.innerHTML = `
    ${metricCards([
      { label: "Available Assets", value: overview.availableAssets ?? 0, meta: "Ready for allocation", icon: "package-check" },
      { label: "Allocated Assets", value: overview.allocatedAssets ?? 0, meta: "Currently assigned", icon: "user-check" },
      { label: "Maintenance", value: overview.maintenanceAssets ?? overview.pendingMaintenance ?? 0, meta: "Open maintenance state", icon: "wrench" },
      { label: "Active Bookings", value: overview.activeBookings ?? 0, meta: "Approved or live", icon: "calendar-check" },
      { label: "Pending Transfers", value: overview.pendingTransfers ?? 0, meta: "Needs approval", icon: "arrow-left-right" },
      { label: "Notifications", value: overview.unreadNotifications ?? overview.notificationBadgeCount ?? 0, meta: "Unread items", icon: "bell-ring" }
    ])}
    <div class="section-grid">
      <section class="panel span-8">
        <div class="panel__header"><h2 class="panel__title">Lifecycle Flow</h2>${badge("ACTIVE")}</div>
        <div class="panel__body">
          <div class="chart-bars" aria-label="Asset lifecycle chart">
            ${[
              ["Available", overview.availableAssets || 0, "var(--color-success)"],
              ["Allocated", overview.allocatedAssets || 0, "var(--color-transition)"],
              ["Bookings", overview.activeBookings || 0, "var(--color-info)"],
              ["Maintenance", overview.maintenanceAssets || overview.pendingMaintenance || 0, "var(--color-maintenance)"],
              ["Transfers", overview.pendingTransfers || 0, "var(--color-warning)"]
            ].map(([label, value, color]) => `
              <div class="chart-column">
                <div class="chart-bar" style="height:${Math.max(8, Number(value) * 14)}px; background:${color};"></div>
                <span>${escapeHtml(label)}</span>
              </div>
            `).join("")}
          </div>
          <div class="chip-row mt-4">
            ${chip("Total assets", overview.totalAssets ?? 0, "status-info")}
            ${chip("Pending verification", overview.pendingVerification ?? 0, "status-warning")}
            ${chip("Discrepancies", overview.discrepanciesFound ?? 0, "status-danger")}
          </div>
        </div>
      </section>
      <section class="panel span-4">
        <div class="panel__header"><h2 class="panel__title">Priority Alerts</h2><a class="text-small text-primary" href="notifications.html">View all</a></div>
        <div class="panel__body stack">
          ${alerts.length ? alerts.map((alert) => `
            <article class="work-card">
              <div class="d-flex align-items-center justify-content-between gap-3">
                <strong>${escapeHtml(alert.title || alert.type || "Alert")}</strong>
                ${badge(alert.priority || alert.type || "INFO")}
              </div>
              <p class="entity-meta mt-2 mb-0">${escapeHtml(alert.message || alert.description || "")}</p>
            </article>
          `).join("") : emptyPanel("No priority alerts", "The backend returned an empty alerts list.")}
        </div>
      </section>
      <section class="panel span-7">
        <div class="panel__header"><h2 class="panel__title">Recent Activity</h2></div>
        <div class="panel__body">
          ${activity.length ? `<div class="timeline">
            ${activity.map((item) => `
              <div class="timeline-item">
                <strong>${escapeHtml(item.title || item.type || item.action || "Activity")}</strong>
                <p class="entity-meta mt-1 mb-0">${escapeHtml(item.description || item.message || item.entityType || "")}</p>
                <span class="text-caption text-muted">${escapeHtml(formatDateTime(item.createdAt || item.timestamp || item.updatedAt))}</span>
              </div>
            `).join("")}
          </div>` : emptyPanel("No recent activity", "Lifecycle activity will appear here after backend workflows run.")}
        </div>
      </section>
      <section class="panel span-5">
        <div class="panel__header"><h2 class="panel__title">Recent Notifications</h2></div>
        <div class="panel__body stack">
          ${notifications.length ? notifications.slice(0, 4).map((item) => `
            <article class="work-card">
              <strong>${escapeHtml(item.title || item.type || "Notification")}</strong>
              <p class="entity-meta mb-0 mt-2">${escapeHtml(item.message || "")}</p>
            </article>
          `).join("") : emptyPanel("No notification items", "Unread and recent notifications will appear here.")}
        </div>
      </section>
    </div>
  `;
  refreshIcons();
}

export async function renderOrganization(content) {
  setActions(`<button class="btn-base btn-primary" id="openOrgAdd" type="button"><i data-lucide="plus"></i> Add Record</button>`);
  renderState(content, "loading", "Loading organization setup");

  const [overviewData, departmentsData, categoriesData, usersData] = await Promise.all([
    apiFetch("/organization/overview"),
    fetchList("/departments", ["departments"], { page: 1, limit: 100 }),
    fetchList("/categories", ["categories"], { page: 1, limit: 100 }),
    fetchList("/users", ["users"], { page: 1, limit: 100 })
  ]);

  const overview = unwrap(overviewData);
  const departments = departmentsData.items;
  const categories = categoriesData.items;
  const users = usersData.items;

  content.innerHTML = `
    ${metricCards([
      { label: "Departments", value: overview.departments?.total ?? departments.length, meta: `${overview.departments?.active ?? departments.length} active`, icon: "building-2" },
      { label: "Categories", value: overview.categories?.total ?? categories.length, meta: "Asset taxonomy", icon: "tags" },
      { label: "Employees", value: overview.employees?.total ?? users.length, meta: `${overview.employees?.active ?? users.length} active`, icon: "users" },
      { label: "Role Coverage", value: "4", meta: "Admin, Manager, Employee, Auditor", icon: "shield" }
    ])}
    <div class="panel">
      <div class="panel__header">
        <div class="tab-list" role="tablist">
          <button class="tab-button active" type="button" data-org-tab="departments">Departments</button>
          <button class="tab-button" type="button" data-org-tab="categories">Categories</button>
          <button class="tab-button" type="button" data-org-tab="employees">Employees</button>
          <button class="tab-button" type="button" data-org-tab="add">Add</button>
        </div>
      </div>
      <div class="panel__body" id="orgTabPanel"></div>
    </div>
  `;

  const panel = content.querySelector("#orgTabPanel");
  const renderTab = (tab) => {
    content.querySelectorAll("[data-org-tab]").forEach((button) => button.classList.toggle("active", button.dataset.orgTab === tab));
    if (tab === "departments") {
      panel.innerHTML = table(
        ["Department", "Head", "Employees", "Assets", "Status"],
        departments.map((department) => `
          <tr>
            <td><div class="entity-cell"><span class="entity-icon"><i data-lucide="building-2"></i></span><div><div class="entity-title">${escapeHtml(department.name)}</div><div class="entity-meta">${escapeHtml(department.code || department.id)}</div></div></div></td>
            <td>${escapeHtml(valueFrom(department, "departmentHead.name", valueFrom(department, "manager.name")))}</td>
            <td>${escapeHtml(department.employeeCount ?? department._count?.users ?? 0)}</td>
            <td>${escapeHtml(department.assetCount ?? department._count?.assets ?? 0)}</td>
            <td>${badge(department.status)}</td>
          </tr>
        `),
        "No departments found"
      );
    }
    if (tab === "categories") {
      panel.innerHTML = table(
        ["Category", "Description", "Assets", "Status"],
        categories.map((category) => `
          <tr>
            <td><div class="entity-cell"><span class="entity-icon"><i data-lucide="tag"></i></span><div><div class="entity-title">${escapeHtml(category.name)}</div><div class="entity-meta">${escapeHtml(category.code || category.id)}</div></div></div></td>
            <td>${escapeHtml(category.description || "No description")}</td>
            <td>${escapeHtml(category.assetCount ?? category._count?.assets ?? 0)}</td>
            <td>${badge(category.status)}</td>
          </tr>
        `),
        "No categories found"
      );
    }
    if (tab === "employees") {
      panel.innerHTML = table(
        ["Employee", "Department", "Role", "Status"],
        users.map((user) => `
          <tr>
            <td><div class="entity-cell"><span class="user-avatar">${escapeHtml((user.name || user.email || "AF").slice(0, 2).toUpperCase())}</span><div><div class="entity-title">${escapeHtml(user.name || "Unnamed employee")}</div><div class="entity-meta">${escapeHtml(user.email)}</div></div></div></td>
            <td>${escapeHtml(valueFrom(user, "department.name"))}</td>
            <td>${badge(user.role)}</td>
            <td>${badge(user.status || "ACTIVE")}</td>
          </tr>
        `),
        "No employees found"
      );
    }
    if (tab === "add") {
      panel.innerHTML = `
        <form class="form-grid" id="orgAddForm">
          <label class="form-field"><span>Record type</span><select class="input-base" name="type"><option value="department">Department</option><option value="category">Category</option><option value="employee">Employee</option></select></label>
          <label class="form-field"><span>Name</span><input class="input-base" name="name" required></label>
          <label class="form-field"><span>Code or email</span><input class="input-base" name="codeOrEmail" required></label>
          <label class="form-field"><span>Role</span><select class="input-base" name="role"><option>EMPLOYEE</option><option>MANAGER</option><option>AUDITOR</option><option>ADMIN</option></select></label>
          <label class="form-field"><span>Department</span><select class="input-base" name="departmentId"><option value="">None</option>${createOptionRows(departments)}</select></label>
          <label class="form-field"><span>Password</span><input class="input-base" name="password" type="password" minlength="6" value="password123"></label>
          <label class="form-field span-12"><span>Description</span><textarea class="input-base" name="description" rows="3"></textarea></label>
          <div class="form-actions span-12"><button class="btn-base btn-secondary" type="reset">Reset</button><button class="btn-base btn-primary" type="submit">Create Record</button></div>
        </form>
      `;
      panel.querySelector("#orgAddForm")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const type = form.get("type");
        const name = String(form.get("name") || "").trim();
        const codeOrEmail = String(form.get("codeOrEmail") || "").trim();
        const description = String(form.get("description") || "").trim();
        const departmentId = String(form.get("departmentId") || "") || undefined;
        const button = event.currentTarget.querySelector("button[type='submit']");
        button.disabled = true;
        try {
          if (type === "department") {
            await apiFetch("/departments", { method: "POST", body: { name, code: codeOrEmail } });
          } else if (type === "category") {
            await apiFetch("/categories", { method: "POST", body: { name, code: codeOrEmail, description } });
          } else {
            await apiFetch("/users", {
              method: "POST",
              body: { name, email: codeOrEmail, password: String(form.get("password") || ""), role: String(form.get("role") || "EMPLOYEE"), departmentId }
            });
          }
          showToast("Record created successfully.", "success");
          await renderOrganization(content);
        } catch (error) {
          showToast(getErrorMessage(error), "error");
        } finally {
          button.disabled = false;
        }
      });
    }
    refreshIcons();
  };

  content.querySelectorAll("[data-org-tab]").forEach((button) => button.addEventListener("click", () => renderTab(button.dataset.orgTab)));
  document.getElementById("openOrgAdd")?.addEventListener("click", () => renderTab("add"));
  renderTab("departments");
  refreshIcons();
}

export async function renderAssets(content) {
  setActions(`<button class="btn-base btn-primary" id="openAssetModal" type="button"><i data-lucide="plus"></i> Register Asset</button>`);
  renderState(content, "loading", "Loading assets");

  const [categoriesData, departmentsData] = await Promise.all([
    fetchList("/categories", ["categories"], { page: 1, limit: 100 }),
    fetchList("/departments", ["departments"], { page: 1, limit: 100 })
  ]);
  const categories = categoriesData.items;
  const departments = departmentsData.items;
  const state = { search: "", status: "", categoryId: "", departmentId: "", page: 1 };

  const renderAssetView = async () => {
    const assetsData = await fetchList("/assets", ["assets"], {
      page: state.page,
      limit: pageSize,
      search: state.search,
      status: state.status,
      categoryId: state.categoryId,
      departmentId: state.departmentId,
      sortBy: "createdAt",
      sortOrder: "desc"
    });
    const assets = assetsData.items;
    const meta = assetsData.pagination;

    content.innerHTML = `
      ${metricCards([
        { label: "Visible Assets", value: meta.total ?? assets.length, meta: "Filtered backend records", icon: "boxes" },
        { label: "Available", value: assets.filter((asset) => asset.status === "AVAILABLE").length, meta: "On current page", icon: "package-check" },
        { label: "Allocated", value: assets.filter((asset) => asset.status === "ALLOCATED").length, meta: "On current page", icon: "user-check" },
        { label: "Maintenance", value: assets.filter((asset) => asset.status === "MAINTENANCE").length, meta: "On current page", icon: "wrench" }
      ])}
      <div class="panel mb-6">
        <div class="panel__body">
          <div class="filter-bar filter-bar--asset">
            <label class="form-field"><span>Search</span><input class="input-base" id="assetSearch" type="search" value="${escapeHtml(state.search)}" placeholder="Asset tag, serial, name, QR"></label>
            <label class="form-field"><span>Status</span><select class="input-base" id="assetStatus"><option value="">All status</option>${["AVAILABLE", "ALLOCATED", "BOOKED", "MAINTENANCE", "RETIRED", "LOST"].map((status) => `<option value="${status}" ${state.status === status ? "selected" : ""}>${titleCase(status)}</option>`).join("")}</select></label>
            <label class="form-field"><span>Category</span><select class="input-base" id="assetCategory"><option value="">All categories</option>${categories.map((category) => `<option value="${escapeHtml(category.id)}" ${state.categoryId === category.id ? "selected" : ""}>${escapeHtml(category.name)}</option>`).join("")}</select></label>
            <label class="form-field"><span>Department</span><select class="input-base" id="assetDepartment"><option value="">All departments</option>${departments.map((department) => `<option value="${escapeHtml(department.id)}" ${state.departmentId === department.id ? "selected" : ""}>${escapeHtml(department.name)}</option>`).join("")}</select></label>
            <button class="btn-base btn-secondary" id="assetReset" type="button"><i data-lucide="rotate-ccw"></i> Reset</button>
          </div>
        </div>
      </div>
      <div id="assetTable">
        ${table(
          ["Asset", "Category", "Department", "Owner", "Location", "Status"],
          assets.map((asset) => `
            <tr>
              <td><div class="entity-cell"><span class="entity-icon"><i data-lucide="monitor-smartphone"></i></span><div><div class="entity-title">${escapeHtml(asset.name)}</div><div class="entity-meta">${escapeHtml(assetTag(asset))}</div></div></div></td>
              <td>${escapeHtml(valueFrom(asset, "category.name"))}</td>
              <td>${escapeHtml(valueFrom(asset, "department.name"))}</td>
              <td>${escapeHtml(valueFrom(asset, "currentAllocation.allocatedTo.name", valueFrom(asset, "currentAllocation.user.name", "Unassigned")))}</td>
              <td>${escapeHtml(asset.location || "Not set")}</td>
              <td>${badge(asset.status)}</td>
            </tr>
          `),
          "No assets match the current filters"
        )}
        ${pagination(meta)}
      </div>
      <div class="modal-overlay hidden" id="assetModal">
        <div class="modal-base modal-panel" role="dialog" aria-modal="true" aria-labelledby="assetModalTitle">
          <div class="d-flex justify-content-between align-items-start gap-4 mb-4">
            <div><h2 class="panel__title" id="assetModalTitle">Register Asset</h2><p class="entity-meta mb-0">Create an asset record in the backend registry.</p></div>
            <button class="btn-base icon-button" id="closeAssetModal" type="button" aria-label="Close"><i data-lucide="x"></i></button>
          </div>
          <form class="form-grid" id="assetForm">
            <label class="form-field"><span>Asset name</span><input class="input-base" name="name" required></label>
            <label class="form-field"><span>Asset tag</span><input class="input-base" name="assetTag" required></label>
            <label class="form-field"><span>Serial number</span><input class="input-base" name="serialNumber"></label>
            <label class="form-field"><span>Location</span><input class="input-base" name="location"></label>
            <label class="form-field"><span>Category</span><select class="input-base" name="categoryId" required>${createOptionRows(categories)}</select></label>
            <label class="form-field"><span>Department</span><select class="input-base" name="departmentId"><option value="">None</option>${createOptionRows(departments)}</select></label>
            <label class="form-field"><span>Condition</span><select class="input-base" name="condition"><option>NEW</option><option selected>GOOD</option><option>FAIR</option><option>DAMAGED</option><option>UNUSABLE</option></select></label>
            <label class="form-field"><span>Bookable</span><select class="input-base" name="isBookable"><option value="false">No</option><option value="true">Yes</option></select></label>
            <div class="form-actions span-12"><button class="btn-base btn-secondary" type="button" id="cancelAssetForm">Cancel</button><button class="btn-base btn-primary" type="submit">Register Asset</button></div>
          </form>
        </div>
      </div>
    `;

    const update = async () => {
      state.search = content.querySelector("#assetSearch").value;
      state.status = content.querySelector("#assetStatus").value;
      state.categoryId = content.querySelector("#assetCategory").value;
      state.departmentId = content.querySelector("#assetDepartment").value;
      state.page = 1;
      await renderAssetView();
    };
    ["assetSearch", "assetStatus", "assetCategory", "assetDepartment"].forEach((id) => content.querySelector(`#${id}`)?.addEventListener("input", update));
    content.querySelector("#assetReset")?.addEventListener("click", async () => {
      state.search = "";
      state.status = "";
      state.categoryId = "";
      state.departmentId = "";
      state.page = 1;
      await renderAssetView();
    });
    bindPager(content, meta, async (page) => {
      state.page = page;
      await renderAssetView();
    });
    const modal = content.querySelector("#assetModal");
    document.getElementById("openAssetModal")?.addEventListener("click", () => modal.classList.remove("hidden"));
    content.querySelector("#closeAssetModal")?.addEventListener("click", () => modal.classList.add("hidden"));
    content.querySelector("#cancelAssetForm")?.addEventListener("click", () => modal.classList.add("hidden"));
    content.querySelector("#assetForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = event.currentTarget.querySelector("button[type='submit']");
      const form = new FormData(event.currentTarget);
      const payload = {
        name: String(form.get("name") || "").trim(),
        assetTag: String(form.get("assetTag") || "").trim(),
        serialNumber: String(form.get("serialNumber") || "").trim() || undefined,
        location: String(form.get("location") || "").trim() || undefined,
        categoryId: String(form.get("categoryId") || ""),
        departmentId: String(form.get("departmentId") || "") || undefined,
        condition: String(form.get("condition") || "GOOD"),
        isBookable: String(form.get("isBookable")) === "true"
      };
      button.disabled = true;
      try {
        await apiFetch("/assets", { method: "POST", body: payload });
        showToast("Asset registered successfully.", "success");
        modal.classList.add("hidden");
        state.page = 1;
        await renderAssetView();
      } catch (error) {
        showToast(getErrorMessage(error), "error");
      } finally {
        button.disabled = false;
      }
    });
    refreshIcons();
  };

  await renderAssetView();
}

export async function renderAllocation(content) {
  setActions(`<button class="btn-base btn-primary" type="button" id="allocationPrimary"><i data-lucide="arrow-left-right"></i> New Transfer</button>`);
  renderState(content, "loading", "Loading allocation workflow");

  const [allocationsData, transfersData, assetsData, usersData, departmentsData] = await Promise.all([
    fetchList("/allocations", ["allocations"], { page: 1, limit: 100 }),
    fetchList("/transfers", ["transfers"], { page: 1, limit: 100 }),
    fetchList("/assets", ["assets"], { page: 1, limit: 100 }),
    fetchList("/users", ["users"], { page: 1, limit: 100 }),
    fetchList("/departments", ["departments"], { page: 1, limit: 100 })
  ]);
  const allocations = allocationsData.items;
  const transfers = transfersData.items;
  const assets = assetsData.items;
  const users = usersData.items;
  const departments = departmentsData.items;

  content.innerHTML = `
    ${metricCards([
      { label: "Active Allocations", value: allocations.filter((allocation) => allocation.status === "ACTIVE").length, meta: "One active owner per asset", icon: "user-check" },
      { label: "Pending Transfers", value: transfers.filter((transfer) => transfer.status === "PENDING").length, meta: "Awaiting approval", icon: "clock" },
      { label: "Returned Assets", value: allocations.filter((allocation) => allocation.status === "RETURNED").length, meta: "Closed assignments", icon: "rotate-ccw" },
      { label: "Eligible Assets", value: assets.filter((asset) => asset.status === "AVAILABLE").length, meta: "Available for allocation", icon: "package-check" }
    ])}
    <div class="workflow-grid">
      <section class="panel">
        <div class="panel__header"><h2 class="panel__title">Allocation Register</h2>${badge("ACTIVE")}</div>
        <div class="panel__body">
          ${table(
            ["Asset", "Allocated To", "Department", "Assigned", "Status"],
            allocations.map((allocation) => `
              <tr>
                <td><div class="entity-cell"><span class="entity-icon"><i data-lucide="package"></i></span><div><div class="entity-title">${escapeHtml(valueFrom(allocation, "asset.name"))}</div><div class="entity-meta">${escapeHtml(assetTag(allocation.asset || {}))}</div></div></div></td>
                <td>${escapeHtml(valueFrom(allocation, "allocatedTo.name", valueFrom(allocation, "user.name")))}</td>
                <td>${escapeHtml(valueFrom(allocation, "department.name"))}</td>
                <td>${escapeHtml(formatDate(allocation.assignedAt || allocation.startDate))}</td>
                <td>${badge(allocation.status)}</td>
              </tr>
            `),
            "No allocation records found"
          )}
        </div>
      </section>
      <aside class="panel">
        <div class="panel__header"><h2 class="panel__title">Transfer Queue</h2></div>
        <div class="panel__body stack">
          ${transfers.length ? transfers.map((transfer) => `
            <article class="work-card">
              <div class="d-flex align-items-center justify-content-between gap-3">
                <strong>${escapeHtml(valueFrom(transfer, "asset.name"))}</strong>
                ${badge(transfer.status)}
              </div>
              <p class="entity-meta">${escapeHtml(valueFrom(transfer, "fromUser.name", "Unassigned"))} to ${escapeHtml(valueFrom(transfer, "toUser.name", valueFrom(transfer, "toDepartment.name")))}</p>
              <p class="text-small mb-0">${escapeHtml(transfer.reason || "No reason provided")}</p>
            </article>
          `).join("") : emptyPanel("No transfers found")}
          <form class="form-grid compact-form" id="transferForm">
            <label class="form-field span-12"><span>Asset</span><select class="input-base" name="assetId" required>${createOptionRows(assets, "name")}</select></label>
            <label class="form-field"><span>To Employee</span><select class="input-base" name="toUserId"><option value="">None</option>${createOptionRows(users, "name")}</select></label>
            <label class="form-field"><span>To Department</span><select class="input-base" name="toDepartmentId"><option value="">None</option>${createOptionRows(departments, "name")}</select></label>
            <label class="form-field span-12"><span>Reason</span><textarea class="input-base" name="reason" rows="3" required></textarea></label>
            <div class="form-actions span-12"><button class="btn-base btn-primary" type="submit">Request Transfer</button></div>
          </form>
        </div>
      </aside>
    </div>
  `;
  content.querySelector("#transferForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button[type='submit']");
    const form = new FormData(event.currentTarget);
    const payload = {
      assetId: String(form.get("assetId") || ""),
      toUserId: String(form.get("toUserId") || "") || undefined,
      toDepartmentId: String(form.get("toDepartmentId") || "") || undefined,
      reason: String(form.get("reason") || "").trim()
    };
    button.disabled = true;
    try {
      await apiFetch("/transfers", { method: "POST", body: payload });
      showToast("Transfer requested successfully.", "success");
      await renderAllocation(content);
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      button.disabled = false;
    }
  });
  refreshIcons();
}

export async function renderBooking(content) {
  setActions(`<button class="btn-base btn-primary" type="button" id="bookingRequest"><i data-lucide="calendar-plus"></i> Request Booking</button>`);
  renderState(content, "loading", "Loading booking calendar");

  const [bookingsData, assetsData] = await Promise.all([
    fetchList("/bookings", ["bookings"], { page: 1, limit: 100, sortBy: "startTime", sortOrder: "desc" }),
    fetchList("/assets", ["assets"], { page: 1, limit: 100 })
  ]);
  const bookings = bookingsData.items;
  const resources = assetsData.items.filter((asset) => asset.isBookable || asset.status === "AVAILABLE");

  content.innerHTML = `
    ${metricCards([
      { label: "Active Bookings", value: bookings.filter((booking) => ["APPROVED", "ACTIVE"].includes(booking.status)).length, meta: "Approved or live", icon: "calendar-check" },
      { label: "Requested", value: bookings.filter((booking) => ["REQUESTED", "PENDING"].includes(booking.status)).length, meta: "Waiting approval", icon: "hourglass" },
      { label: "Bookable Resources", value: resources.length, meta: "From asset registry", icon: "door-open" },
      { label: "Completed", value: bookings.filter((booking) => booking.status === "COMPLETED").length, meta: "Closed reservations", icon: "check-circle" }
    ])}
    <div class="section-grid">
      <section class="panel span-8">
        <div class="panel__header"><h2 class="panel__title">Booking Timeline</h2></div>
        <div class="panel__body timeline-board">
          ${bookings.length ? bookings.map((booking) => `
            <article class="booking-event">
              <div>
                <strong>${escapeHtml(valueFrom(booking, "asset.name", booking.title || "Resource booking"))}</strong>
                <p class="entity-meta mb-0">${escapeHtml(booking.purpose || "Operational reservation")}</p>
              </div>
              <div class="text-right">
                ${badge(booking.status)}
                <div class="entity-meta mt-1">${escapeHtml(formatDateTime(booking.startTime || booking.start))}</div>
              </div>
            </article>
          `).join("") : emptyPanel("No bookings found")}
        </div>
      </section>
      <aside class="panel span-4">
        <div class="panel__header"><h2 class="panel__title">Request Booking</h2></div>
        <div class="panel__body stack">
          <form class="form-grid compact-form" id="bookingForm">
            <label class="form-field span-12"><span>Resource</span><select class="input-base" name="resourceId" required>${createOptionRows(resources, "name")}</select></label>
            <label class="form-field"><span>Date</span><input class="input-base" name="date" type="date" required></label>
            <label class="form-field"><span>Start</span><input class="input-base" name="start" type="time" required></label>
            <label class="form-field"><span>End</span><input class="input-base" name="end" type="time" required></label>
            <label class="form-field span-12"><span>Purpose</span><textarea class="input-base" name="purpose" rows="3" required></textarea></label>
            <div class="form-actions span-12"><button class="btn-base btn-primary" type="submit">Submit Booking</button></div>
          </form>
        </div>
      </aside>
    </div>
  `;
  content.querySelector("#bookingForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button[type='submit']");
    const form = new FormData(event.currentTarget);
    const payload = {
      resourceId: String(form.get("resourceId") || ""),
      startTime: toIsoFromDateTime(form.get("date"), form.get("start")),
      endTime: toIsoFromDateTime(form.get("date"), form.get("end")),
      purpose: String(form.get("purpose") || "").trim()
    };
    button.disabled = true;
    try {
      await apiFetch("/bookings", { method: "POST", body: payload });
      showToast("Booking request submitted.", "success");
      await renderBooking(content);
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      button.disabled = false;
    }
  });
  refreshIcons();
}

export async function renderMaintenance(content) {
  setActions(`<button class="btn-base btn-primary" type="button"><i data-lucide="plus"></i> New Ticket</button>`);
  renderState(content, "loading", "Loading maintenance desk");

  const tickets = (await fetchList("/maintenance", ["maintenance", "tickets", "requests"], { page: 1, limit: 100 })).items;
  const columns = ["REQUESTED", "APPROVED", "ASSIGNED", "IN_PROGRESS", "RESOLVED"];

  content.innerHTML = `
    ${metricCards([
      { label: "Open Tickets", value: tickets.filter((ticket) => !["CLOSED", "REJECTED"].includes(ticket.status)).length, meta: "Needs action", icon: "wrench" },
      { label: "In Progress", value: tickets.filter((ticket) => ticket.status === "IN_PROGRESS").length, meta: "Technician active", icon: "timer" },
      { label: "High Priority", value: tickets.filter((ticket) => ["HIGH", "CRITICAL"].includes(ticket.priority)).length, meta: "Escalated work", icon: "triangle-alert" },
      { label: "Resolution Cost", value: formatCurrency(tickets.reduce((sum, ticket) => sum + asNumber(ticket.resolutionCost), 0)), meta: "Closed cost", icon: "wallet" }
    ])}
    <section class="panel">
      <div class="panel__header"><h2 class="panel__title">Maintenance Workflow</h2>${badge("IN_PROGRESS")}</div>
      <div class="panel__body">
        <div class="kanban-board">
          ${columns.map((status) => `
            <div class="kanban-column">
              <div class="kanban-heading"><span>${escapeHtml(titleCase(status))}</span><span>${tickets.filter((ticket) => ticket.status === status).length}</span></div>
              ${tickets.filter((ticket) => ticket.status === status).map((ticket) => `
                <article class="work-card">
                  <div class="d-flex align-items-center justify-content-between gap-3"><strong>${escapeHtml(ticket.ticketNumber || ticket.id)}</strong>${badge(ticket.priority || "MEDIUM")}</div>
                  <p class="entity-title mt-3 mb-1">${escapeHtml(ticket.issueSummary || ticket.issueTitle || "Maintenance request")}</p>
                  <p class="entity-meta">${escapeHtml(assetTag(ticket.asset || {}))} - ${escapeHtml(valueFrom(ticket, "asset.name"))}</p>
                  <p class="text-small mb-0">Technician: ${escapeHtml(valueFrom(ticket, "assignedTechnician.name", valueFrom(ticket, "assignedTo.name", "Unassigned")))}</p>
                </article>
              `).join("") || '<div class="empty-column">No tickets</div>'}
            </div>
          `).join("")}
        </div>
      </div>
    </section>
  `;
  refreshIcons();
}

export async function renderAudit(content) {
  setActions(`<button class="btn-base btn-primary" type="button"><i data-lucide="shield-plus"></i> Plan Audit</button>`);
  renderState(content, "loading", "Loading audit command center");

  const audits = (await fetchList("/audits", ["audits"], { page: 1, limit: 100 })).items;
  const activeAudit = audits.find((audit) => ["ACTIVE", "IN_PROGRESS"].includes(audit.status)) || audits[0];
  const records = activeAudit?.records || activeAudit?.auditRecords || [];
  const totalAssets = activeAudit?.totalAssets ?? records.length;
  const verifiedAssets = activeAudit?.verifiedAssets ?? records.filter((record) => record.result).length;
  const completion = Math.round((verifiedAssets / Math.max(1, totalAssets)) * 100);

  content.innerHTML = `
    ${metricCards([
      { label: "Active Audits", value: audits.filter((audit) => ["ACTIVE", "IN_PROGRESS"].includes(audit.status)).length, meta: "Currently running", icon: "shield-check" },
      { label: "Assets Verified", value: verifiedAssets, meta: `${completion}% completion`, icon: "scan-line" },
      { label: "Pending", value: Math.max(0, totalAssets - verifiedAssets), meta: "Remaining scope", icon: "list-checks" },
      { label: "Discrepancies", value: activeAudit?.discrepancies ?? activeAudit?.discrepancyCount ?? 0, meta: "Needs investigation", icon: "triangle-alert" }
    ])}
    <div class="section-grid">
      <section class="panel span-7">
        <div class="panel__header"><h2 class="panel__title">${escapeHtml(activeAudit?.title || activeAudit?.name || "Audit cycles")}</h2>${badge(activeAudit?.status || "NONE")}</div>
        <div class="panel__body">
          <div class="progress-track"><span style="width:${completion}%"></span></div>
          <div class="chip-row mt-4">
            ${chip("Total assets", totalAssets)}
            ${chip("Verified", verifiedAssets, "status-success")}
            ${chip("Pending", Math.max(0, totalAssets - verifiedAssets), "status-warning")}
          </div>
          ${records.length ? table(
            ["Asset", "Expected Location", "Condition", "Verification"],
            records.slice(0, 10).map((record) => `
              <tr>
                <td><div class="entity-cell"><span class="entity-icon"><i data-lucide="package-search"></i></span><div><div class="entity-title">${escapeHtml(valueFrom(record, "asset.name"))}</div><div class="entity-meta">${escapeHtml(assetTag(record.asset || {}))}</div></div></div></td>
                <td>${escapeHtml(valueFrom(record, "asset.location"))}</td>
                <td>${badge(valueFrom(record, "asset.condition", "UNKNOWN"))}</td>
                <td>${badge(record.result || "PENDING")}</td>
              </tr>
            `),
            "No audit assets found"
          ) : emptyPanel("No audit records found")}
        </div>
      </section>
      <aside class="panel span-5">
        <div class="panel__header"><h2 class="panel__title">Audit Cycles</h2></div>
        <div class="panel__body stack">
          ${audits.length ? audits.map((audit) => `
            <article class="work-card">
              <div class="d-flex justify-content-between align-items-center"><strong>${escapeHtml(audit.title || audit.name || audit.id)}</strong>${badge(audit.status)}</div>
              <p class="entity-meta mb-0 mt-2">${escapeHtml(formatDate(audit.plannedStart || audit.startedAt || audit.createdAt))}</p>
            </article>
          `).join("") : emptyPanel("No audits found")}
        </div>
      </aside>
    </div>
  `;
  refreshIcons();
}

export async function renderReports(content) {
  setActions(`<button class="btn-base btn-secondary" type="button" id="exportJson"><i data-lucide="download"></i> Export JSON</button>`);
  renderState(content, "loading", "Loading analytics");

  const data = unwrap(await apiFetch("/reports/dashboard"));
  const summary = data.summary || data.totals || {};
  const charts = data.charts || {};
  const idleAssets = data.idleAssets?.items || data.idleAssets || [];
  const usedAssets = data.frequentlyUsedAssets || data.mostUsedAssets?.items || data.mostUsedAssets || [];
  const utilizationChart = charts.utilizationByDepartment || charts.departmentUtilization || {};
  const labels = utilizationChart.labels || [];
  const values = utilizationChart.datasets?.[0]?.data || [];
  const bookingTrend = charts.bookingTrend?.datasets?.[0]?.data || [];

  content.innerHTML = `
    ${metricCards([
      { label: "Asset Utilization", value: `${summary.assetUtilizationPercentage ?? summary.utilizationPercentage ?? 0}%`, meta: "From backend analytics", icon: "activity" },
      { label: "Idle Assets", value: Array.isArray(idleAssets) ? idleAssets.length : 0, meta: "Available but unused", icon: "pause-circle" },
      { label: "Maintenance Cost", value: formatCurrency(summary.totalMaintenanceCost || summary.maintenanceCost || 0), meta: "Current scope", icon: "wrench" },
      { label: "Audit Completion", value: `${summary.auditCompletionPercentage ?? summary.completionPercentage ?? 0}%`, meta: "Verified scope", icon: "shield-check" }
    ])}
    <div class="section-grid">
      <section class="panel span-6">
        <div class="panel__header"><h2 class="panel__title">Department Utilization</h2></div>
        <div class="panel__body stack">
          ${labels.length ? labels.map((label, index) => `
            <div>
              <div class="d-flex justify-content-between text-small mb-2"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(values[index] || 0)}%</span></div>
              <div class="progress-track"><span style="width:${Number(values[index] || 0)}%"></span></div>
            </div>
          `).join("") : emptyPanel("No utilization chart data")}
        </div>
      </section>
      <section class="panel span-6">
        <div class="panel__header"><h2 class="panel__title">Booking Trend</h2></div>
        <div class="panel__body">
          ${bookingTrend.length ? `<div class="chart-bars">${bookingTrend.map((value, index) => `
            <div class="chart-column">
              <div class="chart-bar" style="height:${Math.max(8, Number(value) * 6)}px; background:${index % 2 ? "var(--color-info)" : "var(--color-primary)"};"></div>
              <span>${index + 1}</span>
            </div>
          `).join("")}</div>` : emptyPanel("No booking trend data")}
        </div>
      </section>
      <section class="panel span-4"><div class="panel__header"><h2 class="panel__title">Idle Assets</h2></div><div class="panel__body stack">${idleAssets.length ? idleAssets.slice(0, 5).map((asset) => `<div class="slot-row"><span>${escapeHtml(asset.name)}</span>${badge(asset.status || "AVAILABLE")}</div>`).join("") : emptyPanel("No idle assets")}</div></section>
      <section class="panel span-4"><div class="panel__header"><h2 class="panel__title">Most Used</h2></div><div class="panel__body stack">${usedAssets.length ? usedAssets.slice(0, 5).map((asset) => `<div class="slot-row"><span>${escapeHtml(asset.name)}</span><strong>${escapeHtml(asset.usage?.totalUsage ?? asset.totalUsage ?? 0)} uses</strong></div>`).join("") : emptyPanel("No usage ranking")}</div></section>
      <section class="panel span-4"><div class="panel__header"><h2 class="panel__title">Near Retirement</h2></div><div class="panel__body stack">${(data.nearRetirement?.items || data.nearRetirement || []).length ? (data.nearRetirement.items || data.nearRetirement).slice(0, 5).map((asset) => `<div class="slot-row"><span>${escapeHtml(asset.name)}</span>${badge("WATCH")}</div>`).join("") : emptyPanel("No retirement risks")}</div></section>
    </div>
  `;
  document.getElementById("exportJson")?.addEventListener("click", async () => {
    try {
      await apiFetch("/reports/export", { query: { type: "dashboard", format: "json" } });
      showToast("Report export endpoint returned successfully.", "success");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  });
  refreshIcons();
}

export async function renderNotifications(content) {
  setActions(`<button class="btn-base btn-primary" id="markAllRead" type="button"><i data-lucide="check-check"></i> Mark All Read</button>`);
  renderState(content, "loading", "Loading notifications");

  let filter = "all";
  const renderNotificationsView = async () => {
    const notificationData = await fetchList("/notifications", ["notifications"], {
      page: 1,
      limit: 50,
      status: filter,
      sortBy: "createdAt",
      sortOrder: "desc"
    });
    const notifications = notificationData.items;
    const meta = unwrap(notificationData.payload);
    const unreadCount = meta.unreadCount ?? notifications.filter((notification) => notification.status === "unread" || notification.isRead === false).length;

    content.innerHTML = `
      ${metricCards([
        { label: "Unread", value: unreadCount, meta: "Needs attention", icon: "bell-ring" },
        { label: "Critical", value: notifications.filter((notification) => notification.priority === "HIGH" || notification.priority === "CRITICAL").length, meta: "High priority", icon: "triangle-alert" },
        { label: "Visible Items", value: notifications.length, meta: "Current filter", icon: "inbox" },
        { label: "Filter", value: titleCase(filter), meta: "Notification status", icon: "filter" }
      ])}
      <div class="notification-layout">
        <aside class="panel">
          <div class="panel__header"><h2 class="panel__title">Filters</h2></div>
          <div class="panel__body stack">
            ${["all", "unread", "read"].map((status) => `
              <button class="filter-button ${filter === status ? "active" : ""}" type="button" data-filter="${status}">
                <span>${escapeHtml(titleCase(status))}</span>
              </button>
            `).join("")}
          </div>
        </aside>
        <section class="span-12 stack">
          ${notifications.length ? notifications.map((notification) => {
            const isUnread = notification.status === "unread" || notification.isRead === false;
            return `
              <article class="notification-item ${isUnread ? "is-unread" : ""}">
                <span class="entity-icon"><i data-lucide="${notification.type === "MAINTENANCE" ? "wrench" : notification.type === "AUDIT" ? "shield-check" : notification.type === "BOOKING" ? "calendar-check" : "bell"}"></i></span>
                <div>
                  <div class="d-flex align-items-center gap-3 flex-wrap">
                    <strong>${escapeHtml(notification.title)}</strong>
                    ${badge(notification.type || notification.category || "SYSTEM")}
                    ${badge(notification.priority || "INFO")}
                  </div>
                  <p class="entity-meta mb-0 mt-2">${escapeHtml(notification.message)}</p>
                  <span class="text-caption text-muted">${escapeHtml(formatDateTime(notification.createdAt))}</span>
                </div>
                <div class="form-actions">
                  <button class="btn-base btn-secondary" type="button" data-read="${notification.id}" ${isUnread ? "" : "disabled"}>Read</button>
                  <button class="btn-base icon-button" type="button" data-delete="${notification.id}" aria-label="Delete"><i data-lucide="trash-2"></i></button>
                </div>
              </article>
            `;
          }).join("") : emptyPanel("No notifications in this filter")}
        </section>
        <aside class="panel">
          <div class="panel__header"><h2 class="panel__title">Delivery Health</h2></div>
          <div class="panel__body stack">
            ${chip("In app", "Enabled", "status-success")}
            ${chip("Unread count", unreadCount, "status-info")}
          </div>
        </aside>
      </div>
    `;

    content.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", async () => {
      filter = button.dataset.filter;
      await renderNotificationsView();
    }));
    content.querySelectorAll("[data-read]").forEach((button) => button.addEventListener("click", async () => {
      try {
        await apiFetch(`/notifications/${button.dataset.read}/read`, { method: "PATCH" });
        showToast("Notification marked read.", "success");
        await renderNotificationsView();
      } catch (error) {
        showToast(getErrorMessage(error), "error");
      }
    }));
    content.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", async () => {
      try {
        await apiFetch(`/notifications/${button.dataset.delete}`, { method: "DELETE" });
        showToast("Notification deleted.", "success");
        await renderNotificationsView();
      } catch (error) {
        showToast(getErrorMessage(error), "error");
      }
    }));
    document.getElementById("markAllRead")?.addEventListener("click", async () => {
      try {
        await apiFetch("/notifications/read-all", { method: "PATCH" });
        showToast("All notifications marked read.", "success");
        await renderNotificationsView();
      } catch (error) {
        showToast(getErrorMessage(error), "error");
      }
    });
    refreshIcons();
  };

  await renderNotificationsView();
}
