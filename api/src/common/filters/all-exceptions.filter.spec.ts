import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function createHost(): {
  host: ArgumentsHost;
  status: jest.Mock;
  json: jest.Mock;
} {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: 'GET', url: '/api/v1/tasks/1' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('normalizes an HttpException to the shared error shape', () => {
    const { host, status, json } = createHost();

    filter.catch(new NotFoundException('Task not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      statusCode: 404,
      error: 'Not Found',
      message: 'Task not found',
      path: '/api/v1/tasks/1',
    });
  });

  it('keeps an array of validation messages', () => {
    const { host, json } = createHost();

    filter.catch(
      new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: ['title should not be empty'],
      }),
      host,
    );

    expect(json).toHaveBeenCalledWith({
      success: false,
      statusCode: 400,
      error: 'Bad Request',
      message: ['title should not be empty'],
      path: '/api/v1/tasks/1',
    });
  });

  it('handles a plain string HttpException response', () => {
    const { host, json } = createHost();

    filter.catch(new HttpException('Teapot', 418), host);

    expect(json).toHaveBeenCalledWith({
      success: false,
      statusCode: 418,
      error: 'HttpException',
      message: 'Teapot',
      path: '/api/v1/tasks/1',
    });
  });

  it('maps an unexpected error to a 500 without leaking details', () => {
    const { host, status, json } = createHost();

    filter.catch(new Error('database exploded'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      success: false,
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal server error',
      path: '/api/v1/tasks/1',
    });
  });
});
