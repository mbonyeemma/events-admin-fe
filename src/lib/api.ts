import { toast } from "sonner";

/** Empty = same origin (the API serves the panel at /panel; `npm run dev` proxies to it). */
export const BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
/** Router base, e.g. "/panel" */
export const APP_BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

const TOKEN_KEY = "lyxa_admin_token";

export interface ApiResponse<T = unknown> {
  status: number;
  message: string;
  data?: T;
}

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

type Query = Record<string, string | number | boolean | undefined | null>;

function buildQuery(params?: Query): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.append(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Thrown for every failed call; the message is already shown as a toast unless `quiet`. */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Options = RequestInit & {
  /** Don't toast errors (the caller shows them). */
  quiet?: boolean;
  /** false = public endpoint: no token, and a 401 is just an error (wrong password). */
  auth?: boolean;
};

async function request<T>(endpoint: string, options: Options = {}): Promise<ApiResponse<T>> {
  const { quiet, auth = true, ...init } = options;
  const token = auth ? getToken() : null;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...init.headers,
  };

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, { ...init, headers });
  } catch {
    const message = "Can't reach the Lyxa Events API.";
    if (!quiet) toast.error(message);
    throw new ApiError(0, message);
  }

  const body = (await response.json().catch(() => ({}))) as Partial<ApiResponse<T>>;
  const status = typeof body.status === "number" ? body.status : response.status;

  if (status === 401 && token) {
    clearToken();
    localStorage.removeItem("lyxa_admin_profile");
    toast.error("Session expired. Please sign in again.");
    location.href = `${APP_BASE}/login`;
    throw new ApiError(401, body.message || "Unauthorized");
  }

  if (!response.ok || status >= 400) {
    const message = body.message || `Request failed (${status})`;
    if (!quiet) toast.error(message);
    throw new ApiError(status, message);
  }

  return body as ApiResponse<T>;
}

export const api = {
  get: <T>(endpoint: string, params?: Query) => request<T>(`${endpoint}${buildQuery(params)}`, { method: "GET" }),
  post: <T>(endpoint: string, body?: unknown, opts?: { quiet?: boolean; auth?: boolean }) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body ?? {}), ...opts }),
  put: <T>(endpoint: string, body?: unknown, opts?: { quiet?: boolean }) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(body ?? {}), ...opts }),
  del: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
};
