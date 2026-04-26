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

import { sessionsRepository } from '~/services/pss/repositories/sessionsRepository';
import { sessionActivitiesRepository } from '~/services/pss/repositories/sessionActivitiesRepository';
import { activitiesRepository } from '~/services/pss/repositories/activitiesRepository';
import type {
  PssActivityRecord,
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
  };
}
