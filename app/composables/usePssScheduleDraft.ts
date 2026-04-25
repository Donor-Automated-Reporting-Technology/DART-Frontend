/**
 * usePssScheduleDraft — state machine for the schedule setup form (DART-47).
 *
 * Jira: DART-47 (sub-task of DART-36).
 *
 * Encapsulates the *scaffolding* a facilitator captures BEFORE the
 * day-by-day stepper opens (DART-43): time periods, age groups, active
 * days. The stepper itself is responsible for filling `templateSlots` —
 * this composable leaves that array empty.
 *
 * Stateless / parallel-safe: holds its own ref-based draft, no Pinia
 * store, no shared module state. The setup page instantiates one
 * draft per visit; saving routes the caller to the stepper with the
 * draft's `clientId`.
 *
 * Persistence path:
 *   1. `validate()` returns blockers (per AC).
 *   2. `saveDraft()` upserts the draft into `pss_schedules` with
 *      `status='draft'` and `syncStatus='pending'` — no network call
 *      (POST happens later in DART-41 from the stepper's Save flow).
 *   3. Caller routes to the stepper, passing `record.clientId`.
 *
 * AC mapping (DART-47):
 *   • At least 1 time period required ............... `time_periods_empty`
 *   • At least 1 age group required ................. `age_groups_empty`
 *   • At least 1 active day required ................ `active_days_empty`
 *   • Time periods: HH:MM, end > start .............. `time_period_invalid`
 *   • Continue persists draft to IndexedDB .......... `saveDraft()`
 *   • Cancel returns to active schedule with
 *     confirm-discard if any field touched .......... `isDirty`
 *   • Works fully offline ........................... no network call
 */

import { computed, reactive, readonly, ref } from 'vue';
import { v4 as uuid } from 'uuid';
import { schedulesRepository } from '~/services/pss/repositories/schedulesRepository';
import type {
  PssDayOfWeek,
  PssScheduleAgeGroup,
  PssScheduleRecord,
  PssTemplateSlot,
  PssTimePeriod,
  PssTimePeriodLabel,
} from '~/interfaces/pssDb';

// ── Types ───────────────────────────────────────────────────────────────

export type PssScheduleSetupIssueCode =
  | 'time_periods_empty'
  | 'age_groups_empty'
  | 'active_days_empty'
  | 'time_period_invalid';

export interface PssScheduleSetupIssue {
  code: PssScheduleSetupIssueCode;
  message: string;
  /** Index of the offending time-period row (only for `time_period_invalid`). */
  timePeriodIndex?: number;
}

export interface PssScheduleDraft {
  cfsLocationId: string;
  cfsLocationName: string;
  timePeriods: PssTimePeriod[];
  ageGroups: PssScheduleAgeGroup[];
  activeDays: PssDayOfWeek[];
}

export interface PssScheduleDraftContext {
  cfsLocationId: string;
  cfsLocationName: string;
  /** Authenticated user UUID — stamped on the persisted record. */
  userId: string;
}

export interface PssScheduleDraftSaveResult {
  ok: true;
  record: PssScheduleRecord;
}

export interface PssScheduleDraftSaveError {
  ok: false;
  issues: PssScheduleSetupIssue[];
}

// ── Defaults (per AC / TRD §6.1) ─────────────────────────────────────────

export const PSS_AGE_GROUP_OPTIONS: ReadonlyArray<{
  value: PssScheduleAgeGroup;
  label: string;
}> = Object.freeze([
  { value: '6-10', label: '6–10' },
  { value: '11-14', label: '11–14' },
  { value: '15-17', label: '15–17' },
]);

export const PSS_DAY_OPTIONS: ReadonlyArray<{
  value: PssDayOfWeek;
  short: string;
  long: string;
}> = Object.freeze([
  { value: 'mon', short: 'Mon', long: 'Monday' },
  { value: 'tue', short: 'Tue', long: 'Tuesday' },
  { value: 'wed', short: 'Wed', long: 'Wednesday' },
  { value: 'thu', short: 'Thu', long: 'Thursday' },
  { value: 'fri', short: 'Fri', long: 'Friday' },
  { value: 'sat', short: 'Sat', long: 'Saturday' },
  { value: 'sun', short: 'Sun', long: 'Sunday' },
]);

const DEFAULT_DAYS: PssDayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri'];

const DEFAULT_TIME_PERIODS: PssTimePeriod[] = [
  { label: 'morning', startTime: '08:00', endTime: '12:00' },
  { label: 'afternoon', startTime: '14:00', endTime: '16:00' },
];

// ── Helpers ──────────────────────────────────────────────────────────────

const HH_MM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isValidHHMM(value: string): boolean {
  return HH_MM_RE.test(value);
}

function toMinutes(value: string): number {
  const [h, m] = value.split(':');
  return Number(h) * 60 + Number(m);
}

/** Promote an existing label, or pick the next sensible one for a new row. */
function nextPeriodLabel(existing: PssTimePeriod[]): PssTimePeriodLabel {
  const hasMorning = existing.some((p) => p.label === 'morning');
  return hasMorning ? 'afternoon' : 'morning';
}

function buildInitialDraft(ctx: PssScheduleDraftContext): PssScheduleDraft {
  return {
    cfsLocationId: ctx.cfsLocationId,
    cfsLocationName: ctx.cfsLocationName,
    timePeriods: DEFAULT_TIME_PERIODS.map((p) => ({ ...p })),
    ageGroups: [],
    activeDays: [...DEFAULT_DAYS],
  };
}

// ── Pure validator (exported for tests / banner reuse) ───────────────────

export function validateScheduleDraft(
  draft: PssScheduleDraft,
): PssScheduleSetupIssue[] {
  const issues: PssScheduleSetupIssue[] = [];

  if (draft.timePeriods.length === 0) {
    issues.push({
      code: 'time_periods_empty',
      message: 'Add at least one time period.',
    });
  }

  draft.timePeriods.forEach((p, index) => {
    if (!isValidHHMM(p.startTime) || !isValidHHMM(p.endTime)) {
      issues.push({
        code: 'time_period_invalid',
        message: 'Use HH:MM 24-hour format.',
        timePeriodIndex: index,
      });
      return;
    }
    if (toMinutes(p.endTime) <= toMinutes(p.startTime)) {
      issues.push({
        code: 'time_period_invalid',
        message: 'End time must be later than start time.',
        timePeriodIndex: index,
      });
    }
  });

  if (draft.ageGroups.length === 0) {
    issues.push({
      code: 'age_groups_empty',
      message: 'Pick at least one age group.',
    });
  }

  if (draft.activeDays.length === 0) {
    issues.push({
      code: 'active_days_empty',
      message: 'Activate at least one day of the week.',
    });
  }

  return issues;
}

// ── Composable ───────────────────────────────────────────────────────────

export function usePssScheduleDraft(ctx: PssScheduleDraftContext) {
  const draft = reactive<PssScheduleDraft>(buildInitialDraft(ctx));
  const isDirty = ref(false);

  function markDirty(): void {
    isDirty.value = true;
  }

  // ── Time periods ────────────────────────────────────────────────────

  function addTimePeriod(): void {
    draft.timePeriods.push({
      label: nextPeriodLabel(draft.timePeriods),
      startTime: '08:00',
      endTime: '12:00',
    });
    markDirty();
  }

  function removeTimePeriod(index: number): void {
    if (index < 0 || index >= draft.timePeriods.length) return;
    draft.timePeriods.splice(index, 1);
    markDirty();
  }

  function updateTimePeriod(
    index: number,
    patch: Partial<PssTimePeriod>,
  ): void {
    const current = draft.timePeriods[index];
    if (!current) return;
    Object.assign(current, patch);
    markDirty();
  }

  // ── Age groups ──────────────────────────────────────────────────────

  function toggleAgeGroup(value: PssScheduleAgeGroup): void {
    const i = draft.ageGroups.indexOf(value);
    if (i >= 0) draft.ageGroups.splice(i, 1);
    else draft.ageGroups.push(value);
    markDirty();
  }

  // ── Active days ─────────────────────────────────────────────────────

  function toggleDay(value: PssDayOfWeek): void {
    const i = draft.activeDays.indexOf(value);
    if (i >= 0) draft.activeDays.splice(i, 1);
    else draft.activeDays.push(value);
    markDirty();
  }

  // ── Validation (reactive) ───────────────────────────────────────────

  const issues = computed<PssScheduleSetupIssue[]>(() =>
    validateScheduleDraft(draft),
  );

  const canContinue = computed<boolean>(() => issues.value.length === 0);

  function issueFor(
    code: PssScheduleSetupIssueCode,
  ): PssScheduleSetupIssue | undefined {
    return issues.value.find((i) => i.code === code);
  }

  function timePeriodIssues(index: number): PssScheduleSetupIssue[] {
    return issues.value.filter(
      (i) => i.code === 'time_period_invalid' && i.timePeriodIndex === index,
    );
  }

  // ── Persistence ─────────────────────────────────────────────────────

  async function saveDraft(): Promise<
    PssScheduleDraftSaveResult | PssScheduleDraftSaveError
  > {
    const blockers = validateScheduleDraft(draft);
    if (blockers.length > 0) {
      return { ok: false, issues: blockers };
    }

    const now = new Date().toISOString();
    const clientId = uuid();
    const record: PssScheduleRecord = {
      id: clientId,
      clientId,
      serverId: null,
      clientTimestamp: now,
      syncStatus: 'pending',
      cfsLocationId: ctx.cfsLocationId,
      status: 'draft',
      activeDays: [...draft.activeDays],
      timePeriods: draft.timePeriods.map((p) => ({ ...p })),
      ageGroups: [...draft.ageGroups],
      templateSlots: [] as PssTemplateSlot[],
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    };

    await schedulesRepository.upsert(record);
    isDirty.value = false;
    return { ok: true, record };
  }

  function reset(): void {
    Object.assign(draft, buildInitialDraft(ctx));
    isDirty.value = false;
  }

  return {
    // state
    draft: readonly(draft),
    isDirty: readonly(isDirty),
    issues,
    canContinue,
    // mutators
    addTimePeriod,
    removeTimePeriod,
    updateTimePeriod,
    toggleAgeGroup,
    toggleDay,
    // helpers
    issueFor,
    timePeriodIssues,
    // lifecycle
    saveDraft,
    reset,
  };
}

export type UsePssScheduleDraftReturn = ReturnType<typeof usePssScheduleDraft>;
