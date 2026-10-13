import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

function createContext(statusCode: number): ExecutionContext {
  return {
    switchToHttp: () => ({ getResponse: () => ({ statusCode }) }),
  } as unknown as ExecutionContext;
}

function handlerReturning(value: unknown): CallHandler {
  return { handle: () => of(value) };
}

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor();

  it('wraps a payload in the success envelope with the response status', async () => {
    const context = createContext(200);

    const result = await lastValueFrom(
      interceptor.intercept(context, handlerReturning({ id: 'task-1' })),
    );

    expect(result).toEqual({
      success: true,
      statusCode: 200,
      data: { id: 'task-1' },
    });
  });

  it('preserves a created status code', async () => {
    const context = createContext(201);

    const result = await lastValueFrom(
      interceptor.intercept(context, handlerReturning({ id: 'task-1' })),
    );

    expect(result).toMatchObject({ statusCode: 201 });
  });

  it('returns null data when the handler returns nothing', async () => {
    const context = createContext(200);

    const result = await lastValueFrom(
      interceptor.intercept(context, handlerReturning(undefined)),
    );

    expect(result).toEqual({ success: true, statusCode: 200, data: null });
  });

  it('emits no body for a 204 response', async () => {
    const context = createContext(204);

    const result = await lastValueFrom(
      interceptor.intercept(context, handlerReturning(undefined)),
    );

    expect(result).toBeUndefined();
  });
});
