<template>
  <div class="ben-table-wrap">
    <table class="ben-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Age</th>
          <th>Gender</th>
          <th>Disability</th>
          <th>Location</th>
          <th>Registered</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="beneficiaries.length === 0">
          <td colspan="6" class="empty-cell">No beneficiaries found.</td>
        </tr>
        <tr v-for="b in beneficiaries" :key="b.id" class="ben-row">
          <td class="cell-name">{{ formatName(b) }}</td>
          <td>{{ b.age_at_registration }}</td>
          <td>{{ b.sex }}</td>
          <td>
            <span v-if="b.disability_status && b.disability_status !== 'none'" class="disability-badge">
              {{ b.disability_status }}
            </span>
            <span v-else class="text-muted">—</span>
          </td>
          <td>{{ b.cfs_location?.name ?? '—' }}</td>
          <td class="text-muted">{{ formatDate(b.registration_date) }}</td>
        </tr>
      </tbody>
    </table>

    <!-- Mobile cards -->
    <div class="ben-cards">
      <div v-if="beneficiaries.length === 0" class="empty-cell">No beneficiaries found.</div>
      <div v-for="b in beneficiaries" :key="b.id" class="ben-card">
        <div class="card-top">
          <span class="card-name">{{ formatName(b) }}</span>
          <span class="location-label">{{ b.cfs_location?.name ?? '' }}</span>
        </div>
        <div class="card-meta">
          <span>Age {{ b.age_at_registration }}</span>
          <span>{{ b.sex }}</span>
          <span v-if="b.disability_status && b.disability_status !== 'none'">{{ b.disability_status }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Beneficiary } from '../../interfaces/beneficiary'

defineProps<{
  beneficiaries: Beneficiary[]
}>()

function formatName(b: Beneficiary): string {
  return [b.personal_name, b.father_name, b.grandfather_name, b.family_name]
    .filter(Boolean)
    .join(' ')
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.ben-table-wrap { overflow-x: auto; }

.ben-table {
  width: 100%;
  border-collapse: collapse;
}

.ben-cards { display: none; }

@media (max-width: 640px) {
  .ben-table { display: none; }
  .ben-cards { display: flex; flex-direction: column; gap: 8px; }
}

.ben-table th {
  text-align: left;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-color);
}

.ben-table td {
  padding: 10px 10px;
  font-size: 0.84rem;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-subtle, var(--border-color));
}

.ben-row { transition: background 0.1s; }
.ben-row:hover { background: color-mix(in srgb, var(--primary) 4%, transparent); }

.cell-name { font-weight: 600; }

.text-muted { color: var(--text-muted); }

.empty-cell {
  text-align: center;
  color: var(--text-muted);
  padding: 24px 10px;
  font-size: 0.84rem;
}

.disability-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 0.68rem;
  font-weight: 600;
  background: color-mix(in srgb, var(--warning) 12%, transparent);
  color: var(--warning);
  border-radius: 10px;
}

.location-label {
  font-size: 0.72rem;
  color: var(--text-muted);
}

/* Mobile card */
.ben-card {
  padding: 12px 14px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.card-name {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--text-primary);
}

.card-meta {
  display: flex;
  gap: 10px;
  font-size: 0.72rem;
  color: var(--text-muted);
}
</style>
