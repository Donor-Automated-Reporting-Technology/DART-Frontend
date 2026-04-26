<!--
  Schedule setup screen — DART-47.

  Captures the scaffolding (time periods, age groups, active days) BEFORE
  the day-by-day stepper opens (DART-43). On Continue, persists a draft
  schedule into IndexedDB (`pss_schedules`, status='draft') and routes
  to the stepper carrying the draft's clientId.

  Sourced AC: DART/PSS_MODULE_PRD.md §5, DART/PSS_SCHEDULE_TRD.md §6.1.
  UX ref: Dart-docs/design-system/DART_UX_REFERENCE.md (PSS schedule setup).

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
    <div class="pss-setup">

      <!-- ═══ Page Header (mirrors settings/organization.vue) ═══ -->
      <div class="page-header">
        <div class="header-row">
          <div>
            <h1 class="page-title">New weekly schedule</h1>
            <p class="page-subtitle">
              Set up time periods, age groups and active days — then map activities day-by-day.
            </p>
          </div>
          <NuxtLink :to="`/activities/${frameworkId}/pss`" class="btn-back">
            <AppIcon name="arrow-left" :size="14" />
            <span class="btn-text">PSS</span>
          </NuxtLink>
        </div>
      </div>

      <form class="setup-form" novalidate @submit.prevent="onContinue">

        <!-- CFS location (read-only) -->
        <div class="form-section">
          <div class="section-label">CFS location</div>
          <div class="section-card">
            <div class="cfs-display" aria-live="polite">
              <span class="cfs-display__name">
                {{ cfsLocationName || (cfsLoading ? 'Loading…' : 'No CFS location on profile') }}
              </span>
              <span class="cfs-display__pill">Auto-filled</span>
            </div>
            <p v-if="cfsError === 'unassigned'" class="err-msg">
              No CFS location is assigned to your account. Contact your supervisor.
            </p>
            <p v-else-if="!cfsLocationName && !cfsLoading" class="err-msg">
              Your account is not linked to a CFS location. Contact your organisation admin.
            </p>
          </div>
        </div>

        <!-- Time periods -->
        <div class="form-section">
          <div class="section-label">Time periods</div>
          <div class="section-card">
            <p class="section-hint">
              Defaults: Morning 08:00–12:00, Afternoon 14:00–16:00. Edit or add as needed.
            </p>
            <PssTimePeriodEditor
              :periods="draft.timePeriods"
              :errors="timePeriodErrorsMap"
              @add="addTimePeriod"
              @remove="removeTimePeriod"
              @update="updateTimePeriod"
            />
            <p v-if="issueFor('time_periods_empty')" class="err-msg">
              {{ issueFor('time_periods_empty')!.message }}
            </p>
          </div>
        </div>

        <!-- Age groups -->
        <div class="form-section">
          <div class="section-label">Age groups</div>
          <div class="section-card">
            <p class="section-hint">Pick one or more.</p>
            <PssAgeGroupSelector
              :options="ageGroupOptions"
              :selected="draft.ageGroups"
              aria-label="Schedule age groups"
              @toggle="toggleAgeGroup"
            />
            <p v-if="issueFor('age_groups_empty')" class="err-msg">
              {{ issueFor('age_groups_empty')!.message }}
            </p>
          </div>
        </div>

        <!-- Active days -->
        <div class="form-section">
          <div class="section-label">Active days</div>
          <div class="section-card">
            <p class="section-hint">Mon–Fri are on by default. Tap to toggle.</p>
            <PssActiveDaysSelector
              :options="dayOptions"
              :active="draft.activeDays"
              aria-label="Schedule active days"
              @toggle="toggleDay"
            />
            <p v-if="issueFor('active_days_empty')" class="err-msg">
              {{ issueFor('active_days_empty')!.message }}
            </p>
          </div>
        </div>

        <!-- Actions -->
        <div class="actions">
          <button type="button" class="btn-secondary" @click="onCancel">
            Cancel
          </button>
          <button
            type="submit"
            class="btn-primary"
            :disabled="!canContinue || saving || !cfsLocationName"
          >
            <span v-if="saving" class="btn-spinner" />
            {{ saving ? 'Saving…' : 'Continue' }}
          </button>
        </div>
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
/**
 * @route   /activities/:id/pss/setup
 * @description PSS weekly schedule setup screen — captures time periods,
 *   age groups, and active days BEFORE the day-by-day stepper opens.
 *   Hydrates the facilitator's CFS location (id + name) from the auth
 *   store, refreshing from `GET /cfs/me/location` (DART-72) when online.
 * @uxRef   Dart-docs/design-system/DART_UX_REFERENCE.md (PSS schedule setup)
 * @offline Reads CFS location from localStorage via the auth store; the
 *   network refresh is best-effort and does not block the form.
 * @stores  useAuthStore (cfsLocationId, cfsLocationName)
 * @composables usePssScheduleDraft, useCfsLocation, useToast
 */
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '~/stores/auth';
import {
  PSS_AGE_GROUP_OPTIONS,
  PSS_DAY_OPTIONS,
  usePssScheduleDraft,
} from '~/composables/usePssScheduleDraft';
import { useCfsLocation } from '~/composables/useCfsLocation';
import { useToast } from '~/composables/useToast';

definePageMeta({ layout: false, middleware: ['auth'] });

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();

const frameworkId = route.params.id as string;
const cfsLocationName = computed<string>(() => auth.cfsLocationName ?? '');
const cfsLocationId = computed<string>(() => auth.cfsLocationId ?? '');
const userId = computed<string>(() => auth.userId ?? '');

// DART-72 — hydrate the real CFS location id+name from the backend on
// mount. Offline-first: the composable short-circuits when offline if a
// value is already cached in the auth store.
const {
  loading: cfsLoading,
  error: cfsError,
  fetchAndHydrate: hydrateCfsLocation,
} = useCfsLocation();
onMounted(() => { hydrateCfsLocation(); });

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
  cfsLocationId: cfsLocationId.value,
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
.pss-setup {
  --pad-x: clamp(1rem, 4vw, 1.5rem);
  max-width: 600px;
}

/* ═══ Page Header (mirrors settings/organization.vue) ═══ */
.page-header {
  margin-bottom: 24px;
}

.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-title {
  font-size: 1.35rem;
  font-weight: 750;
  color: var(--text-primary);
  margin: 0 0 2px;
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.45;
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
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s;
  min-height: 36px;
}
.btn-back:hover { border-color: var(--text-muted); color: var(--text-primary); }

/* ═══ Form ═══ */
.setup-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ═══ Form Sections ═══ */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-size: 0.72rem;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  padding-left: 2px;
}

.section-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 18px;
}

.section-hint {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.45;
}

/* ═══ CFS read-only display ═══ */
.cfs-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 12px;
}

.cfs-display__name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.cfs-display__pill {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  background: var(--bg-card);
  padding: 3px 8px;
  border-radius: 999px;
}

/* ═══ Inline error text (mirrors .err-msg) ═══ */
.err-msg {
  margin: 0;
  font-size: 0.72rem;
  color: var(--error);
}

/* ═══ Actions ═══ */
.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Primary CTA — mirrors settings/organization.vue brand button. */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  font-family: inherit;
  min-height: 40px;
}
.btn-primary:hover:not(:disabled)  { opacity: 0.9; }
.btn-primary:active:not(:disabled) { transform: scale(0.98); }
.btn-primary:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 18px;
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.84rem;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  min-height: 40px;
  transition: border-color 0.15s, color 0.15s;
}
.btn-secondary:hover {
  border-color: var(--text-muted);
  color: var(--text-primary);
}

.btn-spinner {
  width: 13px;
  height: 13px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
