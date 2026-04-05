<template>
  <!--
    OnboardingBanner.vue
    ─────────────────────────────────────────────────────────────────────────────
    Framework-based 3-step onboarding flow.

    Steps:
      1. Organisation — "Set your org name and country"
      2. Framework    — "Choose your framework and project details"
      3. Activities   — "Enable at least one activity"

    Post-completion: shows "Get Started" checklist (Locations, Staff, Register).
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
           ══════════════════════════════════════════════════════════════════════ -->
      <div v-if="showCompletion" class="banner-complete">
        <AppIcon name="check-circle" :size="18" class="complete-icon" />
        <div class="complete-content">
          <span class="complete-title">DART is ready — your organisation is set up!</span>
          <div class="checklist">
            <p class="checklist-title">Get started:</p>
            <NuxtLink to="/settings/locations" class="checklist-item" @click="showCompletion = false">
              <AppIcon name="map-pin" :size="13" /> Add your locations and CFS centres
            </NuxtLink>
            <NuxtLink to="/staff" class="checklist-item" @click="showCompletion = false">
              <AppIcon name="users" :size="13" /> Invite your team members
            </NuxtLink>
            <NuxtLink to="/beneficiaries/register" class="checklist-item" @click="showCompletion = false">
              <AppIcon name="user-plus" :size="13" /> Register your first beneficiary
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════════
           COLLAPSED BAR
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
              aria-valuemax="3"
            />
          </div>

          <span class="bar-label">
            <span class="bar-count">{{ store.completedCount }}</span>
            &thinsp;of&thinsp;
            <span class="bar-count">3</span>
            steps complete
          </span>
        </div>

        <!-- Right: skip + collapse/expand toggle -->
        <div class="bar-right">
          <button
            type="button"
            class="skip-btn"
            @click="handleSkip"
            title="Complete setup later in Settings"
          >
            Skip
          </button>
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
                <Step2Framework
                  v-else-if="step.step === 2"
                  @complete="handleStepComplete(2)"
                />
                <Step3ActivityConfirm
                  v-else-if="step.step === 3"
                  @complete="handleStepComplete(3)"
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
import { ref, watch, onMounted } from 'vue'
import { useOnboarding }     from '../../composables/useOnboarding'
import AppIcon               from '../interfaces/AppIcon.vue'
import Step1OrgProfile       from './steps/Step1OrgProfile.vue'
import Step2Framework        from './steps/Step2Framework.vue'
import Step3ActivityConfirm  from './steps/Step3ActivityConfirm.vue'
import type { OnboardingStep } from '../../interfaces/onboarding'

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

const showCompletion = ref(false)

watch(
  () => store.onboarding_complete,
  (done) => {
    if (done) {
      showCompletion.value = true
    }
  },
)

// ── Toggle banner expand / collapse ──────────────────────────────────────────

function handleToggle(): void {
  if (store.bannerExpanded) {
    store.dismiss()
  } else {
    store.bannerExpanded = true
    const first = store.firstIncomplete
    if (first) store.openStep(first.step)
  }
}

// ── Skip ──────────────────────────────────────────────────────────────────────

function handleSkip(): void {
  store.dismiss()
}

// ── Step row click ────────────────────────────────────────────────────────────

function handleStepClick(step: OnboardingStep): void {
  if (step.complete) return

  if (step.active) {
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
  align-items: flex-start;
  gap: 12px;
  padding: 18px 20px;
  background: var(--success-bg);
  color: var(--third);
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.4;
}

.complete-icon {
  flex-shrink: 0;
  color: var(--third);
  margin-top: 1px;
}

.complete-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.complete-title {
  color: var(--third);
  font-weight: 600;
}

.checklist {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.checklist-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0;
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--primary);
  text-decoration: none;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: background 0.15s;
}

.checklist-item:hover {
  background: var(--primary-dim);
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
  .progress-track { width: 90px; }
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

.bar-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.skip-btn {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.skip-btn:hover {
  background: var(--bg-card-hover);
  color: var(--text-secondary);
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

.step-row:last-child { border-bottom: none; }
.step-row--complete { cursor: default; }
.step-row:not(.step-row--complete):hover { background: var(--bg-card-hover); }
.step-row--active { background: var(--bg-card); }
.step-row:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }

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

.step-circle.step-indicator--complete {
  background: var(--success-bg);
  border-color: var(--success);
  color: var(--third);
}

.step-circle.step-indicator--active {
  background: var(--primary-dim);
  border-color: var(--primary);
  color: var(--primary);
}

.step-num { line-height: 1; }

.step-label {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  line-height: 1.3;
}

.step-row--complete .step-label { color: var(--text-muted); }
.step-row--active .step-label { color: var(--text-primary); font-weight: 600; }

.step-chevron {
  color: var(--text-muted);
  flex-shrink: 0;
  transition: transform 0.22s ease, color 0.15s;
}

.step-chevron--open {
  transform: rotate(90deg);
  color: var(--primary);
}

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

.step-panel-wrap {
  padding: 0 20px 20px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-card);
}

/* ══════════════════════════════════════════════════════════════════════════════
   TRANSITIONS
   ══════════════════════════════════════════════════════════════════════════════ */

.banner-fade-enter-active, .banner-fade-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.banner-fade-enter-from, .banner-fade-leave-to {
  opacity: 0; transform: translateY(-6px);
}

.steps-slide-enter-active, .steps-slide-leave-active {
  transition: max-height 0.28s ease, opacity 0.22s ease;
  overflow: hidden; max-height: 600px;
}
.steps-slide-enter-from, .steps-slide-leave-to {
  max-height: 0; opacity: 0;
}

.panel-slide-enter-active, .panel-slide-leave-active {
  transition: max-height 0.25s ease, opacity 0.2s ease;
  overflow: hidden; max-height: 800px;
}
.panel-slide-enter-from, .panel-slide-leave-to {
  max-height: 0; opacity: 0;
}

/* ══════════════════════════════════════════════════════════════════════════════
   RESPONSIVE
   ══════════════════════════════════════════════════════════════════════════════ */

@media (max-width: 640px) {
  .banner-bar { padding: 10px 14px; gap: 10px; }
  .step-row { padding: 12px 14px; }
  .step-panel-wrap { padding: 0 14px 16px; }
}
</style>
