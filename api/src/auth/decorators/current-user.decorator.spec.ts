import { ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../auth.types';
import { currentUserFactory } from './current-user.decorator';

function createContext(user: AuthenticatedUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('CurrentUser', () => {
  it('resolves the authenticated user from the request', () => {
    const user: AuthenticatedUser = { id: 'user-1', email: 'ada@example.com' };

    expect(currentUserFactory(undefined, createContext(user))).toBe(user);
  });
});
