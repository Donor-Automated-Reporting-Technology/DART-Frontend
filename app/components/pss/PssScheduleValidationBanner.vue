<script setup lang="ts">
/**
 * PssScheduleValidationBanner — render save-time validation issues.
 *
 * Jira: DART-41 (sub-task of DART-36).
 *
 * Stateless banner that shows the validator output from
 * `usePssScheduleSave().validate()`:
 *
 *   • RED  — blockers present. Save is disabled by the parent.
 *   • YELLOW — warnings only. Save is allowed.
 *   • Hidden — no issues at all.
 *
 * Issues are listed with their day label so the facilitator can navigate
 * to the offending day on the stepper. A `dismiss-warning` event lets the
 * parent suppress an individual warning when the user knowingly continues.
 */

import { computed } from 'vue';
import { AlertTriangle, AlertCircle, X } from 'lucide-vue-next';

import type {
  PssScheduleValidationIssue,
  PssScheduleValidationResult,
} from '~/composables/usePssScheduleSave';
import type { PssDayOfWeek } from '~/interfaces/pssDb';

interface Props {
  validation: PssScheduleValidationResult;
  /** Allow the parent to hide the banner while submitting, etc. */
  hidden?: boolean;
  /** When true, render a Dismiss (×) button on each warning. */
  dismissibleWarnings?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  hidden: false,
  dismissibleWarnings: false,
});

const emit = defineEmits<{
  'dismiss-warning': [issue: PssScheduleValidationIssue];
  'jump-to-day': [day: PssDayOfWeek];
}>();

const DAY_LABEL: Record<PssDayOfWeek, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

const hasBlockers = computed(() => props.validation.blockers.length > 0);
const hasWarnings = computed(() => props.validation.warnings.length > 0);
const visible = computed(
  () => !props.hidden && (hasBlockers.value || hasWarnings.value),
);
</script>

<template>
  <div v-if="visible" class="pss-validation">
    <!-- Blockers -->
    <div
      v-if="hasBlockers"
      class="pss-validation__panel pss-validation__panel--block"
      role="alert"
    >
      <div class="pss-validation__head">
        <AlertCircle class="pss-validation__icon" aria-hidden="true" />
        <span class="pss-validation__title">
          Fix {{ props.validation.blockers.length }}
          {{ props.validation.blockers.length === 1 ? 'issue' : 'issues' }}
          before saving
        </span>
      </div>
      <ul class="pss-validation__list">
        <li
          v-for="(issue, idx) in props.validation.blockers"
          :key="`blocker-${idx}`"
          class="pss-validation__item"
        >
          <button
            v-if="issue.day"
            type="button"
            class="pss-validation__day-link"
            @click="emit('jump-to-day', issue.day)"
          >
            {{ DAY_LABEL[issue.day] }}
          </button>
          <span class="pss-validation__msg">{{ issue.message }}</span>
        </li>
      </ul>
    </div>

    <!-- Warnings -->
    <div
      v-if="hasWarnings"
      class="pss-validation__panel pss-validation__panel--warn"
      role="status"
    >
      <div class="pss-validation__head">
        <AlertTriangle class="pss-validation__icon" aria-hidden="true" />
        <span class="pss-validation__title">
          {{ props.validation.warnings.length }}
          {{
            props.validation.warnings.length === 1 ? 'warning' : 'warnings'
          }}
          — you can still save
        </span>
      </div>
      <ul class="pss-validation__list">
        <li
          v-for="(issue, idx) in props.validation.warnings"
          :key="`warn-${idx}`"
          class="pss-validation__item"
        >
          <button
            v-if="issue.day"
            type="button"
            class="pss-validation__day-link"
            @click="emit('jump-to-day', issue.day)"
          >
            {{ DAY_LABEL[issue.day] }}
          </button>
          <span class="pss-validation__msg">{{ issue.message }}</span>
          <button
            v-if="props.dismissibleWarnings"
            type="button"
            class="pss-validation__dismiss"
            :aria-label="`Dismiss warning: ${issue.message}`"
            @click="emit('dismiss-warning', issue)"
          >
            <X class="pss-validation__dismiss-icon" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.pss-validation {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pss-validation__panel {
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  border: 1px solid transparent;
}

.pss-validation__panel--block {
  background: var(--error-bg);
  border-color: var(--error);
  color: var(--error);
}

.pss-validation__panel--warn {
  background: var(--warning-bg);
  border-color: var(--warning);
  color: var(--warning);
}

.pss-validation__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
}

.pss-validation__icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.pss-validation__title {
  flex: 1;
}

.pss-validation__list {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.pss-validation__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  line-height: 1.35;
}

.pss-validation__day-link {
  flex-shrink: 0;
  min-height: 24px;
  padding: 0.125rem 0.5rem;
  border-radius: 0.5rem;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: inherit;
  font-weight: 600;
  font-size: 0.75rem;
  cursor: pointer;
}

.pss-validation__day-link:hover {
  background: var(--hover-bg);
}

.pss-validation__day-link:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--focus-ring);
}

.pss-validation__msg {
  flex: 1;
}

.pss-validation__dismiss {
  background: transparent;
  border: 0;
  padding: 0.25rem;
  border-radius: 0.375rem;
  color: inherit;
  opacity: 0.7;
  cursor: pointer;
}

.pss-validation__dismiss:hover {
  opacity: 1;
  background: var(--hover-bg);
}

.pss-validation__dismiss-icon {
  width: 0.875rem;
  height: 0.875rem;
}
</style>
