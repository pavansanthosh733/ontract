// DEMO: Backend URL is injected at build time from VITE_BACKEND_URL.
// Make sure the GitHub Variable VITE_BACKEND_URL points at your
// backend ALB DNS (e.g. http://ontract-backend-alb-...elb.amazonaws.com).
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  "";

export const BASE_URLS = { user: BACKEND_URL, admin: BACKEND_URL };
export const BASE_URL = BASE_URLS.user;

function getAuthToken() {

  // 1️⃣ Check admin token first
  const adminToken = localStorage.getItem("admin_token");
  if (adminToken) return adminToken;

  // 2️⃣ Check contractor token
  const contractorToken = localStorage.getItem("contractor_token");
  if (contractorToken) return contractorToken;

  // 3️⃣ Check user/individual token
  const userToken = localStorage.getItem("access_token");
  if (userToken) return userToken;

  // 4️⃣ No token found
  return null;
}

// ==============================================
// ✅ GET ROLE BASED ON TOKEN
// ==============================================
function getCurrentRole() {
  if (localStorage.getItem("admin_token"))      return "admin";
  if (localStorage.getItem("contractor_token")) return "contractor";
  if (localStorage.getItem("access_token"))     return "user";
  return null;
}

/* ==============================================
   API FETCH WRAPPER
============================================== */
export async function apiFetch(path, options = {}) {

  // ✅ Loading events
  window.dispatchEvent(new Event("api-loading-start"));

  try {
    const url = path.startsWith("http")
      ? path
      : `${BASE_URL}${path}`;

    const isFormData = options.body instanceof FormData;

    // ✅ Auto pick correct token
    const token = getAuthToken();

    const headers = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const res = await fetch(url, {
      mode: "cors",
      credentials: "include",
      ...options,
      headers,
    });

    const raw = await res.text();

    if (raw.startsWith("<!DOCTYPE html>")) {
      throw new Error("Backend returned HTML error page.");
    }

    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const message =
        data?.error   ||
        data?.message ||
        raw           ||
        `HTTP ${res.status} ${res.statusText}`;

      // ✅ 401 — logout correct user
      if (res.status === 401) {
        console.warn(`🔒 Unauthorized | role=${getCurrentRole()}`);
        _handleUnauthorized();
      }

      const err = new Error(message);
      err.response = { status: res.status, data };
      throw err;
    }

    return data ?? null;

  } finally {
    window.dispatchEvent(new Event("api-loading-end"));
  }
}

// ==============================================
// ✅ HANDLE 401 — clear correct token
// ==============================================
function _handleUnauthorized() {
  const role = getCurrentRole();
  const currentPath = window.location.pathname;
  const loginPaths = ["/admin/login", "/contractor/login", "/login", "/"];
  
  if (loginPaths.includes(currentPath)) {
    console.warn("🔒 Already on login page, skipping redirect");
    return;
  }

  if (role === "admin") {
    console.warn("🔒 Admin token expired");
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin"); 
    window.location.href = "/admin/login";
  } else if (role === "contractor") {
    console.warn("🔒 Contractor token expired");
     localStorage.removeItem("contractor_token");
     localStorage.removeItem("contractor");
     window.location.href = "/contractor/login";
  } else {
    console.warn("🔒 User token expired");
     localStorage.removeItem("access_token");
     localStorage.removeItem("user"); 
     window.location.href = "/login";
  }
}

export const apiGet = (path, extra = {}) =>
  apiFetch(path, { method: "GET", ...extra });

export const apiPost = (path, body, extra = {}) =>
  apiFetch(path, {
    method: "POST",
    body: body instanceof FormData ? body : JSON.stringify(body),
    ...extra,
  });

export const apiPut = (path, body, extra = {}) =>
  apiFetch(path, {
    method: "PUT",
    body: body instanceof FormData ? body : JSON.stringify(body),
    ...extra,
  });

export const apiDelete = (path, extra = {}) =>
  apiFetch(path, { method: "DELETE", ...extra });
