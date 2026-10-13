export const LOGIN_PATH = "/login";
export const BOARD_PATH = "/board";

const AUTH_PATHS = [LOGIN_PATH, "/register"];

function isBoardPath(pathname: string): boolean {
  return pathname === BOARD_PATH || pathname.startsWith(`${BOARD_PATH}/`);
}

export function resolveAuthRedirect(
  pathname: string,
  hasSession: boolean,
): string | null {
  if (isBoardPath(pathname)) {
    return hasSession ? null : LOGIN_PATH;
  }

  if (pathname === "/") {
    return hasSession ? BOARD_PATH : null;
  }

  if (AUTH_PATHS.includes(pathname)) {
    return hasSession ? BOARD_PATH : null;
  }

  return null;
}
