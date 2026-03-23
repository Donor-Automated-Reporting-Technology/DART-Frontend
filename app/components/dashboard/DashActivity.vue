<template>
  <section class="activity-card">

    <div class="card-header">
      <div>
        <h2 class="card-title">Recent Activity</h2>
        <p class="card-subtitle">Latest actions across your organisation</p>
      </div>
    </div>

    <ul class="activity-list">
      <li
        v-for="item in activity"
        :key="item.id"
        class="activity-item"
      >
        <!-- Icon bubble -->
        <div :class="['activity-icon', `activity-icon--${iconColor(item.type)}`]">
          <AppIcon :name="iconName(item.type)" :size="14" />
        </div>

        <!-- Content -->
        <div class="activity-content">
          <p class="activity-description">{{ item.description }}</p>
          <div class="activity-meta">
            <span class="activity-user">{{ item.user }}</span>
            <span class="meta-sep">·</span>
            <span class="activity-time">{{ timeAgo(item.timestamp) }}</span>
          </div>
        </div>
      </li>
    </ul>

    <!-- Empty state -->
    <div v-if="!activity.length" class="empty-state">
      <AppIcon name="activity" :size="28" />
      <p>No activity yet</p>
      <span>Actions taken in your organisation will appear here</span>
    </div>

  </section>
</template>

<script setup lang="ts">
import AppIcon from '../interfaces/AppIcon.vue';
import type { ActivityItem, ActivityType } from '../../interfaces/dashboard';

/**
 * DashActivity
 *
 * Displays a chronological feed of recent events in the organisation —
 * report submissions, donor additions, project updates, etc.
 */
defineProps<{
  activity: ActivityItem[];
  /** Formats an ISO timestamp as a relative string e.g. "2 hours ago" */
  timeAgo: (isoDate: string) => string;
}>();

/**
 * Returns the AppIcon name for a given activity type.
 */
function iconName(type: ActivityType): string {
  const map: Record<ActivityType, string> = {
    report_created:   'file-text',
    report_submitted: 'check-circle',
    report_approved:  'check-circle',
    donor_added:      'users',
    project_updated:  'folder',
    project_created:  'folder',
  };
  return map[type] ?? 'activity';
}

/**
 * Returns a colour modifier class for the icon bubble.
 */
function iconColor(type: ActivityType): string {
  const map: Record<ActivityType, string> = {
    report_created:   'primary',
    report_submitted: 'success',
    report_approved:  'success',
    donor_added:      'teal',
    project_updated:  'warning',
    project_created:  'purple',
  };
  return map[type] ?? 'primary';
}
</script>

<style scoped>
/* ── Card shell ───────────────────────────────────────────────────────────── */

.activity-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

/* ── Header ───────────────────────────────────────────────────────────────── */

.card-header {
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

/* ── Activity list ────────────────────────────────────────────────────────── */

.activity-list {
  list-style: none;
  margin: 0;
  padding: 0.5rem 0;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 0.75rem 1.5rem;
  transition: background 0.12s;
}

.activity-item:hover {
  background-color: var(--bg-card-hover);
}

/* ── Icon bubble ──────────────────────────────────────────────────────────── */

.activity-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.activity-icon--primary {
  background: var(--primary-dim);
  color: var(--primary);
}

.activity-icon--success {
  background: var(--success-bg);
  color: var(--third);
}

.activity-icon--teal {
  background: rgba(59, 136, 132, 0.12);
  color: var(--third);
}

.activity-icon--warning {
  background: var(--warning-bg);
  color: var(--warning);
}

.activity-icon--purple {
  background: rgba(124, 111, 247, 0.12);
  color: #7c6ff7;
}

/* ── Content ──────────────────────────────────────────────────────────────── */

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-description {
  font-size: 0.84rem;
  color: var(--text-primary);
  margin: 0 0 0.25rem;
  line-height: 1.4;
}

.activity-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.74rem;
  color: var(--text-muted);
  flex-wrap: wrap;
}

.activity-user {
  color: var(--text-secondary);
  font-weight: 500;
}

.activity-time {
  color: var(--text-muted);
}

.meta-sep {
  color: var(--border-color);
  user-select: none;
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

@media (max-width: 480px) {
  .activity-item {
    padding: 0.7rem 1.25rem;
  }

  .card-header {
    padding: 1rem 1.25rem 0.85rem;
  }
}
</style>
