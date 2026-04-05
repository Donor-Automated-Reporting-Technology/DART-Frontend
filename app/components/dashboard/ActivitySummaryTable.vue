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
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-subtle);
}

.summary-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.summary-count {
  font-size: 0.72rem;
  color: var(--text-muted);
  background: var(--hover-bg);
  padding: 3px 8px;
  border-radius: 10px;
}

.summary-table {
  width: 100%;
  border-collapse: collapse;
}

.summary-table th {
  text-align: left;
  padding: 10px 18px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-subtle);
}

.summary-table td {
  padding: 12px 18px;
  font-size: 0.82rem;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-subtle);
}

.summary-table tr:last-child td { border-bottom: none; }
.summary-table tr:hover td { background: var(--hover-bg-subtle, rgba(255,255,255,0.02)); }

.col-num { text-align: right; width: 80px; }
.col-progress { width: 200px; }
.cell-name { font-weight: 500; color: var(--text-primary); }
.cell-num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }

.cell-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bar-wrap {
  flex: 1;
  height: 6px;
  background: var(--hover-bg);
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}

.bar-fill.clr-green { background: var(--success, #34d399); }
.bar-fill.clr-yellow { background: var(--warning, #fbbf24); }
.bar-fill.clr-red { background: var(--error, #f87171); }

.pct {
  font-size: 0.75rem;
  font-weight: 600;
  width: 40px;
  text-align: right;
  flex-shrink: 0;
}

.pct.clr-green { color: var(--success, #34d399); }
.pct.clr-yellow { color: var(--warning, #fbbf24); }
.pct.clr-red { color: var(--error, #f87171); }

.empty {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}

@media (max-width: 640px) {
  .col-progress { width: 120px; }
  .summary-table th, .summary-table td { padding: 10px 12px; }
}
</style>
