import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../auth.types';
import { AuthenticatedRequest } from '../guards/auth.guard';

export function currentUserFactory(
  _data: unknown,
  context: ExecutionContext,
): AuthenticatedUser {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user;
}

export const CurrentUser = createParamDecorator(currentUserFactory);
