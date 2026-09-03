import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function makeHost(method = 'GET', url = '/test') {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = { method, url };
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
    json,
    status,
    response,
    request,
  };
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    jest.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
  });

  it('responds with the exception status code', () => {
    const host = makeHost();
    filter.catch(new HttpException('Not Found', HttpStatus.NOT_FOUND), host as any);
    expect(host.response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });

  it('includes statusCode, message, error, timestamp, path in the body', () => {
    const host = makeHost('POST', '/projects');
    filter.catch(new HttpException('Bad Request', HttpStatus.BAD_REQUEST), host as any);
    const body = host.response.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Bad Request',
      path: '/projects',
    });
    expect(typeof body.timestamp).toBe('string');
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('extracts message from structured response object', () => {
    const host = makeHost();
    const exception = new HttpException(
      { message: 'Validation failed', error: 'Bad Request' },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
    filter.catch(exception, host as any);
    const body = host.response.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.message).toBe('Validation failed');
  });

  it('extracts error name from structured response object', () => {
    const host = makeHost();
    const exception = new HttpException(
      { message: 'Oops', error: 'UnprocessableEntity' },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
    filter.catch(exception, host as any);
    const body = host.response.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.error).toBe('UnprocessableEntity');
  });

  it('falls back to exception.name when response has no error field', () => {
    const host = makeHost();
    const exception = new HttpException('Conflict', HttpStatus.CONFLICT);
    filter.catch(exception, host as any);
    const body = host.response.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.error).toBe('HttpException');
  });

  it('sets path from request.url', () => {
    const host = makeHost('DELETE', '/projects/abc-123');
    filter.catch(new HttpException('Not Found', HttpStatus.NOT_FOUND), host as any);
    const body = host.response.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.path).toBe('/projects/abc-123');
  });

  it('calls logger.error once per invocation', () => {
    const host = makeHost();
    filter.catch(new HttpException('err', HttpStatus.INTERNAL_SERVER_ERROR), host as any);
    expect(filter['logger'].error).toHaveBeenCalledTimes(1);
  });
});
