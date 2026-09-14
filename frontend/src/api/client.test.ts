import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request, resolveBaseUrl } from './client';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolveBaseUrl', () => {
  it('defaults to the local FastAPI server', () => {
    expect(resolveBaseUrl(undefined)).toBe('http://127.0.0.1:8000');
    expect(resolveBaseUrl('')).toBe('http://127.0.0.1:8000');
  });

  it('strips a trailing slash from an override', () => {
    expect(resolveBaseUrl('https://api.example.com/')).toBe('https://api.example.com');
  });
});

describe('request', () => {
  it('sends JSON with camelCase keys and returns the parsed body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await request<{ ok: boolean }>('/logs', {
      method: 'POST',
      body: { exerciseId: 1, rpe: 7 },
    });

    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:8000/logs');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ exerciseId: 1, rpe: 7 });
  });

  it('maps a 404 to an ApiError carrying the backend detail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(404, { detail: 'Exercise 99 not found' })));

    await expect(request('/state/99')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      detail: 'Exercise 99 not found',
    });
  });

  it('flattens a 422 validation error into a readable sentence', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(422, {
          detail: [
            { type: 'less_than_equal', loc: ['body', 'rpe'], msg: 'Input should be less than or equal to 10' },
            { type: 'greater_than', loc: ['body', 'actualWeight'], msg: 'Input should be greater than 0' },
          ],
        }),
      ),
    );

    const err = (await request('/logs', { method: 'POST', body: {} }).catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(422);
    expect(err.detail).toBe(
      'rpe: Input should be less than or equal to 10; actualWeight: Input should be greater than 0',
    );
  });

  it('maps a network failure to status 0 with a helpful message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const err = (await request('/health').catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
    expect(err.detail).toContain('http://127.0.0.1:8000');
  });
});
