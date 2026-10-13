import { validateLogin, validateRegister } from "./validation";

describe("validateLogin", () => {
  it("accepts a valid email and password", () => {
    expect(
      validateLogin({ email: "ada@example.com", password: "secret" }),
    ).toEqual({});
  });

  it("requires an email", () => {
    expect(validateLogin({ email: "   ", password: "secret" }).email).toBe(
      "Email is required.",
    );
  });

  it("rejects a malformed email", () => {
    expect(validateLogin({ email: "ada", password: "secret" }).email).toBe(
      "Enter a valid email address.",
    );
  });

  it("requires a password", () => {
    expect(
      validateLogin({ email: "ada@example.com", password: "" }).password,
    ).toBe("Password is required.");
  });
});

describe("validateRegister", () => {
  it("accepts a valid registration", () => {
    expect(
      validateRegister({
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "supersecret",
      }),
    ).toEqual({});
  });

  it("requires a name", () => {
    expect(
      validateRegister({ name: "", email: "ada@example.com", password: "s" })
        .name,
    ).toBe("Name is required.");
  });

  it("rejects a name longer than the allowed length", () => {
    expect(
      validateRegister({
        name: "x".repeat(101),
        email: "ada@example.com",
        password: "supersecret",
      }).name,
    ).toBe("Name must be 100 characters or fewer.");
  });

  it("enforces a minimum password length", () => {
    expect(
      validateRegister({
        name: "Ada",
        email: "ada@example.com",
        password: "short",
      }).password,
    ).toBe("Password must be at least 8 characters.");
  });

  it("enforces a maximum password length", () => {
    expect(
      validateRegister({
        name: "Ada",
        email: "ada@example.com",
        password: "x".repeat(73),
      }).password,
    ).toBe("Password must be 72 characters or fewer.");
  });

  it("reports every invalid field at once", () => {
    const errors = validateRegister({ name: "", email: "nope", password: "" });

    expect(errors.name).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });
});
