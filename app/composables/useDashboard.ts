/**
 * useDashboard composable
 *
 * Provides all state and helper utilities for the DART dashboard page.
 * Currently backed by mock data — replace each `ref(MOCK_*)` initialiser
 * with a `dashboardApi.*` call once the backend routes are ready.
 */

import { ref, computed } from "vue";
import type {
  DashboardStats,
  Report,
  Donor,
  Project,
  ActivityItem,
  QuickAction,
} from "../interfaces/dashboard";

// ─── Mock data ────────────────────────────────────────────────────────────────
// Remove these once real API calls are wired in.

const MOCK_STATS: DashboardStats = {
  totalDonors: 14,
  activeProjects: 6,
  reportsSubmitted: 23,
  pendingReports: 4,
};

const MOCK_REPORTS: Report[] = [
  {
    id: "r1",
    title: "Q4 2024 Impact Report",
    donor: "UNHCR",
    project: "CP Response – Malakal PoC",
    status: "submitted",
    dueDate: "2025-01-15",
    submittedAt: "2025-01-12",
  },
  {
    id: "r2",
    title: "PSS Monthly Narrative – December",
    donor: "UNICEF",
    project: "PSS Programme South Sudan",
    status: "draft",
    dueDate: "2025-02-01",
  },
  {
    id: "r3",
    title: "Emergency Response Financial Report",
    donor: "OCHA",
    project: "Emergency Fund 2024",
    status: "overdue",
    dueDate: "2024-12-30",
  },
  {
    id: "r4",
    title: "Mid-Year Programme Review",
    donor: "DFID",
    project: "Livelihoods Recovery",
    status: "approved",
    dueDate: "2025-01-20",
    submittedAt: "2025-01-10",
  },
  {
    id: "r5",
    title: "Beneficiary Data Report – Q1",
    donor: "EU Humanitarian Aid",
    project: "Education in Emergencies",
    status: "draft",
    dueDate: "2025-03-15",
  },
];

const MOCK_DONORS: Donor[] = [
  { id: "d1", name: "UNHCR",           type: "multilateral", country: "Global",       activeProjects: 2, lastReportDate: "2025-01-12" },
  { id: "d2", name: "UNICEF",          type: "multilateral", country: "Global",       activeProjects: 1, lastReportDate: "2024-12-20" },
  { id: "d3", name: "OCHA",            type: "multilateral", country: "Global",       activeProjects: 1 },
  { id: "d4", name: "DFID / FCDO",     type: "bilateral",    country: "United Kingdom", activeProjects: 1, lastReportDate: "2025-01-10" },
  { id: "d5", name: "EU Humanitarian", type: "bilateral",    country: "European Union", activeProjects: 1 },
];

const MOCK_PROJECTS: Project[] = [
  { id: "p1", title: "CP Response – Malakal PoC",  donor: "UNHCR",   status: "active",    progress: 68, endDate: "2025-06-30" },
  { id: "p2", title: "PSS Programme South Sudan",  donor: "UNICEF",  status: "active",    progress: 45, endDate: "2025-12-31" },
  { id: "p3", title: "Emergency Fund 2024",         donor: "OCHA",    status: "completed", progress: 100, endDate: "2024-12-31" },
  { id: "p4", title: "Livelihoods Recovery",        donor: "DFID",    status: "active",    progress: 72, endDate: "2025-09-30" },
  { id: "p5", title: "Education in Emergencies",   donor: "EU",      status: "active",    progress: 20, endDate: "2025-12-31" },
  { id: "p6", title: "WASH Infrastructure",         donor: "UNICEF",  status: "on-hold",   progress: 30, endDate: "2025-08-15" },
];

const MOCK_ACTIVITY: ActivityItem[] = [
  { id: "a1", type: "report_submitted", description: "Q4 2024 Impact Report submitted to UNHCR",        timestamp: new Date(Date.now() - 1 * 3600000).toISOString(),  user: "Nyawelo Deng" },
  { id: "a2", type: "report_created",   description: "Draft created: PSS Monthly Narrative – December", timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),  user: "Nyawelo Deng" },
  { id: "a3", type: "donor_added",      description: "New donor added: EU Humanitarian Aid",             timestamp: new Date(Date.now() - 1 * 86400000).toISOString(), user: "Nyawelo Deng" },
  { id: "a4", type: "report_approved",  description: "Mid-Year Programme Review approved by DFID",       timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), user: "System" },
  { id: "a5", type: "project_updated",  description: "CP Response progress updated to 68%",              timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), user: "Nyawelo Deng" },
  { id: "a6", type: "project_created",  description: "New project created: Education in Emergencies",    timestamp: new Date(Date.now() - 4 * 86400000).toISOString(), user: "Nyawelo Deng" },
];

const QUICK_ACTIONS: QuickAction[] = [
  { id: "qa1", label: "New Report",       description: "Create a donor report",      href: "#", icon: "file-plus",  color: "var(--primary)" },
  { id: "qa2", label: "Add Donor",        description: "Register a new donor",       href: "#", icon: "user-plus",  color: "var(--third)" },
  { id: "qa3", label: "New Project",      description: "Start a new project",        href: "#", icon: "folder-plus",color: "#7c6ff7" },
  { id: "qa4", label: "View All Reports", description: "Browse submitted reports",   href: "#", icon: "list",       color: "var(--warning)" },
];

// ─── Composable ───────────────────────────────────────────────────────────────

export const useDashboard = () => {
  // ── State ──────────────────────────────────────────────────────────────────

  const stats          = ref<DashboardStats>(MOCK_STATS);
  const reports        = ref<Report[]>(MOCK_REPORTS);
  const donors         = ref<Donor[]>(MOCK_DONORS);
  const projects       = ref<Project[]>(MOCK_PROJECTS);
  const activity       = ref<ActivityItem[]>(MOCK_ACTIVITY);
  const quickActions   = ref<QuickAction[]>(QUICK_ACTIONS);
  const isLoading      = ref(false);
  const error          = ref<string | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────

  /** Only the five most recent reports for the dashboard table */
  const recentReports = computed(() => reports.value.slice(0, 5));

  /** Only the six most recent activity items */
  const recentActivity = computed(() => activity.value.slice(0, 6));

  /** Active + on-hold projects (excludes completed) */
  const activeProjects = computed(() =>
    projects.value.filter((p) => p.status !== "completed"),
  );

  // ── Formatters ─────────────────────────────────────────────────────────────

  /**
   * Returns a human-readable relative timestamp.
   * e.g. "2 hours ago", "Yesterday", "3 days ago"
   */
  const timeAgo = (isoDate: string): string => {
    const diffMs   = Date.now() - new Date(isoDate).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs  = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 2)  return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHrs  < 24) return `${diffHrs} hour${diffHrs > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  /**
   * Formats an ISO date string to a readable date.
   * e.g. "15 Jan 2025"
   */
  const formatDate = (isoDate: string): string =>
    new Date(isoDate).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  /**
   * Returns true when a report's due date has passed and it is not approved.
   */
  const isOverdue = (report: Report): boolean => {
    if (report.status === "approved" || report.status === "submitted") return false;
    return new Date(report.dueDate) < new Date();
  };

  /**
   * Returns the greeting based on the current hour.
   */
  const greeting = (): string => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  /**
   * Returns today's date formatted for the dashboard header.
   * e.g. "Monday, 24 March 2025"
   */
  const todayLabel = computed(() =>
    new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      day:     "numeric",
      month:   "long",
      year:    "numeric",
    }),
  );

  // ── Status helpers ─────────────────────────────────────────────────────────

  /** CSS class suffix for a report status badge */
  const reportStatusClass = (status: Report["status"]): string => {
    const map: Record<Report["status"], string> = {
      draft:     "outline",
      submitted: "primary",
      approved:  "success",
      overdue:   "error",
    };
    return map[status] ?? "outline";
  };

  /** Human-readable label for a report status */
  const reportStatusLabel = (status: Report["status"]): string => {
    const map: Record<Report["status"], string> = {
      draft:     "Draft",
      submitted: "Submitted",
      approved:  "Approved",
      overdue:   "Overdue",
    };
    return map[status] ?? status;
  };

  /** CSS class suffix for a project status badge */
  const projectStatusClass = (status: Project["status"]): string => {
    const map: Record<Project["status"], string> = {
      active:    "success",
      completed: "primary",
      "on-hold": "warning",
    };
    return map[status] ?? "outline";
  };

  return {
    // state
    stats,
    reports,
    donors,
    projects,
    activity,
    quickActions,
    isLoading,
    error,
    // derived
    recentReports,
    recentActivity,
    activeProjects,
    // formatters
    timeAgo,
    formatDate,
    isOverdue,
    greeting,
    todayLabel,
    // status helpers
    reportStatusClass,
    reportStatusLabel,
    projectStatusClass,
  };
};
