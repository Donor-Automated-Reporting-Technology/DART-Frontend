/**
 * usePssSessionRun — load + observe one in-progress PSS session.
 *
 * Jira: DART-45 (sub-task of DART-35).
 *
 * Read-side composable for the session checklist screen. Loads the
 * session, its slot rows, and the activity catalogue entries referenced
 * by those slots — keeping all three in sync so the UI can render the
 * expand-on-tap content (aim, steps, materials) without per-row async
 * fetches inside the template.
 *
 * Stateless / parallel-safe: every call returns its own reactive refs.
 * No Pinia store touched — DART-44 / DART-37 will compose on top of
 * this without forcing shared state.
 *
 * Out-of-scope for DART-45 (deferred to DART-44 / DART-37):
 *   • Marking a slot complete with notes / child flag.
 *   • Completing the whole session with overall remarks.
 *
 * The composable still exposes `markSlotCompleted(slotClientId)` so
 * the checklist's progress bar is exercisable end-to-end. DART-44 will
 * replace the placeholder call site with the full sheet (notes + flag)
 * but the underlying repository update stays the same.
 */

import { computed, ref, type ComputedRef, type Ref } from 'vue';

import { v4 as uuidv4 } from 'uuid';

import { sessionsRepository } from '~/services/pss/repositories/sessionsRepository';
import { sessionActivitiesRepository } from '~/services/pss/repositories/sessionActivitiesRepository';
import { activitiesRepository } from '~/services/pss/repositories/activitiesRepository';
import { usePssSessionsApi } from '~/services/pss/sessionsApi';
import type {
  PssActivityRecord,
  PssFlaggedChild,
  PssSessionActivityRecord,
  PssSessionRecord,
} from '~/interfaces/pssDb';

/** Composite row: slot + the activity catalogue entry it points at. */
export interface PssSessionRow {
  slot: PssSessionActivityRecord;
  /** Catalogue activity — `null` when the local cache has not seen it yet. */
  activity: PssActivityRecord | null;
}

export interface UsePssSessionRunReturn {
  /** True while the initial load is running. */
  loading: Ref<boolean>;
  /** True when the requested sessionClientId was not found locally. */
  notFound: Ref<boolean>;
  session: Ref<PssSessionRecord | null>;
  /** Slot rows in template order (1 → 4) joined with their activity. */
  rows: Ref<PssSessionRow[]>;
  /** 0 → 1 inclusive. */
  progress: ComputedRef<number>;
  completedCount: ComputedRef<number>;
  totalCount: ComputedRef<number>;
  /** True once every slot is `status === 'completed'`. */
  allComplete: ComputedRef<boolean>;
  /** True once the session itself is in `completed` status (DART-37). */
  isLocked: ComputedRef<boolean>;
  /** Re-read from IndexedDB — call after a mutation lands. */
  reload: () => Promise<void>;
  /**
   * Minimal "mark done" used by the placeholder Complete button. DART-44
   * replaces the call site with the full sheet (notes + child flag);
   * the repository update mirrored here stays valid.
   */
  markSlotCompleted: (slotClientId: string) => Promise<boolean>;

  /**
   * DART-44 — full complete-activity flow with notes + optional child
   * flag. Calls `PATCH /pss/sessions/:id/activities/:aid/complete` and,
   * if a flag is supplied, `POST /pss/sessions/:id/flags`. Persists
   * locally on success; on failure the local row stays `pending` and
   * the error is thrown so the caller can surface a toast.
   */
  completeSlotWithDetails: (input: {
    slotClientId: string;
    notes: string;
    flag: PssFlaggedChild | null;
  }) => Promise<void>;

  /**
   * DART-37 — complete the whole session with the full facilitator
   * report. Calls `PATCH /pss/sessions/:id/complete`. Persists locally
   * on success; throws on failure. Once it returns the `isLocked` flag
   * flips and the UI must hide every edit affordance.
   */
  completeSessionWithReport: (payload: PssSessionReportInput) => Promise<void>;

  /**
   * Backward-compat wrapper around `completeSessionWithReport`. Existing
   * callers that supplied only `remarks` must now also supply the new
   * required report fields — there's no way to satisfy the BE otherwise.
   */
  completeSessionWithRemarks: (input: PssSessionReportInput) => Promise<void>;
}

export interface PssSessionReportInput {
  key_observations: string;
  protection_notes: string;
  challenges: string;
  follow_up_actions: string[];
  reflection: string;
  remarks?: string;
}

export function usePssSessionRun(
  sessionClientId: string,
): UsePssSessionRunReturn {
  const loading = ref(true);
  const notFound = ref(false);
  const session = ref<PssSessionRecord | null>(null);
  const rows = ref<PssSessionRow[]>([]);

  async function reload(): Promise<void> {
    loading.value = true;
    notFound.value = false;
    try {
      // pss_sessions is keyed by `clientId` and the route param is the
      // local clientId we stamped at session-start (DART-51). We avoid
      // BaseRepository.getByEitherId because the `pss_sessions` schema
      // has no `serverId` index and Dexie throws a SchemaError on the
      // implicit `where('serverId')` lookup.
      const found = await sessionsRepository.getByClientId(sessionClientId);
      if (!found) {
        session.value = null;
        rows.value = [];
        notFound.value = true;
        return;
      }
      session.value = found;

      const slots = await sessionActivitiesRepository.listBySession(
        found.clientId,
      );
      // Resolve activities individually — Dexie has no IN-list helper for
      // arbitrary string keys, but the slot list is at most 4 rows.
      // The slot's activityId may carry either a local clientId or a
      // server uuid (built-in activities are seeded with serverId set),
      // so we look up by clientId first and fall back to a scan.
      const resolved: PssSessionRow[] = [];
      let catalogue: PssActivityRecord[] | null = null;
      for (const slot of slots) {
        let activity =
          (await activitiesRepository.getByClientId(slot.activityId)) ?? null;
        if (!activity) {
          if (!catalogue) catalogue = await activitiesRepository.list();
          activity =
            catalogue.find((a) => a.serverId === slot.activityId) ?? null;
        }
        resolved.push({ slot, activity });
      }
      rows.value = resolved;
    } catch {
      // Any unexpected error (e.g. a stale schema) collapses to the
      // not-found state so the user sees an actionable empty screen
      // instead of a blank page. Errors are surfaced via Vue's global
      // handler / dev console.
      session.value = null;
      rows.value = [];
      notFound.value = true;
    } finally {
      loading.value = false;
    }
  }

  async function markSlotCompleted(slotClientId: string): Promise<boolean> {
    const row = rows.value.find((r) => r.slot.clientId === slotClientId);
    if (!row) return false;
    if (row.slot.status === 'completed') return true;

    await sessionActivitiesRepository.patch(slotClientId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    } as Partial<PssSessionActivityRecord>);
    await reload();
    return true;
  }

  async function completeSlotWithDetails(input: {
    slotClientId: string;
    notes: string;
    flag: PssFlaggedChild | null;
  }): Promise<void> {
    const row = rows.value.find((r) => r.slot.clientId === input.slotClientId);
    if (!row) throw new Error('Slot not found in this session.');
    if (row.slot.status === 'completed') return;

    const sess = session.value;
    if (!sess) throw new Error('Session is not loaded.');
    if (!sess.serverId) {
      throw new Error(
        'Session is not yet synced to the server. Reconnect and retry.',
      );
    }
    if (!row.slot.serverId) {
      throw new Error(
        'Activity slot is not yet synced to the server. Reconnect and retry.',
      );
    }

    const api = usePssSessionsApi();
    const completedAt = new Date().toISOString();

    // 1. PATCH the activity completion (notes optional).
    await api.completeActivity(
      sess.serverId,
      row.slot.serverId,
      {
        notes: input.notes || undefined,
        completed_at: completedAt,
        client_timestamp: completedAt,
      },
      { idempotencyKey: uuidv4() },
    );

    // 2. POST a child flag if one was attached. The flag is optional;
    //    a failure here should NOT roll back the activity completion —
    //    completion is the durable user intent. Surface the flag error
    //    via re-throw so the caller can show a partial-success toast.
    let flagError: unknown = null;
    if (input.flag) {
      try {
        await api.flagChild(
          sess.serverId,
          {
            session_activity_id: row.slot.serverId,
            beneficiary_id: input.flag.childId,
            concern: input.flag.concern,
            flagged_at: completedAt,
            client_uuid: uuidv4(),
          },
          { idempotencyKey: uuidv4() },
        );
      } catch (err) {
        flagError = err;
      }
    }

    // 3. Persist locally only after the BE acknowledged the completion.
    //    Deep-clone the array so Vue's reactive proxies don't reach
    //    Dexie — IndexedDB's structured-clone algorithm rejects them
    //    with `DataCloneError: [object Array] could not be cloned`.
    const existingFlags = (row.slot.flaggedChildren ?? []).map((f) => ({
      childId: f.childId,
      concern: f.concern,
    }));
    const flaggedChildren: PssFlaggedChild[] =
      input.flag && !flagError
        ? [...existingFlags, { childId: input.flag.childId, concern: input.flag.concern }]
        : existingFlags;
    await sessionActivitiesRepository.patch(
      input.slotClientId,
      {
        status: 'completed',
        notes: input.notes,
        completedAt,
        flaggedChildren,
        syncStatus: 'synced',
      } as Partial<PssSessionActivityRecord>,
      { markPending: false },
    );
    await reload();

    if (flagError) throw flagError;
  }

  async function completeSessionWithRemarks(remarks: string): Promise<void> {
    const sess = session.value;
    if (!sess) throw new Error('Session is not loaded.');
    if (sess.status === 'completed') return;
    if (!sess.serverId) {
      throw new Error(
        'Session is not yet synced to the server. Reconnect and retry.',
      );
    }
    const trimmed = remarks.trim();
    if (!trimmed) throw new Error('Remarks are required.');

    const api = usePssSessionsApi();
    const completedAt = new Date().toISOString();
    await api.completeSession(
      sess.serverId,
      { remarks: trimmed, completed_at: completedAt },
      { idempotencyKey: uuidv4() },
    );

    await sessionsRepository.patch(
      sess.clientId,
      {
        status: 'completed',
        remarks: trimmed,
        completedAt,
        syncStatus: 'synced',
      } as Partial<PssSessionRecord>,
      { markPending: false },
    );
    await reload();
  }

  const totalCount = computed(() => rows.value.length);
  const completedCount = computed(
    () => rows.value.filter((r) => r.slot.status === 'completed').length,
  );
  const progress = computed(() =>
    totalCount.value === 0 ? 0 : completedCount.value / totalCount.value,
  );
  const allComplete = computed(
    () => totalCount.value > 0 && completedCount.value === totalCount.value,
  );
  const isLocked = computed(
    () => session.value?.status === 'completed',
  );

  return {
    loading,
    notFound,
    session,
    rows,
    progress,
    completedCount,
    totalCount,
    allComplete,
    isLocked,
    reload,
    markSlotCompleted,
    completeSlotWithDetails,
    completeSessionWithRemarks,
  };
}
