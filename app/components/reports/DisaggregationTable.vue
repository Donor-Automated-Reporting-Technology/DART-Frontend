<template>
  <div class="disagg-table-wrap">
    <table class="disagg-table">
      <thead>
        <tr>
          <th class="col-activity">Activity</th>
          <th>Girls</th>
          <th>Boys</th>
          <th>Women</th>
          <th>Men</th>
          <th>Total</th>
          <th>Disability M</th>
          <th>Disability F</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.code">
          <td class="cell-activity">{{ row.name }}</td>
          <td class="cell-num">{{ row.girls }}</td>
          <td class="cell-num">{{ row.boys }}</td>
          <td class="cell-num">{{ row.women }}</td>
          <td class="cell-num">{{ row.men }}</td>
          <td class="cell-num cell-total">{{ row.girls + row.boys + row.women + row.men }}</td>
          <td class="cell-num">{{ row.disability_male }}</td>
          <td class="cell-num">{{ row.disability_female }}</td>
        </tr>
        <tr v-if="rows.length === 0">
          <td colspan="8" class="cell-empty">No data for this period.</td>
        </tr>
        <tr v-else class="row-totals">
          <td class="cell-activity"><strong>Total</strong></td>
          <td class="cell-num"><strong>{{ totals.girls }}</strong></td>
          <td class="cell-num"><strong>{{ totals.boys }}</strong></td>
          <td class="cell-num"><strong>{{ totals.women }}</strong></td>
          <td class="cell-num"><strong>{{ totals.men }}</strong></td>
          <td class="cell-num cell-total"><strong>{{ totals.girls + totals.boys + totals.women + totals.men }}</strong></td>
          <td class="cell-num"><strong>{{ totals.disability_male }}</strong></td>
          <td class="cell-num"><strong>{{ totals.disability_female }}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface DisaggregationRow {
  code: string
  name: string
  girls: number
  boys: number
  women: number
  men: number
  disability_male: number
  disability_female: number
}

const props = defineProps<{ rows: DisaggregationRow[] }>()

const totals = computed(() => {
  const t = { girls: 0, boys: 0, women: 0, men: 0, disability_male: 0, disability_female: 0 }
  props.rows.forEach(r => {
    t.girls += r.girls
    t.boys += r.boys
    t.women += r.women
    t.men += r.men
    t.disability_male += r.disability_male
    t.disability_female += r.disability_female
  })
  return t
})
</script>

<style scoped>
.disagg-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--bg-card);
}

.disagg-table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
}

.disagg-table th {
  padding: 10px 14px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  text-align: right;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-panel);
}

.disagg-table th.col-activity { text-align: left; }

.disagg-table td {
  padding: 10px 14px;
  font-size: 0.82rem;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-subtle);
}

.disagg-table tr:last-child td { border-bottom: none; }
.disagg-table tr:hover td { background: var(--hover-bg-subtle, rgba(255,255,255,0.02)); }

.cell-activity { text-align: left; font-weight: 500; color: var(--text-primary); }
.cell-num { text-align: right; font-variant-numeric: tabular-nums; }
.cell-total { font-weight: 700; color: var(--text-primary); }

.cell-empty { text-align: center; padding: 24px; color: var(--text-muted); }

.row-totals { background: var(--bg-panel); }
.row-totals td { border-top: 2px solid var(--border-color); }
</style>
