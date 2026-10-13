import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard, AuthenticatedRequest } from './auth.guard';

function createContext(
  request: Partial<AuthenticatedRequest>,
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  const jwt = new JwtService({
    secret: 'test-secret',
    signOptions: { expiresIn: '15m' },
  });
  const guard = new AuthGuard(jwt);

  it('rejects a request without an Authorization header', async () => {
    await expect(
      guard.canActivate(createContext({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a request with a non-bearer Authorization header', async () => {
    await expect(
      guard.canActivate(
        createContext({ headers: { authorization: 'Basic x' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a request with an invalid bearer token', async () => {
    await expect(
      guard.canActivate(
        createContext({ headers: { authorization: 'Bearer not-a-jwt' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a valid bearer token and attaches the authenticated user', async () => {
    const token = await jwt.signAsync({
      sub: 'user-1',
      email: 'ada@example.com',
    });
    const request: Partial<AuthenticatedRequest> = {
      headers: { authorization: `Bearer ${token}` },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'user-1', email: 'ada@example.com' });
  });
});
