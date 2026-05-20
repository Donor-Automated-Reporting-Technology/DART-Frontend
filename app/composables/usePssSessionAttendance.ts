/**
 * usePssSessionAttendance — load + mutate attendance for one session.
 *
 * Loads CFS-registered children once, plus the existing attendance rows
 * for the session. Exposes `setStatus(beneficiaryId, status)` for in-UI
 * toggling and `submit()` to bulk-upsert via
 * `POST /pss/sessions/:id/attendance`. The page that owns this
 * composable shows the present/absent counts and the per-child list.
 */

import { computed, ref, type ComputedRef, type Ref } from 'vue';

import { sessionAttendanceRepository } from '~/services/pss/repositories/sessionAttendanceRepository';
import { sessionsRepository } from '~/services/pss/repositories/sessionsRepository';
import {
  usePssSessionsApi,
  type PssAttendanceDto,
} from '~/services/pss/sessionsApi';
import { beneficiaryApi } from '~/services/beneficiaryApi';
import { useAuthStore } from '~/stores/auth';
import type {
  Beneficiary,
} from '~/interfaces/beneficiary';
import type {
  PssAttendanceStatus,
  PssScheduleAgeGroup,
  PssSessionAttendanceRecord,
  PssSessionRecord,
} from '~/interfaces/pssDb';

/**
 * Map a PSS age group to a [min,max] age range used to filter the CFS
 * beneficiary list. `parents` covers caregivers (18+); the upper bound
 * is intentionally open so older guardians are not silently excluded.
 */
function ageRangeFor(group: PssScheduleAgeGroup | string): [number, number] {
  switch (group) {
    case '6-10':
      return [6, 10];
    case '11-14':
      return [11, 14];
    case '15-17':
      return [15, 17];
    case 'parents':
      return [18, 120];
    default:
      return [0, 120];
  }
}

export interface PssAttendanceRow {
  beneficiary: Beneficiary;
  /** undefined = not yet marked. */
  status: PssAttendanceStatus | undefined;
  /** True while the row's mutation is in flight (during submit). */
  syncing?: boolean;
}

export interface UsePssSessionAttendanceReturn {
  loading: Ref<boolean>;
  saving: Ref<boolean>;
  loadError: Ref<string>;
  saveError: Ref<string>;
  rows: Ref<PssAttendanceRow[]>;
  /** Beneficiaries the user has explicitly marked (excludes 'undefined'). */
  markedCount: ComputedRef<number>;
  presentCount: ComputedRef<number>;
  absentCount: ComputedRef<number>;
  totalCount: ComputedRef<number>;
  /** True once at least one row has a status — gates Complete Session. */
  hasMarkedAny: ComputedRef<boolean>;
  /** Mutate locally (no API call) — used while the user toggles rows. */
  setStatus: (beneficiaryId: string, status: PssAttendanceStatus) => void;
  /** Set every still-undefined row to `present`. */
  markRemainingPresent: () => void;
  /** Set every still-undefined row to `absent`. */
  markRemainingAbsent: () => void;
  /** Reload list + attendance from local IndexedDB (and fall through to BE). */
  reload: () => Promise<void>;
  /** Push all marked rows in one BE call; no-ops if nothing has changed. */
  submit: () => Promise<void>;
}

function fullName(b: Beneficiary): string {
  const parts = [b.personal_name, b.father_name, b.family_name].filter(
    (p): p is string => !!p,
  );
  return parts.join(' ').trim() || 'Unnamed child';
}

function dtoToLocalRecord(
  dto: PssAttendanceDto,
  beneficiaryName: string | undefined,
): PssSessionAttendanceRecord {
  return {
    id: dto.id,
    clientId: dto.id,
    serverId: dto.id,
    clientTimestamp: dto.client_timestamp ?? new Date().toISOString(),
    syncStatus: 'synced',
    syncError: undefined,
    sessionId: dto.session_id,
    beneficiaryId: dto.beneficiary_id,
    status: dto.status,
    markedBy: dto.marked_by,
    markedAt: dto.marked_at,
    beneficiaryName,
  };
}

export function usePssSessionAttendance(
  sessionClientId: string,
): UsePssSessionAttendanceReturn {
  const auth = useAuthStore();
  const api = usePssSessionsApi();

  const loading = ref(true);
  const saving = ref(false);
  const loadError = ref('');
  const saveError = ref('');
  const rows = ref<PssAttendanceRow[]>([]);
  const session = ref<PssSessionRecord | null>(null);

  async function reload(): Promise<void> {
    loading.value = true;
    loadError.value = '';
    try {
      session.value =
        (await sessionsRepository.getByClientId(sessionClientId)) ??
        (await sessionsRepository.findByServerId(sessionClientId)) ??
        null;
      if (!session.value) {
        rows.value = [];
        loadError.value = 'Session not found locally.';
        return;
      }

      // If the local record is stale (created before cfsLocationId was
      // added) fetch from the server to get the authoritative CFS. The
      // attendance endpoint rejects beneficiaries not registered at the
      // session's CFS — using auth.cfsLocationId as a fallback is wrong
      // when the user is at a different CFS than the session.
      if (!session.value.cfsLocationId && session.value.serverId) {
        try {
          const dto = await api.get(session.value.serverId);
          const refreshed: PssSessionRecord = {
            ...session.value,
            cfsLocationId: dto.cfs_location_id,
            scheduleId: dto.schedule_id,
            status: dto.status,
            facilitatorId: dto.facilitator_id,
            startedAt: dto.started_at,
            completedAt: dto.completed_at ?? null,
            remarks: dto.remarks ?? session.value.remarks,
          };
          await sessionsRepository.upsert(refreshed);
          session.value = refreshed;
        } catch {
          // Fall through to the auth-store fallback below.
        }
      }

      const cfsId = session.value.cfsLocationId || auth.cfsLocationId || '';
      if (!cfsId) {
        loadError.value = 'Session is not linked to a CFS location.';
        rows.value = [];
        return;
      }

      // 1. Pull beneficiaries via the session-scoped endpoint. The
      //    org-wide `/cfs/beneficiaries/list` hard-scopes non-admin
      //    callers to their personal assignment — using it here would
      //    return the wrong CFS's roster whenever a session belongs to
      //    a CFS the user isn't currently assigned to (e.g. the
      //    schedule predates a reassignment), and the BE attendance
      //    write would then 422 with BENEFICIARY_NOT_AT_CFS.
      let allBeneficiaries: Beneficiary[] = [];
      if (session.value.serverId) {
        try {
          const data = await api.listEligibleBeneficiaries(session.value.serverId);
          allBeneficiaries = (data as Beneficiary[]) ?? [];
        } catch (err) {
          // Fall back to the org-wide list; better an over-broad set
          // than no children at all when the new endpoint is missing.
          // eslint-disable-next-line no-console
          console.warn(
            '[pss][attendance] eligible-beneficiaries endpoint failed; falling back to org list',
            err,
          );
        }
      }
      if (allBeneficiaries.length === 0) {
        let page = 1;
        while (page <= 20) {
          const res = await beneficiaryApi.list({
            cfs_location_id: cfsId,
            page,
            page_size: 100,
          });
          allBeneficiaries.push(...(res.beneficiaries ?? []));
          if (!res.pagination?.has_next) break;
          page += 1;
        }
      }

      // 2. Age-group filter — show only children whose
      //    `age_at_registration` falls in the session's age band so
      //    facilitators don't have to scroll past unrelated cohorts.
      //    Children with no recorded age pass through (they should
      //    still be markable; the BE has the final say on CFS scope).
      const [minAge, maxAge] = ageRangeFor(session.value.ageGroup);
      const beneficiaries = allBeneficiaries.filter((b) => {
        const age = b.age_at_registration;
        if (typeof age !== 'number') return true;
        return age >= minAge && age <= maxAge;
      });

      // eslint-disable-next-line no-console
      console.info('[pss][attendance]', {
        sessionId: session.value.serverId,
        cfsId,
        ageGroup: session.value.ageGroup,
        minAge,
        maxAge,
        fetched: allBeneficiaries.length,
        afterAgeFilter: beneficiaries.length,
        sample: allBeneficiaries.slice(0, 3).map((b) => ({
          id: b.id,
          name: b.personal_name,
          age: b.age_at_registration,
          cfs: b.cfs_location?.id,
        })),
      });

      // 2. Refresh the local cache from the server when online.
      if (session.value.serverId) {
        try {
          const dtos = await api.listAttendance(session.value.serverId);
          if (dtos.length > 0) {
            const nameById = new Map(
              beneficiaries.map((b) => [b.id, fullName(b)] as const),
            );
            await sessionAttendanceRepository.bulkUpsert(
              dtos.map((d) => dtoToLocalRecord(d, nameById.get(d.beneficiary_id))),
            );
          }
        } catch {
          // Network blip — fall through to whatever local has.
        }
      }

      const existing = await sessionAttendanceRepository.listBySession(
        session.value.clientId,
      );
      const statusByBeneficiary = new Map<string, PssAttendanceStatus>(
        existing.map((r) => [r.beneficiaryId, r.status]),
      );

      rows.value = beneficiaries.map((b) => ({
        beneficiary: b,
        status: statusByBeneficiary.get(b.id),
      }));
    } catch (err) {
      loadError.value =
        err instanceof Error ? err.message : 'Could not load attendance.';
      rows.value = [];
    } finally {
      loading.value = false;
    }
  }

  function setStatus(beneficiaryId: string, status: PssAttendanceStatus): void {
    rows.value = rows.value.map((r) =>
      r.beneficiary.id === beneficiaryId ? { ...r, status } : r,
    );
  }

  function markRemainingPresent(): void {
    rows.value = rows.value.map((r) =>
      r.status === undefined ? { ...r, status: 'present' } : r,
    );
  }

  function markRemainingAbsent(): void {
    rows.value = rows.value.map((r) =>
      r.status === undefined ? { ...r, status: 'absent' } : r,
    );
  }

  async function submit(): Promise<void> {
    if (saving.value) return;
    saveError.value = '';
    const sess = session.value;
    if (!sess) throw new Error('Session is not loaded.');
    if (!sess.serverId) {
      throw new Error(
        'Session is not yet synced to the server. Reconnect and retry.',
      );
    }
    const entries = rows.value
      .filter((r) => r.status !== undefined)
      .map((r) => ({
        beneficiary_id: r.beneficiary.id,
        status: r.status as PssAttendanceStatus,
      }));
    if (entries.length === 0) {
      throw new Error('Mark at least one child before submitting.');
    }

    saving.value = true;
    try {
      const dtos = await api.markAttendance(sess.serverId, {
        entries,
        client_timestamp: new Date().toISOString(),
      });
      const nameById = new Map(
        rows.value.map((r) => [r.beneficiary.id, fullName(r.beneficiary)] as const),
      );
      await sessionAttendanceRepository.bulkUpsert(
        dtos.map((d) => dtoToLocalRecord(d, nameById.get(d.beneficiary_id))),
      );
    } catch (err) {
      saveError.value =
        err instanceof Error
          ? err.message
          : (err as { message?: string } | null)?.message ??
            'Could not save attendance.';
      throw err;
    } finally {
      saving.value = false;
    }
  }

  const totalCount = computed(() => rows.value.length);
  const presentCount = computed(
    () => rows.value.filter((r) => r.status === 'present').length,
  );
  const absentCount = computed(
    () => rows.value.filter((r) => r.status === 'absent').length,
  );
  const markedCount = computed(() => presentCount.value + absentCount.value);
  const hasMarkedAny = computed(() => markedCount.value > 0);

  return {
    loading,
    saving,
    loadError,
    saveError,
    rows,
    markedCount,
    presentCount,
    absentCount,
    totalCount,
    hasMarkedAny,
    setStatus,
    markRemainingPresent,
    markRemainingAbsent,
    reload,
    submit,
  };
}
