/**
 * usePssApi — low-level HTTP client for the DART PSS module.
 *
 * Jira: DART-66 (sub-task of DART-60).
 * Contract: DART-61 PSS API Contract v1 (OpenAPI 3.1) — base path `/api/v1`.
 *
 * Responsibilities (and ONLY these — endpoint wrappers live in
 * `app/services/pssApi.ts`, added in a later sub-task):
 *
 *   1. Inject the bearer token from the existing Pinia auth store.
 *   2. Compose the URL against the runtime API base (`/api/v1` proxy).
 *   3. Retry idempotent GETs on transient network / 5xx failures with
 *      exponential backoff capped at 3 attempts total.
 *   4. Normalise every error — network, HTTP, JSON parse — into the
 *      canonical `PssApiError` envelope so callers have one shape to
 *      handle.
 *
 * Auth refresh is delegated to the existing global Nuxt plugin that
 * watches 401s on `/api/v1/**`; this composable does not duplicate it.
 */

import { getActivePinia } from 'pinia';
import type {
  PssApiError,
  PssHttpMethod,
  PssRequestOptions,
} from '../interfaces/pss';

const BASE = '/api/v1';

/** Methods we will automatically retry on transient failures. */
const IDEMPOTENT_METHODS: ReadonlySet<PssHttpMethod> = new Set(['GET']);

/** HTTP status codes that warrant a retry (transient server-side issues). */
const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([502, 503, 504]);

/** Maximum retry attempts for idempotent requests. */
const DEFAULT_RETRY = 2;

/** Resolve the JWT from the auth store without importing the store module
 *  (avoids a circular dependency with services that this composable will
 *  eventually back). Mirrors the pattern used in `services/cfsApi.ts`. */
function resolveToken(explicit?: string): string | undefined {
  if (explicit) return explicit;
  try {
    const pinia = getActivePinia();
    const authState = pinia?.state.value?.['auth'] as
      | { accessToken?: string | null }
      | undefined;
    return authState?.accessToken ?? undefined;
  } catch {
    return undefined;
  }
}

/** Append a query string to a path, skipping null / undefined values. */
function withQuery(
  path: string,
  query?: PssRequestOptions['query'],
): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Sleep helper for backoff. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert a raw fetch failure or a non-2xx response into the canonical
 * `PssApiError` envelope.
 *
 * Backend error envelope (per DART-61 §responses):
 *   { "message": "...", "code": "validation_failed", "errors": { field: msg } }
 * Some endpoints wrap success payloads under `data` and errors at the top
 * level, so we read both shapes defensively.
 */
function normaliseError(
  status: number,
  body: unknown,
  fallbackMessage: string,
): PssApiError {
  const obj = (body && typeof body === 'object' ? body : {}) as Record<
    string,
    unknown
  >;

  const message =
    (typeof obj.message === 'string' && obj.message) ||
    (typeof obj.error === 'string' && obj.error) ||
    fallbackMessage;

  const code =
    (typeof obj.code === 'string' && obj.code) ||
    (status === 0 ? 'network_error' : `http_${status}`);

  const errorsField = obj.errors;
  let fields: Record<string, string> | undefined;
  if (errorsField && typeof errorsField === 'object') {
    fields = {};
    for (const [k, v] of Object.entries(
      errorsField as Record<string, unknown>,
    )) {
      if (typeof v === 'string') fields[k] = v;
      else if (Array.isArray(v) && typeof v[0] === 'string') fields[k] = v[0];
    }
  }

  return { status, code, message, fields, raw: body };
}

/**
 * Public surface of the composable. Endpoint helpers (`get`, `post`, ...)
 * are thin wrappers around `request` for ergonomics at call sites.
 */
export interface UsePssApiReturn {
  request: <T>(path: string, options?: PssRequestOptions) => Promise<T>;
  get: <T>(
    path: string,
    options?: Omit<PssRequestOptions, 'method' | 'body'>,
  ) => Promise<T>;
  post: <T>(
    path: string,
    body?: unknown,
    options?: Omit<PssRequestOptions, 'method' | 'body'>,
  ) => Promise<T>;
  patch: <T>(
    path: string,
    body?: unknown,
    options?: Omit<PssRequestOptions, 'method' | 'body'>,
  ) => Promise<T>;
  del: <T>(
    path: string,
    options?: Omit<PssRequestOptions, 'method' | 'body'>,
  ) => Promise<T>;
}

export function usePssApi(): UsePssApiReturn {
  async function request<T>(
    path: string,
    options: PssRequestOptions = {},
  ): Promise<T> {
    const method = options.method ?? 'GET';
    const url = withQuery(`${BASE}${path}`, options.query);
    const token = resolveToken(options.token);

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const init: RequestInit = {
      method,
      headers,
      signal: options.signal,
    };

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(options.body);
    }

    const maxRetries =
      options.retry ?? (IDEMPOTENT_METHODS.has(method) ? DEFAULT_RETRY : 0);

    let attempt = 0;
    // attempts = maxRetries + 1 (initial try plus retries)
    // eslint-disable-next-line no-constant-condition
    while (true) {
      attempt++;
      let response: Response;
      try {
        response = await fetch(url, init);
      } catch (err) {
        // Network-level failure — only retry if idempotent and budget left
        if (attempt <= maxRetries) {
          await sleep(Math.min(1000 * 2 ** (attempt - 1), 4000));
          continue;
        }
        const message =
          err instanceof Error ? err.message : 'Network request failed';
        throw normaliseError(0, { message }, message);
      }

      // Read the body once; tolerate empty 204 responses.
      const text = await response.text();
      const body: unknown = text
        ? (() => {
            try {
              return JSON.parse(text);
            } catch {
              return { message: text };
            }
          })()
        : undefined;

      if (response.ok) {
        // Backend convention (mirrored from services/cfsApi.ts): unwrap
        // `data` envelope when present so callers see the payload directly.
        const obj = body as { data?: unknown } | undefined;
        return (obj && obj.data !== undefined ? obj.data : (body ?? null)) as T;
      }

      if (
        attempt <= maxRetries &&
        RETRYABLE_STATUSES.has(response.status)
      ) {
        await sleep(Math.min(1000 * 2 ** (attempt - 1), 4000));
        continue;
      }

      throw normaliseError(
        response.status,
        body,
        response.statusText || 'Request failed',
      );
    }
  }

  return {
    request,
    get: (path, options) => request(path, { ...options, method: 'GET' }),
    post: (path, body, options) =>
      request(path, { ...options, method: 'POST', body }),
    patch: (path, body, options) =>
      request(path, { ...options, method: 'PATCH', body }),
    del: (path, options) => request(path, { ...options, method: 'DELETE' }),
  };
}
