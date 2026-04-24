/**
 * Dashboard feature interfaces
 *
 * All types used across the DART dashboard — drill-down navigation
 * from Organisation → Project → Activity detail views.
 */

// ─── Target Breakdown (shared) ────────────────────────────────────────────────

export interface TargetBreakdown {
  girls: number;
  boys: number;
  girls_with_disability: number;
  boys_with_disability: number;
}

// ─── Level 1: Org Overview — GET /api/v1/dashboard ────────────────────────────

export interface OrgSummary {
  total_projects: number;
  total_active_locations: number;
  total_unique_beneficiaries: number;
  overall_target: number;
  target_breakdown: TargetBreakdown;
}

export interface DashboardProject {
  id: string;
  project_name: string;
  framework_type: string;
  partner_name: string;
  reporting_to: string;
  period_start: string;
  period_end: string;
  is_active: boolean;
  active_activities: number;
  total_activities: number;
  total_beneficiaries: number;
  overall_target: number;
  overall_actual: number;
  overall_progress: number;
  target_breakdown: TargetBreakdown;
}

export interface OrgDashboardResponse {
  org_summary: OrgSummary;
  projects: DashboardProject[];
}

// ─── Level 1: Summary Stats — GET /api/v1/dashboard/summary-stats ─────────────

export interface ReachMetric {
  actual: number;
  target: number;
  percentage: number;
}

export interface BeneficiaryReach {
  total: ReachMetric;
  girls_women: ReachMetric;
  boys_men: ReachMetric;
  with_disability: ReachMetric;
}

export interface SummaryStatsResponse {
  beneficiary_reach: BeneficiaryReach;
}

// ─── Level 2: Project Detail — GET /api/v1/dashboard/projects/:frameworkId ────

export interface ProjectInfo {
  id: string;
  project_name: string;
  framework_type: string;
  partner_name: string;
  reporting_to: string;
  period_start: string;
  period_end: string;
}

export interface ProjectSummary {
  unique_beneficiaries: number;
  girls: number;
  boys: number;
  with_disability: number;
  active_locations: number;
  total_locations: number;
  total_service_points: number;
  target_breakdown: TargetBreakdown;
}

export interface ProjectActivity {
  id: string;
  name: string;
  code: string;
  pattern_type: string;
  target_count: number;
  target_unit: string;
  target_breakdown: TargetBreakdown;
  actual_count: number;
  percentage: number;
  is_active: boolean;
}

export interface ProjectDetailResponse {
  project: ProjectInfo;
  summary: ProjectSummary;
  activities: ProjectActivity[];
}

// ─── Level 3: Activity Detail — GET /api/v1/dashboard/activities/:id ──────────

export interface ActivityInfo {
  id: string;
  name: string;
  code: string;
  target_count: number;
  target_unit: string;
}

export interface ActivityDetailSummary {
  unique_children: number;
  target: number;
  percentage: number;
  girls: number;
  boys: number;
  with_disability: number;
  new_this_period: number;
}

export interface AttendanceOverview {
  total_sessions: number;
  total_present: number;
  total_absent: number;
  attendance_rate: number;
}

export interface DailyTrendPoint {
  date: string;
  present: number;
  absent: number;
}

export interface ActivityLocationRow {
  location_id: string;
  location_name: string;
  unique: number;
  girls: number;
  boys: number;
  disability: number;
  sessions_held: number;
  avg_daily_present: number;
}

export interface ActivitySession {
  id: string;
  date: string;
  location_name: string;
  present: number;
  absent: number;
  total: number;
}

export interface ActivityDetailResponse {
  pattern_type: string;
  activity: ActivityInfo;
  summary: ActivityDetailSummary;
  attendance: AttendanceOverview;
  daily_trend: DailyTrendPoint[];
  by_location: ActivityLocationRow[];
  recent_sessions: ActivitySession[];
}

// ─── Legacy types (kept for compatibility) ────────────────────────────────────

/** Top-level summary cards shown at the top of the dashboard */
export interface DashboardStats {
  /** Total number of donors linked to this organisation */
  totalDonors: number;
  /** Number of active projects currently running */
  activeProjects: number;
  /** Reports submitted in the current period */
  reportsSubmitted: number;
  /** Reports that are still pending submission or approval */
  pendingReports: number;
}

// ─── Multi-activity dashboard (new) ───────────────────────────────────────────

/** Full dashboard response from GET /api/v1/dashboard */
export interface DashboardResponse {
  demographics: DemographicsSummary;
  activity_summary: ActivitySummary[];
  locations: LocationSummary[];
  recent_sessions: RecentSession[];
}

export interface DemographicsSummary {
  total_beneficiaries: number;
  girls_women: number;
  boys_men: number;
  with_disability: number;
}

export interface ActivitySummary {
  code: string;
  name: string;
  actual: number;
  target: number;
  percentage: number;
}

export interface LocationSummary {
  id: string;
  name: string;
  total_children: number;
  children_count?: number;
  centre_count?: number;
  male: number;
  female: number;
  with_disability: number;
}

export interface RecentSession {
  id: string;
  activity_name: string;
  location_name: string;
  session_date: string;
  present_count: number;
  total_count: number;
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export type ReportStatus = "draft" | "submitted" | "approved" | "overdue";

/** A donor report record */
export interface Report {
  id: string;
  title: string;
  /** Name of the donor this report is for */
  donor: string;
  /** Project the report belongs to */
  project: string;
  status: ReportStatus;
  /** ISO 8601 due date */
  dueDate: string;
  /** ISO 8601 timestamp when the report was submitted (if applicable) */
  submittedAt?: string;
}

// ─── Donors ───────────────────────────────────────────────────────────────────

export type DonorType = "bilateral" | "multilateral" | "foundation" | "private";

/** A donor record linked to the organisation */
export interface Donor {
  id: string;
  name: string;
  type: DonorType;
  /** Country / region of the donor */
  country: string;
  /** Number of active grants / projects with this donor */
  activeProjects: number;
  /** ISO 8601 date of the last submitted report */
  lastReportDate?: string;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export type ProjectStatus = "active" | "completed" | "on-hold";

/** A project funded by a donor */
export interface Project {
  id: string;
  title: string;
  donor: string;
  status: ProjectStatus;
  /** Project completion percentage 0–100 */
  progress: number;
  /** ISO 8601 project end date */
  endDate: string;
}

// ─── Activity feed ────────────────────────────────────────────────────────────

export type ActivityType =
  | "report_created"
  | "report_submitted"
  | "report_approved"
  | "donor_added"
  | "project_updated"
  | "project_created";

/** A single entry in the recent activity feed */
export interface ActivityItem {
  id: string;
  type: ActivityType;
  /** Human-readable description of the event */
  description: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Full name of the user who triggered the event */
  user: string;
}

// ─── Quick actions ────────────────────────────────────────────────────────────

/** A quick-action button on the dashboard */
export interface QuickAction {
  id: string;
  label: string;
  description: string;
  /** Placeholder href — real route wired up during onboarding integration */
  href: string;
  /** Icon identifier resolved by AppIcon.vue */
  icon: string;
  /** CSS colour token or hex used for the icon background tint */
  color: string;
}

// ─── Layout ───────────────────────────────────────────────────────────────────

/** Breadcrumb item used by the app layout topbar */
export interface Breadcrumb {
  title: string;
  href: string;
  current?: boolean;
}
