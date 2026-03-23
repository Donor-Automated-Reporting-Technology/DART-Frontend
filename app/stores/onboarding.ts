/**
 * stores/onboarding.ts
 *
 * Pinia store for the ST-06 progressive onboarding flow.
 *
 * Manages:
 *  - The four-step completion state
 *  - Banner expanded / collapsed toggle
 *  - Organisation profile data (pre-fills Step 1)
 *  - Server-sync via GET /api/v1/onboarding/status
 *
 * Actions follow the interface defined in the ST-06 spec:
 *   fetchStatus()   — syncs state from the server
 *   openStep(n)     — expands step n, collapses all others
 *   markComplete(n) — marks step n done, auto-opens step n+1
 *   dismiss()       — collapses the banner without dismissing permanently
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { OnboardingStep, OrgProfileData } from '../interfaces/onboarding'
import { fetchOnboardingStatus } from '../services/onboardingApi'
import { useAuthStore } from './auth'

// ─── Step labels (display order matches step numbers 1–4) ────────────────────

const STEP_LABELS: string[] = [
  'Organisation profile',
  'Donor selection',
  'Activity confirmation',
  'Add first team member',
]

/** Returns a fresh default steps array — all incomplete, none active */
const buildDefaultSteps = (): OnboardingStep[] =>
  STEP_LABELS.map((label, i) => ({
    step:     i + 1,
    label,
    complete: false,
    active:   false,
  }))

// ─── Store definition ─────────────────────────────────────────────────────────

export const useOnboardingStore = defineStore('onboarding', () => {

  // ── State ──────────────────────────────────────────────────────────────────

  /** The four step entries — completion and active-panel state live here */
  const steps = ref<OnboardingStep[]>(buildDefaultSteps())

  /** True once all four steps are complete — hides the banner permanently */
  const onboarding_complete = ref(false)

  /** True while a server request is in flight */
  const loading = ref(false)

  /** Controls whether the expanded step list is visible */
  const bannerExpanded = ref(false)   // collapsed by default per spec

  /** Organisation profile pre-loaded from the status endpoint for Step 1 */
  const orgProfile = ref<OrgProfileData | null>(null)

  // ── Derived ────────────────────────────────────────────────────────────────

  /** Number of steps that have been marked complete (0–4) */
  const completedCount = computed<number>(
    () => steps.value.filter((s) => s.complete).length,
  )

  /** How many steps are still outstanding */
  const remainingCount = computed<number>(() => 4 - completedCount.value)

  /** 0–100 integer used to drive the progress bar width */
  const progressPercent = computed<number>(
    () => (completedCount.value / 4) * 100,
  )

  /** The step whose inline panel is currently expanded, or null */
  const activeStep = computed<OnboardingStep | null>(
    () => steps.value.find((s) => s.active) ?? null,
  )

  /** The first step that has not yet been completed, or null if all done */
  const firstIncomplete = computed<OnboardingStep | null>(
    () => steps.value.find((s) => !s.complete) ?? null,
  )

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * fetchStatus
   *
   * Calls GET /api/v1/onboarding/status and hydrates:
   *   - step completion flags
   *   - onboarding_complete flag
   *   - orgProfile (used to pre-fill Step 1)
   *
   * Safe to call multiple times — idempotent read.
   */
  async function fetchStatus(): Promise<void> {
    const authStore = useAuthStore()
    const token = authStore.accessToken ?? undefined

    loading.value = true
    try {
      const data = await fetchOnboardingStatus(token)

      onboarding_complete.value = data.onboarding_complete

      // Merge server-side completion flags into local step list
      if (Array.isArray(data.steps)) {
        steps.value = steps.value.map((s) => {
          const match = data.steps.find((d) => d.step === s.step)
          return { ...s, complete: match?.complete ?? s.complete }
        })
      }

      // Cache org profile for Step 1 pre-fill
      if (data.organisation) {
        orgProfile.value = data.organisation
      }
    } catch (err) {
      console.error('[onboarding] fetchStatus failed:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * openStep
   *
   * Expands the banner and sets step `n` as the active (expanded) step,
   * closing all other step panels.
   */
  function openStep(n: number): void {
    bannerExpanded.value = true
    steps.value = steps.value.map((s) => ({
      ...s,
      active: s.step === n,
    }))
  }

  /**
   * markComplete
   *
   * Marks step `n` as complete and automatically opens step `n+1`.
   * If `n` is 4 the overall onboarding_complete flag is set to true.
   */
  function markComplete(n: number): void {
    steps.value = steps.value.map((s) => ({
      ...s,
      complete: s.step === n   ? true        : s.complete,
      active:   s.step === n + 1 && n < 4,
    }))

    if (n === 4) {
      onboarding_complete.value = true
    }
  }

  /**
   * dismiss
   *
   * Collapses the banner panel without permanently hiding it.
   * The user can re-open via the "Continue setup" button.
   */
  function dismiss(): void {
    bannerExpanded.value = false
    steps.value = steps.value.map((s) => ({ ...s, active: false }))
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    // state
    steps,
    onboarding_complete,
    loading,
    bannerExpanded,
    orgProfile,
    // derived
    completedCount,
    remainingCount,
    progressPercent,
    activeStep,
    firstIncomplete,
    // actions
    fetchStatus,
    openStep,
    markComplete,
    dismiss,
  }
})
