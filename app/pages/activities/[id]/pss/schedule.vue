<!--
  PSS weekly schedule — day-by-day stepper page (DART-43 / DART-36 wiring).

  Loads the draft saved by setup.vue (DART-47) from IndexedDB via the
  `?draft=<clientId>` query string, then wires together the four PSS
  building blocks already shipped:

    • PssDayStepper          (DART-43) — render+edit one day at a time
    • PssActivityPicker      (DART-38) — bottom sheet for "+ Add activity"
    • PssCopyMondayButton    (DART-48) — clone Monday into other days
    • PssScheduleValidationBanner — surface blockers from save composable

  Persistence path:
    • Local-first: every mutation rewrites the record to `pss_schedules`
      so a refresh does not lose work.
    • Save & publish: validates via `usePssScheduleSave().save(...)`. The
      composable promotes status='draft' → 'active' and archives the
      previously-active schedule for this CFS in the same transaction.

  Sourced AC: DART/PSS_MODULE_PRD.md §6, DART/PSS_SCHEDULE_TRD.md §6.2.
  UX ref: Dart-docs/design-system/DART_UX_REFERENCE.md (PSS schedule).
-->
<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="pss-schedule">

      <!-- Header -->
      <div class="page-header">
        <div class="header-row">
          <div>
            <h1 class="page-title">Weekly schedule</h1>
            <p class="page-subtitle">
              Map activities to time periods for each active day.
            </p>
          </div>
          <NuxtLink :to="`/activities/${frameworkId}/pss/schedules`" class="btn-back">
            <AppIcon name="arrow-left" :size="14" />
            <span>Schedules</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Loading / error states -->
      <div v-if="loading" class="state">Loading draft…</div>
      <div v-else-if="loadError" class="state state--error">
        {{ loadError }}
      </div>

      <!-- Editor -->
      <template v-else-if="record">
        <PssScheduleValidationBanner
          v-if="validation.blockers.length || validation.warnings.length"
          :validation="validation"
          @jump-to-day="onJumpToDay"
        />

        <PssDayStepper
          v-model:current-day-index="currentDayIndex"
          :schedule="record"
          :get-activity="getActivityView"
          @add-activity="onAddActivity"
          @remove-slot="onRemoveSlot"
          @reorder-slots="onReorderSlots"
        />

        <div class="extras">
          <PssCopyMondayButton
            :schedule="record"
            @copy="onCopyMonday"
          />
        </div>

        <div class="actions">
          <NuxtLink :to="`/activities/${frameworkId}/pss/schedules`" class="btn-secondary">
            Cancel
          </NuxtLink>
          <button
            type="button"
            class="btn-primary"
            :disabled="saving || validation.blockers.length > 0"
            @click="onSave"
          >
            <span v-if="saving" class="btn-spinner" />
            {{ saving ? 'Saving…' : 'Save & activate' }}
          </button>
        </div>
      </template>
    </div>

    <!-- Activity picker (DART-38) -->
    <PssActivityPicker
      v-if="pickerSection"
      :open="pickerOpen"
      :age-group="pickerSection.ageGroup"
      title="Add activity"
      @update:open="onPickerOpenChange"
      @select="onPickerSelect"
    />
  </NuxtLayout>
</template>

<script setup lang="ts">
/**
 * @route   /activities/:id/pss/schedule
 * @description Day-by-day editor for an in-progress PSS schedule. Loads
 *   the draft via `?draft=<clientId>` from IndexedDB, lets the
 *   facilitator place activities into (timePeriod × ageGroup) sections
 *   per active day, and publishes via `usePssScheduleSave`.
 * @uxRef   Dart-docs/design-system/DART_UX_REFERENCE.md (PSS schedule)
 * @offline Reads/writes the schedule record locally; publish round-trips
 *   when online and queues otherwise.
 */
import { computed, onMounted, ref, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '~/composables/useToast';
import { useOfflineStatus } from '~/composables/useOfflineStatus';
import { usePssScheduleSave } from '~/composables/usePssScheduleSave';
import { schedulesRepository } from '~/services/pss/repositories/schedulesRepository';
import { activitiesRepository } from '~/services/pss/repositories/activitiesRepository';
import type {
  PssActivityRecord,
  PssScheduleRecord,
  PssTemplateSlot,
  PssDayOfWeek,
} from '~/interfaces/pssDb';
import type {
  PssDayStepperSectionRef,
  PssDayStepperActivityView,
} from '~/components/pss/PssDayStepper.vue';

definePageMeta({ layout: false, middleware: ['auth'] });

const route = useRoute();
const router = useRouter();
const toast = useToast();
const offline = useOfflineStatus();

const frameworkId = route.params.id as string;
const draftId = computed<string>(() => {
  const v = route.query.draft;
  return typeof v === 'string' ? v : '';
});

const breadcrumbs = computed(() => [
  { title: 'Projects', href: '/activities' },
  { title: 'Project', href: `/activities/${frameworkId}` },
  { title: 'PSS', href: `/activities/${frameworkId}/pss` },
  { title: 'Schedules', href: `/activities/${frameworkId}/pss/schedules` },
  {
    title: 'Schedule',
    href: `/activities/${frameworkId}/pss/schedule`,
    current: true,
  },
]);

// ─── Local state ────────────────────────────────────────────────────────────

const loading = ref(true);
const loadError = ref<string>('');
const record = shallowRef<PssScheduleRecord | null>(null);
const currentDayIndex = ref(0);
const saving = ref(false);

// Activity catalogue cached as a Map for O(1) lookups by stepper.
const activityById = ref<Map<string, PssActivityRecord>>(new Map());

const { validate, save } = usePssScheduleSave((activityId) =>
  activityById.value.get(activityId)?.category,
);

const validation = computed(() =>
  record.value ? validate(record.value) : { blockers: [], warnings: [] },
);

// ─── Bootstrap ──────────────────────────────────────────────────────────────

onMounted(async () => {
  if (!draftId.value) {
    loadError.value =
      'No draft id supplied. Start a new schedule from the PSS hub.';
    loading.value = false;
    return;
  }
  try {
    const [draft, allActivities] = await Promise.all([
      schedulesRepository.getByClientId(draftId.value),
      activitiesRepository.list(),
    ]);
    if (!draft) {
      loadError.value = 'Draft not found. It may have been cleared.';
      return;
    }
    record.value = draft;
    activityById.value = new Map(
      allActivities.map((a) => [a.clientId, a]),
    );
  } catch (err) {
    loadError.value =
      err instanceof Error ? err.message : 'Could not load schedule.';
  } finally {
    loading.value = false;
  }
});

// ─── Stepper handlers ───────────────────────────────────────────────────────

const pickerOpen = ref(false);
const pickerSection = ref<PssDayStepperSectionRef | null>(null);

function onJumpToDay(day: PssDayOfWeek): void {
  if (!record.value) return;
  const i = record.value.activeDays.indexOf(day);
  if (i >= 0) currentDayIndex.value = i;
}

function onAddActivity(section: PssDayStepperSectionRef): void {
  pickerSection.value = section;
  pickerOpen.value = true;
}

function onPickerOpenChange(open: boolean): void {
  pickerOpen.value = open;
  if (!open) pickerSection.value = null;
}

async function onPickerSelect(activity: PssActivityRecord): Promise<void> {
  if (!record.value || !pickerSection.value) return;
  const section = pickerSection.value;
  const existing = record.value.templateSlots.filter(
    (s) =>
      s.day === section.day &&
      s.timePeriod === section.timePeriod &&
      s.ageGroup === section.ageGroup,
  );
  const newSlot: PssTemplateSlot = {
    day: section.day,
    timePeriod: section.timePeriod,
    ageGroup: section.ageGroup,
    order: existing.length + 1,
    activityId: activity.clientId,
  };
  // Cache the activity if it wasn't already loaded (custom-created path).
  if (!activityById.value.has(activity.clientId)) {
    const next = new Map(activityById.value);
    next.set(activity.clientId, activity);
    activityById.value = next;
  }
  await mutateRecord((r) => {
    r.templateSlots = [...r.templateSlots, newSlot];
  });
  pickerOpen.value = false;
  pickerSection.value = null;
}

async function onRemoveSlot(slot: PssTemplateSlot): Promise<void> {
  await mutateRecord((r) => {
    const filtered = r.templateSlots.filter(
      (s) =>
        !(
          s.day === slot.day &&
          s.timePeriod === slot.timePeriod &&
          s.ageGroup === slot.ageGroup &&
          s.activityId === slot.activityId &&
          s.order === slot.order
        ),
    );
    let order = 1;
    r.templateSlots = filtered.map((s) => {
      if (
        s.day === slot.day &&
        s.timePeriod === slot.timePeriod &&
        s.ageGroup === slot.ageGroup
      ) {
        return { ...s, order: order++ };
      }
      return s;
    });
  });
}

async function onReorderSlots(payload: PssDayStepperSectionRef & {
  slots: PssTemplateSlot[];
}): Promise<void> {
  await mutateRecord((r) => {
    const others = r.templateSlots.filter(
      (s) =>
        !(
          s.day === payload.day &&
          s.timePeriod === payload.timePeriod &&
          s.ageGroup === payload.ageGroup
        ),
    );
    r.templateSlots = [...others, ...payload.slots];
  });
}

async function onCopyMonday(payload: {
  sourceDay: PssDayOfWeek;
  targetDays: PssDayOfWeek[];
  clonedSlots: PssTemplateSlot[];
}): Promise<void> {
  await mutateRecord((r) => {
    const kept = r.templateSlots.filter(
      (s) => !payload.targetDays.includes(s.day),
    );
    r.templateSlots = [...kept, ...payload.clonedSlots];
  });
  toast.success(
    `Copied ${payload.sourceDay.toUpperCase()} into ${payload.targetDays.length} day(s).`,
  );
}

// ─── Save ───────────────────────────────────────────────────────────────────

async function onSave(): Promise<void> {
  if (!record.value || saving.value) return;
  saving.value = true;
  try {
    const previous = await schedulesRepository.getActive(
      record.value.cfsLocationId,
    );
    const result = await save(
      { ...record.value, status: 'active' },
      {
        isOnline: offline.isOnline.value,
        previousActive:
          previous && previous.clientId !== record.value.clientId
            ? previous
            : null,
      },
    );
    if (!result.ok) {
      if (result.error) {
        toast.error('Could not save schedule.', { detail: result.error });
      } else {
        toast.warning('Fix the highlighted issues before saving.');
      }
      return;
    }
    toast.success(
      result.synced
        ? 'Schedule activated.'
        : 'Schedule saved offline. It will sync when you are back online.',
    );
    await router.push(`/activities/${frameworkId}/pss/schedules`);
  } finally {
    saving.value = false;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getActivityView(
  activityId: string,
): PssDayStepperActivityView | undefined {
  const a = activityById.value.get(activityId);
  if (!a) return undefined;
  return { name: a.name, category: a.category, ageGroup: a.ageGroup };
}

/**
 * Apply a mutation to the in-memory record and persist it to IndexedDB.
 */
async function mutateRecord(
  fn: (r: PssScheduleRecord) => void,
): Promise<void> {
  if (!record.value) return;
  const next: PssScheduleRecord = {
    ...record.value,
    templateSlots: [...record.value.templateSlots],
  };
  fn(next);
  next.updatedAt = new Date().toISOString();
  next.clientTimestamp = next.updatedAt;
  next.syncStatus = 'pending';
  record.value = next;
  try {
    await schedulesRepository.upsert(next);
  } catch (err) {
    toast.error('Could not save change locally.', {
      detail: err instanceof Error ? err.message : 'Unknown error.',
    });
  }
}
</script>

<style scoped>
.pss-schedule {
  --pad-x: clamp(1rem, 4vw, 1.5rem);
  max-width: 720px;
}

.page-header { margin-bottom: 24px; }

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

.state {
  padding: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 0.85rem;
}
.state--error { color: var(--error); }

.extras {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 24px;
}

.btn-primary,
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.84rem;
  font-family: inherit;
  text-decoration: none;
  min-height: 40px;
  cursor: pointer;
  transition: opacity 0.15s, background-color 0.15s, color 0.15s, transform 0.1s;
}

.btn-primary {
  background: var(--primary);
  color: #fff;
  border: none;
  font-weight: 600;
}
.btn-primary:hover:not(:disabled)  { opacity: 0.9; }
.btn-primary:active:not(:disabled) { transform: scale(0.98); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-secondary {
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  font-weight: 500;
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
