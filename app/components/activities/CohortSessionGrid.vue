<template>
  <div class="session-grid">
    <table class="grid-table">
      <thead>
        <tr>
          <th class="col-name">Name</th>
          <th
            v-for="(col, ci) in columns"
            :key="ci"
            class="col-session"
            :class="{ 'col-active': ci === activeColumn }"
          >
            <span class="col-num">{{ col.label }}</span>
            <span v-if="col.moduleName" class="col-mod">{{ col.moduleName }}</span>
          </th>
          <th class="col-status">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.beneficiaryId">
          <td class="cell-name">{{ row.name }}</td>
          <td
            v-for="(col, ci) in columns"
            :key="ci"
            class="cell-session"
            :class="{ 'cell-active': ci === activeColumn }"
          >
            <!-- Already attended -->
            <span v-if="row.attended[ci]" class="mark mark--done">&#10003;</span>
            <!-- Today's column, editable -->
            <label v-else-if="ci === activeColumn" class="mark mark--edit">
              <input
                type="checkbox"
                :checked="row.todayPresent"
                @change="$emit('toggle', row.beneficiaryId)"
              />
            </label>
            <!-- Future / not attended -->
            <span v-else class="mark mark--empty">&mdash;</span>
          </td>
          <td class="cell-status">
            <span class="status-badge">{{ row.attendedCount }}/{{ columns.length }}</span>
          </td>
        </tr>
        <tr v-if="rows.length === 0">
          <td :colspan="columns.length + 2" class="cell-empty">No enrollments yet.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
export interface GridColumn {
  label: string
  moduleName?: string
}

export interface GridRow {
  beneficiaryId: string
  name: string
  /** Boolean per column index — true = previously attended */
  attended: boolean[]
  /** Whether marked present for today's session (activeColumn) */
  todayPresent: boolean
  attendedCount: number
}

defineProps<{
  columns: GridColumn[]
  rows: GridRow[]
  activeColumn: number
}>()

defineEmits<{
  (e: 'toggle', beneficiaryId: string): void
}>()
</script>

<style scoped>
.session-grid {
  overflow-x: auto;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--bg-card);
}

.grid-table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
}

.grid-table th {
  padding: 10px 8px;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  text-align: center;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-panel);
}

.grid-table th.col-name,
.grid-table td.cell-name {
  text-align: left;
  padding-left: 14px;
  position: sticky;
  left: 0;
  background: var(--bg-card);
  z-index: 1;
  min-width: 160px;
}

.col-session { width: 44px; }
.col-active { background: var(--primary-dim) !important; }

.col-num { display: block; font-size: 0.72rem; }
.col-mod { display: block; font-size: 0.6rem; font-weight: 400; color: var(--text-muted); max-width: 60px; overflow: hidden; text-overflow: ellipsis; }

.grid-table td {
  padding: 10px 8px;
  font-size: 0.82rem;
  color: var(--text-secondary);
  text-align: center;
  border-bottom: 1px solid var(--border-subtle);
}

.grid-table tr:hover td { background: var(--hover-bg-subtle, rgba(255,255,255,0.02)); }
.grid-table tr:hover td.cell-name { background: var(--bg-card); }
.cell-active { background: color-mix(in srgb, var(--primary) 5%, transparent); }

.cell-name { font-weight: 500; color: var(--text-primary); }

.mark { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 4px; font-size: 0.82rem; }
.mark--done { color: var(--success); font-weight: 700; }
.mark--empty { color: var(--text-muted); opacity: 0.4; font-size: 0.7rem; }
.mark--edit { cursor: pointer; }
.mark--edit input { width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer; }

.cell-status { text-align: center; }

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 0.72rem;
  font-weight: 600;
  border-radius: 10px;
  background: var(--hover-bg);
  color: var(--text-primary);
}

.cell-empty {
  text-align: center;
  padding: 24px;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.col-status { width: 70px; }
</style>
