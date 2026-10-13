import { resolveAuthRedirect } from "./redirect";

describe("resolveAuthRedirect", () => {
  it("sends unauthenticated visitors on protected routes to /login", () => {
    expect(resolveAuthRedirect("/board", false)).toBe("/login");
    expect(resolveAuthRedirect("/board/settings", false)).toBe("/login");
  });

  it("lets authenticated users stay on protected routes", () => {
    expect(resolveAuthRedirect("/board", true)).toBeNull();
    expect(resolveAuthRedirect("/board/settings", true)).toBeNull();
  });

  it("sends authenticated users from the landing and auth pages to the board", () => {
    expect(resolveAuthRedirect("/", true)).toBe("/board");
    expect(resolveAuthRedirect("/login", true)).toBe("/board");
    expect(resolveAuthRedirect("/register", true)).toBe("/board");
  });

  it("leaves the landing page and auth pages alone for unauthenticated users", () => {
    expect(resolveAuthRedirect("/", false)).toBeNull();
    expect(resolveAuthRedirect("/login", false)).toBeNull();
    expect(resolveAuthRedirect("/register", false)).toBeNull();
  });

  it("ignores unrelated routes", () => {
    expect(resolveAuthRedirect("/about", false)).toBeNull();
    expect(resolveAuthRedirect("/about", true)).toBeNull();
  });
});
