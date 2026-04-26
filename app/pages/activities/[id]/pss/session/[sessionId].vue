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
              <p
                v-if="row.activity?.description"
                class="run-row__aim"
              >
                {{ row.activity.description }}
              </p>
              <p v-else class="run-row__aim run-row__aim--missing">
                No description available for this activity.
              </p>

              <section
                v-if="row.activity?.steps && row.activity.steps.length"
                class="run-row__section"
              >
                <h3 class="run-row__section-title">
                  <AppIcon name="list-checks" :size="14" />
                  Steps
                </h3>
                <ol class="run-row__steps">
                  <li
                    v-for="(step, index) in row.activity.steps"
                    :key="index"
                    class="run-row__step"
                  >
                    {{ step }}
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
                <p class="run-row__materials">{{ row.activity.materials }}</p>
              </section>

              <section
                v-if="row.activity?.conclusion"
                class="run-row__section"
              >
                <h3 class="run-row__section-title">
                  <AppIcon name="flag" :size="14" />
                  Conclusion
                </h3>
                <p>{{ row.activity.conclusion }}</p>
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

        <!-- Bottom action: Complete session (DART-37 will replace) -->
        <footer class="run-footer">
          <button
            type="button"
            class="run-footer__cta"
            :disabled="!allComplete || isLocked"
            @click="onCompleteSession"
          >
            <AppIcon name="flag" :size="16" />
            {{ isLocked ? 'Session completed' : 'Complete session' }}
          </button>
          <p v-if="!allComplete && !isLocked" class="run-footer__hint">
            Complete every activity to finish this session.
          </p>
        </footer>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { usePssSessionRun } from '~/composables/usePssSessionRun';
import { useToast } from '~/composables/useToast';
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
  markSlotCompleted,
} = usePssSessionRun(sessionId);

const expandedId = ref<string | null>(null);
const completing = ref<string | null>(null);

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

async function onMarkComplete(slotClientId: string): Promise<void> {
  if (isLocked.value) return;
  completing.value = slotClientId;
  try {
    const ok = await markSlotCompleted(slotClientId);
    if (!ok) {
      toast.error('Could not mark this activity complete.');
      return;
    }
    // Auto-collapse once done so the next pending row is easier to spot.
    if (expandedId.value === slotClientId) expandedId.value = null;
  } finally {
    completing.value = null;
  }
}

function onCompleteSession(): void {
  // DART-37 owns the overall-remarks prompt + lock transition.
  // For now, route back so the facilitator does not get stuck on a
  // dead button.
  toast.info('Final remarks + smiley evaluation coming soon.');
  void router.push(`/activities/${frameworkId}/pss/today`);
}

onMounted(reload);
</script>

<style scoped>
.run-page {
  max-width: 720px;
  padding-bottom: 64px;
}

.run-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 56px 16px;
  color: var(--text-muted);
}
.run-state h2 {
  font-size: 1.05rem;
  margin: 6px 0 0;
  color: var(--text);
}
.run-cta-link {
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
.run-state--loading {
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

.run-hero {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}
.run-hero__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--accent-soft, rgba(129, 140, 248, 0.15));
  color: var(--accent, #818cf8);
}
.run-hero__title {
  font-size: 1.3rem;
  font-weight: 600;
  margin: 0;
}
.run-hero__sub {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 2px 0 0;
}

.run-progress {
  position: sticky;
  top: 0;
  background: var(--background, #0f0f1a);
  padding: 10px 0 14px;
  z-index: 5;
  margin-bottom: 12px;
}
.run-progress__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
  font-size: 0.78rem;
  color: var(--text-muted);
}
.run-progress__pct {
  font-weight: 600;
  color: var(--accent, #818cf8);
  font-size: 0.85rem;
}
.run-progress__track {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  overflow: hidden;
}
.run-progress__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent, #818cf8), #4ade80);
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
  background: var(--surface, #1a1a2e);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 120ms ease;
}
.run-row[data-status='completed'] {
  border-color: rgba(74, 222, 128, 0.45);
  background: rgba(74, 222, 128, 0.04);
}
.run-row[data-expanded='true'] {
  border-color: var(--accent, #818cf8);
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
.run-row__head:hover {
  background: rgba(255, 255, 255, 0.02);
}

.run-row__check {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.78rem;
  flex-shrink: 0;
}
.run-row__check[data-checked='true'] {
  background: #4ade80;
  color: #052e16;
}
.run-row__order { line-height: 1; }

.run-row__title {
  flex: 1;
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--text);
}
.run-row[data-status='completed'] .run-row__title {
  color: var(--text-muted);
  text-decoration: line-through;
}
.run-row__chevron {
  color: var(--text-muted);
  display: grid;
  place-items: center;
}

.run-row__body {
  padding: 0 14px 14px 54px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 0.86rem;
  line-height: 1.5;
}
.run-row__aim {
  margin: 0;
  color: var(--text);
}
.run-row__aim--missing {
  color: var(--text-muted);
  font-style: italic;
}
.run-row__section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.run-row__section-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin: 4px 0 0;
}
.run-row__steps {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.run-row__step { color: var(--text); }
.run-row__materials {
  margin: 0;
  color: var(--text);
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
  padding: 8px 14px;
  border-radius: 8px;
  background: var(--accent, #818cf8);
  color: #fff;
  border: none;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.run-row__cta:disabled {
  opacity: 0.6;
  cursor: progress;
}
.run-row__done-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
  font-size: 0.78rem;
  font-weight: 600;
}

.run-footer {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.run-footer__cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 12px 20px;
  border-radius: 12px;
  background: var(--accent, #818cf8);
  color: #fff;
  border: none;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  min-width: 220px;
  justify-content: center;
}
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
