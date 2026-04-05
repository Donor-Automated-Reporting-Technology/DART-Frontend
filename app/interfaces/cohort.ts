/**
 * interfaces/cohort.ts
 *
 * Types for cohort-based activities (TeamUp, Parenting, Community Dialogue).
 */

export type CohortStatus = 'open' | 'in_progress' | 'completed'
export type EnrollmentStatus = 'active' | 'completed' | 'dropped_out'

export interface CohortGroup {
  id: string
  framework_activity_id: string
  service_point_id: string
  name: string
  facilitator_id: string
  status: CohortStatus
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  enrollments?: CohortEnrollment[]
}

export interface CohortEnrollment {
  id: string
  cohort_group_id: string
  beneficiary_id: string
  status: EnrollmentStatus
  baseline_score: number | null
  endline_score: number | null
  enrolled_at: string
  created_at: string
  updated_at: string
  beneficiary_name?: string
}

export interface CreateCohortGroupRequest {
  framework_activity_id: string
  service_point_id: string
  name: string
  facilitator_id?: string
}

export interface EnrollRequest {
  beneficiary_ids: string[]
}

export interface UpdateEnrollmentRequest {
  status?: EnrollmentStatus
  baseline_score?: number
  endline_score?: number
}

export interface CohortGroupListResponse {
  groups: CohortGroup[]
}

export interface CohortGroupDetailResponse {
  group: CohortGroup
  enrollments: CohortEnrollment[]
}
