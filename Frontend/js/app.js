import { apiFetch, getErrorMessage, session, unwrap } from "./api.js";
import { renderLayout, renderState, showToast } from "./layout.js";
import { pageRenderers } from "./pages.js";

const pageId = document.body.dataset.page || "dashboard";

const pageAccess = {
  dashboard: ["ADMIN", "MANAGER", "EMPLOYEE", "AUDITOR"],
  organization: ["ADMIN", "MANAGER", "AUDITOR"],
  assets: ["ADMIN", "MANAGER", "EMPLOYEE", "AUDITOR"],
  allocation: ["ADMIN", "MANAGER", "EMPLOYEE", "AUDITOR"],
  booking: ["ADMIN", "MANAGER", "EMPLOYEE", "AUDITOR"],
  maintenance: ["ADMIN", "MANAGER", "EMPLOYEE", "AUDITOR"],
  audit: ["ADMIN", "MANAGER", "EMPLOYEE", "AUDITOR"],
  reports: ["ADMIN", "MANAGER", "EMPLOYEE", "AUDITOR"],
  notifications: ["ADMIN", "MANAGER", "EMPLOYEE", "AUDITOR"]
};

function redirectLogin(reason) {
  session.clear();
  const target = reason ? `login.html?reason=${encodeURIComponent(reason)}` : "login.html";
  window.location.replace(target);
}

function renderBootError(message) {
  const app = document.getElementById("assetflow-app");
  if (!app) return;
  app.innerHTML = `
    <main class="auth-redirect">
      <section class="auth-redirect__panel">
        <div class="state-icon status-danger"><i data-lucide="triangle-alert"></i></div>
        <h1 class="text-h3">Unable to start AssetFlow</h1>
        <p class="text-muted">${message}</p>
        <a class="btn-base btn-primary" href="login.html">Return to Login</a>
      </section>
    </main>
  `;
  window.lucide?.createIcons();
}

async function start() {
  if (!session.getToken()) {
    redirectLogin("missing-token");
    return;
  }

  try {
    const response = await apiFetch("/auth/me");
    const user = unwrap(response);
    session.save({ token: session.getToken(), user });

    const allowedRoles = pageAccess[pageId] || pageAccess.dashboard;
    const shell = renderLayout(pageId);
    if (!shell?.content) return;

    if (!allowedRoles.includes(user.role)) {
      renderState(
        shell.content,
        "error",
        "Access denied for this module.",
        '<p class="entity-meta mt-3">Your current role does not have permission to view this page.</p>'
      );
      return;
    }

    const renderPage = pageRenderers[pageId] || pageRenderers.dashboard;
    await renderPage(shell.content);
  } catch (error) {
    if (error.status === 401) {
      redirectLogin("expired-token");
      return;
    }

    if (error.status === 403) {
      const shell = renderLayout(pageId);
      if (shell?.content) {
        renderState(shell.content, "error", "Access denied for this module.");
      }
      return;
    }

    renderBootError(getErrorMessage(error));
    showToast(getErrorMessage(error), "error");
  }
}

start();
