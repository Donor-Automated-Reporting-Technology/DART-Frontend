<!--
  PSS End-of-Day Smiley Evaluation.

  UNICEF M&E "Smiley Evaluation (Facilitator)" — once a day, after all
  activities for the day are completed, the facilitator records how
  many children placed a stone next to each of the 5 face cards.

  Submission upserts a `pss_day_smiley` row keyed by
  `${scheduleId}:${date}` and enqueues a POST against
  /api/v1/pss/days/:dayId/smiley. The day enters its final locked state
  on success — the existence of the local row is the single source of
  truth, so offline queue + replay leave the UI consistent.

  Routing: this screen blocks back-navigation; it can only be left by
  submitting (or via an explicit "leave" affordance, not provided here
  because the AC says "cannot skip").
-->
<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="eval-page">
      <header class="page-header">
        <div>
          <h1 class="page-title">End-of-day evaluation</h1>
          <p class="page-subtitle">
            {{ humanDate }} · UNICEF 5-face smiley scale
          </p>
        </div>
      </header>

      <p v-if="loading" class="state">Loading day…</p>

      <template v-else-if="alreadyLocked">
        <div class="state state--done">
          <strong>Day already locked.</strong>
          Evaluation was submitted
          {{ alreadyLocked.lockedAt ? '· ' + new Date(alreadyLocked.lockedAt).toLocaleString() : '' }}.
        </div>
        <button
          type="button"
          class="btn-primary"
          @click="goBackToToday"
        >
          Back to today
        </button>
      </template>

      <template v-else-if="!dayContext">
        <div class="state state--error">
          Could not resolve this day. Try again from Today's sessions.
        </div>
      </template>

      <template v-else-if="!allSessionsComplete">
        <div class="state state--error">
          Not all of today's activities are completed yet — finish them
          before recording the evaluation.
        </div>
        <button type="button" class="btn-primary" @click="goBackToToday">
          Back to today
        </button>
      </template>

      <template v-else>
        <p class="lede">
          Children placed a stone next to the face that matched how they
          felt today. Enter the count for each face.
        </p>

        <PssSmileyCounter
          v-model="counts"
          :disabled="saving"
          @update:total="onCountsTotal"
        />

        <section class="blank-row" aria-labelledby="blank-row-label">
          <span id="blank-row-label" class="blank-row__label">
            Blank (no stone placed)
          </span>
          <div class="blank-row__stepper" role="group">
            <button
              type="button"
              class="blank-row__btn"
              :disabled="saving || blank === 0"
              aria-label="Decrease blank count"
              @click="blank = Math.max(0, blank - 1)"
            >−</button>
            <input
              class="blank-row__input"
              type="number"
              inputmode="numeric"
              min="0"
              :value="blank" placeholder="0"
              :disabled="saving"
              aria-label="Blank count"
              @input="onBlankInput($event)"
            />
            <button
              type="button"
              class="blank-row__btn"
              :disabled="saving"
              aria-label="Increase blank count"
              @click="blank = blank + 1"
            >+</button>
          </div>
        </section>

        <section
          v-if="attendanceTotal > 0 && attendanceMismatch"
          class="warning"
          role="status"
        >
          <strong>Heads up:</strong> total entered ({{ enteredTotal }})
          differs from attendance ({{ attendanceTotal }}) by more than
          10%. Double-check before saving — you can still continue.
        </section>

        <div class="action-row">
          <button
            type="button"
            class="btn-primary"
            :disabled="saving || enteredTotal === 0"
            @click="onSave"
          >
            <span v-if="saving" class="spinner" />
            {{ saving ? 'Saving…' : 'Save & lock day' }}
          </button>
        </div>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import PssSmileyCounter, {
  type PssSmileyCounts,
} from '~/components/pss/PssSmileyCounter.vue';
import { useAuthStore } from '~/stores/auth';
import { useToast } from '~/composables/useToast';
import { useOfflineStatus } from '~/composables/useOfflineStatus';
import {
  daySmileyRepository,
  buildDayId,
} from '~/services/pss/repositories/daySmileyRepository';
import { usePssDaysApi } from '~/services/pss/daysApi';
import { sessionsRepository } from '~/services/pss/repositories/sessionsRepository';
import { sessionActivitiesRepository } from '~/services/pss/repositories/sessionActivitiesRepository';
import { sessionAttendanceRepository } from '~/services/pss/repositories/sessionAttendanceRepository';
import { syncQueueRepository } from '~/services/pss/repositories/syncQueueRepository';
import type {
  PssDaySmileyRecord,
  PssSessionRecord,
  PssSyncQueueItem,
} from '~/interfaces/pssDb';

definePageMeta({ layout: false, middleware: ['auth'] });

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();
const offline = useOfflineStatus();
const daysApi = usePssDaysApi();

const frameworkId = route.params.id as string;
const rawDayId = decodeURIComponent(route.params.dayId as string);

interface DayContext {
  scheduleId: string;
  date: string;
}

const dayContext = computed<DayContext | null>(() => {
  const idx = rawDayId.lastIndexOf(':');
  if (idx <= 0) return null;
  const scheduleId = rawDayId.slice(0, idx);
  const date = rawDayId.slice(idx + 1);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { scheduleId, date };
});

const breadcrumbs = computed(() => [
  { title: 'Projects', href: '/activities' },
  { title: 'PSS', href: `/activities/${frameworkId}/pss` },
  {
    title: "Today's Sessions",
    href: `/activities/${frameworkId}/pss/today`,
  },
  { title: 'Evaluation', href: route.fullPath, current: true },
]);

const humanDate = computed(() => {
  if (!dayContext.value) return '';
  const d = new Date(`${dayContext.value.date}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
});

const loading = ref(true);
const saving = ref(false);
const alreadyLocked = ref<PssDaySmileyRecord | null>(null);
const sessionsForDay = ref<PssSessionRecord[]>([]);
const attendanceTotal = ref(0);

const counts = ref<PssSmileyCounts>({
  veryHappy: 0,
  happy: 0,
  ok: 0,
  unhappy: 0,
  veryUnhappy: 0,
});
const blank = ref(0);
const facesTotal = ref(0);

function onCountsTotal(total: number): void {
  facesTotal.value = total;
}

function onBlankInput(event: Event): void {
  const target = event.target as HTMLInputElement | null;
  if (!target) return;
  const raw = target.value.trim();
  const n = raw === '' ? 0 : Number(raw);
  blank.value = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

const enteredTotal = computed(() => facesTotal.value + blank.value);

const allSessionsComplete = computed(
  () =>
    sessionsForDay.value.length > 0 &&
    sessionsForDay.value.every((s) => s.status === 'completed'),
);

const attendanceMismatch = computed(() => {
  if (attendanceTotal.value === 0) return false;
  const diff = Math.abs(enteredTotal.value - attendanceTotal.value);
  return diff / attendanceTotal.value > 0.1;
});

function dtoToLocalDaySmiley(
  dayId: string,
  dto: {
    id: string;
    schedule_id: string;
    date: string;
    very_happy: number;
    happy: number;
    ok: number;
    unhappy: number;
    very_unhappy: number;
    blank: number;
    total_children: number;
    facilitator_id: string;
    locked_at: string;
    client_timestamp?: string | null;
  },
): PssDaySmileyRecord {
  return {
    id: dto.id,
    clientId: dayId,
    serverId: dto.id,
    clientTimestamp: dto.client_timestamp ?? new Date().toISOString(),
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
  };
}

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    if (!dayContext.value) return;
    const { scheduleId, date } = dayContext.value;
    const dayId = buildDayId(scheduleId, date);

    if (offline.isOnline.value) {
      try {
        const dto = await daysApi.getSmiley(dayId);
        if (dto) {
          await daySmileyRepository.upsert(dtoToLocalDaySmiley(dayId, dto));
        }
      } catch {
        // Best-effort hydration; fall back to local.
      }
    }

    const existing = await daySmileyRepository.getByDay(scheduleId, date);
    if (existing) {
      alreadyLocked.value = existing;
      return;
    }

    const all = await sessionsRepository.listByDate(date);
    sessionsForDay.value = all.filter((s) => s.scheduleId === scheduleId);

    let presentSum = 0;
    for (const session of sessionsForDay.value) {
      const att = await sessionAttendanceRepository.listBySession(
        session.clientId,
      );
      presentSum += att.filter((a) => a.status === 'present').length;
    }
    attendanceTotal.value = presentSum;
  } finally {
    loading.value = false;
  }
}

async function onSave(): Promise<void> {
  if (!dayContext.value) return;
  saving.value = true;
  try {
    const { scheduleId, date } = dayContext.value;
    const dayId = buildDayId(scheduleId, date);
    const now = new Date().toISOString();
    const facilitatorId = auth.userId ?? '';

    const record: PssDaySmileyRecord = {
      id: dayId,
      clientId: dayId,
      serverId: null,
      clientTimestamp: now,
      syncStatus: 'pending',
      scheduleId,
      date,
      veryHappy: counts.value.veryHappy,
      happy: counts.value.happy,
      ok: counts.value.ok,
      unhappy: counts.value.unhappy,
      veryUnhappy: counts.value.veryUnhappy,
      blank: blank.value,
      totalChildren: enteredTotal.value,
      facilitatorId,
      lockedAt: now,
    };

    const requestBody = {
      schedule_id: scheduleId,
      date,
      very_happy: record.veryHappy,
      happy: record.happy,
      ok: record.ok,
      unhappy: record.unhappy,
      very_unhappy: record.veryUnhappy,
      blank: record.blank,
      total_children: record.totalChildren,
      facilitator_id: facilitatorId,
      client_uuid: dayId,
      client_timestamp: now,
    };

    const queueItem: PssSyncQueueItem = {
      id: crypto.randomUUID(),
      resource: 'pss_day_smiley',
      operation: 'create',
      recordClientId: dayId,
      payload: {
        dayId,
        body: requestBody,
      },
      status: 'pending',
      attempts: 0,
      nextAttemptAt: now,
      idempotencyKey: dayId,
      createdAt: now,
      updatedAt: now,
    };

    if (offline.isOnline.value) {
      try {
        const dto = await daysApi.submitSmiley(dayId, requestBody, {
          idempotencyKey: dayId,
        });
        await daySmileyRepository.upsert(dtoToLocalDaySmiley(dayId, dto));
        toast.success('Day evaluation saved.', {
          detail: 'Day is now locked.',
        });
        void router.replace(`/activities/${frameworkId}/pss/today`);
        return;
      } catch (err) {
        const e = err as { status?: number } | null;
        const status = e?.status ?? 0;
        const retryable = status === 0 || status >= 500;
        if (!retryable) throw err;
      }
    }

    await daySmileyRepository.upsert(record);
    await syncQueueRepository.enqueue(queueItem);
    toast.success('Day evaluation saved locally.', {
      detail: 'Will sync automatically when connection is stable.',
    });
    void router.replace(`/activities/${frameworkId}/pss/today`);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not save evaluation.';
    toast.error('Save failed', { detail: message });
  } finally {
    saving.value = false;
  }
}

function goBackToToday(): void {
  void router.replace(`/activities/${frameworkId}/pss/today`);
}

// Block back navigation while the user has unsaved counts and the day
// is still unlocked. Submission uses `router.replace` so the history
// entry for this screen is dropped.
function beforeUnloadGuard(e: BeforeUnloadEvent): void {
  if (alreadyLocked.value || saving.value) return;
  if (enteredTotal.value === 0) return;
  e.preventDefault();
  e.returnValue = '';
}

onMounted(() => {
  void loadData();
  window.addEventListener('beforeunload', beforeUnloadGuard);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnloadGuard);
});
</script>

<style scoped>
.eval-page {
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-header { margin-bottom: 4px; }
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

.lede {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
}

.state {
  padding: 24px 16px;
  border-radius: 10px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  text-align: center;
  font-size: 0.9rem;
}
.state--error { color: var(--error); background: var(--error-bg); }
.state--done { color: var(--success, #16a34a); }

.blank-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  gap: 12px;
}
.blank-row__label { font-weight: 500; color: var(--text-primary); }
.blank-row__stepper { display: inline-flex; gap: 4px; align-items: center; }
.blank-row__btn {
  width: 40px; height: 40px;
  background: var(--bg-input);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
  font-weight: 600;
}
.blank-row__btn:disabled { opacity: 0.4; cursor: not-allowed; }
.blank-row__input {
  width: 64px; height: 40px;
  text-align: center;
  font-size: 16px; font-weight: 600;
  background: var(--bg-input);
  color: var(--text-primary);
  border: 1px solid var(--input-border-hover);
  border-radius: 8px;
  font-variant-numeric: tabular-nums;
}

.warning {
  padding: 12px 14px;
  border-radius: 10px;
  background: #fef3c7;
  color: #78350f;
  font-size: 0.88rem;
  border: 1px solid #fbbf24;
}

.action-row { display: flex; gap: 10px; justify-content: flex-end; }
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
