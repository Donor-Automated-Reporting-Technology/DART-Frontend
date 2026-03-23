<template>
  <section class="quick-actions-card">

    <div class="card-header">
      <h2 class="card-title">Quick Actions</h2>
      <p class="card-subtitle">Common tasks at a glance</p>
    </div>

    <ul class="actions-list">
      <li v-for="action in actions" :key="action.id">
        <button class="action-btn" @click="handleAction(action)" type="button">
          <div class="action-icon-wrap" :style="{ background: action.bg }">
            <AppIcon :name="action.icon" :size="18" :style="{ color: action.color }" />
          </div>
          <div class="action-text">
            <span class="action-label">{{ action.label }}</span>
            <span class="action-desc">{{ action.description }}</span>
          </div>
          <AppIcon name="chevron-right" :size="15" class="action-arrow" />
        </button>
      </li>
    </ul>

  </section>
</template>

<script setup lang="ts">
import AppIcon from '../interfaces/AppIcon.vue';

/**
 * DashQuickActions
 *
 * Grid of common task shortcuts on the dashboard.
 * All hrefs are placeholders until the relevant pages are built.
 */

interface Action {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  bg: string;
  href: string;
}

const actions: Action[] = [
  {
    id: 'new-report',
    label: 'New Report',
    description: 'Create a donor report',
    icon: 'file-text',
    color: 'var(--primary)',
    bg: 'var(--primary-dim)',
    href: '#',
  },
  {
    id: 'add-donor',
    label: 'Add Donor',
    description: 'Register a new donor',
    icon: 'users',
    color: 'var(--third)',
    bg: 'var(--success-bg)',
    href: '#',
  },
  {
    id: 'new-project',
    label: 'New Project',
    description: 'Start a new project',
    icon: 'folder',
    color: '#7c6ff7',
    bg: 'rgba(124, 111, 247, 0.1)',
    href: '#',
  },
  {
    id: 'view-reports',
    label: 'All Reports',
    description: 'Browse submitted reports',
    icon: 'eye',
    color: 'var(--warning)',
    bg: 'var(--warning-bg)',
    href: '#',
  },
];

/**
 * Placeholder handler — navigate to the action's route once pages exist.
 * For now all hrefs are "#" so this is a no-op.
 */
function handleAction(action: Action) {
  if (action.href && action.href !== '#') {
    window.location.href = action.href;
  }
}
</script>

<style scoped>
/* ── Card shell ───────────────────────────────────────────────────────────── */

.quick-actions-card {
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

/* ── Actions list ─────────────────────────────────────────────────────────── */

.actions-list {
  list-style: none;
  margin: 0;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* ── Action button ────────────────────────────────────────────────────────── */

.action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem 0.85rem;
  background: none;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
  color: inherit;
}

.action-btn:hover {
  background-color: var(--bg-card-hover);
}

.action-btn:hover .action-arrow {
  color: var(--text-secondary);
  transform: translateX(2px);
}

/* ── Icon wrap ────────────────────────────────────────────────────────────── */

.action-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* ── Text ─────────────────────────────────────────────────────────────────── */

.action-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
}

.action-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.3;
}

.action-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Arrow ────────────────────────────────────────────────────────────────── */

.action-arrow {
  color: var(--text-muted);
  flex-shrink: 0;
  transition: color 0.15s, transform 0.15s;
}
</style>
