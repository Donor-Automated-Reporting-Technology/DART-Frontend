/**
 * TeamUp Word reports (session report + group progress report).
 *
 * Same technique and typography as the PSS daily facilitator report
 * (pages/activities/[id]/pss/reports/daily.vue): an HTML payload saved as
 * `.doc` with the application/msword MIME type, which Word opens and edits
 * natively without shipping a docx library.
 */
import type {
  TeamUpEnrollment,
  TeamUpGroupReport,
  TeamUpSession,
  TeamUpSessionDetail,
} from '../interfaces/teamup'
import { BLOCK_LABELS } from '../services/teamupApi'

export interface ReportHeader {
  organisationName?: string
  projectName?: string
  partnerName?: string
  activityName?: string
}

const esc = (v: unknown): string =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const nl2br = (v: string): string => esc(v).replace(/\n/g, '<br/>')
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const isGirl = (sex: string) => sex?.toLowerCase().startsWith('f')
const hasDisability = (d: string) => !!d && !['none', 'no', 'no disability'].includes(d.toLowerCase())

function formatDateLong(d?: string): string {
  if (!d) return ''
  return new Date(d.length === 10 ? `${d}T12:00:00` : d)
    .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(p => p[0]!.toUpperCase()).join('.') + '.'
}

const CSS = `
  @page Section1 { size: 8.27in 11.69in; margin: 22mm; mso-page-orientation: portrait; }
  div.Section1 { page: Section1; }
  *, body, p, h2, h3, td, th, span, b, i, div {
    font-family: 'Arial Unicode MS', Arial, sans-serif !important;
    mso-ascii-font-family: 'Arial Unicode MS'; mso-hansi-font-family: 'Arial Unicode MS';
  }
  body { font-size: 11pt; color: #000; line-height: 1.4; }
  p.title { font-size: 18pt; font-weight: 700; margin: 0 0 12pt; }
  p.org { font-size: 12pt; font-weight: 700; margin: 0 0 6pt; }
  p.lead { font-size: 11pt; font-weight: 700; margin: 0 0 6pt; }
  hr.rule { border: 0; border-top: 1pt solid #999; margin: 14pt 0; }
  h2.section { font-size: 14pt; font-weight: 700; margin: 20pt 0 10pt; }
  p.label { font-size: 11pt; font-weight: 700; text-decoration: underline; margin: 14pt 0 6pt; }
  p.body { font-size: 11pt; margin: 4pt 0 8pt; line-height: 1.45; }
  p.bullet { font-size: 11pt; margin: 3pt 0 3pt 22pt; text-indent: -14pt; line-height: 1.45; }
  p.signoff { font-size: 10pt; margin: 14pt 0 0; }
  h3.session { font-size: 12pt; font-weight: 700; margin: 18pt 0 4pt; }
  p.byline { font-size: 11pt; font-weight: 700; margin: 0 0 8pt; }
  .muted { font-style: italic; color: #555; font-weight: 400; }
  table.grid { border-collapse: collapse; width: 100%; margin: 6pt 0 10pt; }
  table.grid th, table.grid td { border: 1pt solid #999; padding: 4pt 6pt; font-size: 10pt; text-align: left; }
  table.grid th { background: #E7EEF5; font-weight: 700; }
  h2.section, p.label { page-break-after: avoid; }
  p.body, p.bullet, tr { page-break-inside: avoid; }
`

function wrap(title: string, body: string): string {
  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <title>${esc(title)}</title>
        <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
        <style>${CSS}</style>
      </head>
      <body><div class="Section1">${body}</div></body>
    </html>`
}

function letterhead(title: string, h: ReportHeader): string {
  const org = h.organisationName ? `<p class="org">${esc(h.organisationName)}</p>` : ''
  const project = h.projectName
    ? `Project: ${esc(h.projectName)}${h.partnerName ? ` &mdash; ${esc(h.partnerName)}` : ''} &nbsp;&nbsp;&nbsp;&nbsp; `
    : ''
  return `<p class="title">${esc(title)}</p>${org}<p class="lead">${project}Activity: ${esc(h.activityName || 'TeamUp')}</p>`
}

function metaBlock(rows: Array<[string, string]>): string {
  return rows.map(([k, v]) => `<p class="lead">${esc(k)}:&nbsp;&nbsp;${esc(v)}</p>`).join('')
}

export function downloadDoc(html: string, filename: string): void {
  // BOM keeps Word happy with non-ASCII characters (en-dash, names with accents).
  const blob = new Blob(['﻿', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface SessionParts {
  present: TeamUpEnrollment[]
  absent: TeamUpEnrollment[]
  excused: TeamUpEnrollment[]
  girls: number
  attendanceHtml: string
  conductedHtml: string
}

/** Attendance + "session conducted" blocks for one session. */
function sessionParts(detail: TeamUpSessionDetail): SessionParts {
  const s = detail.session
  const byId = new Map(detail.roster.map(e => [e.beneficiary_id, e]))
  const marks = new Map((s.attendance ?? []).map(a => [a.beneficiary_id, a.status]))
  const present = detail.roster.filter(e => marks.get(e.beneficiary_id) === 'present')
  const absent = detail.roster.filter(e => marks.get(e.beneficiary_id) === 'absent')
  const excused = detail.roster.filter(e => marks.get(e.beneficiary_id) === 'excused')
  const girls = present.filter(e => isGirl(e.sex)).length
  const withDisability = present.filter(e => hasDisability(e.disability_status)).length

  const names = (list: TeamUpEnrollment[]) => list.map(e => esc(e.beneficiary_name)).join(', ')
  const attendance = detail.roster.length === 0
    ? `<p class="body"><i>No children are enrolled in this group.</i></p>`
    : `
      <p class="body">
        <b>${present.length}</b> of <b>${detail.roster.length}</b> enrolled children attended
        (<b>${girls}</b> ${girls === 1 ? 'girl' : 'girls'} and <b>${present.length - girls}</b> ${present.length - girls === 1 ? 'boy' : 'boys'}).
        ${withDisability > 0 ? `<b>${withDisability}</b> ${withDisability === 1 ? 'child' : 'children'} present ${withDisability === 1 ? 'lives' : 'live'} with a disability.` : ''}
      </p>
      ${absent.length ? `<p class="body"><b>Absent (${absent.length}):</b> ${names(absent)}</p>` : ''}
      ${excused.length ? `<p class="body"><b>Excused (${excused.length}):</b> ${names(excused)}</p>` : ''}`

  const objectives = (s.objectives ?? []).length
    ? `<p class="label">Objectives</p>${s.objectives!.map(o => `<p class="bullet">-&nbsp;&nbsp;${esc(o)}</p>`).join('')}`
    : ''

  const blocks = [...(s.blocks ?? [])].sort((a, b) => a.order_index - b.order_index)
  const done = blocks.filter(b => b.completed).length
  const activities = blocks.length
    ? `<p class="label">Activities Completed (${done} of ${blocks.length})</p>
       ${blocks.map(b => `<p class="bullet">-&nbsp;&nbsp;<b>${esc(BLOCK_LABELS[b.block] ?? b.block)}:</b> ${esc(b.activity_name)}${b.energy ? ` (${b.energy})` : ''}${b.completed ? '' : ' <span class="muted">(skipped)</span>'}</p>`).join('')}`
    : ''

  const thumbs = (s.checkin_good != null || s.checkout_good != null)
    ? `<p class="label">How the children felt (thumbs count)</p>
       <table class="grid">
         <tr><th></th><th>Good</th><th>Not too bad</th><th>Not good</th></tr>
         <tr><td>Check-in</td><td>${s.checkin_good ?? '–'}</td><td>${s.checkin_ok ?? '–'}</td><td>${s.checkin_bad ?? '–'}</td></tr>
         <tr><td>Check-out</td><td>${s.checkout_good ?? '–'}</td><td>${s.checkout_ok ?? '–'}</td><td>${s.checkout_bad ?? '–'}</td></tr>
       </table>`
    : ''

  const observations = s.key_observations
    ? `<p class="label">Key Observations</p><p class="body">${nl2br(s.key_observations)}</p>`
    : ''

  // Flags list initials only, like the PSS report keeps names out of protection notes.
  const flags = s.flags ?? []
  const protection = (s.protection_notes || flags.length)
    ? `<p class="label">Child Protection Notes</p>
       ${s.protection_notes ? `<p class="body">${nl2br(s.protection_notes)}</p>` : ''}
       ${flags.map(f => `<p class="bullet">-&nbsp;&nbsp;<b>${esc(initials(byId.get(f.beneficiary_id)?.beneficiary_name ?? 'Child'))}</b> — ${esc(f.concern)}</p>`).join('')}`
    : ''

  const followUp = s.follow_up
    ? `<p class="label">Follow-Up Actions</p><p class="body">${nl2br(s.follow_up)}</p>`
    : ''

  const conductedHtml = [objectives, activities, thumbs, observations, protection, followUp].filter(Boolean).join('\n')
    || '<p class="body">No session details were recorded.</p>'
  return { present, absent, excused, girls, attendanceHtml: attendance, conductedHtml }
}

const groupLabel = (d: TeamUpSessionDetail) =>
  `${d.group.name}${d.group.age_band ? ` (age ${d.group.age_band})` : ''}`
const sessionLabel = (d: TeamUpSessionDetail) =>
  `Session ${d.session.sequence_no} — ${d.session.module_name ?? ''} ${d.session.session_in_module ?? ''}/${d.session.module_sessions ?? ''}`
const unique = (vals: string[]) => [...new Set(vals.filter(Boolean))]

/** One completed (or in-progress) session — the TeamUp facilitator report. */
export function buildSessionReport(detail: TeamUpSessionDetail, header: ReportHeader): string {
  const s = detail.session
  const g = detail.group
  const location = g.service_point_name ?? ''
  const facilitator = s.facilitator_name ?? 'Facilitator'
  const { present, attendanceHtml: attendance, conductedHtml } = sessionParts(detail)
  const flags = s.flags ?? []

  const meta = metaBlock([
    ['To', 'Programme Officer / Supervisor'],
    ['From', `${facilitator} (Facilitator)`],
    ['Date', formatDateLong(s.session_date)],
    ['Location', location],
    ['Group', groupLabel(detail)],
    ['Session', `${s.sequence_no} of ${g.total_sessions || 20} — ${s.module_name ?? ''} ${s.session_in_module ?? ''}/${s.module_sessions ?? ''}`],
  ])

  const summary = `
    <p class="body">
      Session <b>${s.sequence_no}</b> of the TeamUp cycle was ${s.status === 'completed' ? 'completed' : 'held'} with
      <b>${plural(present.length, 'child', 'children')}</b> present.
      ${flags.length ? `<b>${plural(flags.length, 'child was', 'children were')}</b> flagged for child-protection follow-up.` : 'No children were flagged for protection follow-up.'}
    </p>`

  return wrap(`TeamUp Session Report — ${g.name} Session ${s.sequence_no}`, `
    ${letterhead('TeamUp Session Report', header)}
    <hr class="rule" />${meta}<hr class="rule" />
    <h2 class="section">1.&nbsp;&nbsp;Attendance</h2>${attendance}
    <hr class="rule" />
    <h2 class="section">2.&nbsp;&nbsp;Session Conducted</h2>
    ${conductedHtml}
    <hr class="rule" />
    <h2 class="section">3.&nbsp;&nbsp;Summary</h2>${summary}
    <hr class="rule" />
    <p class="signoff">Submitted by <b>${esc(facilitator)}</b>&nbsp;&nbsp;on ${esc(formatDateLong(s.session_date))} at ${esc(location)}.</p>
  `)
}

/** The whole group's cycle — attendance by child, drop-outs and sessions held. */
export function buildGroupReport(report: TeamUpGroupReport, sessions: TeamUpSession[], header: ReportHeader): string {
  const g = report.group
  const active = report.rows.filter(r => r.status !== 'dropped')
  const dropped = report.rows.filter(r => r.status === 'dropped')
  const girls = report.rows.filter(r => isGirl(r.sex)).length
  const held = [...sessions].filter(s => s.status === 'completed').sort((a, b) => a.sequence_no - b.sequence_no)
  const period = held.length
    ? `${formatDateLong(held[0]!.session_date)} – ${formatDateLong(held[held.length - 1]!.session_date)}`
    : 'No sessions held yet'
  const facilitators = report.facilitators.join(', ') || g.facilitator_name || '—'

  const meta = metaBlock([
    ['To', 'Programme Officer / Supervisor'],
    ['From', `${facilitators} (Facilitator)`],
    ['Location', g.service_point_name ?? ''],
    ['Group', `${g.name}${g.age_band ? ` (age ${g.age_band})` : ''}`],
    ['Period', period],
  ])

  const summary = `
    <p class="body">
      The <b>${esc(g.name)}</b> group has completed <b>${report.sessions_completed}</b> of
      <b>${report.total_sessions}</b> TeamUp sessions. <b>${plural(report.rows.length, 'child was', 'children were')}</b>
      enrolled (<b>${girls}</b> ${girls === 1 ? 'girl' : 'girls'}, <b>${report.rows.length - girls}</b> ${report.rows.length - girls === 1 ? 'boy' : 'boys'}).
    </p>
    <p class="body">
      Children need at least <b>${report.min_dosage}</b> sessions to benefit. <b>${report.on_track}</b> ${report.on_track === 1 ? 'child is' : 'children are'}
      on track, <b>${report.at_risk}</b> ${report.at_risk === 1 ? 'is' : 'are'} at risk of not reaching it, and
      <b>${report.dropped}</b> dropped out.
    </p>`

  const childRows = active
    .map(r => `<tr><td>${esc(r.name)}</td><td>${isGirl(r.sex) ? 'F' : 'M'}</td><td>${r.age}</td><td>${r.attended}</td><td>${r.missed}</td><td>${r.at_risk ? 'At risk' : 'On track'}</td></tr>`)
    .join('')
  const attendance = active.length
    ? `<table class="grid"><tr><th>Child</th><th>Sex</th><th>Age</th><th>Attended</th><th>Missed</th><th>Status</th></tr>${childRows}</table>`
    : '<p class="body"><i>No active children in this group.</i></p>'

  const dropouts = dropped.length
    ? dropped.map(r => `<p class="bullet">-&nbsp;&nbsp;<b>${esc(r.name)}</b> — ${esc(r.drop_reason || 'No reason recorded')} (attended ${r.attended})</p>`).join('')
    : '<p class="body">No children dropped out.</p>'

  const sessionRows = held
    .map(s => `<tr><td>${s.sequence_no}</td><td>${esc(s.module_name ?? '')} ${s.session_in_module ?? ''}/${s.module_sessions ?? ''}</td><td>${esc(formatDateLong(s.session_date))}</td><td>${esc(s.facilitator_name ?? '')}</td></tr>`)
    .join('')
  const sessionsTable = held.length
    ? `<table class="grid"><tr><th>#</th><th>Module</th><th>Date</th><th>Facilitator</th></tr>${sessionRows}</table>`
    : '<p class="body"><i>No sessions have been completed yet.</i></p>'

  return wrap(`TeamUp Group Progress Report — ${g.name}`, `
    ${letterhead('TeamUp Group Progress Report', header)}
    <hr class="rule" />${meta}<hr class="rule" />
    <h2 class="section">1.&nbsp;&nbsp;Summary</h2>${summary}
    <hr class="rule" />
    <h2 class="section">2.&nbsp;&nbsp;Attendance by Child</h2>${attendance}
    <hr class="rule" />
    <h2 class="section">3.&nbsp;&nbsp;Drop-outs</h2>${dropouts}
    <hr class="rule" />
    <h2 class="section">4.&nbsp;&nbsp;Sessions Held</h2>${sessionsTable}
    <hr class="rule" />
    <p class="signoff">Prepared by <b>${esc(facilitators)}</b>&nbsp;&nbsp;on ${esc(formatDateLong(new Date().toISOString().slice(0, 10)))}.</p>
  `)
}

export interface PeriodReportOptions {
  /** Shown in "From" and the sign-off. */
  preparedBy: string
  /** True when the report covers only the preparer's own sessions. */
  mine: boolean
}

function periodMeta(details: TeamUpSessionDetail[], opts: PeriodReportOptions, dateRows: Array<[string, string]>) {
  const locations = unique(details.map(d => d.group.service_point_name ?? ''))
  return metaBlock([
    ['To', 'Programme Officer / Supervisor'],
    ['From', `${opts.preparedBy}${opts.mine ? ' (Facilitator)' : ''}`],
    ...dateRows,
    ['Location', locations.join(', ') || '—'],
    ['Groups', unique(details.map(groupLabel)).join(', ') || '—'],
  ])
}

/** Every TeamUp session held on one day — the TeamUp daily facilitator report. */
export function buildDailyReport(details: TeamUpSessionDetail[], date: string, header: ReportHeader, opts: PeriodReportOptions): string {
  const parts = details.map(sessionParts)
  const present = parts.reduce((n, p) => n + p.present.length, 0)
  const girls = parts.reduce((n, p) => n + p.girls, 0)
  const enrolled = details.reduce((n, d) => n + d.roster.length, 0)
  const uniquePresent = new Set(parts.flatMap(p => p.present.map(e => e.beneficiary_id))).size
  const flags = details.reduce((n, d) => n + (d.session.flags?.length ?? 0), 0)

  const overview = details.length === 0
    ? '<p class="body"><i>No TeamUp sessions were recorded for this date.</i></p>'
    : `<p class="body">
         <b>${plural(details.length, 'TeamUp session was', 'TeamUp sessions were')}</b> held today.
         <b>${present}</b> of <b>${enrolled}</b> enrolled children attended
         (<b>${girls}</b> ${girls === 1 ? 'girl' : 'girls'}, <b>${present - girls}</b> ${present - girls === 1 ? 'boy' : 'boys'};
         <b>${uniquePresent}</b> different ${uniquePresent === 1 ? 'child' : 'children'}).
       </p>`

  const sessionsHtml = details.map((d, i) => `
    <h3 class="session">${i + 1}.&nbsp;&nbsp;${esc(groupLabel(d))} — ${esc(sessionLabel(d))}</h3>
    <p class="byline">Facilitated by:&nbsp; ${esc(d.session.facilitator_name ?? '')}</p>
    ${parts[i]!.attendanceHtml}
    ${parts[i]!.conductedHtml}
    ${i < details.length - 1 ? '<hr class="rule" />' : ''}`).join('\n')

  const summary = `<p class="body">
      ${details.length ? `We delivered <b>${plural(details.length, 'session', 'sessions')}</b> and reached <b>${plural(uniquePresent, 'child', 'children')}</b>.` : ''}
      ${flags ? `<b>${plural(flags, 'child was', 'children were')}</b> flagged for child-protection follow-up.` : 'No children were flagged for protection follow-up.'}
    </p>`

  return wrap(`TeamUp Daily Report — ${formatDateLong(date)}`, `
    ${letterhead('TeamUp Daily Facilitator Report', header)}
    <hr class="rule" />${periodMeta(details, opts, [['Date', formatDateLong(date)]])}<hr class="rule" />
    <h2 class="section">1.&nbsp;&nbsp;Attendance</h2>${overview}
    <hr class="rule" />
    <h2 class="section">2.&nbsp;&nbsp;Sessions Conducted</h2>
    ${sessionsHtml || '<p class="body">No sessions were recorded for this date.</p>'}
    <hr class="rule" />
    <h2 class="section">3.&nbsp;&nbsp;Day Summary</h2>${summary}
    <hr class="rule" />
    <p class="signoff">Submitted by <b>${esc(opts.preparedBy)}</b>&nbsp;&nbsp;on ${esc(formatDateLong(date))}.</p>
  `)
}

/** A week of TeamUp sessions — summary tables instead of every session in full. */
export function buildWeeklyReport(details: TeamUpSessionDetail[], from: string, to: string, header: ReportHeader, opts: PeriodReportOptions): string {
  const parts = details.map(sessionParts)
  const present = parts.reduce((n, p) => n + p.present.length, 0)
  const marked = parts.reduce((n, p) => n + p.present.length + p.absent.length + p.excused.length, 0)
  const presentIds = new Set(parts.flatMap(p => p.present.map(e => e.beneficiary_id)))
  const girlsReached = new Set(parts.flatMap(p => p.present.filter(e => isGirl(e.sex)).map(e => e.beneficiary_id))).size
  const rate = marked ? Math.round((present / marked) * 100) : 0
  const flags = details.reduce((n, d) => n + (d.session.flags?.length ?? 0), 0)
  const period = `${formatDateLong(from)} – ${formatDateLong(to)}`

  const glance = details.length === 0
    ? '<p class="body"><i>No TeamUp sessions were recorded this week.</i></p>'
    : `<p class="body">
         <b>${plural(details.length, 'session was', 'sessions were')}</b> held with
         <b>${plural(unique(details.map(d => d.group.id)).length, 'group', 'groups')}</b>, reaching
         <b>${plural(presentIds.size, 'child', 'children')}</b> (<b>${girlsReached}</b> ${girlsReached === 1 ? 'girl' : 'girls'},
         <b>${presentIds.size - girlsReached}</b> ${presentIds.size - girlsReached === 1 ? 'boy' : 'boys'}).
         Attendance was <b>${rate}%</b> of children expected.
         ${flags ? `<b>${plural(flags, 'child was', 'children were')}</b> flagged for child-protection follow-up.` : 'No children were flagged for protection follow-up.'}
       </p>`

  const sessionRows = details.map((d, i) => `<tr>
      <td>${esc(formatDateLong(d.session.session_date))}</td><td>${esc(groupLabel(d))}</td>
      <td>${d.session.sequence_no}</td><td>${esc(d.session.module_name ?? '')}</td>
      <td>${parts[i]!.present.length} / ${d.roster.length}</td><td>${esc(d.session.facilitator_name ?? '')}</td></tr>`).join('')
  const sessionsTable = details.length
    ? `<table class="grid"><tr><th>Date</th><th>Group</th><th>#</th><th>Module</th><th>Present</th><th>Facilitator</th></tr>${sessionRows}</table>`
    : ''

  // Group progress: sessions this week and overall position in the curriculum.
  const byGroup = new Map<string, { d: TeamUpSessionDetail; count: number; present: number; marked: number }>()
  details.forEach((d, i) => {
    const row = byGroup.get(d.group.id) ?? { d, count: 0, present: 0, marked: 0 }
    row.count++
    row.present += parts[i]!.present.length
    row.marked += parts[i]!.present.length + parts[i]!.absent.length + parts[i]!.excused.length
    if (d.session.sequence_no > row.d.session.sequence_no) row.d = d
    byGroup.set(d.group.id, row)
  })
  const groupRows = [...byGroup.values()].map(r => `<tr>
      <td>${esc(groupLabel(r.d))}</td><td>${esc(r.d.group.service_point_name ?? '')}</td><td>${r.count}</td>
      <td>${r.d.session.sequence_no} of ${r.d.group.total_sessions || 20}</td>
      <td>${r.marked ? Math.round((r.present / r.marked) * 100) : 0}%</td></tr>`).join('')
  const groupsTable = groupRows
    ? `<table class="grid"><tr><th>Group</th><th>Location</th><th>Sessions this week</th><th>Reached session</th><th>Attendance</th></tr>${groupRows}</table>`
    : ''

  // Children enrolled in a group that met this week but who missed every session.
  const followUps: string[] = []
  for (const r of byGroup.values()) {
    const groupSessions = details.filter(d => d.group.id === r.d.group.id)
    const missedAll = r.d.roster.filter(e => groupSessions.every(gs =>
      (gs.session.attendance ?? []).find(a => a.beneficiary_id === e.beneficiary_id)?.status !== 'present'))
    if (missedAll.length) {
      followUps.push(`<p class="bullet">-&nbsp;&nbsp;<b>${esc(r.d.group.name)}:</b> ${missedAll.map(e => esc(e.beneficiary_name)).join(', ')} — missed every session this week</p>`)
    }
  }
  details.forEach(d => {
    if (d.session.follow_up) followUps.push(`<p class="bullet">-&nbsp;&nbsp;<b>${esc(d.group.name)}, session ${d.session.sequence_no}:</b> ${esc(d.session.follow_up)}</p>`)
  })
  const observations = details.filter(d => d.session.key_observations)
    .map(d => `<p class="bullet">-&nbsp;&nbsp;<b>${esc(d.group.name)}, session ${d.session.sequence_no}:</b> ${nl2br(d.session.key_observations!)}</p>`).join('')

  return wrap(`TeamUp Weekly Report — ${period}`, `
    ${letterhead('TeamUp Weekly Facilitator Report', header)}
    <hr class="rule" />${periodMeta(details, opts, [['Week', period]])}<hr class="rule" />
    <h2 class="section">1.&nbsp;&nbsp;Week at a Glance</h2>${glance}
    <hr class="rule" />
    <h2 class="section">2.&nbsp;&nbsp;Sessions Held</h2>${sessionsTable || '<p class="body">No sessions were recorded this week.</p>'}
    <hr class="rule" />
    <h2 class="section">3.&nbsp;&nbsp;Group Progress</h2>${groupsTable || '<p class="body">No group met this week.</p>'}
    <hr class="rule" />
    <h2 class="section">4.&nbsp;&nbsp;Children to Follow Up</h2>${followUps.join('') || '<p class="body">No follow-ups this week.</p>'}
    <hr class="rule" />
    <h2 class="section">5.&nbsp;&nbsp;Key Observations</h2>${observations || '<p class="body">No observations were recorded.</p>'}
    <hr class="rule" />
    <p class="signoff">Submitted by <b>${esc(opts.preparedBy)}</b>&nbsp;&nbsp;for the week ${esc(period)}.</p>
  `)
}
