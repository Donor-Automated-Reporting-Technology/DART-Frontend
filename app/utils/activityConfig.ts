/**
 * utils/activityConfig.ts
 *
 * Maps activity template codes to their route, icon, and display label.
 * Used by the sidebar to dynamically render navigation items
 * based on the organisation's active framework activities.
 *
 * SINGLE SOURCE OF TRUTH for activity-template `code` strings consumed by
 * the frontend. **Never hard-code `'CFS_ATTENDANCE'` / `'PSS'` / etc. in
 * pages or components — import from `ACTIVITY_CODES` below.** That mirrors
 * the backend `activity_templates.code` column (see DART migrations
 * 000020 + 000034) and is the only way to keep the two halves in lock-step.
 */

/**
 * Canonical activity template codes that the frontend recognises.
 *
 * - `STRUCTURED_PSS` is the live PSS module entry-point. Backend code is
 *   still `CFS_ATTENDANCE` for backwards compatibility (only the display
 *   label was renamed in migration 000034). The legacy literal `'PSS'` is
 *   intentionally NOT a valid code — guard against it via `isPssActivityCode`.
 */
export const ACTIVITY_CODES = {
  STRUCTURED_PSS: 'CFS_ATTENDANCE',
  TEAMUP: 'TEAMUP',
  CHILDREN_SESSIONS: 'CHILDREN_SESSIONS',
  PARENTING: 'PARENTING',
  COMMUNITY_DIALOGUE: 'COMMUNITY_DIALOGUE',
  MASS_AWARENESS: 'MASS_AWARENESS',
  CASE_MANAGEMENT: 'CASE_MANAGEMENT',
  CP_TRAINING: 'CP_TRAINING',
  IGA: 'IGA',
} as const

export type ActivityCode = typeof ACTIVITY_CODES[keyof typeof ACTIVITY_CODES]

/**
 * Tolerant check for the Structured PSS activity. Accepts every
 * variant the backend has ever shipped (`CFS_ATTENDANCE`, `PSS`,
 * `STRUCTURED_PSS`, lowercase, with/without spaces) so that re-seeded
 * environments don't strand the user on the generic activity page.
 *
 * If the code is missing, callers can fall back to `isPssActivityName`.
 */
export function isPssActivityCode(code: string | null | undefined): boolean {
  if (!code) return false
  const norm = String(code).trim().toUpperCase().replace(/[\s-]+/g, '_')
  return (
    norm === 'CFS_ATTENDANCE' ||
    norm === 'PSS' ||
    norm === 'STRUCTURED_PSS' ||
    norm === 'STRUCTURED_PSS_SESSIONS' ||
    norm === 'STRUCTURED_PSS_ACTIVITIES'
  )
}

/**
 * Name-based fallback: any template whose display name contains
 * "Structured PSS" or starts with "PSS" is treated as the PSS module.
 * Used when the backend seed left `code` blank but the name is set.
 */
export function isPssActivityName(name: string | null | undefined): boolean {
  if (!name) return false
  const n = String(name).trim().toLowerCase()
  return (
    n.includes('structured pss') ||
    n.startsWith('pss ') ||
    n === 'pss' ||
    n.includes('psychosocial')
  )
}

export interface ActivityConfigEntry {
  icon: string
  label: string
  route: string
}

/**
 * MVP: Only PSS (Structured PSS Activities) is active.
 * All other activities are defined but disabled — they will show
 * "Coming Soon" in the UI and are excluded from sidebar navigation.
 *
 * NOTE: Backend template code is `CFS_ATTENDANCE` (migration 000020).
 * Migration 000034 renamed the display label to "Structured PSS Sessions";
 * the code itself is intentionally unchanged so existing framework_activities,
 * dashboard queries and seed data keep resolving. The card on
 * `/activities/[id]` routes directly to `/activities/[id]/pss` for this code.
 */
export const ACTIVITY_CONFIG: Record<string, ActivityConfigEntry> = {
  [ACTIVITY_CODES.STRUCTURED_PSS]: {
    icon: 'puzzle',
    label: 'Structured PSS Sessions',
    route: '/activities/pss',
  },
}

/**
 * Full activity registry including future activities (disabled in MVP).
 * Kept here so the codes are documented; will be merged back into
 * ACTIVITY_CONFIG when each activity is implemented.
 */
export const FUTURE_ACTIVITIES: Record<string, ActivityConfigEntry> = {
  TEAMUP: {
    icon: 'users',
    label: 'TeamUp',
    route: '/activities/teamup',
  },
  CHILDREN_SESSIONS: {
    icon: 'book-open',
    label: 'Children Sessions',
    route: '/activities/children-sessions',
  },
  PARENTING: {
    icon: 'heart',
    label: 'Parenting',
    route: '/activities/parenting',
  },
  COMMUNITY_DIALOGUE: {
    icon: 'message-circle',
    label: 'Community Dialogue',
    route: '/activities/community-dialogue',
  },
  MASS_AWARENESS: {
    icon: 'megaphone',
    label: 'Mass Awareness',
    route: '/activities/mass-awareness',
  },
  CASE_MANAGEMENT: {
    icon: 'shield',
    label: 'Case Management',
    route: '/activities/case-management',
  },
  CP_TRAINING: {
    icon: 'award',
    label: 'CP Training',
    route: '/activities/cp-training',
  },
  IGA: {
    icon: 'briefcase',
    label: 'IGA / Livelihoods',
    route: '/activities/iga',
  },
}

/** Get the config for an activity code, or undefined if unknown */
export function getActivityConfig(code: string): ActivityConfigEntry | undefined {
  return ACTIVITY_CONFIG[code]
}

/** Get all activity codes */
export function getActivityCodes(): string[] {
  return Object.keys(ACTIVITY_CONFIG)
}
