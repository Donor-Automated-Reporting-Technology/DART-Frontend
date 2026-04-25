<!--
  Schedule setup screen — DART-47.

  Captures the scaffolding (time periods, age groups, active days) BEFORE
  the day-by-day stepper opens (DART-43). On Continue, persists a draft
  schedule into IndexedDB (`pss_schedules`, status='draft') and routes
  to the stepper carrying the draft's clientId.

  Sourced AC: DART/PSS_MODULE_PRD.md §5, DART/PSS_SCHEDULE_TRD.md §6.1.

  Stateless / parallel-safe:
    • No Pinia store touched.
    • Local state lives in `usePssScheduleDraft` (this branch) — the
      draft record handed to the stepper satisfies `PssScheduleRecord`,
      so the stepper can fill `templateSlots` without further coupling.

  Routing target on Continue: `/activities/:id/pss/schedule?draft=<clientId>`.
  The stepper page (added in a later sprint) reads `?draft=` to load the
  in-progress record from IndexedDB.
-->
<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="setup-page">
      <header class="setup-hero">
        <div class="setup-hero__icon">
          <AppIcon name="calendar" :size="22" />
        </div>
        <div>
          <h1 class="setup-hero__title">New weekly schedule</h1>
          <p class="setup-hero__sub">
            Set up time periods, age groups and active days — then map activities day-by-day.
          </p>
        </div>
      </header>

      <form class="setup-form" novalidate @submit.prevent="onContinue">
        <!-- CFS location (read-only) -->
        <section class="setup-section">
          <div class="setup-section__head">
            <AppIcon name="building" :size="18" class="setup-section__icon" />
            <h2 class="setup-section__title">CFS location</h2>
          </div>
          <div class="cfs-display" aria-live="polite">
            <span class="cfs-display__name">
              {{ cfsLocationName || 'No CFS location on profile' }}
            </span>
            <span class="cfs-display__pill">Auto-filled</span>
          </div>
          <p v-if="!cfsLocationName" class="setup-error">
            Your account is not linked to a CFS location. Contact your organisation admin.
          </p>
        </section>

        <!-- Time periods -->
        <section class="setup-section">
          <div class="setup-section__head">
            <AppIcon name="clock" :size="18" class="setup-section__icon" />
            <h2 class="setup-section__title">Time periods</h2>
          </div>
          <p class="setup-section__hint">
            Defaults: Morning 08:00–12:00, Afternoon 14:00–16:00. Edit or add as needed.
          </p>
          <PssTimePeriodEditor
            :periods="draft.timePeriods"
            :errors="timePeriodErrorsMap"
            @add="addTimePeriod"
            @remove="removeTimePeriod"
            @update="updateTimePeriod"
          />
          <p v-if="issueFor('time_periods_empty')" class="setup-error">
            {{ issueFor('time_periods_empty')!.message }}
          </p>
        </section>

        <!-- Age groups -->
        <section class="setup-section">
          <div class="setup-section__head">
            <AppIcon name="users" :size="18" class="setup-section__icon" />
            <h2 class="setup-section__title">Age groups</h2>
          </div>
          <p class="setup-section__hint">Pick one or more.</p>
          <PssAgeGroupSelector
            :options="ageGroupOptions"
            :selected="draft.ageGroups"
            aria-label="Schedule age groups"
            @toggle="toggleAgeGroup"
          />
          <p v-if="issueFor('age_groups_empty')" class="setup-error">
            {{ issueFor('age_groups_empty')!.message }}
          </p>
        </section>

        <!-- Active days -->
        <section class="setup-section">
          <div class="setup-section__head">
            <AppIcon name="calendar" :size="18" class="setup-section__icon" />
            <h2 class="setup-section__title">Active days</h2>
          </div>
          <p class="setup-section__hint">Mon–Fri are on by default. Tap to toggle.</p>
          <PssActiveDaysSelector
            :options="dayOptions"
            :active="draft.activeDays"
            aria-label="Schedule active days"
            @toggle="toggleDay"
          />
          <p v-if="issueFor('active_days_empty')" class="setup-error">
            {{ issueFor('active_days_empty')!.message }}
          </p>
        </section>

        <!-- Sticky footer actions -->
        <footer class="setup-footer">
          <button
            type="button"
            class="btn btn--ghost"
            @click="onCancel"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn--primary"
            :disabled="!canContinue || saving || !cfsLocationName"
          >
            <AppIcon
              v-if="saving"
              name="loader"
              :size="16"
              class="btn__spinner"
            />
            <span>{{ saving ? 'Saving…' : 'Continue' }}</span>
          </button>
        </footer>
      </form>
    </div>

    <PssDiscardConfirmModal
      :open="discardOpen"
      @cancel="discardOpen = false"
      @confirm="onConfirmDiscard"
    />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '~/stores/auth';
import {
  PSS_AGE_GROUP_OPTIONS,
  PSS_DAY_OPTIONS,
  usePssScheduleDraft,
} from '~/composables/usePssScheduleDraft';
import { useToast } from '~/composables/useToast';

definePageMeta({ layout: false, middleware: ['auth'] });

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();

const frameworkId = route.params.id as string;
const cfsLocationName = computed<string>(() => auth.cfsLocationName ?? '');

/**
 * The auth store currently exposes `cfsLocationName` for display but not
 * `cfsLocationId`. Until that field is added, we use the authenticated
 * user's id as the cfs identifier — facilitator accounts are 1:1 with
 * a CFS per the PRD. Flag carried in the DART-47 Jira comment for
 * Tech Lead alignment.
 */
const cfsLocationIdFallback = computed<string>(() => auth.userId ?? '');
const userId = computed<string>(() => auth.userId ?? '');

const {
  draft,
  isDirty,
  issues,
  canContinue,
  addTimePeriod,
  removeTimePeriod,
  updateTimePeriod,
  toggleAgeGroup,
  toggleDay,
  issueFor,
  saveDraft,
} = usePssScheduleDraft({
  cfsLocationId: cfsLocationIdFallback.value,
  cfsLocationName: cfsLocationName.value,
  userId: userId.value,
});

const ageGroupOptions = PSS_AGE_GROUP_OPTIONS;
const dayOptions = PSS_DAY_OPTIONS;

const saving = ref(false);
const discardOpen = ref(false);

const breadcrumbs = computed(() => [
  { title: 'Projects', href: '/activities' },
  { title: 'Project', href: `/activities/${frameworkId}` },
  { title: 'PSS', href: `/activities/${frameworkId}/pss` },
  {
    title: 'New schedule',
    href: `/activities/${frameworkId}/pss/setup`,
    current: true,
  },
]);

/** Index → first error message map for the time-period editor. */
const timePeriodErrorsMap = computed<Record<number, string>>(() => {
  const map: Record<number, string> = {};
  for (const issue of issues.value) {
    if (issue.code !== 'time_period_invalid') continue;
    if (typeof issue.timePeriodIndex !== 'number') continue;
    if (map[issue.timePeriodIndex]) continue;
    map[issue.timePeriodIndex] = issue.message;
  }
  return map;
});

async function onContinue(): Promise<void> {
  if (saving.value) return;

  if (!cfsLocationName.value) {
    toast.error('Your account has no CFS location assigned.');
    return;
  }

  saving.value = true;
  try {
    const result = await saveDraft();
    if (!result.ok) {
      toast.warning('Please fix the highlighted fields before continuing.');
      return;
    }
    toast.success('Schedule draft saved. Now build your week.');
    await router.push({
      path: `/activities/${frameworkId}/pss/schedule`,
      query: { draft: result.record.clientId },
    });
  } catch (err) {
    toast.error('Could not save draft locally.', {
      detail: err instanceof Error ? err.message : 'Unknown error.',
    });
  } finally {
    saving.value = false;
  }
}

function onCancel(): void {
  if (isDirty.value) {
    discardOpen.value = true;
    return;
  }
  navigateAwayToActiveSchedule();
}

function onConfirmDiscard(): void {
  discardOpen.value = false;
  navigateAwayToActiveSchedule();
}

function navigateAwayToActiveSchedule(): void {
  // Active-schedule view (DART-33) lives at the PSS hub for now.
  router.push(`/activities/${frameworkId}/pss`);
}
</script>

<style scoped>
.setup-page {
  --pad-x: clamp(1rem, 4vw, 1.5rem);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1rem var(--pad-x) 6rem;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
}

.setup-hero {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
}

.setup-hero__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--primary-dim);
  color: var(--primary);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.setup-hero__title {
  margin: 0 0 0.25rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
}

.setup-hero__sub {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.setup-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.setup-section {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.setup-section__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.setup-section__icon {
  color: var(--primary);
  flex-shrink: 0;
}

.setup-section__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.setup-section__hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.setup-error {
  margin: 0;
  font-size: 0.825rem;
  color: var(--error);
}

.cfs-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 0.75rem 0.875rem;
}

.cfs-display__name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.cfs-display__pill {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  background: var(--bg-surface);
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
}

.setup-footer {
  position: sticky;
  bottom: 0;
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  padding: 0.75rem var(--pad-x);
  margin: 1rem calc(var(--pad-x) * -1) 0;
  background: linear-gradient(
    180deg,
    transparent 0%,
    var(--bg-dark) 30%
  );
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  padding: 0.75rem 1.25rem;
  font: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--ghost {
  background: transparent;
  color: var(--text-primary);
  border-color: var(--border-color);
}

.btn--ghost:hover:not(:disabled) {
  background: var(--hover-bg);
  border-color: var(--primary);
  color: var(--text-primary);
}

.btn--primary {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.btn--primary:hover:not(:disabled) {
  filter: brightness(1.05);
}

.btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.btn__spinner {
  animation: btn-spin 0.8s linear infinite;
}

@keyframes btn-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
