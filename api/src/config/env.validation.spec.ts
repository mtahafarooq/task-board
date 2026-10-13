import { validateEnv } from './env.validation';

const BASE_ENV = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/taskboard',
  JWT_SECRET: 'test-secret',
};

describe('validateEnv', () => {
  it('returns a parsed config when required variables are present', () => {
    const env = validateEnv({ ...BASE_ENV, PORT: '4000' });

    expect(env).toMatchObject({
      DATABASE_URL: BASE_ENV.DATABASE_URL,
      JWT_SECRET: BASE_ENV.JWT_SECRET,
      PORT: 4000,
      COOKIE_SECURE: false,
    });
  });

  it('defaults PORT to 3001 and COOKIE_SECURE to false', () => {
    const env = validateEnv({ ...BASE_ENV });

    expect(env.PORT).toBe(3001);
    expect(env.COOKIE_SECURE).toBe(false);
  });

  it('defaults CORS_ORIGIN to the local web origin', () => {
    const env = validateEnv({ ...BASE_ENV });

    expect(env.CORS_ORIGIN).toBe('http://localhost:3000');
  });

  it('honours a configured CORS_ORIGIN', () => {
    const env = validateEnv({
      ...BASE_ENV,
      CORS_ORIGIN: 'https://board.example.com',
    });

    expect(env.CORS_ORIGIN).toBe('https://board.example.com');
  });

  it('fails with a clear message when a required variable is missing', () => {
    expect(() => validateEnv({ JWT_SECRET: 'test-secret' })).toThrow(
      /Missing required environment variable\(s\): DATABASE_URL/,
    );
  });

  it('treats a blank required variable as missing', () => {
    expect(() => validateEnv({ ...BASE_ENV, JWT_SECRET: '   ' })).toThrow(
      /JWT_SECRET/,
    );
  });

  it('rejects an out-of-range PORT', () => {
    expect(() => validateEnv({ ...BASE_ENV, PORT: 'not-a-number' })).toThrow(
      /Invalid PORT/,
    );
    expect(() => validateEnv({ ...BASE_ENV, PORT: '70000' })).toThrow(
      /Invalid PORT/,
    );
  });
});
