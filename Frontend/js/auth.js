import { apiFetch, escapeHtml, getErrorMessage, session, unwrap } from "./api.js";

const loginForm = document.getElementById("loginForm");
const accountForm = document.getElementById("accountForm");
const accountPanel = document.getElementById("accountPanel");
const authCard = document.getElementById("authCard");
const createAccountButton = document.getElementById("createAccountButton");
const cancelAccountButton = document.getElementById("cancelAccountButton");
const forgotPasswordButton = document.getElementById("forgotPasswordButton");
const authMessage = document.getElementById("authMessage");
const registrationDepartment = document.getElementById("registrationDepartment");
const registrationRole = document.getElementById("registrationRole");
const REGISTER_FLASH_KEY = "assetflow.auth.registrationFlash";

function setMessage(message, type = "info") {
  if (!authMessage) return;
  authMessage.className = `alert-base auth-message ${type === "error" ? "status-danger" : type === "success" ? "status-success" : "status-info"}`;
  authMessage.innerHTML = `<span>${escapeHtml(message)}</span>`;
  authMessage.classList.remove("hidden");
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `alert-base toast animate-toast ${type === "error" ? "status-danger" : type === "success" ? "status-success" : "status-info"}`;
  toast.setAttribute("role", "status");
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function setButtonLoading(form, isLoading, loadingText, idleText) {
  const button = form?.querySelector("button[type='submit']");
  if (!button) return;
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : idleText;
}

function dashboardRedirect() {
  window.location.href = "dashboard.html";
}

async function loadRegistrationOptions() {
  if (!registrationDepartment || !registrationRole) return;

  try {
    const response = await apiFetch("/auth/registration-options");
    const data = unwrap(response);
    const departments = data.departments || [];
    const roles = data.roles || ["EMPLOYEE"];

    if (departments.length > 0) {
      registrationDepartment.disabled = false;
      registrationDepartment.required = true;
      registrationDepartment.innerHTML = [
        '<option value="">Select department</option>',
        ...departments.map((department) => `<option value="${escapeHtml(department.id)}">${escapeHtml(department.name)} (${escapeHtml(department.code)})</option>`)
      ].join("");
    } else {
      registrationDepartment.disabled = true;
      registrationDepartment.required = false;
      registrationDepartment.innerHTML = '<option value="">No active departments available</option>';
    }

    registrationRole.innerHTML = roles.map((role) => `<option value="${escapeHtml(role)}">${escapeHtml(role.replaceAll("_", " "))}</option>`).join("");
  } catch (error) {
    registrationDepartment.disabled = true;
    registrationDepartment.required = false;
    registrationDepartment.innerHTML = '<option value="">Department list unavailable</option>';
    setMessage(getErrorMessage(error), "error");
  }
}

if (session.getToken() && !window.location.search.includes("logout")) {
  dashboardRedirect();
}

try {
  const flash = JSON.parse(sessionStorage.getItem(REGISTER_FLASH_KEY) || "null");
  if (flash?.message) {
    sessionStorage.removeItem(REGISTER_FLASH_KEY);
    setMessage(flash.message, flash.type || "success");
    showToast(flash.message, flash.type || "success");
    const emailInput = loginForm?.elements?.email;
    if (emailInput && flash.email) {
      emailInput.value = flash.email;
      loginForm.elements.password?.focus();
    }
  }
} catch {
  sessionStorage.removeItem(REGISTER_FLASH_KEY);
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(loginForm);
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");

  if (!email || !password) {
    setMessage("Enter your work email and password.", "error");
    return;
  }

  setButtonLoading(loginForm, true, "Signing in...", "Sign In");
  try {
    const response = await apiFetch("/auth/login", {
      method: "POST",
      body: { email, password }
    });
    const data = unwrap(response);
    session.save({
      token: data.token,
      user: data.user
    });
    dashboardRedirect();
  } catch (error) {
    session.clear();
    setMessage(getErrorMessage(error), "error");
  } finally {
    setButtonLoading(loginForm, false, "Signing in...", "Sign In");
  }
});

createAccountButton?.addEventListener("click", () => {
  accountPanel?.classList.remove("hidden");
  authCard?.classList.add("is-registering");
  loadRegistrationOptions();
  accountPanel?.querySelector("input")?.focus();
});

cancelAccountButton?.addEventListener("click", () => {
  accountPanel?.classList.add("hidden");
  authCard?.classList.remove("is-registering");
  accountForm?.reset();
});

forgotPasswordButton?.addEventListener("click", () => {
  setMessage("Password reset is handled by your AssetFlow administrator.", "info");
});

accountForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(accountForm);
  const password = String(form.get("password") || "");
  const confirmPassword = String(form.get("confirmPassword") || "");

  if (!accountForm.checkValidity()) {
    accountForm.reportValidity();
    setMessage("Complete the required registration fields.", "error");
    return;
  }

  if (password !== confirmPassword) {
    setMessage("Passwords do not match.", "error");
    accountForm.elements.confirmPassword?.focus();
    return;
  }

  const payload = {
    firstName: String(form.get("firstName") || "").trim(),
    lastName: String(form.get("lastName") || "").trim(),
    email: String(form.get("email") || "").trim(),
    password,
    confirmPassword,
    departmentId: String(form.get("departmentId") || "") || undefined,
    role: String(form.get("role") || "EMPLOYEE"),
    phone: String(form.get("phone") || "").trim() || undefined
  };

  if (!payload.firstName || !payload.lastName || !payload.email || !payload.password || !payload.confirmPassword || !payload.role) {
    setMessage("Complete the required registration fields.", "error");
    return;
  }

  setButtonLoading(accountForm, true, "Submitting...", "Submit Request");
  try {
    await apiFetch("/auth/register", {
      method: "POST",
      body: payload
    });
    sessionStorage.setItem(
      REGISTER_FLASH_KEY,
      JSON.stringify({
        type: "success",
        message: "Employee account created. Sign in with your new credentials.",
        email: payload.email
      })
    );
    window.location.href = "login.html?registered=1";
  } catch (error) {
    setMessage(getErrorMessage(error), "error");
  } finally {
    setButtonLoading(accountForm, false, "Submitting...", "Submit Request");
  }
});

window.lucide?.createIcons();
