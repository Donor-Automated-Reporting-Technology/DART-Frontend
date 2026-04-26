<!--
  PSS schedules list — DART-43 follow-up.

  Mirrors the canonical settings/organization.vue page pattern:
  page-header + form-section + section-card.

  Lists every schedule persisted in IndexedDB for the current user's CFS
  location (active + archived + draft + pending), so facilitators can see
  what they've saved (including offline-queued schedules waiting on the
  backend `/pss/schedules` endpoint).

  Sourced AC: DART/PSS_MODULE_PRD.md §6.5 (current-schedule view).
  UX ref: Dart-docs/design-system/DART_UX_REFERENCE.md (PSS schedule).
-->
<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="pss-list">

      <!-- ═══ Page Header ═══ -->
      <div class="page-header">
        <div class="header-row">
          <div>
            <h1 class="page-title">Weekly schedules</h1>
            <p class="page-subtitle">
              {{ cfsLocationName ? `For ${cfsLocationName}` : 'For your CFS location' }}
            </p>
          </div>
          <NuxtLink :to="`/activities/${frameworkId}/pss`" class="btn-back">
            <AppIcon name="arrow-left" :size="14" />
            <span class="btn-text">PSS</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="skeleton-field" />
        <div class="skeleton-field" />
      </div>

      <!-- No CFS -->
      <div v-else-if="!cfsLocationId" class="api-err">
        <AppIcon name="alert-circle" :size="14" />
        Your account is not linked to a CFS location.
      </div>

      <template v-else>
        <!-- ═══ Active schedule ═══ -->
        <div v-if="activeRow" class="form-section">
          <div class="section-label">Active schedule</div>
          <div class="section-card">
            <NuxtLink
              :to="`/activities/${frameworkId}/pss/schedule?draft=${activeRow.clientId}`"
              class="row row--active"
            >
              <div class="row-main">
                <div class="row-heading">
                  <span class="row-title">{{ activeRow.activeDays.length }}-day schedule</span>
                  <span class="pill pill--active">Active</span>
                  <span
                    v-if="activeRow.syncStatus !== 'synced'"
                    class="sync-chip"
                    :title="activeRow.syncError ?? activeRow.syncStatus"
                  >
                    <AppIcon name="refresh-cw" :size="11" />
                    {{ SYNC_LABEL[activeRow.syncStatus] }}
                  </span>
                </div>
                <p class="row-sub">{{ summary(activeRow) }}</p>
                <p class="row-meta">
                  Updated {{ formatDate(activeRow.updatedAt || activeRow.clientTimestamp) }}
                </p>
              </div>
              <AppIcon name="chevron-right" :size="16" class="row-chev" />
            </NuxtLink>
          </div>
        </div>

        <!-- ═══ Drafts ═══ -->
        <div v-if="draftRows.length" class="form-section">
          <div class="section-label">Drafts</div>
          <div class="section-card section-card--list">
            <NuxtLink
              v-for="row in draftRows"
              :key="row.clientId"
              :to="`/activities/${frameworkId}/pss/schedule?draft=${row.clientId}`"
              class="row"
            >
              <div class="row-main">
                <div class="row-heading">
                  <span class="row-title">{{ row.activeDays.length }}-day schedule</span>
                  <span class="pill pill--draft">Draft</span>
                  <span
                    v-if="row.syncStatus !== 'synced'"
                    class="sync-chip"
                    :title="row.syncError ?? row.syncStatus"
                  >
                    <AppIcon name="refresh-cw" :size="11" />
                    {{ SYNC_LABEL[row.syncStatus] }}
                  </span>
                </div>
                <p class="row-sub">{{ summary(row) }}</p>
                <p class="row-meta">
                  Updated {{ formatDate(row.updatedAt || row.clientTimestamp) }}
                </p>
              </div>
              <AppIcon name="chevron-right" :size="16" class="row-chev" />
            </NuxtLink>
          </div>
        </div>

        <!-- ═══ Archived ═══ -->
        <div v-if="archivedRows.length" class="form-section">
          <div class="section-label">Archived</div>
          <div class="section-card section-card--list">
            <NuxtLink
              v-for="row in archivedRows"
              :key="row.clientId"
              :to="`/activities/${frameworkId}/pss/schedule?draft=${row.clientId}`"
              class="row row--muted"
            >
              <div class="row-main">
                <div class="row-heading">
                  <span class="row-title">{{ row.activeDays.length }}-day schedule</span>
                  <span class="pill pill--archived">Archived</span>
                </div>
                <p class="row-sub">{{ summary(row) }}</p>
                <p class="row-meta">
                  Updated {{ formatDate(row.updatedAt || row.clientTimestamp) }}
                </p>
              </div>
              <AppIcon name="chevron-right" :size="16" class="row-chev" />
            </NuxtLink>
          </div>
        </div>

        <!-- ═══ Empty state ═══ -->
        <div v-if="rows.length === 0" class="form-section">
          <div class="section-card section-card--empty">
            <AppIcon name="calendar" :size="22" class="empty-icon" />
            <p class="empty-text">No schedules yet for your CFS location.</p>
            <p class="empty-sub">
              Build a weekly schedule of UNICEF PSS activities for your group.
            </p>
          </div>
        </div>

        <!-- ═══ Actions ═══ -->
        <div class="actions">
          <NuxtLink
            :to="`/activities/${frameworkId}/pss/setup`"
            class="btn-primary"
          >
            <AppIcon name="plus" :size="14" />
            New schedule
          </NuxtLink>
        </div>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../../../stores/auth'
import { schedulesRepository } from '../../../../services/pss/repositories'
import type {
  PssScheduleRecord,
  PssDayOfWeek,
  PssLocalSyncStatus,
} from '../../../../interfaces/pssDb'

definePageMeta({ layout: false, middleware: ['auth'] })

const route = useRoute()
const auth = useAuthStore()
const frameworkId = route.params.id as string

const cfsLocationId = computed<string>(() => auth.cfsLocationId ?? '')
const cfsLocationName = computed<string>(() => auth.cfsLocationName ?? '')

const loading = ref(true)
const rows = ref<PssScheduleRecord[]>([])

const breadcrumbs = computed(() => [
  { title: 'Projects', href: '/activities' },
  { title: 'Project', href: `/activities/${frameworkId}` },
  { title: 'PSS', href: `/activities/${frameworkId}/pss` },
  { title: 'Schedules', href: `/activities/${frameworkId}/pss/schedules`, current: true },
])

const SYNC_LABEL: Record<PssLocalSyncStatus, string> = {
  synced: 'Synced',
  pending: 'Pending sync',
  syncing: 'Syncing…',
  failed: 'Sync failed',
  conflict: 'Conflict',
}

const DAY_SHORT: Record<PssDayOfWeek, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
  fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

const activeRow = computed(() => rows.value.find((r) => r.status === 'active') ?? null)
const draftRows = computed(() =>
  rows.value
    .filter((r) => r.status === 'draft')
    .sort(byUpdatedDesc),
)
const archivedRows = computed(() =>
  rows.value
    .filter((r) => r.status === 'archived')
    .sort(byUpdatedDesc),
)

function byUpdatedDesc(a: PssScheduleRecord, b: PssScheduleRecord): number {
  return (b.updatedAt || b.clientTimestamp || '').localeCompare(
    a.updatedAt || a.clientTimestamp || '',
  )
}

function summary(r: PssScheduleRecord): string {
  const days = r.activeDays.map((d) => DAY_SHORT[d]).join(' · ')
  const ages = r.ageGroups.join(', ')
  const slots = r.templateSlots.length
  return `${days || 'No days'} • Ages ${ages || '—'} • ${slots} activit${slots === 1 ? 'y' : 'ies'}`
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(async () => {
  try {
    if (!cfsLocationId.value) return
    rows.value = await schedulesRepository.listByCfs(cfsLocationId.value)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.pss-list {
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ═══ Page Header (mirror canonical) ═══ */
.page-header { margin-bottom: 4px; }
.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.page-title {
  font-size: 1.35rem;
  font-weight: 750;
  color: var(--text-primary);
  margin: 0 0 2px;
  letter-spacing: -0.02em;
}
.page-subtitle {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0;
}
.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s;
  min-height: 36px;
}
.btn-back:hover { border-color: var(--text-muted); color: var(--text-primary); }

/* ═══ Loading skeleton ═══ */
.loading-state { display: flex; flex-direction: column; gap: 12px; }
.skeleton-field {
  height: 72px;
  background: var(--bg-card);
  border-radius: 10px;
  animation: pulse 1.6s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.3; }
}

/* ═══ Sections (mirror canonical) ═══ */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.section-label {
  font-size: 0.72rem;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  padding-left: 2px;
}
.section-card {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 14px 16px;
}
.section-card--list {
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
}
.section-card--empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 32px 16px;
}
.empty-icon { color: var(--text-muted); }
.empty-text { font-size: 0.88rem; font-weight: 600; color: var(--text-primary); margin: 0; }
.empty-sub  { font-size: 0.78rem; color: var(--text-muted); margin: 0; }

/* ═══ Rows ═══ */
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 12px;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: background 0.12s;
}
.row + .row { border-top: 1px solid var(--border-color); border-radius: 0; }
.row:hover  { background: var(--hover-bg); }
.row--muted { opacity: 0.75; }
.row--active { padding: 4px 4px; }

.row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.row-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.row-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}
.row-sub  { font-size: 0.78rem; color: var(--text-secondary); margin: 0; }
.row-meta { font-size: 0.72rem; color: var(--text-muted); margin: 0; }
.row-chev { color: var(--text-muted); flex-shrink: 0; }

/* ═══ Pills ═══ */
.pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.62rem;
  font-weight: 650;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
}
.pill--active {
  background: var(--primary-dim);
  color: var(--primary);
}
.pill--draft {
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}
.pill--archived {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border-color);
}

.sync-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.66rem;
  color: var(--text-muted);
}

/* ═══ Actions (mirror canonical) ═══ */
.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.84rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  font-family: inherit;
  min-height: 40px;
}
.btn-primary:hover  { opacity: 0.9; }
.btn-primary:active { transform: scale(0.98); }

/* ═══ API error (mirror canonical) ═══ */
.api-err {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--error);
  padding: 10px 14px;
  background: var(--error-bg);
  border: 1px solid rgba(248, 113, 113, 0.12);
  border-radius: 8px;
}

/* ═══ Responsive ═══ */
@media (max-width: 640px) {
  .header-row { flex-direction: column; gap: 10px; }
  .btn-text { display: none; }
}
</style>
