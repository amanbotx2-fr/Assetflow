const TOKEN_KEY = "assetflow.auth.token";
const USER_KEY = "assetflow.auth.user";
const API_BASE_KEY = "assetflow.api.baseUrl";

export const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ||
  window.ASSETFLOW_API_BASE_URL ||
  localStorage.getItem(API_BASE_KEY) ||
  "http://localhost:5000/api";

export const session = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  },
  save({ token, user }) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatDate(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export function initials(name) {
  return String(name || "AssetFlow")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AF";
}

export function titleCase(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function statusClass(status) {
  const normalized = String(status || "").toUpperCase();
  if (["AVAILABLE", "APPROVED", "ACTIVE", "COMPLETED", "RESOLVED", "VERIFIED", "CLOSED"].includes(normalized)) {
    return "status-success";
  }
  if (["REQUESTED", "PENDING", "PLANNED", "ASSIGNED"].includes(normalized)) {
    return "status-warning";
  }
  if (["REJECTED", "CANCELLED", "RETIRED", "LOST", "MISSING", "DAMAGED"].includes(normalized)) {
    return "status-danger";
  }
  if (["UNDER_MAINTENANCE", "MAINTENANCE", "IN_PROGRESS"].includes(normalized)) {
    return "status-maintenance";
  }
  if (["ALLOCATED", "TRANSFERRED"].includes(normalized)) {
    return "status-transition";
  }
  return "status-info";
}

export function badge(status) {
  return `<span class="status-badge ${statusClass(status)}">${escapeHtml(titleCase(status || "Unknown"))}</span>`;
}

export function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function apiFetch(path, options = {}) {
  const { query, body, headers, timeout = 15000, ...fetchOptions } = options;
  const token = session.getToken();
  const url = `${API_BASE_URL}${path}${buildQuery(query)}`;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  let response;

  try {
    response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (error) {
    const networkError = new Error(error?.name === "AbortError" ? "Request timed out. Please try again." : "Network request failed. Confirm the backend is running.");
    networkError.status = 0;
    networkError.originalError = error;
    throw networkError;
  } finally {
    window.clearTimeout(timer);
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || response.statusText || "Request failed";
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function unwrap(payload) {
  if (payload && typeof payload === "object" && "success" in payload && "data" in payload) {
    return payload.data;
  }
  return payload?.data ?? payload;
}

export function normalizeList(payload, keys = []) {
  const value = unwrap(payload);
  if (Array.isArray(value)) return value;
  for (const key of keys) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

export function normalizePagination(payload, defaultValue = {}) {
  const value = unwrap(payload);
  return value?.pagination || value?.metadata?.pagination || payload?.pagination || defaultValue;
}

export function extractFieldErrors(error) {
  const details = error?.payload?.error?.details;
  const fieldErrors = details?.fieldErrors || details?.formErrors || {};
  if (Array.isArray(fieldErrors)) return fieldErrors.join(" ");
  if (!fieldErrors || typeof fieldErrors !== "object") return "";
  return Object.entries(fieldErrors)
    .flatMap(([field, messages]) => {
      const text = Array.isArray(messages) ? messages.join(" ") : String(messages || "");
      return text ? [`${titleCase(field)}: ${text}`] : [];
    })
    .join(" ");
}

export function getErrorMessage(error) {
  return extractFieldErrors(error) || error?.payload?.error?.message || error?.message || "Request failed.";
}
