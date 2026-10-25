import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./tokens";
import type { Tokens } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** The one shared Axios instance every request goes through. */
export const api = axios.create({ baseURL: API_URL });

// A bare instance for the refresh call itself, so it can't trigger its own interceptors.
const bare = axios.create({ baseURL: API_URL });

type RetryableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

interface SessionHandlers {
  /** The refresh token stopped working: sign the user out in the UI. */
  onExpired: () => void;
  /** A refresh succeeded: the UI can pick up the latest name/role. */
  onRefreshed: (user: Tokens["user"]) => void;
}

let handlers: SessionHandlers | null = null;

/** The store registers these so the Axios layer can report session changes without importing it. */
export function setSessionHandlers(next: SessionHandlers) {
  handlers = next;
}

let refreshing: Promise<Tokens> | null = null;

/**
 * Exchanges the stored refresh token for a new token pair. Refresh tokens are
 * single use, so concurrent callers (parallel 401s, React strict-mode double
 * effects) must share one in-flight request.
 */
export function refreshSession(): Promise<Tokens> {
  // `.finally` runs after this assignment, so a call that fails straight away
  // (no stored token) can't leave a rejected promise cached forever.
  refreshing ??= requestNewTokens().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function requestNewTokens(): Promise<Tokens> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");
  try {
    const { data } = await bare.post<Tokens>("/auth/refresh", { refreshToken });
    setTokens(data);
    handlers?.onRefreshed(data.user);
    return data;
  } catch (error) {
    clearTokens();
    throw error;
  }
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

const AUTH_PATHS = ["/auth/login", "/auth/refresh"];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;
    const isAuthCall = AUTH_PATHS.some((path) => config?.url?.startsWith(path));

    if (error.response?.status === 401 && config && !config._retried && !isAuthCall) {
      config._retried = true;
      try {
        const tokens = await refreshSession();
        config.headers.set("Authorization", `Bearer ${tokens.accessToken}`);
        return api(config);
      } catch {
        handlers?.onExpired();
      }
    }
    return Promise.reject(error);
  },
);
