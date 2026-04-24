/**
 * Conflict-resolution helpers for the PSS module.
 *
 * Jira: DART-64 (sub-task of DART-60).
 *
 * Two policies are codified here so every page applies them the same way.
 * They are intentionally tiny — most call sites just call one function
 * after a fetch / sync round-trip.
 *
 * 1. **Server-wins for read GETs.** When a list / detail GET returns,
 *    overwrite the local IndexedDB cache with the server payload. The
 *    server is the authority for shared state; the local copy is
 *    presentation-only. Use `applyServerWins(local, remote)` — it always
 *    returns `remote` and is here purely so the policy is named in code.
 *
 * 2. **Last-write-wins for facilitator session edits.** When a queued
 *    write is replayed and the server already has a newer version of the
 *    same record, the server wins. The user is told via a yellow warning
 *    toast: "Remote changes detected — refreshed to latest." Use
 *    `applyLastWriteWins(local, remote, { onRemoteOverwrite })`.
 *
 * The decision uses the `client_timestamp` field that all PSS records
 * carry (per the offline contract — see DART_FRONTEND_MIGRATION_PLAN.md).
 */

import type { PssTimestamped } from '../interfaces/pss';

// ---------------------------------------------------------------------------
// Server-wins (GET cache refresh)
// ---------------------------------------------------------------------------

/**
 * Always returns `remote`. Documents the server-wins policy at call sites
 * so a future reader doesn't wonder why the local copy is being thrown
 * away. Keep using this even though it's a one-liner — it's a contract,
 * not a performance optimisation.
 *
 * ```ts
 * const fresh = applyServerWins(localActivity, await api.get(...));
 * await db.pss_activities.put(fresh);
 * ```
 */
export function applyServerWins<T>(_local: T | undefined, remote: T): T {
  return remote;
}

// ---------------------------------------------------------------------------
// Last-write-wins (offline write replay)
// ---------------------------------------------------------------------------

export interface LwwResult<T> {
  /** The record that should be persisted locally and shown to the user. */
  value: T;
  /**
   * `true` when the remote copy was newer than the local pending edit and
   * therefore overwrote it — call sites should fire the
   * "remote changes detected" warning toast in that case.
   */
  remoteWasNewer: boolean;
}

export interface LwwOptions {
  /**
   * Optional callback fired exactly when the remote copy overwrites a
   * locally-newer pending edit. The toast wiring lives at the call site
   * so this util stays free of UI imports.
   */
  onRemoteOverwrite?: () => void;
}

/**
 * Last-write-wins resolution. Compares `client_timestamp` on both copies;
 * the newer one is kept. Ties go to the remote (server is authoritative
 * when timestamps are equal — typically a clock-skew edge case).
 */
export function applyLastWriteWins<T extends PssTimestamped>(
  local: T,
  remote: T,
  options: LwwOptions = {},
): LwwResult<T> {
  const localTs = toMillis(local.client_timestamp);
  const remoteTs = toMillis(remote.client_timestamp);

  if (localTs > remoteTs) {
    // Local pending edit is newer — keep it. Sync queue will push it next.
    return { value: local, remoteWasNewer: false };
  }

  // Remote wins. If we had a pending local edit (i.e. they differed in
  // either content or timestamp) the user needs to be told their unsaved
  // work was overwritten.
  if (localTs < remoteTs) options.onRemoteOverwrite?.();
  return { value: remote, remoteWasNewer: true };
}

/** Coerce ISO-8601 string OR epoch number to milliseconds for comparison. */
function toMillis(value: string | number): number {
  if (typeof value === 'number') return value;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

// ---------------------------------------------------------------------------
// Toast copy (kept here so the wording is consistent across the app)
// ---------------------------------------------------------------------------

/** Standard wording for the LWW overwrite toast. Use with `useToast().warning(...)`. */
export const REMOTE_OVERWRITE_TOAST = {
  message: 'Remote changes detected — refreshed to latest.',
  detail: 'Your unsaved local changes were replaced by a newer server version.',
} as const;
