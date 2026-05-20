<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="week-page">

      <!-- ── Header ─────────────────────────────────────────────── -->
      <div class="page-header">
        <div class="header-row">
          <div>
            <h1 class="page-title">Weekly Timetable</h1>
            <p class="page-subtitle">
              {{ serverDateStr }} · {{ activeSchedule ? cfsLocationName : 'No active schedule' }}
            </p>
            <p v-if="clockWarning" class="clock-warning">
              <AppIcon name="alert-triangle" :size="13" /> Device clock may be wrong — using server time
            </p>
          </div>
          <NuxtLink :to="`/activities/${frameworkId}/pss`" class="btn-back">
            <AppIcon name="arrow-left" :size="14" />
            <span class="btn-text">PSS</span>
          </NuxtLink>
        </div>
      </div>

      <!-- ── Loading ────────────────────────────────────────────── -->
      <div v-if="loading" class="state-card">
        <div class="skeleton" v-for="i in 5" :key="i" />
      </div>

      <!-- ── No schedule ────────────────────────────────────────── -->
      <div v-else-if="!activeSchedule" class="state-card state-card--empty">
        <AppIcon name="calendar-x" :size="28" class="empty-icon" />
        <p class="empty-title">No active schedule</p>
        <p class="empty-sub">Build a weekly schedule to use this view.</p>
        <NuxtLink :to="`/activities/${frameworkId}/pss/setup`" class="btn-primary">
          <AppIcon name="plus" :size="14" /> Build schedule
        </NuxtLink>
      </div>

      <template v-else>
        <!-- ── Day grid ───────────────────────────────────────────── -->
        <div class="day-grid">
          <button
            v-for="day in weekDays"
            :key="day.key"
            type="button"
            class="day-card"
            :class="{
              'day-card--today':   day.isToday,
              'day-card--done':    day.isDone,
              'day-card--off':     !day.isScheduled,
              'day-card--active':  selectedDay === day.key,
            }"
            @click="selectDay(day.key)"
          >
            <div class="day-card__head">
              <span class="day-card__name">{{ day.label }}</span>
              <span v-if="day.isToday" class="day-pill day-pill--today">Today</span>
              <span v-else-if="day.isDone" class="day-pill day-pill--done">
                <AppIcon name="check" :size="10" /> Done
              </span>
              <span v-else-if="!day.isScheduled" class="day-pill">Off</span>
            </div>
            <div class="day-card__meta" v-if="day.isScheduled">
              {{ day.blockCount }} session{{ day.blockCount !== 1 ? 's' : '' }}
            </div>
            <div class="day-card__dot-row">
              <span
                v-for="b in day.blocks"
                :key="`${b.timePeriod}|${b.ageGroup}`"
                class="dot"
                :class="dotClass(b)"
                :title="`${b.timePeriod} · Age ${b.ageGroup}`"
              />
            </div>
          </button>
        </div>

        <!-- ── Day detail panel ───────────────────────────────────── -->
        <Transition name="panel-slide">
          <div v-if="selectedDayData" class="detail-panel">

            <div class="detail-head">
              <div>
                <h2 class="detail-title">{{ selectedDayData.label }}</h2>
                <p class="detail-sub">
                  {{ selectedDayData.isToday ? 'Today · ' : '' }}
                  {{ selectedDayData.blockCount }} scheduled session{{ selectedDayData.blockCount !== 1 ? 's' : '' }}
                </p>
              </div>
              <NuxtLink
                v-if="selectedDayData.isToday"
                :to="`/activities/${frameworkId}/pss/today`"
                class="btn-primary"
              >
                <AppIcon name="play" :size="13" /> Go to Today
              </NuxtLink>
            </div>

            <!-- Sessions for selected day -->
            <div
              v-for="block in selectedDayData.blocks"
              :key="`${block.timePeriod}|${block.ageGroup}`"
              class="block-card"
              :class="{ 'block-card--done': block.session?.status === 'completed' }"
            >
              <div class="block-card__head">
                <div class="block-pills">
                  <span class="pill pill--period">
                    {{ block.timePeriod === 'morning' ? '☀ Morning' : '🌤 Afternoon' }}
                  </span>
                  <span class="pill pill--age">Age {{ block.ageGroup }}</span>
                </div>
                <span v-if="block.session?.status === 'completed'" class="pill pill--done">
                  <AppIcon name="check-circle" :size="11" /> Completed
                </span>
                <span v-else-if="block.session" class="pill pill--progress">In progress</span>
                <span v-else-if="selectedDayData.isFuture" class="pill pill--future">Upcoming</span>
              </div>

              <!-- Activity list -->
              <ul class="activity-list">
                <li
                  v-for="slot in block.slots"
                  :key="slot.activityId"
                  class="activity-row"
                  :class="{ 'activity-row--done': slotDone(slot, block) }"
                >
                  <span class="activity-dot" :class="slotDone(slot, block) ? 'activity-dot--done' : ''" />
                  <span class="activity-name">
                    {{ getActivityName(slot.activityId) }}
                  </span>
                  <span v-if="slotDone(slot, block)" class="activity-check">
                    <AppIcon name="check" :size="11" />
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </Transition>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '~/stores/auth';
import { useOfflineStatus } from '~/composables/useOfflineStatus';
import { schedulesRepository } from '~/services/pss/repositories/schedulesRepository';
import { activitiesRepository } from '~/services/pss/repositories';
import { sessionsRepository } from '~/services/pss/repositories/sessionsRepository';
import { sessionActivitiesRepository } from '~/services/pss/repositories/sessionActivitiesRepository';
import {
  usePssSchedulesApi,
  applyScheduleDto,
  dtoToScheduleRecord,
} from '~/services/pss/schedulesApi';
import { useServerTime } from '~/composables/useServerTime';
import type {
  PssDayOfWeek,
  PssScheduleRecord,
  PssSessionRecord,
  PssTemplateSlot,
  PssSessionActivityRecord,
} from '~/interfaces/pssDb';

definePageMeta({ layout: false, middleware: ['auth'] });

const route = useRoute();
const auth = useAuthStore();
const offline = useOfflineStatus();
const schedulesApi = usePssSchedulesApi();
const serverTime = useServerTime();
const { serverDateStr, clockWarning } = serverTime;
const frameworkId = route.params.id as string;
const cfsLocationId = computed(() => auth.cfsLocationId ?? '');
const cfsLocationName = computed(() => auth.cfsLocationName ?? '');

const loading = ref(true);
const activeSchedule = ref<PssScheduleRecord | null>(null);
const existingSessions = ref<PssSessionRecord[]>([]);
const sessionActivities = ref<PssSessionActivityRecord[]>([]);
const activityNames = ref<Map<string, string>>(new Map());
const selectedDay = ref<PssDayOfWeek | null>(null);

const breadcrumbs = computed(() => [
  { title: 'Projects', href: '/activities' },
  { title: 'Project', href: `/activities/${frameworkId}` },
  { title: 'PSS', href: `/activities/${frameworkId}/pss` },
  { title: 'Weekly Timetable', href: route.fullPath, current: true },
]);

// ── Day config ─────────────────────────────────────────────────────────

const ORDERED_DAYS: PssDayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS: Record<PssDayOfWeek, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
  thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};
const JS_DAY_TO_KEY: Record<number, PssDayOfWeek> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
};

const todayKey = computed<PssDayOfWeek>(() => serverTime.serverTodayKey() as PssDayOfWeek);

// Monday = 0 offset for ordering relative to today
const DAY_ORDER: Record<PssDayOfWeek, number> = {
  mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6,
};

function dayIsPast(day: PssDayOfWeek): boolean {
  return DAY_ORDER[day] < DAY_ORDER[todayKey.value];
}
function dayIsFuture(day: PssDayOfWeek): boolean {
  return DAY_ORDER[day] > DAY_ORDER[todayKey.value];
}

// ── Block helpers ───────────────────────────────────────────────────────

interface BlockView {
  timePeriod: 'morning' | 'afternoon';
  ageGroup: string;
  slots: PssTemplateSlot[];
  session: PssSessionRecord | null;
  sessionActivities: PssSessionActivityRecord[];
}

function blocksForDay(day: PssDayOfWeek): BlockView[] {
  if (!activeSchedule.value) return [];
  const slots = activeSchedule.value.templateSlots.filter((s) => s.day === day);
  const grouped = new Map<string, PssTemplateSlot[]>();
  for (const slot of slots) {
    const k = `${slot.timePeriod}|${slot.ageGroup}`;
    (grouped.get(k) ?? (grouped.set(k, []).get(k)!)).push(slot);
  }
  const schedKey = activeSchedule.value.serverId ?? activeSchedule.value.clientId;
  return Array.from(grouped.entries()).map(([k, slts]) => {
    const [tp, ag] = k.split('|') as ['morning' | 'afternoon', string];
    const session = existingSessions.value.find(
      (s) => s.scheduleId === schedKey && s.timePeriod === tp && s.ageGroup === ag,
    ) ?? null;
    const acts = session
      ? sessionActivities.value.filter((a) => a.sessionId === session.clientId)
      : [];
    return { timePeriod: tp, ageGroup: ag, slots: slts, session, sessionActivities: acts };
  }).sort((a, b) => (a.timePeriod === 'morning' ? -1 : 1) - (b.timePeriod === 'morning' ? -1 : 1));
}

// ── Week day computed ────────────────────────────────────────────────────

interface WeekDay {
  key: PssDayOfWeek;
  label: string;
  isScheduled: boolean;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  isDone: boolean;
  blockCount: number;
  blocks: BlockView[];
}

const weekDays = computed<WeekDay[]>(() =>
  ORDERED_DAYS.map((key) => {
    const blocks = blocksForDay(key);
    const isScheduled = blocks.length > 0;
    const isToday = key === todayKey.value;
    const isPast = dayIsPast(key);
    const isFuture = dayIsFuture(key);
    const isDone = isScheduled && isPast && blocks.every((b) => b.session?.status === 'completed');
    return { key, label: DAY_LABELS[key], isScheduled, isToday, isPast, isFuture, isDone, blockCount: blocks.length, blocks };
  }),
);

const selectedDayData = computed<WeekDay | null>(
  () => weekDays.value.find((d) => d.key === selectedDay.value) ?? null,
);

function selectDay(key: PssDayOfWeek) {
  selectedDay.value = selectedDay.value === key ? null : key;
}

function dotClass(b: BlockView): string {
  if (b.session?.status === 'completed') return 'dot--done';
  if (b.session) return 'dot--progress';
  return 'dot--pending';
}

function getActivityName(activityId: string): string {
  return activityNames.value.get(activityId) ?? 'Activity';
}

function slotDone(slot: PssTemplateSlot, block: BlockView): boolean {
  return block.sessionActivities.some(
    (a) => (a.activityId === slot.activityId) && a.status === 'completed',
  );
}

// ── Data loading ─────────────────────────────────────────────────────────

async function reconcile(): Promise<void> {
  if (!offline.isOnline.value || !cfsLocationId.value) return;
  try {
    const dtos = await schedulesApi.list({ cfsLocationId: cfsLocationId.value, status: 'active' });
    if (!dtos.length) return;
    const dto = await schedulesApi.get(dtos[0]!.id);
    const local = await schedulesRepository.getActive(cfsLocationId.value);
    const merged = local
      ? (() => { const r = applyScheduleDto(local, dto); r.syncStatus = 'synced'; r.syncError = undefined; return r; })()
      : dtoToScheduleRecord(dto);
    await schedulesRepository.upsert(merged);
    // Seed activity catalogue
    for (const slot of dto.slots ?? []) {
      if (!slot.id) continue;
      if (await activitiesRepository.getByClientId(slot.id)) continue;
      await activitiesRepository.upsert({
        clientId: slot.id, serverId: slot.id,
        clientTimestamp: slot.created_at || new Date().toISOString(),
        syncStatus: 'synced', syncError: undefined,
        name: slot.activity_name || 'Untitled',
        description: slot.activity_aim || '', category: 'wellbeing',
        ageGroup: (slot.age_group === 'parents' ? '6-10' : slot.age_group) as any,
        source: 'custom', steps: slot.activity_steps ? [slot.activity_steps] : [],
        materials: slot.materials || '', conclusion: '', attentionNote: '',
        cfsId: null, createdBy: null,
      });
    }
  } catch { /* offline fallback */ }
}

onMounted(async () => {
  try {
    if (!cfsLocationId.value) return;
    await serverTime.init();
    await reconcile();
    activeSchedule.value = (await schedulesRepository.getActive(cfsLocationId.value)) ?? null;
    if (!activeSchedule.value) return;

    const schedKey = activeSchedule.value.serverId ?? activeSchedule.value.clientId;

    // Load all sessions for this schedule (all dates in the current week)
    const weekDates = getWeekDates();
    const allSessions: PssSessionRecord[] = [];
    for (const date of weekDates) {
      const s = await sessionsRepository.listByScheduleAndDate(schedKey, date);
      allSessions.push(...s);
    }
    existingSessions.value = allSessions;

    // Load session activities for all sessions
    const allActs: PssSessionActivityRecord[] = [];
    for (const session of allSessions) {
      const acts = await sessionActivitiesRepository.listBySession(session.clientId);
      allActs.push(...acts);
    }
    sessionActivities.value = allActs;

    // Build activity name map from local catalogue
    const nameMap = new Map<string, string>();
    for (const slot of activeSchedule.value.templateSlots) {
      if (nameMap.has(slot.activityId)) continue;
      const act = await activitiesRepository.getByClientId(slot.activityId);
      if (act) nameMap.set(slot.activityId, act.name);
    }
    activityNames.value = nameMap;

    // Auto-select today if it's scheduled
    const todayData = weekDays.value.find((d) => d.key === todayKey.value && d.isScheduled);
    if (todayData) selectedDay.value = todayData.key;

  } finally {
    loading.value = false;
  }
});

function getWeekDates(): string[] {
  const now = serverTime.serverNow();
  const monday = new Date(now);
  const jsDay = now.getDay();
  const diff = jsDay === 0 ? -6 : 1 - jsDay;
  monday.setDate(now.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
}
</script>

<style scoped>
.week-page {
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Header ── */
.page-header { margin-bottom: 4px; }
.header-row {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 16px;
}
.page-title {
  font-size: 1.35rem; font-weight: 750;
  color: var(--text-primary); margin: 0 0 2px;
  letter-spacing: -0.02em;
}
.page-subtitle { font-size: 0.8rem; color: var(--text-muted); margin: 0; }
.clock-warning {
  display: inline-flex; align-items: center; gap: 5px;
  margin: 4px 0 0; font-size: 0.74rem; font-weight: 500;
  color: #d97706; background: rgba(217,119,6,0.10);
  border: 1px solid rgba(217,119,6,0.25); border-radius: 6px; padding: 3px 8px;
}
.btn-back {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; background: var(--bg-input);
  color: var(--text-secondary); border: 1px solid var(--border-color);
  border-radius: 8px; font-size: 0.82rem; font-weight: 500;
  text-decoration: none; white-space: nowrap; min-height: 36px;
  transition: border-color 0.15s, color 0.15s;
}
.btn-back:hover { border-color: var(--text-muted); color: var(--text-primary); }
.btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 16px; background: var(--primary); color: #fff;
  border: none; border-radius: 8px; font-size: 0.84rem;
  font-weight: 600; text-decoration: none; cursor: pointer;
  font-family: inherit; transition: opacity 0.15s;
}
.btn-primary:hover { opacity: 0.88; }

/* ── States ── */
.state-card {
  background: var(--bg-panel); border: 1px solid var(--border-color);
  border-radius: 12px; padding: 32px 20px;
  display: flex; flex-direction: column; gap: 12px;
}
.state-card--empty { align-items: center; text-align: center; }
.empty-icon { color: var(--text-muted); margin-bottom: 4px; }
.empty-title { font-size: 0.96rem; font-weight: 600; color: var(--text-primary); margin: 0; }
.empty-sub { font-size: 0.82rem; color: var(--text-muted); margin: 0 0 8px; }
.skeleton {
  height: 72px; border-radius: 10px; background: var(--bg-card);
  animation: pulse 1.6s ease-in-out infinite;
}
@keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.28; } }

/* ── Day grid ── */
.day-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.day-card {
  display: flex; flex-direction: column; gap: 6px;
  padding: 10px 8px 10px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  cursor: pointer; text-align: left;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s, transform 0.1s;
  min-height: 80px;
}
.day-card:hover { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 4%, var(--bg-panel)); }
.day-card:active { transform: scale(0.97); }

.day-card--today { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 6%, var(--bg-panel)); }
.day-card--done  { border-color: var(--success, #22c55e); background: color-mix(in srgb, #22c55e 5%, var(--bg-panel)); }
.day-card--off   { opacity: 0.45; pointer-events: none; }
.day-card--active { border-color: var(--primary) !important; box-shadow: 0 0 0 3px var(--focus-ring); }

.day-card__head {
  display: flex; align-items: center; justify-content: space-between; gap: 4px; flex-wrap: wrap;
}
.day-card__name { font-size: 0.72rem; font-weight: 700; color: var(--text-primary); letter-spacing: 0.01em; }
.day-card__meta { font-size: 0.65rem; color: var(--text-muted); }

.day-pill {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 0.55rem; font-weight: 700; letter-spacing: 0.04em;
  text-transform: uppercase; padding: 2px 5px; border-radius: 999px;
  background: var(--bg-input); color: var(--text-muted);
}
.day-pill--today { background: var(--primary-dim); color: var(--primary); }
.day-pill--done  { background: color-mix(in srgb, #22c55e 18%, transparent); color: #16a34a; }

.day-card__dot-row { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 2px; }
.dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--border-color);
}
.dot--done     { background: #22c55e; }
.dot--progress { background: var(--primary); }
.dot--pending  { background: var(--border-color); }

/* ── Detail panel ── */
.detail-panel {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.detail-head {
  display: flex; align-items: center;
  justify-content: space-between; gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border-color);
}
.detail-title {
  margin: 0; font-size: 1.05rem; font-weight: 700;
  color: var(--text-primary); letter-spacing: -0.01em;
}
.detail-sub { margin: 2px 0 0; font-size: 0.78rem; color: var(--text-muted); }

/* ── Block card ── */
.block-card {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-color);
}
.block-card:last-child { border-bottom: none; }
.block-card--done { background: color-mix(in srgb, #22c55e 3%, var(--bg-panel)); }

.block-card__head {
  display: flex; align-items: center;
  justify-content: space-between; gap: 8px;
  margin-bottom: 10px; flex-wrap: wrap;
}
.block-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.pill {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 0.68rem; font-weight: 650; letter-spacing: 0.04em;
  text-transform: uppercase; padding: 3px 8px; border-radius: 999px;
}
.pill--period  { background: var(--primary-dim); color: var(--primary); }
.pill--age     { background: var(--bg-input); color: var(--text-secondary); border: 1px solid var(--border-color); }
.pill--done    { background: color-mix(in srgb, #22c55e 18%, transparent); color: #16a34a; }
.pill--progress { background: color-mix(in srgb, var(--primary) 15%, transparent); color: var(--primary); }
.pill--future  { background: var(--bg-input); color: var(--text-muted); border: 1px solid var(--border-color); }

/* ── Activity list ── */
.activity-list {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 6px;
}
.activity-row {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; border-radius: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  font-size: 0.84rem; color: var(--text-secondary);
  transition: background 0.12s;
}
.activity-row--done {
  background: color-mix(in srgb, #22c55e 6%, var(--bg-input));
  border-color: color-mix(in srgb, #22c55e 25%, var(--border-color));
  color: var(--text-primary);
}
.activity-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  background: var(--border-color);
}
.activity-dot--done { background: #22c55e; }
.activity-name { flex: 1; }
.activity-check { color: #22c55e; display: flex; align-items: center; }

/* ── Transition ── */
.panel-slide-enter-active { transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.panel-slide-leave-active { transition: all 0.18s ease-in; }
.panel-slide-enter-from { opacity: 0; transform: translateY(10px); }
.panel-slide-leave-to  { opacity: 0; transform: translateY(6px); }

/* ── Responsive ── */
@media (max-width: 640px) {
  .day-grid { grid-template-columns: repeat(4, 1fr); }
  .header-row { flex-direction: column; gap: 10px; }
  .btn-text { display: none; }
}
@media (max-width: 400px) {
  .day-grid { grid-template-columns: repeat(3, 1fr); }
}
</style>
