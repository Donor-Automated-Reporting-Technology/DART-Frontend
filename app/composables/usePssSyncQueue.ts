/**
 * usePssSyncQueue — outbox sync worker for the PSS module.
 *
 * Jira: DART-68 (sub-task of DART-60).
 *
 * Implements the mandate from the ticket description verbatim:
 *
 *   • Outbox-pattern queue: every mutation enqueues
 *     `{op, resource, payload, attempt, status}`.
 *   • Worker drains on online + visibility change with exponential
 *     backoff (1s → 60s cap, max 8 attempts → mark dead).
 *   • Online detection via `navigator.onLine` events (heartbeat hook
 *     left injectable so DART-65 can plug in the auth-aware ping).
 *   • Exposes `pending`, `failed`, `retry()` plus the richer surface
 *     the status bar (DART-67) needs: `isSyncing`, `lastSyncTime`,
 *     `syncError`.
 *
 * Decoupled from the API client (DART-66) on purpose: the caller
 * passes a `send` function. This keeps the worker testable, lets
 * the integration land before DART-66 merges, and avoids importing
 * the client at the composable's top level (which would create a
 * circular dep once `services/pss/*Service.ts` consume both).
 *
 * Singleton: the worker state lives in module scope so every
 * consumer of the composable sees the same counts and the same
 * timer — calling `usePssSyncQueue()` multiple times is safe and
 * does not start multiple drain loops.
 */

import { computed, ref, onMounted, onUnmounted, type ComputedRef, type Ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { syncQueueRepository } from '../services/pss/repositories';
import type {
  PssSyncQueueItem,
  PssSyncOperation,
  PssSyncResource,
} from '../interfaces/pssDb';

// ── Backoff / retry policy ────────────────────────────────────────────────

const BASE_BACKOFF_MS = 1_000;   // 1s
const MAX_BACKOFF_MS = 60_000;   // 60s cap (per ticket)
const MAX_ATTEMPTS = 8;          // per ticket
const REFRESH_INTERVAL_MS = 5_000;

// ── Sender contract ───────────────────────────────────────────────────────

/**
 * Result returned by the injected sender for one queue item.
 *
 * - `serverId` (optional) lets the caller capture an id assigned by the
 *   backend. The worker stores it back on the originating record via
 *   the per-resource repository (handled by the sender, not here, so
 *   this composable stays resource-agnostic).
 * - `kind` distinguishes terminal failures (auth, validation) from
 *   transient ones (network, 5xx) so the worker knows whether to retry
 *   or mark dead immediately.
 */
export type PssSyncSendOutcome =
  | { kind: 'success'; serverId?: string }
  | { kind: 'retryable'; error: string }
  | { kind: 'fatal'; error: string };

export type PssSyncSender = (
  item: PssSyncQueueItem,
) => Promise<PssSyncSendOutcome>;

// ── Singleton reactive state ──────────────────────────────────────────────

const _pendingCount = ref(0);
const _failedCount = ref(0);
const _deadCount = ref(0);
const _isSyncing = ref(false);
const _lastSyncTime = ref<string | null>(null);
const _syncError = ref<string | null>(null);
const _isOnline = ref(
  typeof navigator !== 'undefined' ? navigator.onLine : true,
);

let _sender: PssSyncSender | null = null;
let _draining = false;
let _refreshTimer: ReturnType<typeof setInterval> | null = null;
let _retryTimer: ReturnType<typeof setTimeout> | null = null;
let _windowListenersAttached = false;
let _consumerCount = 0;

// ── Helpers ───────────────────────────────────────────────────────────────

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Exponential backoff with full jitter. Cap at MAX_BACKOFF_MS so a long
 * outage cannot stretch retries beyond a minute.
 */
function backoffMs(attempts: number): number {
  const expo = Math.min(BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1), MAX_BACKOFF_MS);
  return Math.floor(Math.random() * expo);
}

async function refreshCounts(): Promise<void> {
  const [pending, failed, dead] = await Promise.all([
    syncQueueRepository.countByStatus('pending'),
    syncQueueRepository.countByStatus('failed'),
    syncQueueRepository.countByStatus('dead'),
  ]);
  _pendingCount.value = pending;
  _failedCount.value = failed;
  _deadCount.value = dead;
}

/**
 * Schedule the next drain attempt at the earliest pending item's
 * `nextAttemptAt`. Avoids a tight polling loop while still firing
 * promptly when a backoff window expires.
 */
async function scheduleNextDrain(): Promise<void> {
  if (_retryTimer) {
    clearTimeout(_retryTimer);
    _retryTimer = null;
  }
  if (!_isOnline.value) return;

  const items = await syncQueueRepository.list();
  const future = items
    .filter((i) => i.status === 'pending')
    .map((i) => Date.parse(i.nextAttemptAt))
    .filter((t) => Number.isFinite(t) && t > Date.now());
  if (!future.length) return;

  const earliest = Math.min(...future);
  const delay = Math.max(50, earliest - Date.now());
  _retryTimer = setTimeout(() => {
    void drain();
  }, delay);
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Enqueue a new outbox item. Caller is responsible for marking the
 * originating record as `pending` in its own repository.
 */
export async function enqueue(input: {
  resource: PssSyncResource;
  operation: PssSyncOperation;
  recordClientId: string;
  payload: unknown;
  /** Optional explicit idempotency key; auto-generated when omitted. */
  idempotencyKey?: string;
}): Promise<string> {
  const now = nowIso();
  const item: PssSyncQueueItem = {
    id: uuidv4(),
    resource: input.resource,
    operation: input.operation,
    recordClientId: input.recordClientId,
    payload: input.payload,
    status: 'pending',
    attempts: 0,
    nextAttemptAt: now,
    idempotencyKey: input.idempotencyKey ?? uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  await syncQueueRepository.enqueue(item);
  await refreshCounts();
  // Fire-and-forget; drain handles its own re-entrancy guard.
  void drain();
  return item.id;
}

/**
 * Manually trigger a drain. Resets `failed` items back to `pending`
 * with `nextAttemptAt = now` so they are picked up immediately.
 */
export async function retry(): Promise<void> {
  const failedItems = await syncQueueRepository.list();
  const now = nowIso();
  await Promise.all(
    failedItems
      .filter((i) => i.status === 'failed')
      .map((i) =>
        syncQueueRepository.markFailed(i.id, '', now, i.attempts),
      ),
  );
  _syncError.value = null;
  await refreshCounts();
  void drain();
}

/**
 * Drain pending, due items in FIFO order. No-op when offline, when no
 * sender has been registered, or when a drain is already in flight.
 */
export async function drain(): Promise<void> {
  if (_draining) return;
  if (!_isOnline.value) return;
  if (!_sender) return;

  _draining = true;
  _isSyncing.value = true;
  try {
    let due = await syncQueueRepository.listDue();
    while (due.length) {
      const item = due[0]!;
      await syncQueueRepository.markSyncing(item.id);

      let outcome: PssSyncSendOutcome;
      try {
        outcome = await _sender(item);
      } catch (err) {
        outcome = {
          kind: 'retryable',
          error: err instanceof Error ? err.message : 'sender threw',
        };
      }

      if (outcome.kind === 'success') {
        await syncQueueRepository.markSynced(item.id);
        _syncError.value = null;
      } else if (outcome.kind === 'fatal') {
        await syncQueueRepository.markDead(item.id, outcome.error);
        _syncError.value = outcome.error;
      } else {
        const attempts = item.attempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          await syncQueueRepository.markDead(item.id, outcome.error);
          _syncError.value = outcome.error;
        } else {
          const next = new Date(Date.now() + backoffMs(attempts)).toISOString();
          await syncQueueRepository.markFailed(
            item.id,
            outcome.error,
            next,
            attempts,
          );
          _syncError.value = outcome.error;
          // Stop draining this pass — the failed item's own backoff
          // governs when we try again. Do NOT keep hammering on the
          // remaining due items if connectivity looks broken.
          break;
        }
      }

      due = await syncQueueRepository.listDue();
    }

    await syncQueueRepository.removeSynced();
    _lastSyncTime.value = nowIso();
  } finally {
    _draining = false;
    _isSyncing.value = false;
    await refreshCounts();
    await scheduleNextDrain();
  }
}

/**
 * Register the function the worker uses to actually send an item to
 * the server. Wiring is the caller's responsibility — typically a
 * Nuxt plugin (`plugins/pssSync.client.ts`) once DART-66's
 * `usePssApi` ships.
 *
 * Calling this with `null` (or omitting it) detaches the sender and
 * pauses the worker; pending items remain queued.
 */
export function registerSender(sender: PssSyncSender | null): void {
  _sender = sender;
  if (sender) void drain();
}

// ── Browser event wiring (idempotent) ─────────────────────────────────────

function onOnline(): void {
  _isOnline.value = true;
  void drain();
}

function onOffline(): void {
  _isOnline.value = false;
}

function onVisibility(): void {
  if (
    typeof document !== 'undefined' &&
    document.visibilityState === 'visible'
  ) {
    void drain();
  }
}

function attachWindowListeners(): void {
  if (_windowListenersAttached) return;
  if (typeof window === 'undefined') return;
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  document.addEventListener('visibilitychange', onVisibility);
  _windowListenersAttached = true;
}

function detachWindowListeners(): void {
  if (!_windowListenersAttached) return;
  if (typeof window === 'undefined') return;
  window.removeEventListener('online', onOnline);
  window.removeEventListener('offline', onOffline);
  document.removeEventListener('visibilitychange', onVisibility);
  _windowListenersAttached = false;
}

// ── Composable surface ────────────────────────────────────────────────────

export interface UsePssSyncQueueReturn {
  pending: Ref<number>;
  failed: Ref<number>;
  dead: Ref<number>;
  /** True while a drain pass is actively running. */
  isSyncing: Ref<boolean>;
  /** ISO timestamp of the last successful drain pass. */
  lastSyncTime: Ref<string | null>;
  /** Last error surfaced by the sender, cleared on successful sync. */
  syncError: Ref<string | null>;
  /** Reactive online state from `navigator.onLine` + window events. */
  isOnline: Ref<boolean>;
  /** Convenience: total items needing user attention (failed + dead). */
  attentionCount: ComputedRef<number>;
  /** Re-attempt failed items immediately. */
  retry: () => Promise<void>;
  /** Force a drain (no-op if already syncing or offline). */
  drain: () => Promise<void>;
  /** Enqueue a new outbox item. */
  enqueue: typeof enqueue;
  /** Wire the sender — usually called once at app boot. */
  registerSender: typeof registerSender;
}

export function usePssSyncQueue(): UsePssSyncQueueReturn {
  // Lazily attach lifecycle hooks the first time a Vue component asks for
  // the composable, then reference-count so the timers stop when no
  // component is observing.
  onMounted(() => {
    _consumerCount++;
    attachWindowListeners();
    if (!_refreshTimer) {
      _refreshTimer = setInterval(() => {
        void refreshCounts();
      }, REFRESH_INTERVAL_MS);
    }
    void refreshCounts();
    void scheduleNextDrain();
  });

  onUnmounted(() => {
    _consumerCount = Math.max(0, _consumerCount - 1);
    if (_consumerCount === 0) {
      if (_refreshTimer) {
        clearInterval(_refreshTimer);
        _refreshTimer = null;
      }
      if (_retryTimer) {
        clearTimeout(_retryTimer);
        _retryTimer = null;
      }
      detachWindowListeners();
    }
  });

  return {
    pending: _pendingCount,
    failed: _failedCount,
    dead: _deadCount,
    isSyncing: _isSyncing,
    lastSyncTime: _lastSyncTime,
    syncError: _syncError,
    isOnline: _isOnline,
    attentionCount: computed(() => _failedCount.value + _deadCount.value),
    retry,
    drain,
    enqueue,
    registerSender,
  };
}
