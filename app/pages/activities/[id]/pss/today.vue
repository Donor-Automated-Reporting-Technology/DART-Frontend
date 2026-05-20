<!--
  PSS Today's Sessions — entry point for running scheduled PSS work.

  Jira: DART-51 (sub-task of DART-35).

  Lists today's scheduled (timePeriod × ageGroup) blocks pulled from the
  facilitator's active schedule. Each block shows its activity count and
  a single CTA — "Enter Session" — that creates the server session
  (POST /pss/sessions) and routes to the checklist (DART-45).

  If a session for the same (schedule, date, time_period, age_group)
  already exists locally (the BE would 409 anyway), the CTA flips to
  "Resume" and routes straight to the existing session.

  Source: DART/PSS_MODULE_PRD.md §7.
-->
<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="today-page">
      <header class="page-header">
        <div class="header-row">
          <div>
            <h1 class="page-title">Today's sessions</h1>
            <p class="page-subtitle">
              {{ humanToday }} ·
              {{ cfsLocationName || 'Your CFS' }}
            </p>
          </div>
          <NuxtLink :to="`/activities/${frameworkId}/pss`" class="btn-back">
            <AppIcon name="arrow-left" :size="14" />
            <span class="btn-text">PSS</span>
          </NuxtLink>
        </div>
      </header>

      <div
        v-if="!loading && dayLocked"
        class="day-banner day-banner--locked"
        role="status"
      >
        <div class="day-banner__text">
          <strong>Day locked.</strong>
          End-of-day smiley evaluation submitted — no further edits.
        </div>
      </div>

      <div
        v-else-if="!loading && evaluationDue"
        class="day-banner day-banner--due"
        role="alert"
      >
        <div class="day-banner__text">
          <strong>End-of-day evaluation required.</strong>
          All activities are complete. Record the UNICEF 5-face smiley
          evaluation to lock the day.
        </div>
        <button
          type="button"
          class="day-banner__cta"
          @click="goToEvaluation"
        >
          Start evaluation
          <AppIcon name="chevron-right" :size="14" />
        </button>
      </div>

      <div v-if="loading" class="state">Loading today's schedule…</div>

      <div v-else-if="!cfsLocationId" class="state state--error">
        Your account is not linked to a CFS location.
      </div>

      <div v-else-if="!activeSchedule" class="state">
        <p>No active schedule for your CFS.</p>
        <NuxtLink :to="`/activities/${frameworkId}/pss/setup`" class="btn-primary">
          Build a schedule
        </NuxtLink>
      </div>

      <div v-else-if="blocks.length === 0" class="state">
        Nothing scheduled for today. Take the day off.
      </div>

      <ul v-else class="block-list">
        <li
          v-for="block in blocks"
          :key="`${block.timePeriod}|${block.ageGroup}`"
          class="block"
        >
          <div class="block-main">
            <div class="block-headline">
              <span class="pill pill--period">
                {{ block.timePeriod === 'morning' ? 'Morning' : 'Afternoon' }}
              </span>
              <span class="pill pill--age">Age {{ block.ageGroup }}</span>
              <span
                v-if="block.existingSession?.status === 'completed'"
                class="pill pill--done"
              >Done</span>
              <span
                v-else-if="block.existingSession"
                class="pill pill--running"
              >In progress</span>
            </div>
            <p class="block-meta">
              {{ block.slotCount }} activit{{ block.slotCount === 1 ? 'y' : 'ies' }}
            </p>
          </div>
          <button
            type="button"
            class="block-cta"
            :class="ctaClass(block)"
            :disabled="starting === blockKey(block)"
            @click="onEnter(block)"
          >
            <span v-if="starting === blockKey(block)" class="spinner" />
            {{ ctaLabel(block) }}
            <AppIcon name="chevron-right" :size="14" />
          </button>
        </li>
      </ul>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '~/stores/auth';
import { useOfflineStatus } from '~/composables/useOfflineStatus';
import { useToast } from '~/composables/useToast';
import { schedulesRepository } from '~/services/pss/repositories/schedulesRepository';
import { sessionsRepository } from '~/services/pss/repositories/sessionsRepository';
import { sessionActivitiesRepository } from '~/services/pss/repositories/sessionActivitiesRepository';
import {
  daySmileyRepository,
  buildDayId,
} from '~/services/pss/repositories/daySmileyRepository';
import { usePssSessionsApi, type PssSessionDto } from '~/services/pss/sessionsApi';
import { usePssDaysApi, type PssDaySmileyDto } from '~/services/pss/daysApi';
import { usePssSessionStart } from '~/composables/usePssSessionStart';
import type {
  PssDayOfWeek,
  PssDaySmileyRecord,
  PssScheduleAgeGroup,
  PssScheduleRecord,
  PssSessionRecord,
  PssTimePeriodLabel,
} from '~/interfaces/pssDb';

definePageMeta({ layout: false, middleware: ['auth'] });

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();
const sessionStart = usePssSessionStart();
const sessionsApi = usePssSessionsApi();
const daysApi = usePssDaysApi();
const offline = useOfflineStatus();

const frameworkId = route.params.id as string;
const cfsLocationId = computed(() => auth.cfsLocationId ?? '');
const cfsLocationName = computed(() => auth.cfsLocationName ?? '');

const loading = ref(true);
const activeSchedule = ref<PssScheduleRecord | null>(null);
const existingSessions = ref<PssSessionRecord[]>([]);
const starting = ref<string | null>(null);
const dayEvaluation = ref<PssDaySmileyRecord | null>(null);

const breadcrumbs = computed(() => [
  { title: 'Projects', href: '/activities' },
  { title: 'Project', href: `/activities/${frameworkId}` },
  { title: 'PSS', href: `/activities/${frameworkId}/pss` },
  { title: "Today's Sessions", href: route.fullPath, current: true },
]);

const DAYS: Record<number, PssDayOfWeek> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
};

const todayDay = computed<PssDayOfWeek>(() => DAYS[new Date().getDay()] ?? 'mon');
const todayDate = computed(() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
});

const humanToday = computed(() =>
  new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }),
);

interface TodayBlock {
  timePeriod: PssTimePeriodLabel;
  ageGroup: PssScheduleAgeGroup;
  slotCount: number;
  existingSession: PssSessionRecord | null;
}

function blockKey(b: { timePeriod: PssTimePeriodLabel; ageGroup: PssScheduleAgeGroup }): string {
  return `${b.timePeriod}|${b.ageGroup}`;
}

function ctaLabel(b: TodayBlock): string {
  if (b.existingSession?.status === 'completed') return 'View';
  if (b.existingSession) return 'Resume';
  return 'Enter session';
}

function ctaClass(b: TodayBlock): string {
  if (b.existingSession?.status === 'completed') return 'block-cta--view';
  return '';
}

const blocks = computed<TodayBlock[]>(() => {
  if (!activeSchedule.value) return [];
  const todaySlots = activeSchedule.value.templateSlots.filter(
    (s) => s.day === todayDay.value,
  );
  if (todaySlots.length === 0) return [];

  const grouped = new Map<string, TodayBlock>();
  for (const slot of todaySlots) {
    const key = `${slot.timePeriod}|${slot.ageGroup}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.slotCount += 1;
    } else {
      grouped.set(key, {
        timePeriod: slot.timePeriod,
        ageGroup: slot.ageGroup,
        slotCount: 1,
        existingSession:
          existingSessions.value.find(
            (s) =>
              s.timePeriod === slot.timePeriod &&
              s.ageGroup === slot.ageGroup &&
              s.date === todayDate.value,
          ) ?? null,
      });
    }
  }
  // Stable sort: morning before afternoon, then age group ascending.
  return Array.from(grouped.values()).sort((a, b) => {
    if (a.timePeriod !== b.timePeriod) {
      return a.timePeriod === 'morning' ? -1 : 1;
    }
    return a.ageGroup.localeCompare(b.ageGroup);
  });
});

function dtoToLocalSession(dto: PssSessionDto): PssSessionRecord {
  return {
    id: dto.id,
    clientId: dto.id,
    serverId: dto.id,
    clientTimestamp: dto.client_timestamp ?? new Date().toISOString(),
    syncStatus: 'synced',
    syncError: undefined,
    scheduleId: dto.schedule_id,
    cfsLocationId: dto.cfs_location_id,
    date: dto.session_date.slice(0, 10),
    timePeriod: dto.time_period,
    ageGroup: dto.age_group,
    status: dto.status,
    facilitatorId: dto.facilitator_id,
    remarks: dto.remarks ?? '',
    startedAt: dto.started_at,
    completedAt: dto.completed_at ?? null,
  };
}

/**
 * Reconcile today's sessions for this account between server and local
 * IndexedDB. Without this pull, opening today.vue on a second device
 * would never know about an in-progress session started elsewhere and
 * would 409 on every Enter Session click. The list call is filtered to
 * `only_mine=true` so other facilitators' sessions never appear here.
 */
async function reconcileServerSessions(): Promise<void> {
  if (!offline.isOnline.value) return;
  try {
    const dtos = await sessionsApi.list({
      date: todayDate.value,
      cfsLocationId: cfsLocationId.value || undefined,
      onlyMine: true,
    });
    if (dtos.length === 0) return;
    // Upsert each into the local cache so re-renders + the checklist
    // page see the same row. Slot rows are seeded lazily when the user
    // taps Resume → the session page hydrates via GET /:id if needed.
    const records = dtos.map(dtoToLocalSession);
    await sessionsRepository.bulkUpsert(records);

    // Also pull each session's full payload so the slots are seeded
    // locally — otherwise the checklist opens with zero rows on the
    // device that didn't start the session.
    for (const dto of dtos) {
      if (!dto.activities || dto.activities.length === 0) {
        try {
          const full = await sessionsApi.get(dto.id);
          if (full.activities && full.activities.length > 0) {
            await sessionActivitiesRepository.bulkUpsert(
              full.activities.map((a) => ({
                id: a.id,
                clientId: a.id,
                serverId: a.id,
                clientTimestamp: a.client_timestamp ?? new Date().toISOString(),
                syncStatus: 'synced' as const,
                syncError: undefined,
                sessionId: dto.id,
                activityId: a.schedule_slot_id ?? a.id,
                order: a.order_index,
                status: a.status,
                notes: a.notes ?? '',
                completedAt: a.completed_at ?? null,
                flaggedChildren: [],
              })),
            );
          }
        } catch {
          // Best-effort hydration; if it fails the session row is still
          // visible and the checklist page will retry the GET on mount.
        }
      } else {
        await sessionActivitiesRepository.bulkUpsert(
          dto.activities.map((a) => ({
            id: a.id,
            clientId: a.id,
            serverId: a.id,
            clientTimestamp: a.client_timestamp ?? new Date().toISOString(),
            syncStatus: 'synced' as const,
            syncError: undefined,
            sessionId: dto.id,
            activityId: a.schedule_slot_id ?? a.id,
            order: a.order_index,
            status: a.status,
            notes: a.notes ?? '',
            completedAt: a.completed_at ?? null,
            flaggedChildren: [],
          })),
        );
      }
    }
  } catch {
    // Network or auth blip — fall back to whatever the local cache
    // says. The Enter Session click still has the 409 fallback.
  }
}

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    if (!cfsLocationId.value) return;
    activeSchedule.value =
      (await schedulesRepository.getActive(cfsLocationId.value)) ?? null;
    // Pull server-side sessions for today first so cross-device state
    // is reflected before the user clicks anything.
    await reconcileServerSessions();
    // List today's sessions across all schedules — the BE's UNIQUE
    // constraint is on (cfs_location_id, session_date, time_period,
    // age_group) and ignores schedule_id, so a freshly-activated
    // schedule may collide with sessions started earlier today against
    // the previously-active (now-archived) schedule. Filtering by
    // schedule_id would hide those rows, mislabel the block as "Enter
    // session", trigger a 409 on click, and resume the stale session.
    // reconcileServerSessions above scoped the pull to this facilitator
    // and CFS via only_mine=true, so listByDate is already safe.
    existingSessions.value = await sessionsRepository.listByDate(todayDate.value);

    // Day-level smiley lookup — locks today's UI when present.
    //
    // The submission only writes to the device that recorded the
    // evaluation (plus the server). Other devices logged into the same
    // account would otherwise show "evaluation due" forever. Pull the
    // server row first when online and seed the local cache so the
    // banner reflects cross-device state.
    if (activeSchedule.value) {
      const sched = activeSchedule.value;
      const scheduleKey = sched.serverId ?? sched.clientId;
      const dayId = buildDayId(scheduleKey, todayDate.value);

      if (offline.isOnline.value) {
        try {
          const dto = await daysApi.getSmiley(dayId);
          if (dto) {
            await daySmileyRepository.upsert({
              id: dto.id,
              clientId: dayId,
              serverId: dto.id,
              clientTimestamp:
                dto.client_timestamp ?? new Date().toISOString(),
              syncStatus: 'synced',
              syncError: undefined,
              scheduleId: dto.schedule_id,
              date: dto.date.slice(0, 10),
              veryHappy: dto.very_happy,
              happy: dto.happy,
              ok: dto.ok,
              unhappy: dto.unhappy,
              veryUnhappy: dto.very_unhappy,
              blank: dto.blank,
              totalChildren: dto.total_children,
              facilitatorId: dto.facilitator_id,
              lockedAt: dto.locked_at,
            });
          }
        } catch {
          // Best-effort hydration. Fall through to whatever the local
          // cache already knows about this day.
        }
      }

      dayEvaluation.value =
        (await daySmileyRepository.getByDay(scheduleKey, todayDate.value)) ??
        null;
    } else {
      dayEvaluation.value = null;
    }
  } finally {
    loading.value = false;
  }
}

// ── End-of-day evaluation gate ─────────────────────────────────────────
//
// Once every scheduled block for the active day has a completed session,
// the facilitator must submit the UNICEF 5-face smiley evaluation before
// the day is considered closed. The evaluation locks the day; existence
// of a `pss_day_smiley` row keyed by (scheduleId, date) is the source of
// truth.

const allBlocksDone = computed(
  () =>
    blocks.value.length > 0 &&
    blocks.value.every((b) => b.existingSession?.status === 'completed'),
);

const dayLocked = computed(() => dayEvaluation.value !== null);

const evaluationDue = computed(
  () => allBlocksDone.value && !dayLocked.value && !!activeSchedule.value,
);

const evaluationDayId = computed(() => {
  const sched = activeSchedule.value;
  if (!sched) return null;
  return buildDayId(sched.serverId ?? sched.clientId, todayDate.value);
});

function goToEvaluation(): void {
  if (!evaluationDayId.value) return;
  void router.push(
    `/activities/${frameworkId}/pss/day/${encodeURIComponent(evaluationDayId.value)}/evaluation`,
  );
}

async function onEnter(block: TodayBlock): Promise<void> {
  if (block.existingSession) {
    if (block.existingSession.status === 'completed') {
      toast.info('This block is already completed — opening read-only view.');
    }
    void router.push(
      `/activities/${frameworkId}/pss/session/${block.existingSession.clientId}`,
    );
    return;
  }
  if (!activeSchedule.value?.serverId) {
    toast.error(
      'Schedule has not finished syncing — wait a moment and try again.',
    );
    return;
  }
  starting.value = blockKey(block);
  try {
    const result = await sessionStart.start({
      scheduleId: activeSchedule.value.serverId,
      date: todayDate.value,
      timePeriod: block.timePeriod,
      ageGroup: block.ageGroup,
    });
    void router.push(
      `/activities/${frameworkId}/pss/session/${result.session.clientId}`,
    );
  } catch (err) {
    // PssApiError is a plain object, not an Error instance — pull the
    // server's message + code so the toast tells the user *why* the BE
    // rejected the create (e.g. SCHEDULE_NOT_ACTIVE,
    // NO_SLOTS_FOR_PERIOD).
    const e = err as { message?: string; code?: string; status?: number };
    const message = e?.message || (err instanceof Error ? err.message : 'Could not start the session.');
    const heading =
      e?.code === 'SCHEDULE_NOT_ACTIVE'
        ? 'Schedule is not active.'
        : e?.code === 'NO_SLOTS_FOR_PERIOD'
          ? 'No activities scheduled for this block.'
          : 'Could not start the session.';
    toast.error(heading, { detail: message });
  } finally {
    starting.value = null;
  }
}

onMounted(loadData);
</script>

<style scoped>
.today-page {
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-header { margin-bottom: 4px; }
.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.page-title {
  font-size: 1.35rem;
  font-weight: 750;
  color: var(--text-primary, var(--text));
  margin: 0 0 2px;
}
.page-subtitle {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0;
}
.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.82rem;
  text-decoration: none;
  font-weight: 500;
  white-space: nowrap;
  min-height: 36px;
  transition: border-color 0.15s, color 0.15s;
}
.btn-back:hover { border-color: var(--text-muted); color: var(--text-primary); }

.state {
  padding: 32px 16px;
  border-radius: 10px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  text-align: center;
  font-size: 0.9rem;
}
.state--error { color: var(--error); background: var(--error-bg); }

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 9px 16px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
}

.block-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.block {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 12px;
}
.block-main { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.block-headline { display: flex; gap: 6px; flex-wrap: wrap; }
.pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.7rem;
  font-weight: 650;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 3px 9px;
  border-radius: 999px;
}
.pill--period {
  background: var(--primary-dim);
  color: var(--primary);
}
.pill--age {
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}
.pill--running {
  background: rgba(250, 204, 21, 0.14);
  color: #facc15;
}
.pill--done {
  background: rgba(34, 197, 94, 0.16);
  color: #22c55e;
}
.block-meta {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0;
}

.block-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
  transition: opacity 0.12s, transform 0.1s;
}
.block-cta:hover:not(:disabled)  { opacity: 0.9; }
.block-cta:active:not(:disabled) { transform: scale(0.98); }
.block-cta:disabled { opacity: 0.55; cursor: progress; }
.block-cta--view {
  background: #22c55e;
  color: #052e16;
}

.spinner {
  width: 11px;
  height: 11px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.day-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}
.day-banner__text { font-size: 0.9rem; line-height: 1.35; }
.day-banner--due {
  background: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.4);
  color: var(--text-primary);
}
.day-banner--locked {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.4);
  color: var(--text-primary);
}
.day-banner__cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
}

@media (max-width: 480px) {
  .header-row { flex-direction: column; gap: 10px; }
  .btn-text { display: none; }
  .block { flex-direction: column; align-items: stretch; gap: 10px; }
  .block-cta { justify-content: center; }
}
</style>
