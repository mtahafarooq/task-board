import { DEFAULT_CORS_ORIGIN } from '../cors';

export interface AppEnv {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET?: string;
  COOKIE_SECURE: boolean;
  CORS_ORIGIN: string;
}

const REQUIRED_VARS = ['DATABASE_URL', 'JWT_SECRET'] as const;

export function validateEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const missing = REQUIRED_VARS.filter((key) => {
    const value = env[key];
    return value === undefined || value.trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Set them in the environment or .env before starting the API ' +
        '(see .env.example).',
    );
  }

  const port = Number(env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid PORT "${env.PORT}": expected an integer between 1 and 65535.`,
    );
  }

  return {
    NODE_ENV: env.NODE_ENV ?? 'development',
    PORT: port,
    DATABASE_URL: env.DATABASE_URL as string,
    JWT_SECRET: env.JWT_SECRET as string,
    JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET,
    COOKIE_SECURE: env.COOKIE_SECURE === 'true',
    CORS_ORIGIN: env.CORS_ORIGIN?.trim() || DEFAULT_CORS_ORIGIN,
  };
}
