/**
 * pssErrorMessages — map a normalised `PssApiError` to a human message
 * suitable for a toast.
 *
 * Jira: DART-62.
 *
 * Backend error envelope (per DART-61 §responses):
 *   { "message": "...", "code": "validation_failed", "errors": { field: msg } }
 *
 * Strategy:
 *   1. If the backend supplied a `message` and the `code` is recognised,
 *      use the backend's message verbatim — they own the domain copy.
 *   2. Otherwise fall back to a generic message keyed by `code`.
 *   3. For `validation_failed` with a `fields` map, return the first
 *      field error as the secondary `detail` — keeps the toast tight
 *      while still pointing the user at the offending input.
 *
 * Localisation note: copy is English-only for now (DART_Testing_Report.md
 * tracks i18n as a Medium severity backlog item — Arabic/Dinka/Nuer).
 */

import type { PssApiError } from '../interfaces/pss';

interface ErrorCopy {
  message: string;
  detail?: string;
}

/** Generic fallbacks keyed by the canonical error code. */
const FALLBACKS: Record<string, string> = {
  network_error: "Can't reach the server — your changes will sync when you're back online.",
  unauthorized: 'Your session expired. Please sign in again.',
  forbidden: "You don't have permission to do that.",
  not_found: "That record doesn't exist or has been removed.",
  conflict: 'Someone else updated this record. Reload to see the latest version.',
  validation_failed: 'Some fields need attention before this can be saved.',
  rate_limited: 'Too many requests — please wait a moment and try again.',
  server_error: 'Something went wrong on our side. Please try again shortly.',
};

/** HTTP status → canonical code, used when the backend omits `code`. */
function codeFromStatus(status: number): string {
  if (status === 0) return 'network_error';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 422) return 'validation_failed';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server_error';
  return `http_${status}`;
}

/**
 * Convert a `PssApiError` to display copy for a toast.
 * Always returns a usable `message`; `detail` is set when there is a
 * meaningful field-level message to surface.
 */
export function pssErrorToToast(error: PssApiError): ErrorCopy {
  const code =
    error.code && error.code !== `http_${error.status}`
      ? error.code
      : codeFromStatus(error.status);

  const fallback = FALLBACKS[code] ?? 'Something went wrong. Please try again.';

  // Prefer the backend's wording when it exists and looks human (not a stack
  // trace, not the bare HTTP status text from `response.statusText`).
  const backendMessage =
    error.message && error.message.length < 200 && !/^\s*at\s/.test(error.message)
      ? error.message
      : undefined;

  let detail: string | undefined;
  if (error.fields) {
    const firstField = Object.entries(error.fields)[0];
    if (firstField) detail = `${firstField[0]}: ${firstField[1]}`;
  }

  return {
    message: backendMessage ?? fallback,
    detail,
  };
}
