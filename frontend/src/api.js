// DEMO: Backend URL is injected at build time from VITE_BACKEND_URL.
// Make sure the GitHub Variable VITE_BACKEND_URL points at your
// backend ALB DNS (e.g. http://ontract-backend-alb-...elb.amazonaws.com).
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  "";

export const BASE_URLS = { user: BACKEND_URL, admin: BACKEND_URL };
export const BASE_URL = BASE_URLS.user;

export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const isFormData = options.body instanceof FormData;
  const refreshToken = localStorage.getItem("refresh_token");

  const res = await fetch(url, {
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(refreshToken ? { Authorization: `Bearer ${refreshToken}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const raw = await res.text();
  if (raw.startsWith("<!DOCTYPE html>")) {
    throw new Error("Backend returned HTML error page.");
  }
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }

  if (!res.ok) {
    const message = data?.error || data?.message || raw || `HTTP ${res.status}`;
    const err = new Error(message);
    err.response = { status: res.status, data };
    throw err;
  }
  return data ?? null;
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
