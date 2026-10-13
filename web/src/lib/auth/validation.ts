export interface LoginErrors {
  email?: string;
  password?: string;
}

export interface RegisterErrors {
  name?: string;
  email?: string;
  password?: string;
}

export const MAX_NAME_LENGTH = 100;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): string | undefined {
  const value = email.trim();
  if (!value) {
    return "Email is required.";
  }
  if (!EMAIL_PATTERN.test(value)) {
    return "Enter a valid email address.";
  }
  return undefined;
}

export function validateLogin(input: {
  email: string;
  password: string;
}): LoginErrors {
  const errors: LoginErrors = {};

  const email = validateEmail(input.email);
  if (email) {
    errors.email = email;
  }

  if (!input.password) {
    errors.password = "Password is required.";
  }

  return errors;
}

export function validateRegister(input: {
  name: string;
  email: string;
  password: string;
}): RegisterErrors {
  const errors: RegisterErrors = {};

  const name = input.name.trim();
  if (!name) {
    errors.name = "Name is required.";
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.name = `Name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  }

  const email = validateEmail(input.email);
  if (email) {
    errors.email = email;
  }

  if (!input.password) {
    errors.password = "Password is required.";
  } else if (input.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  } else if (input.password.length > MAX_PASSWORD_LENGTH) {
    errors.password = `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`;
  }

  return errors;
}
