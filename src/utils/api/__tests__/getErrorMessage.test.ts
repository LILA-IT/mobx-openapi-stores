import { describe, expect, it } from 'vitest';

import { ResponseError } from '../../../openapi-generator';
import { getErrorMessage } from '../getErrorMessage';

describe('getErrorMessage', () => {
  it('returns the message from a JSON error response', async () => {
    const response = new Response(JSON.stringify({ message: 'Invalid input' }), {
      status: 400,
      statusText: 'Bad Request',
    });

    await expect(getErrorMessage(new ResponseError(response))).resolves.toBe(
      'Invalid input',
    );
  });

  it('returns the response body when JSON has no message property', async () => {
    const body = JSON.stringify({ code: 'invalid_input' });
    const response = new Response(body, { status: 422 });

    await expect(getErrorMessage(new ResponseError(response))).resolves.toBe(body);
  });

  it('returns status text when the response body is empty', async () => {
    const response = new Response('', {
      status: 503,
      statusText: 'Service Unavailable',
    });

    await expect(getErrorMessage(new ResponseError(response))).resolves.toBe(
      'Service Unavailable',
    );
  });

  it('returns the HTTP status when no body or status text is available', async () => {
    const response = new Response('', { status: 500 });

    await expect(getErrorMessage(new ResponseError(response))).resolves.toBe('HTTP 500');
  });

  it('falls back to status text when the response body is malformed JSON', async () => {
    const response = new Response('not-json', {
      status: 502,
      statusText: 'Bad Gateway',
    });

    await expect(getErrorMessage(new ResponseError(response))).resolves.toBe(
      'Bad Gateway',
    );
  });

  it('returns the message from a standard Error', async () => {
    await expect(getErrorMessage(new Error('Network failed'))).resolves.toBe(
      'Network failed',
    );
  });

  it('returns the configured default for nullish errors', async () => {
    await expect(getErrorMessage(null, 'Request failed')).resolves.toBe('Request failed');
  });

  it('serializes non-Error values', async () => {
    await expect(getErrorMessage({ reason: 'offline' })).resolves.toBe(
      '{"reason":"offline"}',
    );
  });
});
