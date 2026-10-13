import {
  SESSION_COOKIE_NAME,
  clearSessionCookie,
  setSessionCookie,
} from "./session";

interface CookieDocument {
  cookie: string;
}

function captureCookieWrites(run: () => void): string[] {
  const writes: string[] = [];
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  const doc: CookieDocument = {
    get cookie() {
      return "";
    },
    set cookie(value: string) {
      writes.push(value);
    },
  };

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: doc,
  });

  try {
    run();
  } finally {
    if (previous) {
      Object.defineProperty(globalThis, "document", previous);
    } else {
      delete (globalThis as { document?: unknown }).document;
    }
  }

  return writes;
}

describe("session cookie", () => {
  it("sets a readable, week-long session cookie at the site root", () => {
    const writes = captureCookieWrites(() => setSessionCookie());

    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain(`${SESSION_COOKIE_NAME}=1`);
    expect(writes[0]).toContain("path=/");
    expect(writes[0]).toContain("max-age=604800");
    expect(writes[0]).toContain("samesite=lax");
  });

  it("clears the session cookie", () => {
    const writes = captureCookieWrites(() => clearSessionCookie());

    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain(`${SESSION_COOKIE_NAME}=;`);
    expect(writes[0]).toContain("max-age=0");
  });

  it("is a no-op when document is unavailable", () => {
    expect(() => setSessionCookie()).not.toThrow();
    expect(() => clearSessionCookie()).not.toThrow();
  });
});
