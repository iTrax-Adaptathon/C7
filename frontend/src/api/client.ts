// The single HTTP entry point for the frontend. Every request to the backend
// goes through `request()`; components never call fetch() directly.

const DEFAULT_BASE_URL = 'http://127.0.0.1:8000';

export function resolveBaseUrl(raw: string | undefined): string {
  const value = (raw ?? '').trim();
  return (value || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

export const API_BASE_URL = resolveBaseUrl(import.meta.env.VITE_API_BASE_URL);

/** A failed request, with a human-readable `detail` suitable for the UI. */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
}

interface ValidationIssue {
  loc?: (string | number)[];
  msg?: string;
}

function describeFailure(status: number, payload: unknown): string {
  const detail = (payload as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const issues = (detail as ValidationIssue[])
      .map((issue) => {
        const field = issue.loc?.filter((part) => part !== 'body').join('.');
        return field ? `${field}: ${issue.msg ?? 'invalid'}` : issue.msg ?? 'invalid';
      })
      .join('; ');
    if (issues) return issues;
  }
  return `The server responded with an error (HTTP ${status}).`;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const init: RequestInit & { headers: Record<string, string> } = {
    method: options.method ?? 'GET',
    headers: { Accept: 'application/json' },
  };
  if (options.body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new ApiError(0, `Can't reach the coach server at ${API_BASE_URL}. Is the backend running?`);
  }

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // non-JSON error body; fall through to the generic message
    }
    throw new ApiError(response.status, describeFailure(response.status, payload));
  }

  return (await response.json()) as T;
}
