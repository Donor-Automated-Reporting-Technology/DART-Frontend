/**
 * composables/useOnboarding.ts
 *
 * Shared composable for the ST-06 progressive onboarding banner.
 *
 * Provides:
 *  - Visibility guard (org_admin only)
 *  - Progress bar reactive style
 *  - Initialisation helper (fetch status + open first incomplete step)
 *  - Step-complete callback (marks done + re-syncs from server)
 *  - Step indicator CSS class helper
 */

import { computed } from 'vue'
import { useOnboardingStore } from '../stores/onboarding'
import { useAuthStore } from '../stores/auth'
import type { OnboardingStep } from '../interfaces/onboarding'

export const useOnboarding = () => {
  const store     = useOnboardingStore()
  const authStore = useAuthStore()

  // ── Visibility ──────────────────────────────────────────────────────────────

  /** Only org_admin users see the onboarding banner */
  const isOrgAdmin = computed<boolean>(
    () => authStore.userRole === 'org_admin',
  )

  /**
   * Master visibility switch for the banner.
   * Hidden for non-admins and once all four steps are done.
   */
  const shouldShowBanner = computed<boolean>(
    () => isOrgAdmin.value && !store.onboarding_complete,
  )

  // ── Progress bar ────────────────────────────────────────────────────────────

  /**
   * Reactive inline style for the progress bar fill element.
   *
   * Colour transitions:
   *   0 %        → var(--text-muted)  grey
   *   25 – 75 %  → var(--primary)     blue
   *   100 %      → var(--success)     green
   */
  const progressBarStyle = computed(() => {
    const pct = store.progressPercent
    const color =
      pct === 100 ? 'var(--success)'   :
      pct === 0   ? 'var(--text-muted)' :
      'var(--primary)'

    return { width: `${pct}%`, backgroundColor: color }
  })

  // ── Initialisation ──────────────────────────────────────────────────────────

  /**
   * init
   *
   * Called on dashboard layout / page mount.
   * Fetches the current onboarding status from the server, then
   * automatically opens the first incomplete step panel.
   */
  async function init(): Promise<void> {
    await store.fetchStatus()

    // Auto-open the first incomplete step so the user can act immediately
    const first = store.firstIncomplete
    if (first && !store.onboarding_complete) {
      store.openStep(first.step)
    }
  }

  // ── Step events ─────────────────────────────────────────────────────────────

  /**
   * onStepComplete
   *
   * Emitted by each step panel when the user successfully saves.
   * Marks the step complete locally, then re-fetches server state to ensure
   * all completion flags are authoritative.
   */
  async function onStepComplete(n: number): Promise<void> {
    store.markComplete(n)
    await store.fetchStatus()
  }

  // ── Step indicator helpers ──────────────────────────────────────────────────

  /**
   * Returns the BEM modifier class for a step's circle indicator.
   *
   *   complete  → step-indicator--complete  (green + checkmark)
   *   active    → step-indicator--active    (blue  + number)
   *   default   → ''                        (grey  + number)
   */
  function stepIndicatorClass(step: Pick<OnboardingStep, 'complete' | 'active'>): string {
    if (step.complete) return 'step-indicator--complete'
    if (step.active)   return 'step-indicator--active'
    return ''
  }

  /**
   * Returns the accessible label for a step's current state.
   * Used for aria-label on the step row buttons.
   */
  function stepAriaLabel(step: OnboardingStep): string {
    const state = step.complete ? 'Complete' : step.active ? 'In progress' : 'Not started'
    return `Step ${step.step}: ${step.label} — ${state}`
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  return {
    store,
    isOrgAdmin,
    shouldShowBanner,
    progressBarStyle,
    init,
    onStepComplete,
    stepIndicatorClass,
    stepAriaLabel,
  }
}
