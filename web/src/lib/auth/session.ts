export const SESSION_COOKIE_NAME = "tb_session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function setSessionCookie(): void {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${SESSION_COOKIE_NAME}=1; path=/; max-age=${SESSION_MAX_AGE_SECONDS}; samesite=lax`;
}

export function clearSessionCookie(): void {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
}
