/**
 * Cohort programmes — closed groups that work through a curriculum session by
 * session (TeamUp, Parenting, Community Dialogue). One set of shared pages in
 * components/cohort/ serves all three; this config holds what differs.
 * Mirrors models.CohortProgram in the API.
 */

export type CohortProgramKey = 'teamup' | 'parenting' | 'community_dialogue'

export interface CohortProgramConfig {
  key: CohortProgramKey
  /** URL segment: /activities/:id/<route>, /dashboard/<route>/:faId, /api/v1/<route>. */
  route: string
  label: string
  /** Activity template code that also marks an activity as this programme. */
  templateCode: string
  /** Who joins groups. */
  participant: 'child' | 'adult'
  /** Plural noun for participants in copy ("children", "caregivers"…). */
  noun: string
  nounSingular: string
  /** Capitalised plural for headings ("Children", "Caregivers"). */
  nounTitle: string
  /** Children's groups are formed by age band (TeamUp). */
  requiresAgeBand: boolean
  /** TeamUp sessions run a 5-step plan with thumbs check-in/check-out. */
  usesSessionSteps: boolean
  /** Short description for the hub. */
  tagline: string
}

export const COHORT_PROGRAMS: Record<CohortProgramKey, CohortProgramConfig> = {
  teamup: {
    key: 'teamup',
    route: 'teamup',
    label: 'TeamUp',
    templateCode: 'TEAMUP',
    participant: 'child',
    noun: 'children',
    nounTitle: 'Children',
    nounSingular: 'child',
    requiresAgeBand: true,
    usesSessionSteps: true,
    tagline: 'Run TeamUp groups through the curriculum and report on them.',
  },
  parenting: {
    key: 'parenting',
    route: 'parenting',
    label: 'Parenting',
    templateCode: 'PARENTING',
    participant: 'adult',
    noun: 'caregivers',
    nounTitle: 'Caregivers',
    nounSingular: 'caregiver',
    requiresAgeBand: false,
    usesSessionSteps: false,
    tagline: 'Run parenting groups with caregivers, module by module.',
  },
  community_dialogue: {
    key: 'community_dialogue',
    route: 'community-dialogue',
    label: 'Community Dialogue',
    templateCode: 'COMMUNITY_DIALOGUE',
    participant: 'adult',
    noun: 'participants',
    nounTitle: 'Participants',
    nounSingular: 'participant',
    requiresAgeBand: false,
    usesSessionSteps: false,
    tagline: 'Run community dialogue groups session by session.',
  },
}

export const cohortProgram = (key: CohortProgramKey) => COHORT_PROGRAMS[key]

/** Which cohort programme an activity belongs to (module column first, then template code). */
export function cohortProgramOf(a: {
  module?: string | null
  activity_code?: string
  code?: string
  template?: { code?: string } | null
}): CohortProgramConfig | null {
  const code = a.template?.code ?? a.activity_code ?? a.code
  return Object.values(COHORT_PROGRAMS).find(p => a.module === p.key || code === p.templateCode) ?? null
}
