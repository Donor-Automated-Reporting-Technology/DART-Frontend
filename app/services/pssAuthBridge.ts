/**
 * pssAuthBridge — auth-refresh bridge for the DART PSS module.
 *
 * Jira: DART-65 (sub-task of DART-60).
 *
 * What this module owns
 * ---------------------
 * The existing client-side auth plugin (`app/plugins/auth.client.ts`, from
 * DART-6) only refreshes the access token ONCE at app boot. It does NOT
 * intercept 401s from in-flight API calls. This module fills that gap for
 * the PSS sub-tree:
 *
 *   1. `refreshAccessToken()` — single-flight POST `/api/v1/auth/refresh`.
 *      Concurrent callers share the same in-flight promise so a burst of
 *      401s from parallel requests triggers exactly one refresh round-trip.
 *
 *   2. `withAuthRefresh(call)` — wraps any async API call: if the call
 *      throws a 401-shaped error, awaits a refresh and replays the call
 *      ONCE. If refresh fails, clears the session (logout) and rethrows.
 *
 *   3. `isUnauthorizedError(err)` — predicate for the canonical PSS error
 *      envelope (DART-66 `PssApiError`) and raw `{ status: 401 }` shapes.
 *
 *   4. `hasValidPssAuthToken()` — convenience read for the sync worker
 *      (DART-68) so a caller can gate `drain()` behind a non-expired JWT.
 *
 * What this module does NOT own
 * -----------------------------
 * - The actual fetch in `usePssApi` (DART-66) — that file imports
 *   `withAuthRefresh` and wraps its `request` body. One-line integration.
 * - The sync queue worker loop (DART-68) — the worker's existing
 *   `registerSender(sender)` contract is reused. A boot-time plugin (added
 *   when DART-66 + DART-68 are both on main) calls `registerSender` with
 *   a closure that pipes through `withAuthRefresh`. See the Jira comment
 *   on DART-65 for the exact 3-line plugin.
 *
 * Why no direct import of usePssApi or usePssSyncQueue
 * ----------------------------------------------------
 * Both live on sibling feature branches that have not yet merged to main.
 * Importing them here would either break the build on main or force this
 * branch to depend on the others. Keeping this module standalone lets
 * DART-65 land independently and lets the Tech Lead sequence the merges
 * however suits the release.
 */

import { getActivePinia } from 'pinia'
import { useAuthStore, isTokenValid } from '../stores/auth'

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────

/** Canonical 401-shaped error contract this bridge can detect. */
export interface UnauthorizedLike {
  status?: number
  code?: string
}

/** Outcome of `refreshAccessToken()`. */
export type RefreshOutcome =
  | { ok: true; accessToken: string }
  | { ok: false; reason: 'no_cookie' | 'network' | 'rejected' | 'unknown' }

/** Backend response envelope from POST /api/v1/auth/refresh. */
interface RefreshResponseEnvelope {
  data?: {
    user?: { role?: string | null } | null
    tokens?: { access_token?: string | null } | null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────────────

const REFRESH_ENDPOINT = '/api/v1/auth/refresh'

/**
 * HTTP status codes treated as "unauthenticated" for the purposes of
 * triggering a refresh. 401 is the standard. We deliberately do NOT include
 * 403 — that's an authorization failure (token valid, user lacks rights),
 * which a refresh would not fix.
 */
const UNAUTHORIZED_STATUSES: ReadonlySet<number> = new Set([401])

/**
 * Error codes the PSS API client (DART-66 `PssApiError`) emits for the
 * 401 case. Defensive — covers both the explicit `http_401` form and the
 * future-proof `unauthorized` / `token_expired` strings the backend
 * occasionally returns under the `code` field.
 */
const UNAUTHORIZED_CODES: ReadonlySet<string> = new Set([
  'http_401',
  'unauthorized',
  'token_expired',
  'invalid_token',
])

// ─────────────────────────────────────────────────────────────────────────────
//  Single-flight refresh
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Module-scoped in-flight promise. While a refresh is pending, every
 * caller receives the same promise; only one network round-trip happens.
 */
let inFlightRefresh: Promise<RefreshOutcome> | null = null

/**
 * Issue (or join) a refresh-token round-trip.
 *
 * On success: writes the new access token (and, if present, the user role)
 * into the Pinia auth store via the same setters the boot plugin uses.
 *
 * On failure: clears the session so route middleware will redirect to
 * `/login` on the next navigation. We do NOT navigate here — that would
 * couple this module to the router and surprise callers running inside a
 * background sync worker.
 */
export function refreshAccessToken(): Promise<RefreshOutcome> {
  if (inFlightRefresh) return inFlightRefresh

  inFlightRefresh = (async (): Promise<RefreshOutcome> => {
    // Defensive Pinia access — this function may be invoked from a sync
    // worker tick, an `onErrorCaptured` boundary, or any other scope that
    // is NOT a Vue setup or Nuxt request. In those scopes the active
    // Pinia is unset and bare `useAuthStore()` would throw
    // "getActivePinia() was called but there was no active Pinia".
    // Per the Pinia docs, passing the instance explicitly
    // (`useStore(pinia)`) is the supported outside-setup pattern.
    const pinia = getActivePinia()
    if (!pinia) {
      // No Pinia scope — nothing to refresh into. Surface as a transient
      // failure so the caller's 401 bubbles up unchanged.
      return { ok: false, reason: 'unknown' }
    }
    const authStore = useAuthStore(pinia)

    let response: RefreshResponseEnvelope | undefined
    try {
      response = await $fetch<RefreshResponseEnvelope>(REFRESH_ENDPOINT, {
        method: 'POST',
        credentials: 'include',
      })
    } catch (err) {
      // Distinguish "no/expired cookie → server said no" from "no network".
      // $fetch rejects with an FetchError that carries the response status
      // for HTTP errors; for true network failures `response` is undefined.
      const status =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined

      if (status === 401 || status === 403) {
        // Cookie is gone or rejected — full logout, force re-login.
        authStore.clearSession()
        return { ok: false, reason: 'rejected' }
      }
      if (status === undefined) {
        // Truly offline — keep the session intact so we can retry later
        // when connectivity returns.
        return { ok: false, reason: 'network' }
      }
      // 5xx or unexpected status — don't kill the session, but the caller
      // should treat this as a transient failure.
      return { ok: false, reason: 'unknown' }
    }

    const newToken = response?.data?.tokens?.access_token ?? null
    if (!newToken) {
      // Server returned 200 but no token — treat like a rejection so the
      // user gets bounced to login rather than silently looping.
      authStore.clearSession()
      return { ok: false, reason: 'no_cookie' }
    }

    authStore.setToken(newToken)
    const role = response?.data?.user?.role ?? null
    if (role) authStore.setUserRole(role)

    return { ok: true, accessToken: newToken }
  })()

  // Always release the singleton once the round-trip settles, regardless
  // of outcome. The next 401 will start a fresh refresh attempt.
  inFlightRefresh.finally(() => {
    inFlightRefresh = null
  })

  return inFlightRefresh
}

// ─────────────────────────────────────────────────────────────────────────────
//  401 detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * True when `err` looks like a 401 we should respond to with a refresh.
 *
 * Accepts:
 *   - PssApiError (DART-66): `{ status, code, message, ... }`
 *   - Raw fetch FetchError: `{ response: { status: 401 } }`
 *   - Generic `{ status: 401 }` shapes
 */
export function isUnauthorizedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as UnauthorizedLike & {
    response?: { status?: number }
  }

  if (typeof e.status === 'number' && UNAUTHORIZED_STATUSES.has(e.status)) {
    return true
  }
  if (typeof e.response?.status === 'number' &&
      UNAUTHORIZED_STATUSES.has(e.response.status)) {
    return true
  }
  if (typeof e.code === 'string' && UNAUTHORIZED_CODES.has(e.code)) {
    return true
  }
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
//  Replay-once wrapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run an async API call, replaying it ONCE if the first attempt fails
 * with a 401. If the refresh fails for any reason, the original 401 is
 * rethrown (the session is also cleared by `refreshAccessToken` when the
 * cookie is rejected).
 *
 * Usage from `usePssApi.request()` (DART-66):
 *
 *   return withAuthRefresh(() => doFetch())
 *
 * Usage from the PSS sync worker (DART-68) sender:
 *
 *   registerSender(async (item) => {
 *     try {
 *       const serverId = await withAuthRefresh(() => api.request(...))
 *       return { kind: 'success', serverId }
 *     } catch (err) {
 *       return mapErrorToSyncOutcome(err)
 *     }
 *   })
 */
export async function withAuthRefresh<T>(
  call: () => Promise<T>,
): Promise<T> {
  try {
    return await call()
  } catch (err) {
    if (!isUnauthorizedError(err)) throw err

    const outcome = await refreshAccessToken()
    if (!outcome.ok) {
      // Session is already cleared (or transient — caller decides what to
      // do with the rethrown 401). Either way, do NOT replay.
      throw err
    }

    // Refresh succeeded — replay the original call once. Any further 401
    // bubbles out unchanged (no infinite loop).
    return await call()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sync-worker convenience
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true when the auth store currently holds a non-expired JWT.
 *
 * The PSS sync worker (DART-68) calls this from its boot plugin to decide
 * whether to register a real sender (token valid → drain the queue) or
 * to register `null` (token missing/expired → worker becomes a no-op
 * until the next refresh succeeds).
 *
 * This is a synchronous read of the Pinia store; it does NOT trigger a
 * refresh. Pair it with `refreshAccessToken()` if you need to be sure
 * the token is current before the next request.
 */
export function hasValidPssAuthToken(): boolean {
  // Defensive Pinia access — see `refreshAccessToken` for rationale.
  // This is called by the sync worker boot plugin, which can fire before
  // any Vue component has mounted.
  const pinia = getActivePinia()
  if (!pinia) return false
  const token = (pinia.state.value['auth'] as { accessToken?: string | null } | undefined)?.accessToken
  return !!token && isTokenValid(token)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Test seam
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reset the in-flight refresh singleton. Test-only — not exported through
 * a barrel and not for use by app code.
 */
export function __resetRefreshSingletonForTests(): void {
  inFlightRefresh = null
}
