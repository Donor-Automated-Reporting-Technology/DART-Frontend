<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Activities', href: '/activities' },
      { title: 'Mass Awareness', href: '/activities/mass-awareness', current: true },
    ]"
  >
    <div class="ma-page">
      <div class="page-header">
        <h1 class="page-title">Mass Awareness Events</h1>
        <p class="page-subtitle">Record community awareness sessions with aggregate participant counts.</p>
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>

      <!-- New event form -->
      <div class="card">
        <h3 class="card-title">Record New Event</h3>
        <AggregateEventForm
          :form="form"
          :total-participants="totalParticipants"
          :submitting="submitting"
          :service-points="servicePoints"
          @submit="handleSubmit"
        />
      </div>

      <!-- Event history -->
      <div class="card">
        <h3 class="card-title">Event History</h3>

        <div v-if="loading" class="loading-state">Loading events…</div>

        <div v-else-if="events.length === 0" class="empty-state">
          No mass awareness events recorded yet.
        </div>

        <div v-else class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th class="num">Girls</th>
                <th class="num">Boys</th>
                <th class="num">Women</th>
                <th class="num">Men</th>
                <th class="num">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ev in events" :key="ev.id">
                <td>{{ ev.event_name }}</td>
                <td>{{ ev.event_date }}</td>
                <td class="num">{{ ev.girls }}</td>
                <td class="num">{{ ev.boys }}</td>
                <td class="num">{{ ev.women }}</td>
                <td class="num">{{ ev.men }}</td>
                <td class="num total">{{ ev.total_participants }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useMassAwareness } from '../../composables/useMassAwareness'
import { useLocationStore } from '../../stores/location'
import { useAuthStore } from '../../stores/auth'
import AggregateEventForm from '../../components/activities/AggregateEventForm.vue'

definePageMeta({ layout: false, middleware: ['auth'] })

const locationStore = useLocationStore()
const authStore = useAuthStore()
const servicePoints = locationStore.allServicePoints

const {
  events, loading, submitting, error,
  form, totalParticipants,
  fetchEvents, submitEvent,
} = useMassAwareness()

async function handleSubmit() {
  const activityId = authStore.frameworkActivities?.find(
    (a: any) => a.code === 'mass_awareness' || a.template_code === 'mass_awareness',
  )?.id || ''

  await submitEvent(activityId)
}

onMounted(() => {
  fetchEvents()
  if (!locationStore.locations.length) locationStore.fetchLocations()
})
</script>

<style scoped>
.ma-page { max-width: 900px; }

.page-header { margin-bottom: 20px; }
.page-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
.page-subtitle { font-size: 0.82rem; color: var(--text-muted); margin: 0; }

.error-msg { font-size: 0.82rem; color: var(--error); margin: 0 0 12px; }

.card {
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg); padding: 20px; margin-bottom: 20px;
}
.card-title { font-size: 0.92rem; font-weight: 600; color: var(--text-secondary); margin: 0 0 16px; }

.loading-state { text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.85rem; }
.empty-state { text-align: center; padding: 32px; color: var(--text-muted); font-size: 0.85rem; }

.table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.data-table th { text-align: left; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); padding: 8px 10px; border-bottom: 1px solid var(--border-color); }
.data-table td { padding: 10px; border-bottom: 1px solid var(--border-subtle); color: var(--text-primary); }
.data-table .num { text-align: right; font-variant-numeric: tabular-nums; }
.data-table .total { font-weight: 700; color: var(--primary); }
</style>
