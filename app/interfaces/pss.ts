/**
 * PSS module shared types.
 *
 * Source of truth: DART-61 PSS API Contract v1 (OpenAPI 3.1).
 * Confluence: https://mubaraklouis-1744661146773.atlassian.net/wiki/spaces/DART/pages/24739841
 *
 * Scope of this file (DART-66): only the primitives that `usePssApi.ts`
 * needs — the normalised error shape, HTTP method, and request options.
 * Endpoint payload / response types will be added in subsequent DART-60
 * sub-tasks alongside the `pssApi` service layer.
 */

/** HTTP methods supported by the PSS API client. */
export type PssHttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/**
 * Canonical error envelope returned by every PSS endpoint after the
 * client has normalised the raw backend response.
 *
 * - `status` — HTTP status code (0 when the request never reached the server)
 * - `code`   — short machine-readable code from the backend (e.g.
 *              `validation_failed`, `not_found`, `conflict`); falls back to
 *              the HTTP status name when the backend did not provide one
 * - `message`— human-readable message safe to surface in toasts
 * - `fields` — per-field validation errors keyed by field name (only set on
 *              422 / validation_failed responses)
 * - `raw`    — the original JSON body for debugging — never render directly
 */
export interface PssApiError {
  status: number;
  code: string;
  message: string;
  fields?: Record<string, string>;
  raw?: unknown;
}

/**
 * Options accepted by the low-level `request` exposed from `usePssApi`.
 *
 * `retry` defaults to 2 for idempotent methods (`GET`) and 0 for everything
 * else — callers should leave it unset unless they have a specific reason
 * to override the default.
 */
export interface PssRequestOptions {
  method?: PssHttpMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Override the bearer token (defaults to the auth store's accessToken). */
  token?: string;
  /** Number of retry attempts on transient failures. */
  retry?: number;
  /** AbortSignal forwarded to the underlying fetch. */
  signal?: AbortSignal;
}
