// ==============================================
// 🌐 SAME ORIGIN BASE URL (VITE PROXY)
// ==============================================
const NGROK_URLS = "http://localhost:5000";

/**
 * MAIN BACKEND URLS
 * (Keep BASE_URLS so existing imports don't break)
 */
export const BASE_URLS = {
  user: NGROK_URLS,
  admin: NGROK_URLS,
};

// Unified base URL used by all requests
export const BASE_URL = BASE_URLS.user;

// ==============================================
// 📡 API FETCH WRAPPER (COOKIE + VITE PROXY SAFE)
// ==============================================
export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const isFormData = options.body instanceof FormData;

  // 🔥 get refresh token from localStorage
  const refreshToken = localStorage.getItem("refresh_token");

  const res = await fetch(url, {
    credentials: "include",

headers: {
  ...(isFormData ? {} : { "Content-Type": "application/json" }),

  ...(refreshToken
    ? { Authorization: `Bearer ${refreshToken}` }
    : {}),


 

  ...(options.headers || {}),
},

    ...options,
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
}


// ==============================================
// 🌐 API METHOD HELPERS
// ==============================================
export const apiGet = (path, extraOptions = {}) =>
  apiFetch(path, {
    method: "GET",
    ...extraOptions,
  });

export const apiPost = (path, body, extraOptions = {}) =>
  apiFetch(path, {
    method: "POST",
    body: body instanceof FormData ? body : JSON.stringify(body),
    ...extraOptions,
  });

export const apiPut = (path, body, extraOptions = {}) =>
  apiFetch(path, {
    method: "PUT",
    body: body instanceof FormData ? body : JSON.stringify(body),
    ...extraOptions,
  });

export const apiDelete = (path, extraOptions = {}) =>
  apiFetch(path, {
    method: "DELETE",
    ...extraOptions,
  });