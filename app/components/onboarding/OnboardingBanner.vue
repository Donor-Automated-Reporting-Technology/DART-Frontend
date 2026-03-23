<template>
  <!--
    OnboardingBanner.vue
    ─────────────────────────────────────────────────────────────────────────────
    ST-06 — Progressive onboarding banner.

    Visible only to org_admin users while onboarding_complete = false.

    States:
      Collapsed  — shows progress bar + step count + "Continue setup" button.
      Expanded   — shows all four step rows; clicking a row opens its inline panel.
      Completing — green flash shown for 3 s then the banner self-hides.

    The component is driven by useOnboarding() composable + useOnboardingStore().
    Each step panel emits 'complete' which is handled by onStepComplete().
  -->
  <Transition name="banner-fade">
    <div
      v-if="shouldShowBanner || showCompletion"
      class="onboarding-banner"
      :class="{ 'banner--completing': showCompletion }"
      role="region"
      aria-label="Organisation setup progress"
    >

      <!-- ══════════════════════════════════════════════════════════════════════
           COMPLETION SCREEN
           Shown for 3 seconds after step 4 completes, then fades permanently.
           ══════════════════════════════════════════════════════════════════════ -->
      <div v-if="showCompletion" class="banner-complete">
        <AppIcon name="check-circle" :size="18" class="complete-icon" />
        <span>DART is ready — your team can now log in</span>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════════
           COLLAPSED BAR  (always visible while banner is shown)
           ══════════════════════════════════════════════════════════════════════ -->
      <div v-else class="banner-bar">

        <!-- Left: progress track + count label -->
        <div class="bar-left">
          <div class="progress-track" aria-hidden="true">
            <div
              class="progress-fill"
              :style="progressBarStyle"
              role="progressbar"
              :aria-valuenow="store.completedCount"
              aria-valuemin="0"
              aria-valuemax="4"
            />
          </div>

          <span class="bar-label">
            <span class="bar-count">{{ store.completedCount }}</span>
            &thinsp;of&thinsp;
            <span class="bar-count">4</span>
            steps complete
          </span>
        </div>

        <!-- Right: collapse/expand toggle -->
        <div class="bar-right">
          <button
            type="button"
            class="continue-btn"
            @click="handleToggle"
            :aria-expanded="store.bannerExpanded"
            aria-controls="onboarding-steps-list"
          >
            {{ store.bannerExpanded ? 'Collapse' : 'Continue setup' }}
            <AppIcon
              name="chevron-down"
              :size="13"
              class="toggle-chevron"
              :class="{ 'toggle-chevron--up': store.bannerExpanded }"
            />
          </button>
        </div>

      </div><!-- /banner-bar -->

      <!-- ══════════════════════════════════════════════════════════════════════
           EXPANDED STEPS LIST
           ══════════════════════════════════════════════════════════════════════ -->
      <Transition name="steps-slide">
        <div
          v-if="store.bannerExpanded && !showCompletion"
          id="onboarding-steps-list"
          class="banner-steps"
        >

          <template v-for="step in store.steps" :key="step.step">

            <!-- ── Step header row ──────────────────────────────────────── -->
            <div
              class="step-row"
              :class="{
                'step-row--complete': step.complete,
                'step-row--active':   step.active,
              }"
              :role="!step.complete ? 'button' : 'presentation'"
              :tabindex="!step.complete ? 0 : -1"
              :aria-label="stepAriaLabel(step)"
              :aria-expanded="step.active"
              @click="handleStepClick(step)"
              @keydown.enter.space.prevent="handleStepClick(step)"
            >
              <!-- Indicator circle -->
              <div
                class="step-circle"
                :class="stepIndicatorClass(step)"
                aria-hidden="true"
              >
                <AppIcon v-if="step.complete" name="check" :size="11" />
                <span v-else class="step-num">{{ step.step }}</span>
              </div>

              <!-- Step label -->
              <span class="step-label">{{ step.label }}</span>

              <!-- Right indicator -->
              <AppIcon
                v-if="!step.complete"
                name="chevron-right"
                :size="14"
                class="step-chevron"
                :class="{ 'step-chevron--open': step.active }"
                aria-hidden="true"
              />
              <span v-else class="step-done-pill">Done</span>
            </div>

            <!-- ── Inline step panel ─────────────────────────────────────── -->
            <Transition name="panel-slide">
              <div v-if="step.active" class="step-panel-wrap">
                <Step1OrgProfile
                  v-if="step.step === 1"
                  @complete="handleStepComplete(1)"
                />
                <Step2DonorSelection
                  v-else-if="step.step === 2"
                  @complete="handleStepComplete(2)"
                />
                <Step3ActivityConfirm
                  v-else-if="step.step === 3"
                  @complete="handleStepComplete(3)"
                />
                <Step4TeamMember
                  v-else-if="step.step === 4"
                  @complete="handleStepComplete(4)"
                  @skip="handleStepComplete(4)"
                />
              </div>
            </Transition>

          </template>

        </div>
      </Transition>

    </div>
  </Transition>
</template>

<script setup lang="ts">
/**
 * OnboardingBanner — script
 *
 * Orchestrates the four-step onboarding flow.
 * Delegates state to useOnboarding() composable and useOnboardingStore().
 * Handles expand/collapse, step navigation and the 3-second completion screen.
 */
import { ref, watch, onMounted } from 'vue'
import { useOnboarding }     from '../../composables/useOnboarding'
import AppIcon               from '../interfaces/AppIcon.vue'
import Step1OrgProfile       from './steps/Step1OrgProfile.vue'
import Step2DonorSelection   from './steps/Step2DonorSelection.vue'
import Step3ActivityConfirm  from './steps/Step3ActivityConfirm.vue'
import Step4TeamMember       from './steps/Step4TeamMember.vue'
import type { OnboardingStep } from '../../interfaces/onboarding'

// ── Composable & store ────────────────────────────────────────────────────────

const {
  store,
  shouldShowBanner,
  progressBarStyle,
  onStepComplete,
  stepIndicatorClass,
  stepAriaLabel,
  init,
} = useOnboarding()

// ── Completion screen ─────────────────────────────────────────────────────────

/**
 * Controls the 3-second green completion flash.
 * Set to true when all 4 steps are done; auto-resets after 3 000 ms so the
 * banner fades out permanently (shouldShowBanner becomes false because
 * onboarding_complete is now true).
 */
const showCompletion = ref(false)

watch(
  () => store.onboarding_complete,
  (done) => {
    if (done) {
      showCompletion.value = true
      setTimeout(() => {
        showCompletion.value = false
      }, 3000)
    }
  },
)

// ── Toggle banner expand / collapse ──────────────────────────────────────────

function handleToggle(): void {
  if (store.bannerExpanded) {
    store.dismiss()
  } else {
    store.bannerExpanded = true
    // Re-open first incomplete step when expanding
    const first = store.firstIncomplete
    if (first) store.openStep(first.step)
  }
}

// ── Step row click ────────────────────────────────────────────────────────────

function handleStepClick(step: OnboardingStep): void {
  if (step.complete) return   // completed steps are not interactive

  if (step.active) {
    // Collapse already-open panel
    store.dismiss()
    store.bannerExpanded = true
  } else {
    store.openStep(step.step)
  }
}

// ── Step completion ───────────────────────────────────────────────────────────

async function handleStepComplete(n: number): Promise<void> {
  await onStepComplete(n)
}

// ── Initialise on mount ───────────────────────────────────────────────────────

onMounted(() => {
  init()
})
</script>

<style scoped>
/* ── Banner container ─────────────────────────────────────────────────────── */

.onboarding-banner {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: border-color 0.3s;
}

.onboarding-banner.banner--completing {
  border-color: var(--success);
}

/* ══════════════════════════════════════════════════════════════════════════════
   COMPLETION SCREEN
   ══════════════════════════════════════════════════════════════════════════════ */

.banner-complete {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: var(--success-bg);
  color: var(--third);
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.4;
}

.complete-icon {
  flex-shrink: 0;
  color: var(--third);
}

/* ══════════════════════════════════════════════════════════════════════════════
   COLLAPSED BAR
   ══════════════════════════════════════════════════════════════════════════════ */

.banner-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  flex-wrap: wrap;
}

/* ── Left side ─────────────────────────────────────────────────────────────── */

.bar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.progress-track {
  width: 160px;
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  overflow: hidden;
  flex-shrink: 0;
}

@media (max-width: 480px) {
  .progress-track {
    width: 90px;
  }
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease, background-color 0.4s ease;
}

.bar-label {
  font-size: 0.82rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.bar-count {
  font-weight: 700;
  color: var(--text-primary);
}

/* ── Right side ────────────────────────────────────────────────────────────── */

.bar-right {
  flex-shrink: 0;
}

.continue-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--primary-dim);
  border: 1px solid var(--primary);
  border-radius: var(--radius-sm);
  color: var(--primary);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.continue-btn:hover {
  background: var(--primary-hover);
}

.toggle-chevron {
  transition: transform 0.22s ease;
  flex-shrink: 0;
}

.toggle-chevron--up {
  transform: rotate(180deg);
}

/* ══════════════════════════════════════════════════════════════════════════════
   EXPANDED STEPS LIST
   ══════════════════════════════════════════════════════════════════════════════ */

.banner-steps {
  border-top: 1px solid var(--border-subtle);
}

/* ── Step header row ──────────────────────────────────────────────────────── */

.step-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 20px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-subtle);
  transition: background 0.12s;
  user-select: none;
}

.step-row:last-child {
  border-bottom: none;
}

.step-row--complete {
  cursor: default;
}

.step-row:not(.step-row--complete):hover {
  background: var(--bg-card-hover);
}

.step-row--active {
  background: var(--bg-card);
}

.step-row:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}

/* ── Step circle ──────────────────────────────────────────────────────────── */

.step-circle {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 700;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}

/* Complete: green circle with checkmark */
.step-circle.step-indicator--complete {
  background: var(--success-bg);
  border-color: var(--success);
  color: var(--third);
}

/* Active: blue circle with number */
.step-circle.step-indicator--active {
  background: var(--primary-dim);
  border-color: var(--primary);
  color: var(--primary);
}

.step-num {
  line-height: 1;
}

/* ── Step label ───────────────────────────────────────────────────────────── */

.step-label {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  line-height: 1.3;
}

.step-row--complete .step-label {
  color: var(--text-muted);
}

.step-row--active .step-label {
  color: var(--text-primary);
  font-weight: 600;
}

/* ── Step chevron ─────────────────────────────────────────────────────────── */

.step-chevron {
  color: var(--text-muted);
  flex-shrink: 0;
  transition: transform 0.22s ease, color 0.15s;
}

.step-chevron--open {
  transform: rotate(90deg);
  color: var(--primary);
}

/* ── Done pill ────────────────────────────────────────────────────────────── */

.step-done-pill {
  padding: 2px 8px;
  background: var(--success-bg);
  border: 1px solid var(--success);
  border-radius: 20px;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--third);
  letter-spacing: 0.3px;
  flex-shrink: 0;
}

/* ── Inline step panel wrapper ────────────────────────────────────────────── */

.step-panel-wrap {
  padding: 0 20px 20px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-card);
}

/* ══════════════════════════════════════════════════════════════════════════════
   TRANSITIONS
   ══════════════════════════════════════════════════════════════════════════════ */

/* Banner mount/unmount fade */
.banner-fade-enter-active,
.banner-fade-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.banner-fade-enter-from,
.banner-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Steps list slide */
.steps-slide-enter-active,
.steps-slide-leave-active {
  transition: max-height 0.28s ease, opacity 0.22s ease;
  overflow: hidden;
  max-height: 600px;
}

.steps-slide-enter-from,
.steps-slide-leave-to {
  max-height: 0;
  opacity: 0;
}

/* Per-step panel slide */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: max-height 0.25s ease, opacity 0.2s ease;
  overflow: hidden;
  max-height: 800px;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  max-height: 0;
  opacity: 0;
}

/* ══════════════════════════════════════════════════════════════════════════════
   RESPONSIVE
   ══════════════════════════════════════════════════════════════════════════════ */

@media (max-width: 640px) {
  .banner-bar {
    padding: 10px 14px;
    gap: 10px;
  }

  .step-row {
    padding: 12px 14px;
  }

  .step-panel-wrap {
    padding: 0 14px 16px;
  }
}
</style>
