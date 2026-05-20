<!--
  PSS Session Checklist — DART-45.

  Renders the scheduled activities for one in-progress PSS session as
  an ordered checklist. Tap a row → expand to show the activity's aim
  (description), step-by-step facilitator instructions, materials
  needed, conclusion, and any attention notes. A sticky progress bar at
  the top updates per completion (slot.status === 'completed').

  Slots can be completed in any order (per AC). Once the parent
  session is `status === 'completed'` (DART-37), the whole UI locks
  and no further toggles are accepted.

  Boundary with DART-44 / DART-37:
    • The "Mark complete" button here does the minimal repository
      update needed for the progress bar to advance. DART-44 will
      replace the call site with the full notes + child-flag sheet
      (the underlying repository update stays the same).
    • The "Complete session" button at the bottom is a stub that
      defers to DART-37 (currently routes back to /today). DART-37
      adds the overall-remarks prompt and the lock transition.

  Sourced AC: DART-35 story (todo-list with notes per activity + child
  flag), DART/PSS_MODULE_PRD.md §7, DART/PSS_SCHEDULE_TRD.md §6.1
  (PSS-016 expand, PSS-017 progress bar).
-->
<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="run-page">
      <!-- Loading -->
      <div v-if="loading" class="run-state run-state--loading">
        <div class="pulse-dot" /><div class="pulse-dot" /><div class="pulse-dot" />
      </div>

      <!-- Not found -->
      <div v-else-if="notFound" class="run-state run-state--empty">
        <AppIcon name="alert-triangle" :size="22" />
        <h2>Session not found</h2>
        <p>This session is not on your device. It may belong to another facilitator.</p>
        <NuxtLink class="run-cta-link" :to="`/activities/${frameworkId}/pss/today`">
          <AppIcon name="arrow-left" :size="14" />
          Back to Today's Sessions
        </NuxtLink>
      </div>

      <template v-else-if="session">
        <!-- Header: session meta -->
        <header class="run-hero">
          <div class="run-hero__icon">
            <AppIcon name="play-circle" :size="22" />
          </div>
          <div class="run-hero__meta">
            <h1 class="run-hero__title">Session in progress</h1>
            <p class="run-hero__sub">
              {{ humanDate(session.date) }} ·
              {{ periodLabel(session.timePeriod) }} ·
              Age {{ session.ageGroup }}
            </p>
          </div>
        </header>

        <!-- Attendance summary + CTA -->
        <section class="run-attendance" aria-label="Session attendance">
          <div class="run-attendance__main">
            <div class="run-attendance__head">
              <span class="run-attendance__label">Attendance</span>
              <span
                v-if="!attendance.hasMarkedAny.value"
                class="run-attendance__badge run-attendance__badge--required"
              >Required</span>
              <span
                v-else
                class="run-attendance__badge run-attendance__badge--ok"
              >Marked</span>
            </div>
            <p class="run-attendance__counts">
              <span class="count count--present">
                {{ attendance.presentCount.value }} present
              </span>
              <span class="count count--absent">
                {{ attendance.absentCount.value }} absent
              </span>
              <span class="count count--total">
                of {{ attendance.totalCount.value }} children
              </span>
            </p>
          </div>
          <button
            type="button"
            class="run-attendance__cta"
            :disabled="isLocked"
            @click="openAttendance"
          >
            {{
              attendance.hasMarkedAny.value
                ? 'Edit attendance'
                : 'Mark attendance'
            }}
          </button>
        </section>

        <!-- Sticky progress bar -->
        <section class="run-progress" aria-label="Session progress">
          <div class="run-progress__head">
            <span class="run-progress__count">
              {{ completedCount }} / {{ totalCount }} done
            </span>
            <span class="run-progress__pct">{{ Math.round(progress * 100) }}%</span>
          </div>
          <div
            class="run-progress__track"
            role="progressbar"
            :aria-valuenow="Math.round(progress * 100)"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div
              class="run-progress__fill"
              :style="{ width: `${Math.round(progress * 100)}%` }"
            />
          </div>
        </section>

        <!-- Checklist -->
        <ul class="run-list">
          <li
            v-for="row in rows"
            :key="row.slot.clientId"
            class="run-row"
            :data-status="row.slot.status"
            :data-expanded="expandedId === row.slot.clientId"
          >
            <button
              type="button"
              class="run-row__head"
              :aria-expanded="expandedId === row.slot.clientId"
              :aria-controls="`run-detail-${row.slot.clientId}`"
              @click="toggleExpand(row.slot.clientId)"
            >
              <span
                class="run-row__check"
                :data-checked="row.slot.status === 'completed'"
                :aria-label="row.slot.status === 'completed' ? 'Completed' : 'Pending'"
              >
                <AppIcon
                  v-if="row.slot.status === 'completed'"
                  name="check"
                  :size="14"
                />
                <span v-else class="run-row__order">{{ row.slot.order }}</span>
              </span>
              <span class="run-row__title">
                {{ row.activity?.name ?? 'Activity not in catalogue' }}
              </span>
              <span class="run-row__chevron" aria-hidden="true">
                <AppIcon
                  :name="expandedId === row.slot.clientId ? 'chevron-up' : 'chevron-down'"
                  :size="16"
                />
              </span>
            </button>

            <div
              v-show="expandedId === row.slot.clientId"
              :id="`run-detail-${row.slot.clientId}`"
              class="run-row__body"
            >
              <section
                v-if="row.activity?.description"
                class="run-row__section"
              >
                <h3 class="run-row__section-title">
                  <AppIcon name="target" :size="14" />
                  Aim
                </h3>
                <p
                  v-for="(p, pIdx) in splitParagraphs(row.activity.description)"
                  :key="pIdx"
                  class="run-row__aim"
                >
                  {{ p }}
                </p>
              </section>
              <p v-else class="run-row__aim run-row__aim--missing">
                No description available for this activity.
              </p>

              <section
                v-if="parseSteps(row.activity?.steps).length"
                class="run-row__section"
              >
                <h3 class="run-row__section-title">
                  <AppIcon name="list-checks" :size="14" />
                  Steps
                </h3>
                <ol class="run-row__steps">
                  <li
                    v-for="(step, index) in parseSteps(row.activity?.steps)"
                    :key="index"
                    class="run-row__step"
                  >
                    <span class="run-row__step-num">{{ index + 1 }}</span>
                    <span class="run-row__step-text">{{ step }}</span>
                  </li>
                </ol>
              </section>

              <section
                v-if="row.activity?.materials"
                class="run-row__section"
              >
                <h3 class="run-row__section-title">
                  <AppIcon name="package" :size="14" />
                  Materials
                </h3>
                <ul class="run-row__chips">
                  <li
                    v-for="(m, mIdx) in splitMaterials(row.activity.materials)"
                    :key="mIdx"
                    class="run-row__chip"
                  >
                    {{ m }}
                  </li>
                </ul>
              </section>

              <section
                v-if="row.activity?.conclusion"
                class="run-row__section"
              >
                <h3 class="run-row__section-title">
                  <AppIcon name="flag" :size="14" />
                  Conclusion
                </h3>
                <p
                  v-for="(p, pIdx) in splitParagraphs(row.activity.conclusion)"
                  :key="pIdx"
                  class="run-row__aim"
                >
                  {{ p }}
                </p>
              </section>

              <section
                v-if="row.activity?.attentionNote"
                class="run-row__section run-row__section--note"
              >
                <h3 class="run-row__section-title">
                  <AppIcon name="alert-circle" :size="14" />
                  Attention
                </h3>
                <p>{{ row.activity.attentionNote }}</p>
              </section>

              <div class="run-row__actions">
                <button
                  v-if="row.slot.status !== 'completed'"
                  type="button"
                  class="run-row__cta"
                  :disabled="completing === row.slot.clientId || isLocked"
                  @click="onMarkComplete(row.slot.clientId)"
                >
                  <AppIcon name="check-circle" :size="16" />
                  Mark complete
                </button>
                <span
                  v-else
                  class="run-row__done-pill"
                  aria-label="Activity completed"
                >
                  <AppIcon name="check" :size="14" />
                  Done
                </span>
              </div>
            </div>
          </li>
        </ul>

        <!-- Bottom action: Complete session (DART-37) -->
        <footer class="run-footer">
          <button
            type="button"
            class="run-footer__cta"
            :disabled="!allComplete || !attendance.hasMarkedAny.value || isLocked"
            @click="onCompleteSession"
          >
            <AppIcon name="flag" :size="16" />
            {{ isLocked ? 'Session completed' : 'Complete session' }}
          </button>
          <p v-if="!isLocked" class="run-footer__hint">
            <template v-if="!allComplete">
              Complete every activity to finish this session.
            </template>
            <template v-else-if="!attendance.hasMarkedAny.value">
              Mark attendance before completing this session.
            </template>
          </p>
        </footer>
      </template>
    </div>

    <PssCompleteActivitySheet
      :open="completeSheetOpen"
      :activity-name="completeSheetActivityName"
      @update:open="completeSheetOpen = $event"
      @submit="onCompleteSheetSubmit"
    />

    <PssCompleteSessionDialog
      :open="completeSessionOpen"
      :submitting="completingSession"
      @update:open="completeSessionOpen = $event"
      @submit="onCompleteSessionSubmit"
    />

    <PssAttendanceSheet
      :open="attendanceOpen"
      :rows="attendance.rows.value"
      :loading="attendance.loading.value"
      :saving="attendance.saving.value"
      :load-error="attendance.loadError.value"
      :save-error="attendance.saveError.value"
      :present-count="attendance.presentCount.value"
      :absent-count="attendance.absentCount.value"
      :total-count="attendance.totalCount.value"
      :marked-count="attendance.markedCount.value"
      @update:open="attendanceOpen = $event"
      @set-status="(id, status) => attendance.setStatus(id, status)"
      @mark-remaining-present="attendance.markRemainingPresent"
      @mark-remaining-absent="attendance.markRemainingAbsent"
      @submit="onAttendanceSubmit"
    />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { usePssSessionRun } from '~/composables/usePssSessionRun';
import { useToast } from '~/composables/useToast';
import PssCompleteActivitySheet from '~/components/pss/PssCompleteActivitySheet.vue';
import PssCompleteSessionDialog from '~/components/pss/PssCompleteSessionDialog.vue';
import PssAttendanceSheet from '~/components/pss/PssAttendanceSheet.vue';
import { usePssSessionAttendance } from '~/composables/usePssSessionAttendance';

interface PssCompleteActivitySubmitPayload {
  notes: string;
  flag: {
    beneficiaryId: string;
    beneficiaryName: string;
    concern: string;
  } | null;
}
import type { PssTimePeriodLabel } from '~/interfaces/pssDb';

definePageMeta({ layout: false, middleware: ['auth'] });

const route = useRoute();
const router = useRouter();
const toast = useToast();

const frameworkId = route.params.id as string;
const sessionId = route.params.sessionId as string;

const {
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
  completeSlotWithDetails,
  completeSessionWithRemarks,
} = usePssSessionRun(sessionId);

const expandedId = ref<string | null>(null);
const completing = ref<string | null>(null);

// DART-44 — complete-activity sheet state.
const completeSheetOpen = ref(false);
const completeSheetSlotId = ref<string | null>(null);
const completeSheetActivityName = computed(() => {
  if (!completeSheetSlotId.value) return '';
  const row = rows.value.find((r) => r.slot.clientId === completeSheetSlotId.value);
  return row?.activity?.name ?? 'Activity';
});

// DART-37 — complete-session dialog state.
const completeSessionOpen = ref(false);
const completingSession = ref(false);

// Per-session attendance state.
const attendance = usePssSessionAttendance(sessionId);
const attendanceOpen = ref(false);

async function openAttendance(): Promise<void> {
  if (isLocked.value) return;
  attendanceOpen.value = true;
  await attendance.reload();
}

async function onAttendanceSubmit(): Promise<void> {
  try {
    await attendance.submit();
    attendanceOpen.value = false;
    toast.success(
      `Attendance saved · ${attendance.presentCount.value} present, ${attendance.absentCount.value} absent.`,
    );
  } catch (err) {
    const e = err as { message?: string; code?: string } | null;
    const heading =
      e?.code === 'BENEFICIARY_NOT_AT_CFS'
        ? 'A child is not registered at this CFS.'
        : e?.code === 'SESSION_LOCKED'
          ? 'Session is already completed.'
          : 'Could not save attendance.';
    const message = e?.message || (err instanceof Error ? err.message : 'Unknown error.');
    toast.error(heading, { detail: message });
  }
}

const breadcrumbs = computed(() => [
  { title: 'Projects', href: '/activities' },
  { title: 'Project', href: `/activities/${frameworkId}` },
  { title: 'PSS', href: `/activities/${frameworkId}/pss` },
  { title: "Today's Sessions", href: `/activities/${frameworkId}/pss/today` },
  { title: 'Session', href: route.fullPath, current: true },
]);

function periodLabel(p: PssTimePeriodLabel): string {
  return p === 'morning' ? 'Morning' : 'Afternoon';
}

function humanDate(iso: string): string {
  // iso === 'YYYY-MM-DD'; treat as UTC midnight to avoid timezone drift.
  const ts = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(ts)) return iso;
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

function toggleExpand(slotClientId: string): void {
  expandedId.value = expandedId.value === slotClientId ? null : slotClientId;
}

/**
 * Activity instructions arrive as one big text blob (the BE stores
 * them as a single denormalised string per slot). Split that blob
 * into individual steps so the UI can render each as a numbered card.
 *
 * Recognised separators, in priority order:
 *   1. Numbered prefixes — "1)", "2.", "3 -", etc.
 *   2. Bullet prefixes — "- ", "• ", "* "
 *   3. Newlines
 *   4. Sentences (period followed by a space + capital letter)
 *
 * If none of those produce > 1 chunk we return the whole blob as a
 * single step, so prose-style descriptions still render readably.
 */
function parseSteps(steps: string[] | undefined): string[] {
  if (!steps || steps.length === 0) return [];
  const blob = steps.join('\n').trim();
  if (!blob) return [];

  // 1. Numbered prefixes anywhere in the string.
  const numbered = blob
    .split(/\s*(?:^|\s)(?=\d{1,2}[.)\-]\s)/)
    .map((s) => s.replace(/^\d{1,2}[.)\-]\s*/, '').trim())
    .filter(Boolean);
  if (numbered.length > 1) return numbered;

  // 2. Bullet prefixes.
  const bulleted = blob
    .split(/\s*(?:^|\n|\s)(?=[-•*]\s)/)
    .map((s) => s.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
  if (bulleted.length > 1) return bulleted;

  // 3. Newlines.
  const lined = blob
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lined.length > 1) return lined;

  // 4. Sentence boundaries — only split if there are 3+ sentences;
  //    a single sentence shouldn't get arbitrarily broken at periods.
  const sentenced = blob
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentenced.length >= 3) return sentenced;

  return [blob];
}

/**
 * Split prose into paragraphs on blank lines so long descriptions
 * don't render as a single wall of text.
 */
function splitParagraphs(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Materials are usually a comma- or newline-separated list (e.g.
 * "Story book, Markers, Paper"). Render each as a chip; if the
 * source is genuinely a single phrase, render it as one chip.
 */
function splitMaterials(text: string | undefined): string[] {
  if (!text) return [];
  const parts = text
    .split(/\s*(?:,|;|\n|·|•)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [text.trim()];
}

function onMarkComplete(slotClientId: string): void {
  if (isLocked.value) return;
  completeSheetSlotId.value = slotClientId;
  completeSheetOpen.value = true;
}

async function onCompleteSheetSubmit(
  payload: PssCompleteActivitySubmitPayload,
): Promise<void> {
  const slotClientId = completeSheetSlotId.value;
  if (!slotClientId) return;
  completing.value = slotClientId;
  try {
    await completeSlotWithDetails({
      slotClientId,
      notes: payload.notes,
      flag: payload.flag
        ? {
            childId: payload.flag.beneficiaryId,
            concern: payload.flag.concern,
          }
        : null,
    });
    completeSheetOpen.value = false;
    completeSheetSlotId.value = null;
    if (expandedId.value === slotClientId) expandedId.value = null;
    toast.success(
      payload.flag
        ? `Marked complete and flagged ${payload.flag.beneficiaryName}.`
        : 'Activity marked complete.',
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save.';
    toast.error('Could not complete this activity.', { detail: message });
  } finally {
    completing.value = null;
  }
}

function onCompleteSession(): void {
  if (isLocked.value || !allComplete.value) return;
  completeSessionOpen.value = true;
}

async function onCompleteSessionSubmit(payload: { remarks: string }): Promise<void> {
  if (completingSession.value) return;
  completingSession.value = true;
  try {
    await completeSessionWithRemarks(payload.remarks);
    completeSessionOpen.value = false;
    toast.success('Session completed.');
    // DART-34 owns the smiley evaluation screen; until it lands the
    // facilitator returns to today's sessions list. The session is
    // already locked locally + on the server so re-entry shows the
    // read-only completed view.
    void router.push(`/activities/${frameworkId}/pss/today`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save.';
    toast.error('Could not complete the session.', { detail: message });
  } finally {
    completingSession.value = false;
  }
}

onMounted(async () => {
  await reload();
  await attendance.reload();
});
</script>

<style scoped>
.run-page {
  max-width: 720px;
  padding-bottom: 64px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.run-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 48px 16px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  color: var(--text-muted);
}
.run-state h2 {
  font-size: 1.05rem;
  margin: 6px 0 0;
  color: var(--text-primary);
}
.run-cta-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 9px 16px;
  border-radius: 8px;
  background: var(--primary);
  color: #fff;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
}
.run-state--loading {
  flex-direction: row;
  gap: 6px;
}
.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
  animation: pulse 1.2s ease-in-out infinite;
}
.pulse-dot:nth-child(2) { animation-delay: 0.2s; }
.pulse-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes pulse {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50%      { opacity: 1;   transform: scale(1); }
}

.run-hero {
  display: flex;
  align-items: center;
  gap: 14px;
}
.run-hero__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--primary-dim);
  color: var(--primary);
  flex-shrink: 0;
}
.run-hero__title {
  font-size: 1.3rem;
  font-weight: 750;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin: 0;
}
.run-hero__sub {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 2px 0 0;
}

.run-attendance {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  margin-bottom: 14px;
}
.run-attendance__main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.run-attendance__head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.run-attendance__label {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.run-attendance__badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 999px;
}
.run-attendance__badge--required {
  background: rgba(250, 204, 21, 0.16);
  color: #facc15;
}
.run-attendance__badge--ok {
  background: rgba(34, 197, 94, 0.16);
  color: #22c55e;
}
.run-attendance__counts {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 0.82rem;
}
.count {
  display: inline-flex;
  align-items: center;
  font-weight: 600;
}
.count--present { color: #22c55e; }
.count--absent  { color: #ef4444; }
.count--total   { color: var(--text-muted); font-weight: 500; }

.run-attendance__cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  border-radius: 8px;
  background: var(--primary);
  color: #fff;
  border: none;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: opacity 0.12s, transform 0.1s;
}
.run-attendance__cta:hover:not(:disabled) { opacity: 0.9; }
.run-attendance__cta:active:not(:disabled) { transform: scale(0.98); }
.run-attendance__cta:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 480px) {
  .run-attendance { flex-direction: column; align-items: stretch; }
  .run-attendance__cta { justify-content: center; }
}

.run-progress {
  position: sticky;
  top: 0;
  background: var(--bg-panel);
  padding: 12px 14px 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  z-index: 5;
  margin-bottom: 14px;
}
.run-progress__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
  font-size: 0.78rem;
  color: var(--text-secondary);
}
.run-progress__count { font-weight: 500; }
.run-progress__pct {
  font-weight: 700;
  color: var(--primary);
  font-size: 0.92rem;
}
.run-progress__track {
  width: 100%;
  height: 8px;
  background: var(--bg-input);
  border-radius: 999px;
  overflow: hidden;
}
.run-progress__fill {
  height: 100%;
  background: var(--primary);
  border-radius: 999px;
  transition: width 220ms ease;
}

.run-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.run-row {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 120ms ease;
}
.run-row[data-status='completed'] {
  border-color: rgba(34, 197, 94, 0.45);
  background: rgba(34, 197, 94, 0.04);
}
.run-row[data-expanded='true'] {
  border-color: var(--primary);
}

.run-row__head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: transparent;
  border: none;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.run-row__head:hover { background: var(--hover-bg); }

.run-row__check {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--bg-input);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.78rem;
  flex-shrink: 0;
}
.run-row__check[data-checked='true'] {
  background: #22c55e;
  color: #052e16;
}
.run-row__order { line-height: 1; }

.run-row__title {
  flex: 1;
  font-size: 0.94rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}
.run-row[data-status='completed'] .run-row__title {
  color: var(--text-secondary);
}
.run-row__chevron {
  color: var(--text-muted);
  display: grid;
  place-items: center;
}

.run-row__body {
  padding: 0 16px 16px 54px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 0.9rem;
  line-height: 1.6;
}
.run-row__aim {
  margin: 0;
  color: var(--text-primary);
}
.run-row__aim--missing {
  color: var(--text-muted);
  font-style: italic;
}
.run-row__section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.run-row__section-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin: 4px 0 0;
}
.run-row__steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.run-row__step {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 9px 12px;
  color: var(--text-primary);
}
.run-row__step-num {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--primary-dim);
  color: var(--primary);
  font-size: 0.74rem;
  font-weight: 700;
  display: grid;
  place-items: center;
  margin-top: 1px;
}
.run-row__step-text {
  flex: 1;
  line-height: 1.55;
}

.run-row__chips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.run-row__chip {
  display: inline-flex;
  align-items: center;
  padding: 5px 11px;
  border-radius: 999px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  font-size: 0.8rem;
  color: var(--text-primary);
}
.run-row__section--note {
  background: rgba(250, 204, 21, 0.08);
  border-radius: 8px;
  padding: 8px 10px;
}
.run-row__section--note .run-row__section-title {
  color: #fde047;
  margin-top: 0;
}

.run-row__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 6px;
}
.run-row__cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: 8px;
  background: var(--primary);
  color: #fff;
  border: none;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.12s, transform 0.1s;
}
.run-row__cta:hover:not(:disabled)  { opacity: 0.9; }
.run-row__cta:active:not(:disabled) { transform: scale(0.98); }
.run-row__cta:disabled {
  opacity: 0.55;
  cursor: progress;
}
.run-row__done-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.16);
  color: #22c55e;
  font-size: 0.78rem;
  font-weight: 600;
}

.run-footer {
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.run-footer__cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 12px 22px;
  border-radius: 10px;
  background: var(--primary);
  color: #fff;
  border: none;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  min-width: 220px;
  justify-content: center;
  font-family: inherit;
  transition: opacity 0.12s, transform 0.1s;
}
.run-footer__cta:hover:not(:disabled)  { opacity: 0.9; }
.run-footer__cta:active:not(:disabled) { transform: scale(0.98); }
.run-footer__cta:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.run-footer__hint {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-muted);
}
</style>
