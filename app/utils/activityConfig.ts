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

export const ACTIVITY_CONFIG: Record<string, ActivityConfigEntry> = {
  CFS_ATTENDANCE: {
    icon: 'check-square',
    label: 'Attendance',
    route: '/activities/attendance',
  },
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
