<template>
  <section class="projects-card">

    <div class="card-header">
      <div>
        <h2 class="card-title">Active Projects</h2>
        <p class="card-subtitle">Current funded projects and progress</p>
      </div>
      <NuxtLink to="#" class="view-all-link" @click.prevent>
        View all
        <AppIcon name="chevron-right" :size="14" />
      </NuxtLink>
    </div>

    <!-- Project list -->
    <ul v-if="projects.length" class="projects-list">
      <li
        v-for="project in projects"
        :key="project.id"
        class="project-item"
      >
        <!-- Left: donor initial + title/donor -->
        <div class="project-left">
          <div
            class="project-avatar"
            :style="{ background: donorColor(project.donor) }"
            aria-hidden="true"
          >
            {{ project.donor[0] }}
          </div>

          <div class="project-info">
            <span class="project-title">{{ project.title }}</span>
            <span class="project-donor">{{ project.donor }}</span>
          </div>
        </div>

        <!-- Right: status badge + progress -->
        <div class="project-right">
          <span :class="['status-badge', `status-badge--${statusClass(project.status)}`]">
            {{ statusLabel(project.status) }}
          </span>

          <div class="project-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${project.progress}%` }"
              />
            </div>
            <span class="progress-label">{{ project.progress }}%</span>
          </div>

          <span class="project-end">
            <AppIcon name="calendar" :size="12" />
            {{ formatDate(project.endDate) }}
          </span>
        </div>
      </li>
    </ul>

    <!-- Empty state -->
    <div v-else class="empty-state">
      <AppIcon name="folder" :size="30" />
      <p>No active projects</p>
      <span>Projects will appear here once created</span>
    </div>

  </section>
</template>

<script setup lang="ts">
import AppIcon from '../interfaces/AppIcon.vue';
import type { Project } from '../../interfaces/dashboard';

/**
 * DashProjects
 *
 * Lists the currently active (and on-hold) projects for the organisation,
 * showing each project's donor, completion progress and end date.
 * Completed projects are intentionally excluded to keep the list focused.
 */
defineProps<{
  /** Projects to display — pass `activeProjects` from useDashboard */
  projects: Project[];
}>();

// ─── Status helpers ───────────────────────────────────────────────────────────

/** Maps a project status to a badge colour modifier */
function statusClass(status: Project['status']): string {
  const map: Record<Project['status'], string> = {
    active:    'success',
    completed: 'primary',
    'on-hold': 'warning',
  };
  return map[status] ?? 'outline';
}

/** Human-readable status label */
function statusLabel(status: Project['status']): string {
  const map: Record<Project['status'], string> = {
    active:    'Active',
    completed: 'Completed',
    'on-hold': 'On Hold',
  };
  return map[status] ?? status;
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/** Formats an ISO date string to "30 Jun 2025" */
function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-GB', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  });
}

/**
 * Returns a deterministic muted tint colour for a donor's avatar.
 * Uses a small palette so repeated donors stay consistent.
 */
const DONOR_COLOURS = [
  'rgba(108, 177, 255, 0.18)',
  'rgba(59,  136, 132, 0.18)',
  'rgba(124, 111, 247, 0.18)',
  'rgba(232, 168,  56, 0.18)',
  'rgba(232,  88,  88, 0.18)',
];

function donorColor(donor: string): string {
  let hash = 0;
  for (let i = 0; i < donor.length; i++) {
    hash = donor.charCodeAt(i) + ((hash << 5) - hash);
  }
  return DONOR_COLOURS[Math.abs(hash) % DONOR_COLOURS.length];
}
</script>

<style scoped>
/* ── Card shell ───────────────────────────────────────────────────────────── */

.projects-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 1px solid var(--border-subtle);
}

.card-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.2rem;
}

.card-subtitle {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0;
}

.view-all-link {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 0.78rem;
  color: var(--text-primary);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  margin-top: 2px;
  flex-shrink: 0;
}

.view-all-link:hover {
  text-decoration: underline;
}

/* ── Project list ─────────────────────────────────────────────────────────── */

.projects-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.project-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.95rem 1.5rem;
  border-top: 1px solid var(--border-subtle);
  transition: background 0.12s;
}

.project-item:hover {
  background-color: var(--bg-card-hover);
}

/* ── Left side ────────────────────────────────────────────────────────────── */

.project-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  flex: 1;
}

.project-avatar {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
  flex-shrink: 0;
}

.project-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.project-title {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-donor {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 2px;
}

/* ── Right side ───────────────────────────────────────────────────────────── */

.project-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

/* ── Progress bar ─────────────────────────────────────────────────────────── */

.project-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-bar {
  width: 80px;
  height: 5px;
  background-color: var(--bg-panel);
  border-radius: 3px;
  overflow: hidden;
  flex-shrink: 0;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary) 0%, rgba(108, 177, 255, 0.7) 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 28px;
  text-align: right;
}

/* ── End date ─────────────────────────────────────────────────────────────── */

.project-end {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
}

/* ── Status badges ────────────────────────────────────────────────────────── */

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-badge--success {
  background: var(--success-bg);
  color: var(--third);
}

.status-badge--primary {
  background: var(--primary-dim);
  color: var(--primary);
}

.status-badge--warning {
  background: var(--warning-bg);
  color: var(--warning);
}

.status-badge--outline {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

/* ── Empty state ──────────────────────────────────────────────────────────── */

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 3rem 1.5rem;
  color: var(--text-muted);
  text-align: center;
}

.empty-state p {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.empty-state span {
  font-size: 0.78rem;
}

/* ── Responsive ───────────────────────────────────────────────────────────── */

@media (max-width: 640px) {
  .project-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
  }

  .project-right {
    width: 100%;
    justify-content: space-between;
  }

  .progress-bar {
    width: 60px;
  }

  .project-end {
    display: none;
  }
}
</style>
