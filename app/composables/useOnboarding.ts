/**
 * composables/useOnboarding.ts
 *
 * Shared composable for the framework-based 3-step onboarding banner.
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

  const isOrgAdmin = computed<boolean>(
    () => authStore.userRole === 'org_admin',
  )

  /**
   * Master visibility switch for the banner.
   * Hidden for non-admins and once all three steps are done.
   */
  const shouldShowBanner = computed<boolean>(
    () => isOrgAdmin.value && !store.onboarding_complete,
  )

  // ── Progress bar ────────────────────────────────────────────────────────────

  const progressBarStyle = computed(() => {
    const pct = store.progressPercent
    const color =
      pct === 100 ? 'var(--success)'   :
      pct === 0   ? 'var(--text-muted)' :
      'var(--primary)'

    return { width: `${pct}%`, backgroundColor: color }
  })

  // ── Initialisation ──────────────────────────────────────────────────────────

  async function init(): Promise<void> {
    await store.fetchStatus()

    const first = store.firstIncomplete
    if (first && !store.onboarding_complete) {
      store.openStep(first.step)
    }
  }

  // ── Step events ─────────────────────────────────────────────────────────────

  async function onStepComplete(n: number): Promise<void> {
    store.markComplete(n)
    await store.fetchStatus()
  }

  // ── Step indicator helpers ──────────────────────────────────────────────────

  function stepIndicatorClass(step: Pick<OnboardingStep, 'complete' | 'active'>): string {
    if (step.complete) return 'step-indicator--complete'
    if (step.active)   return 'step-indicator--active'
    return ''
  }

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
