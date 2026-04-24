/**
 * Idempotency-key helpers for the PSS module.
 *
 * Jira: DART-64 (sub-task of DART-60).
 *
 * Every PSS write (POST / PATCH / DELETE) must carry a unique
 * `Idempotency-Key` header so the backend can deduplicate retries —
 * critical for the sync queue that replays offline mutations after a
 * reconnect. Without dedupe, a flaky network during a session-complete
 * call could create two server-side session rows.
 *
 * Conventions:
 *   - The key is a UUID v4 generated client-side.
 *   - The same logical mutation MUST reuse the same key on every retry.
 *     The sync queue persists the key alongside the record so subsequent
 *     replays send the same value.
 *   - Keys are NOT secrets — safe to log for debugging.
 */

import { v4 as uuidv4 } from 'uuid';

/** Generate a fresh UUID v4 to use as an `Idempotency-Key`. */
export function newIdempotencyKey(): string {
  return uuidv4();
}

/**
 * Convenience helper for queued mutations: returns the existing key if
 * the record already has one, otherwise mints a new one. Use this when
 * pulling a record off the sync queue so a stored key is always preferred.
 */
export function ensureIdempotencyKey(record: {
  idempotency_key?: string | null;
}): string {
  if (record.idempotency_key) return record.idempotency_key;
  const key = newIdempotencyKey();
  record.idempotency_key = key;
  return key;
}
