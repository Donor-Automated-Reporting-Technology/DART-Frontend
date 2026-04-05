<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Activities', href: '/activities' },
      { title: 'Children Sessions', href: '/activities/children-sessions', current: true },
    ]"
  >
    <div class="csessions-page">
      <div class="page-header">
        <h1 class="page-title">Children CP Awareness Sessions</h1>
        <p class="page-subtitle">Track 6 child protection awareness topics per child.</p>
      </div>

      <!-- Filters -->
      <div class="filters">
        <div class="field">
          <label class="field-label">CFS Centre</label>
          <select v-model="centreId" class="field-input">
            <option value="" disabled>Select centre</option>
            <option v-for="sp in servicePoints" :key="sp.id" :value="sp.id">{{ sp.name }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">Topic</label>
          <select v-model="selectedTopic" class="field-input">
            <option v-for="(t, i) in topics" :key="i" :value="i">T{{ i + 1 }}: {{ t }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">Date</label>
          <input v-model="sessionDate" type="date" class="field-input" />
        </div>
      </div>

      <!-- Error -->
      <p v-if="error" class="error-msg">{{ error }}</p>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">Loading…</div>

      <!-- Topic grid -->
      <template v-else-if="rows.length > 0">
        <!-- Toolbar -->
        <div class="toolbar">
          <button class="btn-outline btn-sm" @click="selectAll">Select All</button>
          <button class="btn-outline btn-sm" @click="deselectAll">Deselect All</button>
          <span class="toolbar-info">{{ presentCount }}/{{ totalCount }} selected for today</span>
        </div>

        <TopicAttendanceGrid
          :topics="topics"
          :rows="rows"
          :active-topic="selectedTopic"
          @toggle="toggleChild"
        />

        <!-- Topic completion -->
        <div class="topic-stats">
          <div v-for="(t, i) in topics" :key="i" class="topic-pill">
            <span class="pill-label">T{{ i + 1 }}</span>
            <span class="pill-count">{{ topicCompletionCounts[i] }}</span>
          </div>
        </div>

        <!-- Submit -->
        <div class="submit-bar">
          <button
            class="btn-primary"
            :disabled="submitting || presentCount === 0"
            @click="submitTopicAttendance"
          >
            <span v-if="submitting" class="btn-spinner" />
            {{ submitting ? 'Submitting…' : 'Submit Topic Attendance' }}
          </button>
        </div>
      </template>

      <!-- Empty -->
      <div v-else-if="centreId && !loading" class="empty-state">
        No beneficiaries at this centre.
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useChildrenSessions, CP_TOPICS } from '../../composables/useChildrenSessions'
import { useLocationStore } from '../../stores/location'
import TopicAttendanceGrid from '../../components/activities/TopicAttendanceGrid.vue'

definePageMeta({ layout: false, middleware: ['auth'] })

const locationStore = useLocationStore()
const servicePoints = locationStore.allServicePoints
const topics = CP_TOPICS

const {
  centreId, selectedTopic, sessionDate, rows, loading, submitting, error,
  presentCount, totalCount, topicCompletionCounts,
  fetchBeneficiariesWithTopicProgress, toggleChild, selectAll, deselectAll, submitTopicAttendance,
} = useChildrenSessions()

onMounted(() => {
  if (!locationStore.locations.length) locationStore.fetchLocations()
})
</script>

<style scoped>
.csessions-page { max-width: 900px; }

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

.error-msg { font-size: 0.82rem; color: var(--error); margin: 0 0 12px; }
.loading-state { text-align: center; padding: 32px; color: var(--text-muted); font-size: 0.85rem; }
.empty-state { text-align: center; padding: 48px; background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-lg); color: var(--text-muted); font-size: 0.85rem; }

.toolbar {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0; border-bottom: none;
}

.toolbar-info { margin-left: auto; font-size: 0.78rem; color: var(--text-muted); }

.btn-outline { padding: 6px 12px; background: transparent; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.72rem; color: var(--text-muted); cursor: pointer; }
.btn-outline:hover { border-color: var(--text-primary); color: var(--text-primary); }
.btn-sm { font-size: 0.72rem; }

.topic-stats {
  display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap;
}

.topic-pill {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px; background: var(--bg-card);
  border: 1px solid var(--border-subtle); border-radius: 16px;
}

.pill-label { font-size: 0.72rem; font-weight: 600; color: var(--text-muted); }
.pill-count { font-size: 0.78rem; font-weight: 700; color: var(--text-primary); }

.submit-bar { display: flex; justify-content: flex-end; margin-top: 14px; }

.btn-primary {
  display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px;
  background: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm);
  font-size: 0.82rem; font-weight: 600; cursor: pointer;
}
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 640px) {
  .filters { flex-direction: column; }
}
</style>
