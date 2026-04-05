<template>
  <div class="topic-grid">
    <table class="grid-table">
      <thead>
        <tr>
          <th class="col-name">Name</th>
          <th
            v-for="(topic, ti) in topics"
            :key="ti"
            class="col-topic"
            :class="{ 'col-active': ti === activeTopic }"
            :title="topic"
          >
            T{{ ti + 1 }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td class="cell-name">{{ row.full_name }}</td>
          <td
            v-for="(topic, ti) in topics"
            :key="ti"
            class="cell-topic"
            :class="{ 'cell-active': ti === activeTopic }"
          >
            <span v-if="row.topicsDone[ti]" class="mark mark--done">&#10003;</span>
            <label v-else-if="ti === activeTopic" class="mark mark--edit">
              <input
                type="checkbox"
                :checked="row.selected"
                @change="$emit('toggle', row.id)"
              />
            </label>
            <span v-else class="mark mark--empty">&mdash;</span>
          </td>
        </tr>
        <tr v-if="rows.length === 0">
          <td :colspan="topics.length + 1" class="cell-empty">No beneficiaries loaded.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
export interface TopicRow {
  id: string
  full_name: string
  topicsDone: boolean[]
  selected: boolean
}

defineProps<{
  topics: string[]
  rows: TopicRow[]
  activeTopic: number
}>()

defineEmits<{
  (e: 'toggle', id: string): void
}>()
</script>

<style scoped>
.topic-grid {
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
  font-size: 0.7rem;
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

.col-topic { width: 50px; }
.col-active { background: var(--primary-dim) !important; }

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

.cell-empty {
  text-align: center;
  padding: 24px;
  color: var(--text-muted);
  font-size: 0.85rem;
}
</style>
