<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Activities', href: '/activities' },
      { title: 'Attendance', href: '/activities/attendance', current: true },
    ]"
  >
    <div class="attendance-page">
      <div class="page-header">
        <h1 class="page-title">Daily Attendance</h1>
        <p class="page-subtitle">Record beneficiary attendance for today's session.</p>
      </div>

      <!-- Filters -->
      <div class="filters">
        <div class="field">
          <label class="field-label">Date</label>
          <input v-model="date" type="date" class="field-input" />
        </div>
        <div class="field">
          <label class="field-label">CFS Centre</label>
          <select v-model="centreId" class="field-input">
            <option value="" disabled>Select centre</option>
            <option v-for="sp in servicePoints" :key="sp.id" :value="sp.id">{{ sp.name }}</option>
          </select>
        </div>
      </div>

      <!-- Submitted banner -->
      <div v-if="submitted" class="success-banner">
        <span>Attendance submitted successfully!</span>
        <button class="btn-text" @click="submitted = false; fetchBeneficiaries()">Record another</button>
      </div>

      <!-- Error -->
      <p v-if="error" class="error-msg">{{ error }}</p>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">Loading beneficiaries…</div>

      <!-- Table -->
      <div v-else-if="rows.length > 0 && !submitted" class="attendance-card">
        <div class="toolbar">
          <button class="btn-outline btn-sm" @click="selectAll">Select All</button>
          <button class="btn-outline btn-sm" @click="deselectAll">Deselect All</button>
        </div>

        <table class="att-table">
          <thead>
            <tr>
              <th class="col-check"></th>
              <th>Name</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Disability</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.id"
              :class="{ 'row-selected': row.selected }"
              @click="toggleBeneficiary(row.id)"
            >
              <td class="col-check">
                <input type="checkbox" :checked="row.selected" @click.stop />
              </td>
              <td class="cell-name">{{ row.full_name }}</td>
              <td>{{ row.age }}</td>
              <td class="cell-gender">{{ row.sex }}</td>
              <td>
                <span v-if="row.disability_status !== 'none'" class="badge badge--disability">{{ row.disability_status }}</span>
                <span v-else class="text-muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Summary footer -->
        <div class="summary-footer">
          <div class="summary-stats">
            <span>Present: <strong>{{ presentCount }}</strong></span>
            <span>Absent: <strong>{{ absentCount }}</strong></span>
            <span>Girls: <strong>{{ genderBreakdown.girls }}</strong></span>
            <span>Boys: <strong>{{ genderBreakdown.boys }}</strong></span>
            <span>Disability: <strong>{{ disabilityCount }}</strong></span>
          </div>
          <button
            class="btn-primary"
            :disabled="submitting || presentCount === 0"
            @click="submitAttendance"
          >
            <span v-if="submitting" class="btn-spinner" />
            {{ submitting ? 'Submitting…' : 'Submit Attendance' }}
          </button>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="centreId && !loading && !submitted" class="empty-state">
        No beneficiaries registered at this centre.
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAttendance } from '../../composables/useAttendance'
import { useLocationStore } from '../../stores/location'

definePageMeta({ layout: false, middleware: ['auth'] })

const locationStore = useLocationStore()
const servicePoints = locationStore.allServicePoints

const {
  date, centreId, rows, loading, submitting, submitted, error,
  presentCount, absentCount, genderBreakdown, disabilityCount,
  fetchBeneficiaries, toggleBeneficiary, selectAll, deselectAll, submitAttendance,
} = useAttendance()

onMounted(() => {
  if (!locationStore.locations.length) locationStore.fetchLocations()
})
</script>

<style scoped>
.attendance-page { max-width: 800px; }

.page-header { margin-bottom: 20px; }
.page-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
.page-subtitle { font-size: 0.82rem; color: var(--text-muted); margin: 0; }

.filters { display: flex; gap: 14px; margin-bottom: 18px; }

.field { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }

.field-input {
  padding: 9px 12px; background: var(--bg-input); border: 1px solid var(--border-color);
  border-radius: var(--radius-sm); color: var(--text-primary); font-size: 0.82rem; font-family: inherit;
}
.field-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-dim); }

select.field-input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 8px center; background-repeat: no-repeat; background-size: 16px; padding-right: 32px;
}

.success-banner {
  display: flex; align-items: center; gap: 10px; padding: 12px 16px;
  background: color-mix(in srgb, var(--success) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--success) 20%, transparent);
  border-radius: var(--radius-sm); color: var(--success); font-size: 0.85rem; margin-bottom: 16px;
}

.error-msg { font-size: 0.82rem; color: var(--error); margin: 0 0 12px; }

.loading-state { text-align: center; padding: 32px; color: var(--text-muted); font-size: 0.85rem; }

.attendance-card {
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg); overflow: hidden;
}

.toolbar { display: flex; gap: 8px; padding: 12px 14px; border-bottom: 1px solid var(--border-subtle); }

.btn-outline { padding: 6px 12px; background: transparent; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.75rem; color: var(--text-muted); cursor: pointer; }
.btn-outline:hover { border-color: var(--text-primary); color: var(--text-primary); }
.btn-sm { font-size: 0.72rem; }

.att-table { width: 100%; border-collapse: collapse; }
.att-table th { text-align: left; padding: 10px 14px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); border-bottom: 1px solid var(--border-subtle); }
.att-table td { padding: 10px 14px; font-size: 0.82rem; color: var(--text-secondary); border-bottom: 1px solid var(--border-subtle); }
.att-table tr:last-child td { border-bottom: none; }
.att-table tr { cursor: pointer; transition: background 0.1s; }
.att-table tr:hover td { background: var(--hover-bg-subtle, rgba(255,255,255,0.02)); }
.row-selected { background: color-mix(in srgb, var(--primary) 6%, transparent); }

.col-check { width: 40px; text-align: center; }
.col-check input { accent-color: var(--primary); width: 16px; height: 16px; cursor: pointer; }
.cell-name { font-weight: 500; color: var(--text-primary); }
.cell-gender { text-transform: capitalize; }

.badge { font-size: 0.7rem; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
.badge--disability { background: var(--warning-bg, color-mix(in srgb,var(--warning) 12%, transparent)); color: var(--warning); }

.text-muted { color: var(--text-muted); }

.summary-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 14px; border-top: 1px solid var(--border-subtle); background: var(--bg-panel);
}

.summary-stats { display: flex; gap: 16px; font-size: 0.78rem; color: var(--text-muted); }
.summary-stats strong { color: var(--text-primary); }

.btn-primary {
  display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px;
  background: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm);
  font-size: 0.82rem; font-weight: 600; cursor: pointer;
}
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-text { background: none; border: none; color: var(--success); font-size: 0.82rem; font-weight: 500; cursor: pointer; text-decoration: underline; }

.btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state { text-align: center; padding: 48px; color: var(--text-muted); font-size: 0.85rem; background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-lg); }

@media (max-width: 640px) {
  .filters { flex-direction: column; }
  .summary-footer { flex-direction: column; gap: 12px; }
  .summary-stats { flex-wrap: wrap; gap: 10px; }
}
</style>
