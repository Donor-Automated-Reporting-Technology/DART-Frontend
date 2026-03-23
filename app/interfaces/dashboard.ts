/**
 * Dashboard feature interfaces
 *
 * All types used across the DART dashboard — donors, reports,
 * projects and activity feed. These replace the previous FocusFlow
 * types that were incorrectly copied from another application.
 */

// ─── Stats summary ────────────────────────────────────────────────────────────

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
