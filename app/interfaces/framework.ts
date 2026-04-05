/**
 * interfaces/framework.ts
 *
 * Types for the multi-activity framework system.
 */

export type FrameworkType = 'child_protection' | 'education' | 'health' | 'wash' | 'livelihoods'

export type PatternType =
  | 'daily_attendance'
  | 'cohort_sequential'
  | 'topic_attendance'
  | 'aggregate_event'
  | 'case_workflow'
  | 'training_event'

export interface ActivityTemplate {
  id: string
  framework_type: FrameworkType
  name: string
  code: string
  description: string
  pattern_type: PatternType
  default_config: Record<string, unknown> | null
  created_at: string
}

export interface Framework {
  id: string
  organisation_id: string
  framework_type: FrameworkType
  project_name: string
  partner_name: string
  reporting_to: string
  period_start: string
  period_end: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateFrameworkRequest {
  framework_type: FrameworkType
  project_name: string
  partner_name: string
  reporting_to: string
  period_start: string
  period_end: string
}

export interface UpdateFrameworkRequest {
  framework_type?: FrameworkType
  project_name?: string
  partner_name?: string
  reporting_to?: string
  period_start?: string
  period_end?: string
}

export interface FrameworkActivity {
  id: string
  framework_id: string
  activity_template_id: string
  is_active: boolean
  target_count: number
  target_unit: string
  custom_config: Record<string, unknown> | null
  created_at: string
  updated_at: string
  template?: ActivityTemplate
}

export interface ToggleActivityRequest {
  is_active: boolean
}

export interface SetTargetRequest {
  target_count: number
  target_unit: string
}

export interface FrameworkListResponse {
  frameworks: Framework[]
}

export interface FrameworkActivitiesResponse {
  activities: FrameworkActivity[]
}

export interface ActivityTemplatesResponse {
  templates: ActivityTemplate[]
}
