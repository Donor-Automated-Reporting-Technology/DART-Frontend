<template>
  <div class="activity-summary">
    <div class="summary-header">
      <h3 class="summary-title">Activity Progress</h3>
      <span class="summary-count">{{ activities.length }} activities</span>
    </div>

    <div v-if="activities.length === 0" class="empty">
      <p>No activity data for this period.</p>
    </div>

    <table v-else class="summary-table">
      <thead>
        <tr>
          <th class="col-name">Activity</th>
          <th class="col-num">Actual</th>
          <th class="col-num">Target</th>
          <th class="col-progress">Progress</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in activities" :key="a.code">
          <td class="cell-name">{{ a.name }}</td>
          <td class="cell-num">{{ a.actual }}</td>
          <td class="cell-num">{{ a.target }}</td>
          <td class="cell-progress">
            <div class="bar-wrap">
              <div
                class="bar-fill"
                :class="barColor(a.percentage)"
                :style="{ width: Math.min(a.percentage, 100) + '%' }"
              />
            </div>
            <span class="pct" :class="barColor(a.percentage)">{{ a.percentage }}%</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { ActivitySummary } from '../../interfaces/dashboard'

defineProps<{ activities: ActivitySummary[] }>()

function barColor(pct: number): string {
  if (pct >= 80) return 'clr-green'
  if (pct >= 50) return 'clr-yellow'
  return 'clr-red'
}
</script>

<style scoped>
.activity-summary {
  overflow: hidden;
}

.summary-header {
  display: none;
}

.summary-table {
  width: 100%;
  border-collapse: collapse;
}

.summary-table th {
  text-align: left;
  padding: 12px 22px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted, #AEAEB2);
}

.summary-table td {
  padding: 14px 22px;
  font-size: 0.82rem;
  color: var(--text-secondary, #86868B);
}

.summary-table tbody tr {
  transition: background 0.12s;
}
.summary-table tbody tr:hover td {
  background: var(--hover-bg-subtle, rgba(0,0,0,0.015));
}

.col-num { text-align: right; width: 80px; }
.col-progress { width: 200px; }
.cell-name { font-weight: 500; color: var(--text-primary, #1D1D1F); }
.cell-num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }

.cell-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bar-wrap {
  flex: 1;
  height: 5px;
  background: var(--hover-bg, rgba(0,0,0,0.03));
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.bar-fill.clr-green,
.bar-fill.clr-yellow,
.bar-fill.clr-red { background: var(--primary); }

.pct {
  font-size: 0.75rem;
  font-weight: 600;
  width: 40px;
  text-align: right;
  flex-shrink: 0;
  color: var(--primary);
}

.empty {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}

@media (max-width: 640px) {
  .col-progress { width: 120px; }
  .summary-table th, .summary-table td { padding: 10px 14px; }
}
</style>
