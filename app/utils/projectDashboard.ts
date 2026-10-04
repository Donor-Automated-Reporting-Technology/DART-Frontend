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
  year: 'enrolments in that project year',
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

const YEAR_FIELD = /^\s*year\s*(\d+)\s*target/i

/**
 * Target fields as the dashboards show them. "Year N target" fields take
 * their actual from the indicator's enrolments in that project year, and a
 * field with a target but nothing counted yet reads 0 rather than blank.
 */
export function resolveTargetFields(ind: ProjectLogframeIndicator): ProjectTargetFieldProgress[] {
  return (ind.target_fields ?? []).map((f) => {
    const m = f.label.match(YEAR_FIELD)
    const year = m ? ind.years?.find(y => y.year === Number(m[1])) : undefined
    if (year) {
      const actual = year.actual
      const percentage = hasTarget(f.target) ? Math.min(Math.round((actual / f.target) * 100), 100) : 0
      return { ...f, actual, percentage, measure: 'year', source: 'computed' as const }
    }
    if (f.target != null && f.actual == null) return { ...f, actual: 0, percentage: 0 }
    return f
  })
}

export const formatNumber = (n: number | null | undefined): string =>
  Math.round(n ?? 0).toLocaleString('en-US')

export function hasTarget(value?: number | null): value is number {
  return value != null && value > 0
}

// ── Project years ────────────────────────────────────────────────────────────

export interface ProjectYearSpan { year: number; start: string; end: string }

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

/**
 * Reporting years of a project period, matching the backend: Year 1 starts on
 * the project start date, each following year one calendar year later, and
 * the last year ends on the project end date.
 */
export function projectYears(start?: string | null, end?: string | null): ProjectYearSpan[] {
  if (!start || !end) return []
  const s = new Date(`${start.slice(0, 10)}T00:00:00Z`)
  const e = new Date(`${end.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return []
  const out: ProjectYearSpan[] = []
  for (let i = 0; i < 20; i++) {
    const ys = new Date(s); ys.setUTCFullYear(s.getUTCFullYear() + i)
    if (ys > e) break
    const ye = new Date(s); ye.setUTCFullYear(s.getUTCFullYear() + i + 1); ye.setUTCDate(ye.getUTCDate() - 1)
    out.push({ year: i + 1, start: isoDate(ys), end: isoDate(ye > e ? e : ye) })
  }
  return out
}

/** "Y1 · 2027", or "Y1 · 2027–28" when the year spans two calendar years. */
export function yearLabel(y: ProjectYearSpan, long = false): string {
  const a = y.start.slice(0, 4)
  const b = y.end.slice(0, 4)
  const span = a === b ? a : `${a}–${b.slice(2)}`
  return `${long ? 'Year ' : 'Y'}${y.year} · ${span}`
}

/** Index of the year containing `now`, or null outside the period. */
export function currentYearIndex(years: ProjectYearSpan[], now = new Date()): number | null {
  const today = isoDate(now)
  return years.find(y => y.start <= today && today <= y.end)?.year ?? null
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

export type IndicatorStatus = 'achieved' | 'good' | 'warn' | 'bad' | 'pending' | 'upcoming' | 'none'

export const STATUS_LABELS: Record<IndicatorStatus, string> = {
  achieved: 'Achieved',
  good: 'On track',
  warn: 'Needs attention',
  bad: 'Behind',
  pending: 'In progress',
  upcoming: 'Not started',
  none: 'No target',
}

/**
 * Status of a progress percentage against how much of the project period has
 * passed: at least 90% of the expected pace is on track, 60–89% needs
 * attention, under 60% is behind. Before the project starts nothing is
 * expected yet, so any progress is on track. Without dates it reads
 * "In progress".
 */
export function paceStatus(progress: number | null, expected: number | null): IndicatorStatus {
  if (progress === null) return 'none'
  if (progress >= 100) return 'achieved'
  if (expected === null) return 'pending'
  if (expected === 0) return progress > 0 ? 'good' : 'upcoming'
  const pace = progress / expected
  return pace >= 0.9 ? 'good' : pace >= 0.6 ? 'warn' : 'bad'
}

/**
 * Progress of an indicator, 0+: against its overall target, or, when it only
 * has target fields, against the fields that carry both a target and an
 * actual. Null when there is nothing to measure against.
 */
export function indicatorProgress(ind: ProjectLogframeIndicator): number | null {
  if (hasTarget(ind.target_value)) return Math.round(ind.percentage)
  // Year fields repeat the same people as the breakdown fields, so leave them out.
  const fields = (ind.target_fields ?? []).filter(f => f.measure !== 'year' && hasTarget(f.target) && f.actual != null)
  if (!fields.length) return null
  const target = fields.reduce((s, f) => s + (f.target ?? 0), 0)
  const actual = fields.reduce((s, f) => s + (f.actual ?? 0), 0)
  return Math.min(Math.round((actual / target) * 100), 100)
}

/** True once anything has been counted towards the indicator. */
export function indicatorHasData(ind: ProjectLogframeIndicator): boolean {
  return ind.actual_value > 0 || (ind.target_fields ?? []).some(f => (f.actual ?? 0) > 0)
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
  /** Anything counted yet; groups without data start collapsed. */
  hasData: boolean
  rows: IndicatorRow[]
}

/** One project year of an impact: summed year targets and reach of its indicators. */
export interface YearPoint {
  year: number
  label: string
  target: number
  actual: number
  pct: number
  /** The year has not started yet. */
  future: boolean
}

export interface ImpactYears {
  id: string
  number: string
  title: string
  /** Life-of-project totals of the impact's indicators. */
  target: number
  actual: number
  hasYearTargets: boolean
  years: YearPoint[]
}
