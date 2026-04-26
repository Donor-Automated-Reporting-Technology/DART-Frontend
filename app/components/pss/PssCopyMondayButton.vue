<script setup lang="ts">
/**
 * PssCopyMondayButton — productivity shortcut for the CFS schedule wizard.
 *
 * Jira: DART-48 (sub-task of DART-36).
 * Source: DART/PSS_MODULE_PRD.md §6.5, DART/PSS_SCHEDULE_TRD.md §6.1 (PSS-013).
 *
 * Renders the "Copy Monday → All Days" button that appears on the Monday
 * step of the day-by-day stepper (DART-43). On tap it deep-clones every
 * Monday slot — with fresh slot identity — onto the other ACTIVE days.
 *
 * Stateless / presentation-only — mirrors the DART-43 stepper contract:
 * the parent owns the schedule, listens for `copy`, and commits the
 * cloned slots into its store. This component never writes to IndexedDB,
 * never calls the API, and never mutates the prop.
 *
 * Day-locking (sessions started) is honoured by the parent via the
 * `lockedDays` prop — locked target days are simply omitted from the
 * computed target list, so the user is never asked to overwrite a day
 * they are not allowed to edit.
 *
 * Dialog UX:
 *   • If every target day is empty → silent copy + success toast.
 *   • If any target day already has slots → confirm dialog listing the
 *     days that will be overwritten. Default focus on Cancel.
 */

import { computed, nextTick, ref, watch } from 'vue';
import { Copy } from 'lucide-vue-next';

import { useToast } from '~/composables/useToast';
import type {
  PssDayOfWeek,
  PssScheduleRecord,
  PssTemplateSlot,
} from '~/interfaces/pssDb';

interface Props {
  /** The draft schedule the parent is editing. */
  schedule: Pick<PssScheduleRecord, 'activeDays' | 'templateSlots'>;
  /** The day this button copies FROM. Defaults to Monday. */
  sourceDay?: PssDayOfWeek;
  /** Days that must NOT be written to (e.g. sessions already started). */
  lockedDays?: PssDayOfWeek[];
  /** Disable the whole control (e.g. parent is saving). */
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  sourceDay: 'mon',
  lockedDays: () => [],
  disabled: false,
});

const emit = defineEmits<{
  /**
   * User confirmed the copy. The parent must replace `templateSlots` for
   * each target day with the supplied `clonedSlots` (which already carry
   * the correct `day` for each entry and fresh `order` numbering).
   */
  copy: [
    payload: {
      sourceDay: PssDayOfWeek;
      targetDays: PssDayOfWeek[];
      clonedSlots: PssTemplateSlot[];
    },
  ];
}>();

const toast = useToast();

// ── Day labels (display only) ───────────────────────────────────────────
const DAY_LABEL: Record<PssDayOfWeek, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

// ── Derived state ───────────────────────────────────────────────────────

/** Slots belonging to the source day, in their authored order. */
const sourceSlots = computed<PssTemplateSlot[]>(() =>
  props.schedule.templateSlots
    .filter((s) => s.day === props.sourceDay)
    .slice()
    .sort((a, b) => a.order - b.order),
);

/** Active days minus the source day minus any locked days. */
const targetDays = computed<PssDayOfWeek[]>(() => {
  const locked = new Set(props.lockedDays);
  return props.schedule.activeDays.filter(
    (d) => d !== props.sourceDay && !locked.has(d),
  );
});

/** Days among the targets that already hold ≥1 slot. */
const conflictingDays = computed<PssDayOfWeek[]>(() => {
  const occupied = new Set(
    props.schedule.templateSlots.map((s) => s.day),
  );
  return targetDays.value.filter((d) => occupied.has(d));
});

/** AC: visible only on the source day, only when source has ≥1 slot. */
const canCopy = computed<boolean>(
  () =>
    !props.disabled &&
    sourceSlots.value.length > 0 &&
    targetDays.value.length > 0,
);

// ── Confirm dialog ──────────────────────────────────────────────────────
const showDialog = ref(false);
const cancelButtonRef = ref<HTMLButtonElement | null>(null);

watch(showDialog, async (open) => {
  if (open) {
    await nextTick();
    cancelButtonRef.value?.focus();
  }
});

/** Build deep-cloned slots for every target day. PssTemplateSlot is keyed
 *  implicitly by (day, timePeriod, ageGroup, order); cloning to a new day
 *  is the only freshening required for them to be independent records. */
function buildClonedSlots(): PssTemplateSlot[] {
  const out: PssTemplateSlot[] = [];
  for (const day of targetDays.value) {
    for (const slot of sourceSlots.value) {
      out.push({
        day,
        timePeriod: slot.timePeriod,
        ageGroup: slot.ageGroup,
        order: slot.order,
        activityId: slot.activityId,
      });
    }
  }
  return out;
}

function performCopy(): void {
  const targets = targetDays.value;
  if (targets.length === 0) return;
  const clonedSlots = buildClonedSlots();
  emit('copy', {
    sourceDay: props.sourceDay,
    targetDays: targets,
    clonedSlots,
  });
  const targetLabel = targets.map((d) => DAY_LABEL[d]).join(', ');
  toast.success(`Copied ${DAY_LABEL[props.sourceDay]} to ${targetLabel}`);
}

function onClick(): void {
  if (!canCopy.value) return;
  if (conflictingDays.value.length === 0) {
    performCopy();
    return;
  }
  showDialog.value = true;
}

function onConfirm(): void {
  showDialog.value = false;
  performCopy();
}

function onCancel(): void {
  showDialog.value = false;
}
</script>

<template>
  <div v-if="canCopy" class="pss-copy-monday">
    <button
      type="button"
      class="pss-copy-monday__btn"
      :aria-label="`Copy ${DAY_LABEL[props.sourceDay]} schedule to ${targetDays
        .map((d) => DAY_LABEL[d])
        .join(', ')}`"
      @click="onClick"
    >
      <Copy class="pss-copy-monday__icon" aria-hidden="true" />
      <span>Copy {{ DAY_LABEL[props.sourceDay] }} → All Days</span>
    </button>

    <!-- Confirm dialog (only when at least one target day already has slots) -->
    <Teleport v-if="showDialog" to="body">
      <div
        class="pss-copy-monday__overlay"
        role="presentation"
        @click.self="onCancel"
      >
        <div
          class="pss-copy-monday__dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pss-copy-monday-title"
          aria-describedby="pss-copy-monday-desc"
        >
          <h2 id="pss-copy-monday-title" class="pss-copy-monday__title">
            Overwrite existing days?
          </h2>
          <p id="pss-copy-monday-desc" class="pss-copy-monday__desc">
            Overwrite
            <strong>{{
              conflictingDays.map((d) => DAY_LABEL[d]).join(', ')
            }}</strong
            >? This cannot be undone.
          </p>
          <div class="pss-copy-monday__actions">
            <button
              ref="cancelButtonRef"
              type="button"
              class="pss-copy-monday__btn pss-copy-monday__btn--ghost"
              @click="onCancel"
            >
              Cancel
            </button>
            <button
              type="button"
              class="pss-copy-monday__btn pss-copy-monday__btn--danger"
              @click="onConfirm"
            >
              Overwrite
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.pss-copy-monday {
  display: flex;
}

.pss-copy-monday__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.625rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border-color);
  background: var(--primary-dim);
  color: var(--primary);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease,
    transform 120ms ease;
}

.pss-copy-monday__btn:hover {
  background: var(--primary-hover);
  border-color: var(--primary);
}

.pss-copy-monday__btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--focus-ring);
}

.pss-copy-monday__btn:active {
  transform: translateY(1px);
}

.pss-copy-monday__icon {
  width: 1rem;
  height: 1rem;
}

.pss-copy-monday__btn--ghost {
  background: var(--bg-input);
  border-color: var(--border-color);
  color: var(--text-secondary);
}

.pss-copy-monday__btn--ghost:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.pss-copy-monday__btn--danger {
  background: var(--error-bg);
  border-color: var(--error);
  color: var(--error);
}

.pss-copy-monday__btn--danger:hover {
  background: var(--error-bg);
  border-color: var(--error);
  opacity: 0.85;
}

.pss-copy-monday__overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 1rem;
  z-index: 60;
}

.pss-copy-monday__dialog {
  width: 100%;
  max-width: 24rem;
  background: var(--bg-panel);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 1rem;
  padding: 1.25rem;
  box-shadow: var(--shadow-elevated);
}

.pss-copy-monday__title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  color: var(--text-primary);
}

.pss-copy-monday__desc {
  font-size: 0.875rem;
  line-height: 1.4;
  margin: 0 0 1.25rem;
  color: var(--text-secondary);
}

.pss-copy-monday__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
