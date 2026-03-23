<template>
  <!--
    DashRecentReports — shadcn DataTable style
    ─────────────────────────────────────────────────────────────────────────────
    Renders the 5 most recent donor reports as a full-width table inside a
    dark card panel, matching the shadcn/ui DataTable visual pattern.

    Desktop: full table with thead / tbody rows.
    Mobile (≤ 640 px): collapses to a stacked card list for readability.

    Props:
      reports — array of Report objects from useDashboard().recentReports
  -->
  <section class="reports-card">

    <!-- ── Card header: title + "View all" link ──────────────────────────── -->
    <div class="card-header">
      <div class="card-header-copy">
        <h2 class="card-title">Recent Reports</h2>
        <p class="card-subtitle">Latest donor reports across all projects</p>
      </div>

      <!-- "View all" — placeholder link until the Reports page is wired -->
      <NuxtLink to="#" class="view-all-link" @click.prevent aria-label="View all reports">
        View all
        <AppIcon name="chevron-right" :size="13" />
      </NuxtLink>
    </div>

    <!-- ── Desktop table ─────────────────────────────────────────────────── -->
    <div class="table-wrap">
      <table class="data-table" role="table">
        <thead>
          <tr>
            <th scope="col">Report</th>
            <th scope="col">Donor</th>
            <th scope="col">Status</th>
            <th scope="col">Due Date</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="report in reports"
            :key="report.id"
            class="data-row"
          >
            <!-- Report title + project name stacked -->
            <td class="cell-report">
              <span class="report-title">{{ report.title }}</span>
              <span class="report-project">{{ report.project }}</span>
            </td>

            <!-- Donor name with a small initial avatar -->
            <td class="cell-donor">
              <div class="donor-chip">
                <span class="donor-avatar" aria-hidden="true">
                  {{ report.donor[0] }}
                </span>
                <span class="donor-name">{{ report.donor }}</span>
              </div>
            </td>

            <!-- Status badge — pill coloured by status -->
            <td class="cell-status">
              <span :class="['status-badge', `status-badge--${statusClass(report.status)}`]">
                <span class="status-dot" aria-hidden="true" />
                {{ statusLabel(report.status) }}
              </span>
            </td>

            <!-- Due date — highlighted red when overdue -->
            <td class="cell-date">
              <span
                class="due-date"
                :class="{ 'due-date--overdue': report.status === 'overdue' }"
              >
                {{ formatDate(report.dueDate) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Mobile card list ───────────────────────────────────────────────── -->
    <!--
      Hidden on desktop via CSS; shown on ≤ 640 px screens instead of the
      table so users don't have to scroll horizontally on small viewports.
    -->
    <ul class="mobile-list" role="list">
      <li
        v-for="report in reports"
        :key="report.id"
        class="mobile-list-item"
      >
        <!-- Top row: truncated title + status badge -->
        <div class="mobile-item-top">
          <span class="report-title">{{ report.title }}</span>
          <span :class="['status-badge', `status-badge--${statusClass(report.status)}`]">
            <span class="status-dot" aria-hidden="true" />
            {{ statusLabel(report.status) }}
          </span>
        </div>

        <!-- Meta row: donor · project · due date -->
        <div class="mobile-item-meta">
          <span>{{ report.donor }}</span>
          <span class="meta-dot" aria-hidden="true">·</span>
          <span>{{ report.project }}</span>
          <span class="meta-dot" aria-hidden="true">·</span>
          <span :class="{ 'due-date--overdue': report.status === 'overdue' }">
            Due {{ formatDate(report.dueDate) }}
          </span>
        </div>
      </li>
    </ul>

    <!-- ── Empty state ────────────────────────────────────────────────────── -->
    <div v-if="!reports.length" class="empty-state">
      <AppIcon name="file-text" :size="30" />
      <p class="empty-title">No reports yet</p>
      <span class="empty-sub">Create your first report to get started</span>
    </div>

  </section>
</template>

<script setup lang="ts">
/**
 * DashRecentReports
 *
 * Displays a compact, shadcn DataTable–styled panel of the 5 most recent
 * donor reports.  All data logic is unchanged; only the visual presentation
 * has been updated to match the sidebar-07 design reference.
 *
 * Usage:
 *   <DashRecentReports :reports="recentReports" />
 */
import AppIcon from '../interfaces/AppIcon.vue';
import type { Report } from '../../interfaces/dashboard';

defineProps<{
  /** Array of report objects — typically useDashboard().recentReports */
  reports: Report[];
}>();

// ─── Status helpers ───────────────────────────────────────────────────────────

/**
 * Maps a report status to a CSS modifier class used by .status-badge.
 * Modifier names align with global badge tokens in main.css.
 */
function statusClass(status: Report['status']): string {
  const map: Record<Report['status'], string> = {
    draft:     'outline',
    submitted: 'primary',
    approved:  'success',
    overdue:   'error',
  };
  return map[status] ?? 'outline';
}

/** Human-readable label for each report status value */
function statusLabel(status: Report['status']): string {
  const map: Record<Report['status'], string> = {
    draft:     'Draft',
    submitted: 'Submitted',
    approved:  'Approved',
    overdue:   'Overdue',
  };
  return map[status] ?? status;
}

// ─── Date formatter ───────────────────────────────────────────────────────────

/** Converts an ISO date string to "15 Jan 2025" format */
function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-GB', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  });
}
</script>

<style scoped>
/* ── Card shell ───────────────────────────────────────────────────────────── */
/*
  Dark panel with a subtle border — matches the shadcn DataTable card wrapper.
  overflow: hidden is required so the table's edge rows don't bleed outside
  the rounded corners.
*/

.reports-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  overflow: hidden;
}

/* ── Card header ──────────────────────────────────────────────────────────── */

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  /* 16px top/bottom, 24px left/right — matches shadcn header padding */
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-subtle);
}

.card-header-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.card-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}

.card-subtitle {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.4;
}

/* "View all →" link aligned to the top-right of the header */
.view-all-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--primary);
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
  /* Vertically align with the title baseline */
  margin-top: 2px;
  transition: opacity 0.14s;
}

.view-all-link:hover {
  opacity: 0.8;
  text-decoration: underline;
}

/* ── Table wrapper ────────────────────────────────────────────────────────── */

.table-wrap {
  overflow-x: auto;
}

/* ── Full-width data table ────────────────────────────────────────────────── */

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.845rem;
}

/* ── Table head ───────────────────────────────────────────────────────────── */
/*
  shadcn DataTable thead: 12 px uppercase muted labels, 8px/24px padding,
  NO background fill — the card bg shows through.
*/

.data-table thead th {
  text-align: left;
  /* 8px vertical, 24px horizontal */
  padding: 8px 24px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  /* Thin separator between head and body */
  border-bottom: 1px solid var(--border-subtle);
  white-space: nowrap;
  /* No background — transparent */
  background: transparent;
}

/* ── Table body rows ──────────────────────────────────────────────────────── */

.data-row {
  /* Subtle bottom rule between every row */
  border-bottom: 1px solid var(--border-subtle);
  transition: background 0.12s;
}

/* Remove bottom border from the very last row so it doesn't clash with the card edge */
.data-row:last-child {
  border-bottom: none;
}

.data-row:hover {
  background-color: var(--bg-card-hover);
}

/* ── Table cells ──────────────────────────────────────────────────────────── */
/*
  shadcn DataTable td: 14px top/bottom, 24px left/right
*/

.data-table td {
  /* 14px vertical, 24px horizontal */
  padding: 14px 24px;
  vertical-align: middle;
  color: var(--text-secondary);
}

/* ── Cell: Report (title + project) ──────────────────────────────────────── */

.cell-report {
  min-width: 200px;
  max-width: 280px;
}

.report-title {
  display: block;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 260px;
}

.report-project {
  display: block;
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 260px;
}

/* ── Cell: Donor (avatar + name) ─────────────────────────────────────────── */

.cell-donor {
  min-width: 130px;
  white-space: nowrap;
}

.donor-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* Small circular avatar showing first letter of the donor name */
.donor-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--primary-dim);
  color: var(--primary);
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  text-transform: uppercase;
}

.donor-name {
  font-size: 0.84rem;
  color: var(--text-secondary);
}

/* ── Cell: Status ─────────────────────────────────────────────────────────── */

.cell-status {
  white-space: nowrap;
}

/* ── Cell: Due Date ───────────────────────────────────────────────────────── */

.cell-date {
  white-space: nowrap;
}

.due-date {
  font-size: 0.82rem;
  color: var(--text-secondary);
}

/* Overdue date shown in error red */
.due-date--overdue {
  color: var(--error);
  font-weight: 500;
}

/* ── Status badge (pill) ──────────────────────────────────────────────────── */
/*
  Pill-shaped badge, 12px font, with a small dot to the left of the label.
  Colour modifier classes use the global token names (outline / primary /
  success / error) aligned with the .badge-* rules in main.css.
*/

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;   /* pill shape */
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
  line-height: 1.5;
}

/* Small filled circle that takes the badge's current text colour */
.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

/* Draft — neutral outline */
.status-badge--outline {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

/* Submitted — primary blue tint */
.status-badge--primary {
  background: var(--primary-dim);
  color: var(--primary);
}

/* Approved — success teal */
.status-badge--success {
  background: var(--success-bg);
  color: var(--third);
}

/* Overdue — error red */
.status-badge--error {
  background: var(--error-bg);
  color: var(--error);
}

/* ── Mobile stacked list (hidden on desktop) ──────────────────────────────── */

.mobile-list {
  display: none;       /* shown via @media below */
  list-style: none;
  margin: 0;
  padding: 0;
}

.mobile-list-item {
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-subtle);
}

.mobile-list-item:last-child {
  border-bottom: none;
}

/* Top row: truncated title + status badge side-by-side */
.mobile-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.mobile-item-top .report-title {
  font-size: 0.84rem;
  max-width: unset;
  flex: 1;
}

/* Meta row: donor · project · due date in muted text */
.mobile-item-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: var(--text-muted);
}

.meta-dot {
  color: var(--border-color);
  user-select: none;
}

/* ── Empty state ──────────────────────────────────────────────────────────── */

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 24px;
  color: var(--text-muted);
  text-align: center;
}

.empty-title {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.empty-sub {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* ── Responsive ───────────────────────────────────────────────────────────── */

@media (max-width: 640px) {
  /* Hide desktop table, reveal mobile list */
  .table-wrap {
    display: none;
  }

  .mobile-list {
    display: block;
  }

  /* Tighter header padding on small screens */
  .card-header {
    padding: 14px 20px;
  }
}
</style>
