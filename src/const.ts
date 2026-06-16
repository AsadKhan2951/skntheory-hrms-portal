export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const SESSION_TOKEN_STORAGE_KEY = "session_token";

export const getLoginUrl = () => "/";

export function getStoredSessionToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
}

export function storeSessionToken(token?: string | null) {
  if (typeof window === "undefined") return;

  if (!token) {
    window.localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token);
}

export function clearStoredSessionToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
}
