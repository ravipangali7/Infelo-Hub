import type { User } from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

const TOKEN_KEY = "infelo_token";
const USER_KEY = "infelo_user";
const AUTH_REDIRECT_REASON_KEY = "infelo_auth_redirect_reason";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/** Cached current user (from login/register or GET auth/me/). */
export function getUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export class ApiError extends Error {
  status: number;
  detail: string;
  code?: string;
  errors?: Record<string, string[]>;

  constructor(res: { status: number; detail: string; code?: string; errors?: Record<string, string[]> }) {
    super(res.detail);
    this.name = "ApiError";
    this.status = res.status;
    this.detail = res.detail;
    this.code = res.code;
    this.errors = res.errors;
  }
}

export function setAuthRedirectReason(reason: string): void {
  localStorage.setItem(AUTH_REDIRECT_REASON_KEY, reason);
}

export function popAuthRedirectReason(): string | null {
  const reason = localStorage.getItem(AUTH_REDIRECT_REASON_KEY);
  localStorage.removeItem(AUTH_REDIRECT_REASON_KEY);
  return reason;
}

export async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    formData?: FormData;
  } = {}
): Promise<T> {
  const { method = "GET", body, headers = {}, formData } = options;
  const token = getToken();
  const url = path.startsWith("http") ? path : `${BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

  const reqHeaders: Record<string, string> = { ...headers };
  if (token) {
    reqHeaders["Authorization"] = `Token ${token}`;
  }
  if (!formData) {
    reqHeaders["Content-Type"] = "application/json";
  }

  const fetchOptions: RequestInit = {
    method,
    headers: reqHeaders,
  };
  if (formData) {
    fetchOptions.body = formData;
    delete (reqHeaders as Record<string, string>)["Content-Type"];
  } else if (body !== undefined && method !== "GET") {
    fetchOptions.body = JSON.stringify(body);
  }

  const res = await fetch(url, fetchOptions);
  let data: { detail?: string; code?: string; errors?: Record<string, string[]> };
  try {
    data = await res.json();
  } catch {
    data = { detail: res.statusText || "Request failed" };
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        setAuthRedirectReason("SESSION_EXPIRED");
        window.location.href = "/login";
      }
    } else if (res.status === 403 && data.code && ["ACCOUNT_FROZEN", "ACCOUNT_DEACTIVATED", "ACCOUNT_DISABLED"].includes(data.code)) {
      clearToken();
      if (typeof window !== "undefined" && !window.location.pathname.includes("/account-blocked")) {
        setAuthRedirectReason(data.code);
        window.location.href = "/account-blocked";
      }
    }
    throw new ApiError({
      status: res.status,
      detail: data.detail ?? "Request failed",
      code: data.code,
      errors: data.errors,
    });
  }

  return data as T;
}

/** PATCH multipart with XMLHttpRequest so upload progress can be reported. */
export function patchFormWithUploadProgress<T>(
  path: string,
  formData: FormData,
  onProgress?: (loaded: number, total: number) => void
): Promise<T> {
  const token = getToken();
  const url = path.startsWith("http") ? path : `${BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PATCH", url);
    if (token) {
      xhr.setRequestHeader("Authorization", `Token ${token}`);
    }

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) {
        onProgress(ev.loaded, ev.total);
      }
    };

    xhr.onload = () => {
      let data: { detail?: string; code?: string; errors?: Record<string, string[]> };
      try {
        data = JSON.parse(xhr.responseText) as typeof data;
      } catch {
        data = { detail: xhr.statusText || "Request failed" };
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        if (xhr.status === 401) {
          clearToken();
          if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
            setAuthRedirectReason("SESSION_EXPIRED");
            window.location.href = "/login";
          }
        } else if (
          xhr.status === 403 &&
          data.code &&
          ["ACCOUNT_FROZEN", "ACCOUNT_DEACTIVATED", "ACCOUNT_DISABLED"].includes(data.code)
        ) {
          clearToken();
          if (typeof window !== "undefined" && !window.location.pathname.includes("/account-blocked")) {
            setAuthRedirectReason(data.code);
            window.location.href = "/account-blocked";
          }
        }
        reject(
          new ApiError({
            status: xhr.status,
            detail: data.detail ?? "Request failed",
            code: data.code,
            errors: data.errors,
          })
        );
        return;
      }

      resolve(data as T);
    };

    xhr.onerror = () => {
      reject(new ApiError({ status: 0, detail: "Network error" }));
    };

    xhr.send(formData);
  });
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  postForm: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", formData }),
  patchForm: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "PATCH", formData }),
};
