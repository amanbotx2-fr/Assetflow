import { badge, escapeHtml, initials, session, titleCase } from "./api.js";

export const routes = [
  { id: "dashboard", label: "Dashboard", href: "dashboard.html", icon: "layout-dashboard" },
  { id: "organization", label: "Organization", href: "organization_setup.html", icon: "building-2" },
  { id: "assets", label: "Assets", href: "assets.html", icon: "monitor-smartphone" },
  { id: "allocation", label: "Allocation", href: "allocation_transfer.html", icon: "arrow-left-right" },
  { id: "booking", label: "Resource Booking", href: "resource_booking.html", icon: "calendar-clock" },
  { id: "maintenance", label: "Maintenance", href: "maintenance.html", icon: "wrench" },
  { id: "audit", label: "Audit", href: "audit.html", icon: "shield-check" },
  { id: "reports", label: "Reports", href: "reports.html", icon: "bar-chart-3" },
  { id: "notifications", label: "Notifications", href: "notifications.html", icon: "bell" }
];

export const pageMeta = {
  dashboard: {
    title: "Dashboard",
    kicker: "Command Center",
    copy: "A live operating view of assets, bookings, maintenance, audit health and alerts."
  },
  organization: {
    title: "Organization Setup",
    kicker: "Foundation Data",
    copy: "Manage departments, categories and employee records that power the asset lifecycle."
  },
  assets: {
    title: "Asset Directory",
    kicker: "Inventory Control",
    copy: "Register, search and monitor every asset with ownership, condition and QR lookup context."
  },
  allocation: {
    title: "Allocation & Transfer",
    kicker: "Ownership Flow",
    copy: "Control employee assignment, transfer approvals and asset return history from one workflow."
  },
  booking: {
    title: "Resource Booking",
    kicker: "Availability Planning",
    copy: "Coordinate shared resources, prevent conflicts and approve booking requests."
  },
  maintenance: {
    title: "Maintenance Management",
    kicker: "Service Desk",
    copy: "Track repair requests from approval through technician work, resolution and closure."
  },
  audit: {
    title: "Audit Command Center",
    kicker: "Verification",
    copy: "Run audit cycles, verify assets, surface discrepancies and monitor compliance."
  },
  reports: {
    title: "Reports & Analytics",
    kicker: "Decision Intelligence",
    copy: "Analyze utilization, idle assets, maintenance cost, booking demand and audit outcomes."
  },
  notifications: {
    title: "Notifications Center",
    kicker: "Inbox",
    copy: "Review approvals, alerts and system updates from every module."
  }
};

export function renderLayout(pageId) {
  const user = session.getUser() || {
    name: "Unknown User",
    email: "",
    role: ""
  };
  const meta = pageMeta[pageId] || pageMeta.dashboard;
  const app = document.getElementById("assetflow-app");

  if (!app) return null;

  app.innerHTML = `
    <div class="app-container">
      <div class="modal-overlay d-md-none d-none" id="sidebarOverlay"></div>
      <aside class="sidebar-layout" id="sidebar">
        <div class="brand-lockup">
          <a class="brand-mark focus-ring" href="dashboard.html" aria-label="AssetFlow Home">
            <i data-lucide="boxes"></i>
          </a>
          <div class="brand-lockup__text">
            <span class="brand-lockup__title">AssetFlow</span>
            <span class="brand-lockup__sub">Enterprise ERP</span>
          </div>
          <button class="btn-base d-md-none focus-ring ml-auto" id="closeSidebarBtn" type="button" aria-label="Close menu">
            <i data-lucide="x"></i>
          </button>
        </div>
        <nav aria-label="Main navigation">
          ${routes.map((route) => `
            <a href="${route.href}" class="sidebar-nav-item focus-ring ${route.id === pageId ? "active" : ""}" ${route.id === pageId ? 'aria-current="page"' : ""}>
              <i data-lucide="${route.icon}"></i>
              <span>${route.label}</span>
            </a>
          `).join("")}
        </nav>
        <div class="sidebar-footer">
          <div class="d-flex align-items-center gap-3 px-3 py-2">
            <div class="user-avatar user-avatar--dark">${escapeHtml(initials(user.name || user.email))}</div>
            <div class="min-w-0">
              <div class="text-small font-semibold text-white text-truncate">${escapeHtml(user.name || "Unknown User")}</div>
              <div class="text-caption text-muted">${escapeHtml(titleCase(user.role || "Authenticated"))}</div>
            </div>
          </div>
        </div>
      </aside>
      <main class="content-layout">
        <header class="navbar-base">
          <div class="d-flex align-items-center gap-4">
            <button class="btn-base d-md-none focus-ring icon-button" id="openSidebarBtn" type="button" aria-label="Open sidebar" aria-expanded="false">
              <i data-lucide="menu"></i>
            </button>
            <nav class="breadcrumb d-none d-md-flex" aria-label="Breadcrumb">
              <a href="dashboard.html">Dashboard</a>
              ${pageId === "dashboard" ? "" : '<i data-lucide="chevron-right"></i>'}
              ${pageId === "dashboard" ? '<span>Overview</span>' : `<span>${escapeHtml(meta.title)}</span>`}
            </nav>
          </div>
          <div class="navbar-actions">
            <label class="search-bar-base global-search d-none d-md-flex">
              <i data-lucide="search"></i>
              <input type="search" class="input-base" id="globalSearchInput" placeholder="Search assets, people, tickets" aria-label="Global search">
            </label>
            <div class="position-relative">
              <button class="btn-base icon-button focus-ring" id="notificationBtn" type="button" aria-label="Notifications" aria-haspopup="true" aria-expanded="false">
                <i data-lucide="bell"></i>
                <span class="notification-dot" aria-hidden="true"></span>
              </button>
              <div class="dropdown-base app-dropdown d-none" id="notificationDropdown">
                <div class="dropdown-header">
                  <strong>Notifications</strong>
                  ${badge("UNREAD")}
                </div>
                <a href="notifications.html" class="dropdown-item">
                  <i data-lucide="arrow-right"></i>
                  Open notifications center
                </a>
              </div>
            </div>
            <div class="position-relative">
              <button class="btn-base profile-button focus-ring" id="profileBtn" type="button" aria-label="User menu" aria-haspopup="true" aria-expanded="false">
                <span class="user-avatar">${escapeHtml(initials(user.name || user.email))}</span>
                <span class="profile-copy d-none d-md-flex">
                  <strong>${escapeHtml(user.name || "Unknown User")}</strong>
                  <small>${escapeHtml(titleCase(user.role || "Authenticated"))}</small>
                </span>
                <i data-lucide="chevron-down"></i>
              </button>
              <div class="dropdown-base app-dropdown d-none" id="profileDropdown">
                <div class="dropdown-header">
                  <div class="min-w-0">
                    <strong class="text-small">${escapeHtml(user.name || "Unknown User")}</strong>
                    <div class="entity-meta text-truncate">${escapeHtml(user.email || "")}</div>
                  </div>
                </div>
                <a href="notifications.html" class="dropdown-item"><i data-lucide="bell"></i> Notifications</a>
                <button class="dropdown-item dropdown-item--button" id="logoutButton" type="button">
                  <i data-lucide="log-out"></i> Logout
                </button>
              </div>
            </div>
          </div>
        </header>
        <div class="page-container">
          <div class="content-wrapper">
            <section class="page-header">
              <div>
                <div class="page-kicker"><i data-lucide="sparkles"></i>${escapeHtml(meta.kicker)}</div>
                <h1 class="page-title">${escapeHtml(meta.title)}</h1>
                <p class="page-copy">${escapeHtml(meta.copy)}</p>
              </div>
              <div class="page-header__actions" id="pageActions"></div>
            </section>
            <section id="pageContent" aria-live="polite"></section>
          </div>
        </div>
      </main>
      <div class="toast hidden" id="appToast"></div>
    </div>
  `;

  initLayoutInteractions();
  refreshIcons();
  return {
    content: document.getElementById("pageContent"),
    actions: document.getElementById("pageActions")
  };
}

export function initLayoutInteractions() {
  const sidebar = document.getElementById("sidebar");
  const openSidebarBtn = document.getElementById("openSidebarBtn");
  const closeSidebarBtn = document.getElementById("closeSidebarBtn");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const notificationBtn = document.getElementById("notificationBtn");
  const notificationDropdown = document.getElementById("notificationDropdown");
  const profileBtn = document.getElementById("profileBtn");
  const profileDropdown = document.getElementById("profileDropdown");
  const logoutButton = document.getElementById("logoutButton");

  const closeSidebar = () => {
    sidebar?.classList.remove("open");
    sidebarOverlay?.classList.add("d-none");
    openSidebarBtn?.setAttribute("aria-expanded", "false");
  };

  const openSidebar = () => {
    sidebar?.classList.add("open");
    sidebarOverlay?.classList.remove("d-none");
    openSidebarBtn?.setAttribute("aria-expanded", "true");
  };

  const closeDropdowns = () => {
    notificationDropdown?.classList.add("d-none");
    profileDropdown?.classList.add("d-none");
    notificationBtn?.setAttribute("aria-expanded", "false");
    profileBtn?.setAttribute("aria-expanded", "false");
  };

  openSidebarBtn?.addEventListener("click", openSidebar);
  closeSidebarBtn?.addEventListener("click", closeSidebar);
  sidebarOverlay?.addEventListener("click", closeSidebar);

  notificationBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = notificationDropdown?.classList.contains("d-none");
    closeDropdowns();
    if (willOpen) {
      notificationDropdown?.classList.remove("d-none");
      notificationBtn.setAttribute("aria-expanded", "true");
    }
  });

  profileBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = profileDropdown?.classList.contains("d-none");
    closeDropdowns();
    if (willOpen) {
      profileDropdown?.classList.remove("d-none");
      profileBtn.setAttribute("aria-expanded", "true");
    }
  });

  document.addEventListener("click", closeDropdowns);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDropdowns();
      closeSidebar();
    }
  });

  logoutButton?.addEventListener("click", () => {
    session.clear();
    window.location.href = "login.html";
  });
}

export function renderState(target, type, message, action = "") {
  const icon = type === "loading" ? "loader-2" : type === "error" ? "triangle-alert" : "inbox";
  target.innerHTML = `
    <div class="panel state-panel">
      <div class="panel__body text-center">
        <div class="state-icon ${type === "error" ? "status-danger" : "status-info"}"><i data-lucide="${icon}"></i></div>
        <h3 class="panel__title mt-3">${escapeHtml(message)}</h3>
        ${action}
      </div>
    </div>
  `;
  refreshIcons();
}

export function setActions(html = "") {
  const actions = document.getElementById("pageActions");
  if (actions) {
    actions.innerHTML = html;
    refreshIcons();
  }
}

export function showToast(message, type = "info") {
  const toast = document.getElementById("appToast");
  if (!toast) return;
  toast.className = `toast alert-base status-${type === "success" ? "success" : type === "error" ? "danger" : "info"}`;
  toast.innerHTML = `<i data-lucide="${type === "success" ? "check-circle" : type === "error" ? "triangle-alert" : "info"}"></i><span>${escapeHtml(message)}</span>`;
  toast.classList.remove("hidden");
  refreshIcons();
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.add("hidden"), 3200);
}

export function refreshIcons() {
  window.lucide?.createIcons();
}
