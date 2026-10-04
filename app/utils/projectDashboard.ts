/**
 * Shared helpers for the project-level dashboards (project overview and the
 * impact drill-down): logframe labels, target-field sources and the
 * pace-based indicator status.
 */

import type {
  ProjectActivity,
  ProjectLogframeIndicator,
  ProjectLogframeLevel,
  ProjectTargetFieldProgress,
} from '../interfaces/dashboard'

const TYPE_LABELS: Record<string, string> = {
  goal: 'Goal', impact: 'Impact', outcome: 'Outcome', output: 'Output', result: 'Result', activity: 'Activity',
}

export function levelTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type
}

const MEASURE_LABELS: Record<string, string> = {
  total: 'all beneficiaries',
  female: 'girls / female',
  male: 'boys / male',
  disability: 'beneficiaries with disability',
  female_disability: 'girls with disability',
  male_disability: 'boys with disability',
}

/** Where a target field's actual comes from, in words. */
export function targetFieldSourceLabel(tf: ProjectTargetFieldProgress): string {
  if (tf.source === 'manual') return 'Entered manually'
  if (tf.source === 'computed') return `Counted from ${MEASURE_LABELS[tf.measure] ?? 'linked activities'}`
  if (tf.measure === 'manual') return 'Manual — no actual entered yet'
  if (tf.target == null) return 'No numeric target'
  return 'Not tracked — choose what this counts in Settings'
}

export const formatNumber = (n: number | null | undefined): string =>
  Math.round(n ?? 0).toLocaleString('en-US')

export function hasTarget(value?: number | null): value is number {
  return value != null && value > 0
}

// ── Pace ─────────────────────────────────────────────────────────────────────

/**
 * Share of the project period that has elapsed, 0–100. Null when the project
 * has no usable dates, in which case statuses cannot be judged against pace.
 */
export function periodElapsed(start?: string, end?: string, now = new Date()): number | null {
  if (!start || !end) return null
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return null
  return Math.round(Math.min(Math.max((now.getTime() - s) / (e - s), 0), 1) * 100)
}

export type IndicatorStatus = 'achieved' | 'good' | 'warn' | 'bad' | 'pending' | 'none'

export const STATUS_LABELS: Record<IndicatorStatus, string> = {
  achieved: 'Achieved',
  good: 'On track',
  warn: 'Needs attention',
  bad: 'Behind',
  pending: 'In progress',
  none: 'No target',
}

/**
 * Status of a progress percentage against how much of the project period has
 * passed: at least 90% of the expected pace is on track, 60–89% needs
 * attention, under 60% is behind. Without dates (or before the project
 * starts) nothing can be expected yet, so it reads "In progress".
 */
export function paceStatus(progress: number | null, expected: number | null): IndicatorStatus {
  if (progress === null) return 'none'
  if (progress >= 100) return 'achieved'
  if (!expected) return 'pending'
  const pace = progress / expected
  return pace >= 0.9 ? 'good' : pace >= 0.6 ? 'warn' : 'bad'
}

// ── Data checks ──────────────────────────────────────────────────────────────

export type CheckLevel = 'ok' | 'warn'
export interface IndicatorCheck { level: CheckLevel; text: string }

/** Setup checks shown on an indicator; a 'warn' marks it as needing setup. */
export function indicatorChecks(ind: ProjectLogframeIndicator): IndicatorCheck[] {
  const out: IndicatorCheck[] = []
  const fields = ind.target_fields ?? []

  if (hasTarget(ind.target_value)) out.push({ level: 'ok', text: `Target set (${formatNumber(ind.target_value)}${ind.unit ? ` ${ind.unit}` : ''}).` })
  else if (fields.some(f => f.target != null)) out.push({ level: 'ok', text: 'Targets set on its target fields.' })
  else out.push({ level: 'warn', text: 'No numerical target set yet.' })

  const links = ind.linked_activity_ids?.length ?? 0
  out.push(links
    ? { level: 'ok', text: `Linked to ${links} activit${links === 1 ? 'y' : 'ies'}.` }
    : { level: 'warn', text: 'Not linked to any activity, so nothing is counted towards it.' })

  const untracked = fields.filter(f => f.source === 'none' && f.target != null).length
  if (untracked) out.push({ level: 'warn', text: `${untracked} target field${untracked === 1 ? ' is' : 's are'} not tracked yet.` })

  return out
}

// ── Logframe tree ────────────────────────────────────────────────────────────

/** The impact a level sits under (itself when it is one); null when none. */
export function impactAncestor(levelId: string, levels: ProjectLogframeLevel[]): ProjectLogframeLevel | null {
  const byId = new Map(levels.map(l => [l.id, l]))
  const seen = new Set<string>()
  let cur = byId.get(levelId)
  while (cur && !seen.has(cur.id)) {
    if (cur.level_type === 'impact') return cur
    seen.add(cur.id)
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined
  }
  return null
}

// ── View models ──────────────────────────────────────────────────────────────

export interface IndicatorRow {
  ind: ProjectLogframeIndicator
  /** Overall progress against the numerical target, 0+ (null without one). */
  progress: number | null
  status: IndicatorStatus
  checks: IndicatorCheck[]
  /** Number of setup checks still open. */
  issues: number
  /** e.g. "Outcome: Children are safer" when the indicator sits below the impact. */
  levelLabel: string
  fieldCount: number
  activities: ProjectActivity[]
}

/** Indicators grouped under the impact they roll up to. */
export interface IndicatorGroup {
  id: string
  /** Two-digit impact number, empty for indicators outside any impact. */
  number: string
  title: string
  progress: number | null
  link: string | null
  rows: IndicatorRow[]
}
