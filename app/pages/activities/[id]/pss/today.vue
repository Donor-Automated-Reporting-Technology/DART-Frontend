<!--
  Today's PSS Sessions — DART-51.

  Lists every (time period × age group) combination scheduled for today
  on the facilitator's active CFS schedule, and exposes an
  "Enter Session" CTA per slot. Tapping the CTA:
    1. Calls `usePssSessionStart()` which builds the session +
       slot rows offline-first and queues a `pss_sessions` create.
    2. Routes the facilitator to the session checklist (DART-45 page),
       carrying the local clientId so the checklist works pre-sync.

  In-progress detection: when a session for that slot already exists
  locally, the CTA reads "Resume Session" and the existing session is
  re-opened — never duplicated. Server enforces UNIQUE
  (cfs_location_id, session_date, time_period, age_group) too.

  Sourced AC: DART/PSS_MODULE_PRD.md §7, DART/PSS_SCHEDULE_TRD.md §6.1
              (PSS-015 "Enter Session" CTA + duplicate prevention).
-->
<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="today-page">
      <header class="today-hero">
        <div class="today-hero__icon">
          <AppIcon name="check-square" :size="22" />
        </div>
        <div>
          <h1 class="today-hero__title">Today's Sessions</h1>
          <p class="today-hero__sub">
            {{ humanDate }} · {{ cfsLocationName ?? 'No CFS location' }}
          </p>
        </div>
      </header>

      <!-- Loading -->
      <div v-if="loading" class="today-state today-state--loading">
        <div class="pulse-dot" /><div class="pulse-dot" /><div class="pulse-dot" />
      </div>

      <!-- No active schedule -->
      <div v-else-if="!schedule" class="today-state today-state--empty">
        <AppIcon name="calendar-x" :size="22" />
        <h2>No active schedule</h2>
        <p>Set up and activate a weekly schedule to start running sessions.</p>
        <NuxtLink class="today-cta-link" :to="`/activities/${frameworkId}/pss/setup`">
          <AppIcon name="plus" :size="14" />
          Create schedule
        </NuxtLink>
      </div>

      <!-- No slots scheduled today -->
      <div
        v-else-if="todaysGroups.length === 0"
        class="today-state today-state--empty"
      >
        <AppIcon name="coffee" :size="22" />
        <h2>Nothing scheduled today</h2>
        <p>Your active schedule has no activities for {{ humanDate }}.</p>
      </div>

      <!-- Period × age group grid -->
      <div v-else class="today-grid">
        <article
          v-for="group in todaysGroups"
          :key="`${group.timePeriod}-${group.ageGroup}`"
          class="today-card"
          :data-status="group.existing ? 'in-progress' : 'pending'"
        >
          <header class="today-card__head">
            <div class="today-card__chips">
              <span class="chip chip--period">{{ periodLabel(group.timePeriod) }}</span>
              <span class="chip chip--age">Age {{ group.ageGroup }}</span>
            </div>
            <span
              v-if="group.existing"
              class="chip chip--status"
              aria-label="Session in progress"
            >
              <AppIcon name="play-circle" :size="12" />
              In progress
            </span>
          </header>

          <ul class="today-card__list">
            <li
              v-for="slot in group.slots"
              :key="`${slot.day}-${slot.timePeriod}-${slot.order}`"
              class="today-card__slot"
            >
              <span class="today-card__slot-order">{{ slot.order }}</span>
              <span class="today-card__slot-name">
                {{ activityName(slot.activityId) || 'Untitled activity' }}
              </span>
            </li>
          </ul>

          <button
            type="button"
            class="today-card__cta"
            :disabled="starting === groupKey(group)"
            @click="onEnter(group)"
          >
            <AppIcon
              :name="group.existing ? 'play' : 'arrow-right-circle'"
              :size="16"
            />
            {{ group.existing ? 'Resume session' : 'Enter session' }}
          </button>
        </article>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { schedulesRepository } from '~/services/pss/repositories/schedulesRepository';
import { sessionsRepository } from '~/services/pss/repositories/sessionsRepository';
import { activitiesRepository } from '~/services/pss/repositories/activitiesRepository';
import { useAuthStore } from '~/stores/auth';
import { useCfsLocation } from '~/composables/useCfsLocation';
import { useToast } from '~/composables/useToast';
import {
  slotsForPeriod,
  usePssSessionStart,
} from '~/composables/usePssSessionStart';
import type {
  PssActivityRecord,
  PssScheduleAgeGroup,
  PssScheduleRecord,
  PssSessionRecord,
  PssTemplateSlot,
  PssTimePeriodLabel,
} from '~/interfaces/pssDb';

definePageMeta({ layout: false, middleware: ['auth'] });

interface TodayGroup {
  timePeriod: PssTimePeriodLabel;
  ageGroup: PssScheduleAgeGroup;
  slots: PssTemplateSlot[];
  existing?: PssSessionRecord;
}

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();
const { cfsLocationId, cfsLocationName, fetchAndHydrate } = useCfsLocation();
const { start } = usePssSessionStart();

const frameworkId = route.params.id as string;

const loading = ref(true);
const starting = ref<string | null>(null);
const schedule = ref<PssScheduleRecord | null>(null);
const todaysGroups = ref<TodayGroup[]>([]);
const activitiesById = ref<Map<string, PssActivityRecord>>(new Map());

const today = new Date();
const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const humanDate = today.toLocaleDateString(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'short',
});

const breadcrumbs = computed(() => [
  { title: 'Projects', href: '/activities' },
  { title: 'Project', href: `/activities/${frameworkId}` },
  { title: 'PSS', href: `/activities/${frameworkId}/pss` },
  { title: "Today's Sessions", href: `/activities/${frameworkId}/pss/today`, current: true },
]);

function periodLabel(p: PssTimePeriodLabel): string {
  return p === 'morning' ? 'Morning' : 'Afternoon';
}

function groupKey(g: TodayGroup): string {
  return `${g.timePeriod}-${g.ageGroup}`;
}

function activityName(activityId: string): string {
  return activitiesById.value.get(activityId)?.name ?? '';
}

async function loadAll(): Promise<void> {
  loading.value = true;
  try {
    await fetchAndHydrate();
    if (!cfsLocationId.value) {
      schedule.value = null;
      todaysGroups.value = [];
      return;
    }

    const active = await schedulesRepository.getActive(cfsLocationId.value);
    schedule.value = active ?? null;
    if (!active) {
      todaysGroups.value = [];
      return;
    }

    // Pre-load activity name cache (avoids per-row IndexedDB reads in the
    // template). One toArray() since the catalogue is small (~70 rows).
    const allActivities = await activitiesRepository.list();
    const map = new Map<string, PssActivityRecord>();
    for (const a of allActivities) {
      map.set(a.clientId, a);
      if (a.serverId) map.set(a.serverId, a);
    }
    activitiesById.value = map;

    // Look up sessions already in progress on the active schedule today.
    const todaysSessions = await sessionsRepository.listByScheduleAndDate(
      active.clientId,
      todayIso,
    );

    // Distinct (timePeriod, ageGroup) groups from today's slots.
    const groups: TodayGroup[] = [];
    for (const period of active.timePeriods) {
      for (const age of active.ageGroups) {
        const slots = slotsForPeriod(active, todayIso, period.label, age);
        if (slots.length === 0) continue;
        const existing = todaysSessions.find(
          (s) =>
            s.timePeriod === period.label &&
            s.ageGroup === age &&
            s.status === 'in-progress',
        );
        groups.push({ timePeriod: period.label, ageGroup: age, slots, existing });
      }
    }
    todaysGroups.value = groups;
  } finally {
    loading.value = false;
  }
}

async function onEnter(group: TodayGroup): Promise<void> {
  if (starting.value) return;

  // Resume path — never re-create.
  if (group.existing) {
    await router.push(
      `/activities/${frameworkId}/pss/session/${group.existing.clientId}`,
    );
    return;
  }
  if (!schedule.value) return;
  if (!auth.userId) {
    toast.error('Your session has expired — please log in again.');
    return;
  }

  starting.value = groupKey(group);
  try {
    const result = await start({
      schedule: schedule.value,
      date: todayIso,
      timePeriod: group.timePeriod,
      ageGroup: group.ageGroup,
      facilitatorId: auth.userId,
    });

    if (!result.ok) {
      // Duplicate — open the existing one.
      if (result.existing) {
        await router.push(
          `/activities/${frameworkId}/pss/session/${result.existing.clientId}`,
        );
        return;
      }
      const first = result.issues[0];
      toast.error(first?.message ?? 'Could not start the session.');
      return;
    }

    toast.success(
      result.slots.length === 1
        ? '1 activity loaded — let’s go.'
        : `${result.slots.length} activities loaded — let’s go.`,
    );
    await router.push(
      `/activities/${frameworkId}/pss/session/${result.session.clientId}`,
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unexpected error starting session.';
    toast.error(message);
  } finally {
    starting.value = null;
  }
}

onMounted(loadAll);
</script>

<style scoped>
.today-page {
  max-width: 720px;
  padding-bottom: 48px;
}

.today-hero {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
}
.today-hero__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--accent-soft, rgba(129, 140, 248, 0.15));
  color: var(--accent, #818cf8);
}
.today-hero__title {
  font-size: 1.4rem;
  font-weight: 600;
  margin: 0;
}
.today-hero__sub {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 2px 0 0;
}

.today-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 56px 16px;
  color: var(--text-muted);
}
.today-state h2 {
  font-size: 1.05rem;
  margin: 6px 0 0;
  color: var(--text);
}
.today-state p {
  margin: 0;
  font-size: 0.85rem;
  max-width: 320px;
}
.today-cta-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--accent, #818cf8);
  color: #fff;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
}
.today-state--loading {
  flex-direction: row;
  gap: 6px;
}
.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent, #818cf8);
  animation: pulse 1.2s ease-in-out infinite;
}
.pulse-dot:nth-child(2) { animation-delay: 0.2s; }
.pulse-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes pulse {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50%      { opacity: 1;   transform: scale(1); }
}

.today-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: 1fr;
}

.today-card {
  background: var(--surface, #1a1a2e);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.today-card[data-status='in-progress'] {
  border-color: var(--accent, #818cf8);
}

.today-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.today-card__chips {
  display: flex;
  gap: 6px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
}
.chip--period {
  background: rgba(129, 140, 248, 0.12);
  color: var(--accent, #818cf8);
}
.chip--age {
  background: rgba(34, 197, 94, 0.12);
  color: #4ade80;
}
.chip--status {
  background: rgba(250, 204, 21, 0.12);
  color: #fde047;
}

.today-card__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.today-card__slot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  font-size: 0.85rem;
}
.today-card__slot-order {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent-soft, rgba(129, 140, 248, 0.18));
  color: var(--accent, #818cf8);
  display: grid;
  place-items: center;
  font-size: 0.72rem;
  font-weight: 600;
}
.today-card__slot-name {
  flex: 1;
  color: var(--text);
}

.today-card__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--accent, #818cf8);
  color: #fff;
  border: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 120ms ease;
}
.today-card__cta:disabled {
  opacity: 0.6;
  cursor: progress;
}
.today-card[data-status='in-progress'] .today-card__cta {
  background: #fde047;
  color: #1f1300;
}
</style>
