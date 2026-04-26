/**
 * utils/activityConfig.ts
 *
 * Maps activity template codes to their route, icon, and display label.
 * Used by the sidebar to dynamically render navigation items
 * based on the organisation's active framework activities.
 */

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
  CFS_ATTENDANCE: {
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
