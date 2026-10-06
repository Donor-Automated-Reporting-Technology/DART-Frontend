/**
 * interfaces/teamup.ts
 *
 * Types for the TeamUp module (closed groups, 20-session DRA curriculum).
 * Mirrors the Go DTOs in DART/internal/dto/teamup_dto.go.
 */

export type AgeBand = '6-9' | '10-14' | '15-17'
export type GroupStatus = 'active' | 'completed' | 'cancelled'
export type EnrollmentStatus = 'active' | 'completed' | 'dropped'
export type AttendanceStatus = 'present' | 'absent' | 'excused'
export type BlockType = 'check_in' | 'warm_up' | 'game' | 'cool_down' | 'check_out'

export interface TeamUpModule {
  order: number
  name: string
  sessions: number
  objectives: string[]
}

export interface TeamUpCurriculumSession {
  sequence_no: number
  module_order: number
  module_name: string
  session_in_module: number
  module_sessions: number
}

export interface TeamUpActivity {
  block: BlockType
  name: string
  energy?: 'active' | 'calm'
  summary: string
}

export interface TeamUpCurriculum {
  code: string
  name: string
  min_dosage: number
  modules: TeamUpModule[]
  sessions: TeamUpCurriculumSession[]
  activities: TeamUpActivity[]
}

export interface TeamUpGroup {
  id: string
  organisation_id: string
  framework_activity_id: string
  service_point_id: string
  service_point_name?: string
  name: string
  program: string
  curriculum_code: string
  age_band?: AgeBand
  meeting_days: number[]
  meeting_time?: string
  facilitator_id?: string
  facilitator_name?: string
  status: GroupStatus
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
  enrolled_count: number
  sessions_completed: number
  total_sessions: number
}

export interface TeamUpEnrollment {
  id: string
  cohort_group_id: string
  beneficiary_id: string
  status: EnrollmentStatus
  baseline_score?: number
  endline_score?: number
  enrolled_at: string
  dropped_at?: string
  drop_reason?: string
  beneficiary_name: string
  sex: string
  age: number
  language: string
  disability_status: string
}

export interface TeamUpBlock {
  id: string
  session_id: string
  block: BlockType
  activity_name: string
  energy?: 'active' | 'calm'
  order_index: number
  completed: boolean
}

export interface TeamUpAttendance {
  id: string
  session_id: string
  beneficiary_id: string
  status: AttendanceStatus
}

export interface TeamUpFlag {
  id: string
  session_id: string
  beneficiary_id: string
  concern: string
  flagged_at: string
}

export interface TeamUpSession {
  id: string
  cohort_group_id: string
  sequence_no: number
  session_date: string
  facilitator_id: string
  facilitator_name?: string
  status: 'in_progress' | 'completed'
  objectives: string[] | null
  checkin_good?: number
  checkin_ok?: number
  checkin_bad?: number
  checkout_good?: number
  checkout_ok?: number
  checkout_bad?: number
  key_observations?: string
  protection_notes?: string
  follow_up?: string
  module_name?: string
  session_in_module?: number
  module_sessions?: number
  blocks?: TeamUpBlock[]
  attendance?: TeamUpAttendance[]
  flags?: TeamUpFlag[]
}

export interface TeamUpGroupDetail {
  group: TeamUpGroup
  enrollments: TeamUpEnrollment[]
  sessions: TeamUpSession[]
  next_session?: number
}

export interface TeamUpSessionDetail {
  session: TeamUpSession
  group: TeamUpGroup
  roster: TeamUpEnrollment[]
  warnings: string[]
}

export interface Thumbs {
  good: number
  ok: number
  bad: number
}

export interface CreateTeamUpGroupRequest {
  framework_activity_id: string
  cfs_location_id?: string
  name: string
  age_band: AgeBand
  meeting_days: number[]
  meeting_time?: string
  start_date?: string
}

export interface StartTeamUpSessionRequest {
  session_date: string
  objectives: string[]
  sequence_no?: number
  client_uuid?: string
  device_id?: string
  client_timestamp?: string
}

export interface UpdateTeamUpSessionRequest {
  objectives?: string[]
  checkin?: Thumbs
  checkout?: Thumbs
  key_observations?: string
  protection_notes?: string
  follow_up?: string
}

export interface UpdateTeamUpEnrollmentRequest {
  status?: EnrollmentStatus
  drop_reason?: string
  baseline_score?: number
  endline_score?: number
}

export interface TeamUpEnrollResult {
  enrolled: string[]
  skipped: Record<string, string>
}

export interface TeamUpReportCell {
  sequence_no: number
  status: '' | AttendanceStatus
  date?: string
}

export interface TeamUpReportRow {
  enrollment_id: string
  beneficiary_id: string
  name: string
  sex: string
  age: number
  status: EnrollmentStatus
  drop_reason?: string
  cells: TeamUpReportCell[]
  attended: number
  missed: number
  at_risk: boolean
}

export interface TeamUpGroupReport {
  group: TeamUpGroup
  total_sessions: number
  sessions_completed: number
  min_dosage: number
  on_track: number
  at_risk: number
  dropped: number
  facilitators: string[]
  rows: TeamUpReportRow[]
}

export interface EligibleBeneficiary {
  id: string
  personal_name: string
  father_name: string
  grandfather_name?: string
  age_at_registration: number
  sex: string
  language: string
  disability_status: string
}

// ─── Activity dashboard — GET /api/v1/teamup/dashboard/:frameworkActivityId ───

export interface TeamUpDashboard {
  activity: { id: string; framework_id: string; name: string; code: string; target_count: number; target_unit: string }
  scope_location?: string
  total_sessions: number
  min_dosage: number
  summary: {
    children: number
    girls: number
    boys: number
    with_disability: number
    target_percentage: number
    active_groups: number
    completed_groups: number
    sessions_held: number
    attendance_rate: number
    avg_sessions_per_child: number
    reached_min_dosage: number
    at_risk: number
    dropped: number
    flagged_children: number
  }
  dosage: { label: string; count: number }[]
  wellbeing: { sessions_counted: number; checkin_good_pct: number; checkout_good_pct: number; checkin_bad_pct: number; checkout_bad_pct: number }
  scores: { children_with_both: number; avg_baseline: number; avg_endline: number; avg_change: number; improved: number }
  by_location: {
    location_id: string
    location_name: string
    groups: number
    children: number
    girls: number
    boys: number
    sessions_held: number
    attendance_rate: number
    reached_min_dosage: number
  }[]
  groups: {
    id: string
    name: string
    location_name: string
    age_band?: string
    status: string
    enrolled: number
    sessions_completed: number
    total_sessions: number
    attendance_rate: number
    at_risk: number
    dropped: number
  }[]
  recent_sessions: {
    id: string
    group_id: string
    group_name: string
    location_name: string
    sequence_no: number
    module_name: string
    date: string
    facilitator_name?: string
    present: number
    marked: number
    status: string
  }[]
}
