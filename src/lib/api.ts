import axios, { AxiosError, AxiosRequestConfig } from "axios";

import { env } from "@/env";

import { cookie } from "@/lib/cookie-client";
import { mockApi } from "@/lib/mock-api";

// Toggle mock mode; set to false for real live backend operation
export const USE_MOCK_API = false;

/**
 * Every failed API call rejects with this. It is a plain Error (same message as before), plus the
 * HTTP status and the error body's `data`, for callers that branch on them (e.g. a 409 with a code).
 */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ||
    env.NEXT_PUBLIC_API_URL ||
    "https://nayem5000.binarybards.online/api/v1",
  timeout: 15_000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json"
  }
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Call POST /api/v1/auth/refresh to exchange active refresh token / session for a fresh access token.
 */
export async function refreshAccessToken(): Promise<string> {
  const sessionId = cookie.get("sessionId") || undefined;
  const baseURL =
    process.env.NEXT_PUBLIC_API_URL ||
    env.NEXT_PUBLIC_API_URL ||
    "https://nayem5000.binarybards.online/api/v1";

  const res = await axios.post<{
    success: boolean;
    data: { accessToken: string; sessionId?: string };
  }>(
    `${baseURL}/auth/refresh`,
    sessionId ? { sessionId } : {},
    {
      withCredentials: true,
      headers: { "Content-Type": "application/json", Accept: "application/json" }
    }
  );

  const newToken = res.data?.data?.accessToken;
  if (newToken) {
    cookie.set("accessToken", newToken);
    if (res.data?.data?.sessionId) {
      cookie.set("sessionId", res.data.data.sessionId);
    }
    return newToken;
  }
  throw new Error("No access token returned by refresh endpoint");
}

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = cookie.get("accessToken");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (
    err: AxiosError<{ message?: string; errorMessages?: Array<{ message: string; path?: string }> }>
  ) => {
    // Ignore intentionally canceled/aborted requests (React 19 lifecycle cleanup & React Query signal)
    if (axios.isCancel(err)) {
      return Promise.reject(err);
    }

    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const method = err.config?.method?.toUpperCase() || "REQUEST";
      const url = err.config?.url || "";
      const originalConfig = err.config as AxiosRequestConfig & {
        _retry?: boolean;
        skipAuthRedirect?: boolean;
      };
      const skipAuthRedirect = Boolean(originalConfig?.skipAuthRedirect);
      const firstDetail = err.response?.data?.errorMessages?.[0]?.message;
      const mainMessage = err.response?.data?.message;
      const serverMessage =
        firstDetail && (mainMessage === "Validation Error" || !mainMessage)
          ? firstDetail
          : mainMessage || firstDetail || err.message || "An unexpected network error occurred";

      // Detailed console error logging ONLY for genuine server/network errors
      // (skip expected 401s from silent session-hydration checks so stale cookies don't surface as errors)
      if (!(skipAuthRedirect && status === 401)) {
        console.error(
          `🚨 [API Error ${status || "Network"}]: ${method} ${url}\n` +
            `• Server Message: ${serverMessage}\n` +
            `• Details:`,
          err.response?.data ?? err.message
        );
      }

      // Handle 401 Unauthorized: Attempt silent refresh once for protected non-auth requests
      if (status === 401 && typeof window !== "undefined") {
        const isAuthUrl =
          url.includes("/auth/login") ||
          url.includes("/auth/refresh") ||
          url.includes("/auth/register") ||
          url.includes("/auth/forgot-password") ||
          url.includes("/auth/reset-password");

        if (!originalConfig?._retry && !isAuthUrl && !skipAuthRedirect) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({
                resolve: (token: string) => {
                  if (originalConfig.headers) {
                    originalConfig.headers.Authorization = `Bearer ${token}`;
                  }
                  resolve(api(originalConfig));
                },
                reject: (queueErr: unknown) => {
                  reject(queueErr);
                }
              });
            });
          }

          originalConfig._retry = true;
          isRefreshing = true;

          try {
            const newToken = await refreshAccessToken();
            processQueue(null, newToken);
            if (originalConfig.headers) {
              originalConfig.headers.Authorization = `Bearer ${newToken}`;
            }
            return api(originalConfig);
          } catch (refreshErr) {
            processQueue(refreshErr, null);
            cookie.remove("accessToken");
            cookie.remove("sessionId");
            const pathname = window.location.pathname;
            if (
              !pathname.startsWith("/login") &&
              !pathname.startsWith("/signup") &&
              !pathname.startsWith("/verify-email") &&
              !pathname.startsWith("/forgot-password") &&
              !pathname.startsWith("/reset-password")
            ) {
              window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
            }
            return Promise.reject(
              new ApiRequestError(
                "Session expired. Please sign in again.",
                401,
                axios.isAxiosError(refreshErr) ? refreshErr.response?.data : undefined
              )
            );
          } finally {
            isRefreshing = false;
          }
        }

        // Clean up credentials if refresh is not eligible or failed
        cookie.remove("accessToken");
        cookie.remove("sessionId");
        const pathname = window.location.pathname;
        if (
          !skipAuthRedirect &&
          !pathname.startsWith("/login") &&
          !pathname.startsWith("/signup") &&
          !pathname.startsWith("/verify-email") &&
          !pathname.startsWith("/forgot-password") &&
          !pathname.startsWith("/reset-password")
        ) {
          window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
        }
      }

      return Promise.reject(
        new ApiRequestError(serverMessage, status, (err.response?.data as { data?: unknown })?.data)
      );
    }
    return Promise.reject(err);
  }
);

type Cfg = AxiosRequestConfig & { signal?: AbortSignal; skipAuthRedirect?: boolean };

export const get = async <T>(url: string, config?: Cfg): Promise<T> => {
  if (USE_MOCK_API) {
    if (url === "/user/profile" || url.includes("/user/profile")) {
      return (await mockApi.getProfile()) as unknown as T;
    }
  }
  try {
    return (await api.get<T>(url, config)).data;
  } catch (error) {
    if (USE_MOCK_API) {
      if (url.includes("/user/profile")) {
        return (await mockApi.getProfile()) as unknown as T;
      }
    }
    throw error;
  }
};

export const post = async <T, B = unknown>(url: string, body?: B, config?: Cfg): Promise<T> => {
  if (USE_MOCK_API) {
    if (url === "/auth/login" || url.includes("/auth/login")) {
      return (await mockApi.login(
        body as unknown as Parameters<typeof mockApi.login>[0]
      )) as unknown as T;
    }
    if (url === "/user" || url.includes("/user")) {
      return (await mockApi.signup(
        body as unknown as Parameters<typeof mockApi.signup>[0]
      )) as unknown as T;
    }
  }
  try {
    return (await api.post<T>(url, body, config)).data;
  } catch (error) {
    if (USE_MOCK_API) {
      if (url.includes("/auth/login")) {
        return (await mockApi.login(
          body as unknown as Parameters<typeof mockApi.login>[0]
        )) as unknown as T;
      }
      if (url.includes("/user")) {
        return (await mockApi.signup(
          body as unknown as Parameters<typeof mockApi.signup>[0]
        )) as unknown as T;
      }
    }
    throw error;
  }
};

export const patch = async <T, B = unknown>(url: string, body?: B, config?: Cfg): Promise<T> =>
  (await api.patch<T>(url, body, config)).data;

export const put = async <T, B = unknown>(url: string, body?: B, config?: Cfg): Promise<T> =>
  (await api.put<T>(url, body, config)).data;

export const del = async <T>(url: string, config?: Cfg): Promise<T> =>
  (await api.delete<T>(url, config)).data;
