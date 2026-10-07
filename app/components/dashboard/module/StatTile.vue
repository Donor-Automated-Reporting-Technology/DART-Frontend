<template>
  <div class="stat-tile" :class="{ 'stat-tile--alert': alert }">
    <span class="stat-value" :class="tone ? `stat-value--${tone}` : ''">{{ value }}</span>
    <span class="stat-label">{{ label }}</span>
    <span v-if="sub" class="stat-sub">{{ sub }}</span>
  </div>
</template>

<script setup lang="ts">
/** Compact figure beside the reach hero on activity-module dashboards. */
defineProps<{
  value: string | number
  label: string
  sub?: string
  tone?: 'good' | 'warn' | 'bad'
  alert?: boolean
}>()
</script>

<style scoped>
.stat-tile {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg, 16px);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
}
.stat-tile--alert { border-color: rgba(255, 149, 0, 0.5); }
.stat-value { font-size: 1.8rem; font-weight: 750; color: var(--text-primary); line-height: 1.1; font-variant-numeric: tabular-nums; }
.stat-value--good { color: var(--data-teal); }
.stat-value--warn { color: var(--warning); }
.stat-value--bad { color: var(--error); }
.stat-label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
.stat-sub { font-size: 0.72rem; color: var(--text-muted); }
</style>
