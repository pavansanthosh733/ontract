const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  "";

export const BASE_URLS = { user: BACKEND_URL, admin: BACKEND_URL };
export const BASE_URL = BASE_URLS.user;

function getAuthToken() {
  return null;
}

// ===============================================
function getRefreshUrl(path) {
  if (path.startsWith("/api/admin")) {
    return `${BASE_URLS.admin}/api/admin/refresh`;
  }

  if (path.startsWith("/api/contractor")) {
    return `${BASE_URLS.contractor}/api/contractor/refresh`;
  }
  
  return `${BASE_URLS.user}/api/refresh`;
} null;
}

/* ==============================================
   API FETCH WRAPPER
============================================== */
export async function apiFetch(path, options = {}) {
  console.log("API CALL:", path);

  window.dispatchEvent(new Event("api-loading-start"));

  try {
    const url = path.startsWith("http")
      ? path
      : `${BASE_URL}${path}`;

    const isFormData = options.body instanceof FormData;

    const token = getAuthToken();

    const headers = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    let res = await fetch(url, {
      mode: "cors",
      credentials: "include",
      ...options,
      headers,
    });

    // ===================================================
    // AUTO REFRESH ON 401
    // ===================================================
    if (res.status === 401) {
      const refreshUrl = getRefreshUrl(path);

      console.warn("401 received");
      console.log("Refreshing via:", refreshUrl);

      const refreshResponse = await fetch(refreshUrl, {
        method: "POST",
        credentials: "include",
      });

      if (refreshResponse.ok) {
        console.log("Refresh successful. Retrying request...");

        res = await fetch(url, {
          mode: "cors",
          credentials: "include",
          ...options,
          headers,
        });
      } else {
        console.warn("Refresh failed");
        _handleUnauthorized();
      }
    }

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

    console.log("STATUS:", res.status, path);

    if (!res.ok) {
      const message =
        data?.error ||
        data?.message ||
        raw ||
        `HTTP ${res.status} ${res.statusText}`;

      const err = new Error(message);
      err.response = {
        status: res.status,
        data,
      };

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
  console.warn("Unauthorized request.");
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