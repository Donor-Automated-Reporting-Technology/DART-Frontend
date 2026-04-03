<template>
  <!--
    CfsBeneficiariesTable
    ─────────────────────────────────────────────────────────────────────────────
    Reusable paginated + filterable beneficiaries list.

    Props:
      token              — auth token
      showLocationFilter — when true (admin only) shows the CFS location dropdown
      locations          — array of { id, name } for the location filter (admin only)
  -->
  <div class="ben-table-wrap">

    <!-- ── Toolbar ─────────────────────────────────────────────────────────── -->
    <div class="ben-toolbar">

      <!-- Search -->
      <div class="ben-search">
        <AppIcon name="search" :size="15" class="ben-search__icon" />
        <input
          id="ben-search-input"
          v-model="localSearch"
          class="ben-search__input"
          type="text"
          placeholder="Search by name…"
          autocomplete="off"
        />
        <button
          v-if="localSearch"
          class="ben-search__clear"
          aria-label="Clear search"
          @click="localSearch = ''"
        >×</button>
      </div>

      <!-- Filters row -->
      <div class="ben-filters">

        <!-- Location filter (admin only) -->
        <select
          v-if="showLocationFilter"
          id="ben-location-filter"
          v-model="filterLocation"
          class="ben-select"
          @change="resetPage"
        >
          <option value="">All Locations</option>
          <option
            v-for="loc in locations"
            :key="loc.id"
            :value="loc.id"
          >{{ loc.name }}</option>
        </select>

        <!-- Sex filter -->
        <select
          id="ben-sex-filter"
          v-model="filterSex"
          class="ben-select"
          @change="resetPage"
        >
          <option value="">All Genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>

        <!-- Disability filter -->
        <select
          id="ben-disability-filter"
          v-model="filterDisability"
          class="ben-select"
          @change="resetPage"
        >
          <option value="">All Disability Statuses</option>
          <option value="none">None</option>
          <option value="physical">Physical</option>
          <option value="visual">Visual</option>
          <option value="hearing">Hearing</option>
          <option value="intellectual">Intellectual</option>
          <option value="psychosocial">Psychosocial</option>
          <option value="other">Other</option>
        </select>

        <!-- Results count badge -->
        <span v-if="pagination" class="ben-count">
          {{ pagination.total_items }} {{ pagination.total_items === 1 ? 'child' : 'children' }}
        </span>
      </div>
    </div>

    <!-- ── Loading skeleton ────────────────────────────────────────────────── -->
    <div v-if="isLoading" class="ben-skeleton">
      <div v-for="n in 5" :key="n" class="ben-skeleton__row" />
    </div>

    <!-- ── Error ───────────────────────────────────────────────────────────── -->
    <div v-else-if="loadError" class="ben-error">
      <AppIcon name="alert-circle" :size="16" />
      <span>{{ loadError }}</span>
      <button class="ben-btn-retry" @click="fetch">Retry</button>
    </div>

    <!-- ── Empty state ─────────────────────────────────────────────────────── -->
    <div v-else-if="!isLoading && beneficiaries.length === 0" class="ben-empty">
      <AppIcon name="users" :size="36" />
      <p>No beneficiaries found</p>
      <span v-if="localSearch || filterSex || filterDisability || filterLocation">
        Try adjusting the filters
      </span>
    </div>

    <!-- ── Table ───────────────────────────────────────────────────────────── -->
    <div v-else class="ben-table-scroll">
      <table class="ben-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Age</th>
            <th>Sex</th>
            <th>Disability</th>
            <th>Guardian</th>
            <th>Registered</th>
            <th v-if="showLocationFilter">CFS Location</th>
            <th v-if="showLocationFilter">Facilitator</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="ben in beneficiaries"
            :key="ben.id"
            class="ben-table__row"
          >
            <!-- Full name: personal + father + family -->
            <td class="ben-name-cell">
              <span class="ben-name">{{ fullName(ben) }}</span>
              <span v-if="ben.language" class="ben-lang">{{ ben.language }}</span>
            </td>
            <td>{{ ben.age_at_registration }} yrs</td>
            <td>
              <span class="ben-badge" :class="sexClass(ben.sex)">
                {{ capitalize(ben.sex) }}
              </span>
            </td>
            <td>
              <span
                class="ben-badge"
                :class="ben.disability_status === 'none' ? 'ben-badge--neutral' : 'ben-badge--disability'"
              >
                {{ capitalize(ben.disability_status) }}
              </span>
            </td>
            <td class="ben-guardian-cell">
              <span>{{ ben.guardian_name }}</span>
              <span v-if="ben.guardian_phone" class="ben-phone">{{ ben.guardian_phone }}</span>
            </td>
            <td class="ben-date-cell">{{ formatDate(ben.registration_date) }}</td>
            <td v-if="showLocationFilter" class="ben-location-cell">
              {{ ben.cfs_location?.name ?? '—' }}
            </td>
            <td v-if="showLocationFilter" class="ben-staff-cell">
              {{ getFacilitator(ben.cfs_location?.id) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Pagination ──────────────────────────────────────────────────────── -->
    <div v-if="pagination && pagination.total_pages > 1" class="ben-pagination">
      <button
        class="ben-page-btn"
        :disabled="!pagination.has_prev"
        @click="goPage(currentPage - 1)"
      >
        <AppIcon name="chevron-left" :size="16" />
      </button>

      <template v-for="p in pageNumbers" :key="p">
        <span v-if="p === '...'" class="ben-page-ellipsis">…</span>
        <button
          v-else
          class="ben-page-btn"
          :class="{ 'ben-page-btn--active': p === currentPage }"
          @click="goPage(Number(p))"
        >{{ p }}</button>
      </template>

      <button
        class="ben-page-btn"
        :disabled="!pagination.has_next"
        @click="goPage(currentPage + 1)"
      >
        <AppIcon name="chevron-right" :size="16" />
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { cfsApi } from '../../services/cfsApi';
import type { BeneficiaryListItem, BeneficiaryListPagination, StaffAssignment } from '../../interfaces/cfs';
import AppIcon from '../interfaces/AppIcon.vue';

// ── Props ───────────────────────────────────────────────────────────────────
const props = defineProps<{
  token?: string;
  /** Whether to show the CFS location filter + column (org_admin only) */
  showLocationFilter?: boolean;
  /** Location options for the filter dropdown */
  locations?: Array<{ id: string; name: string }>;
  /** Staff assignments to map facilitators (admin only) */
  assignments?: StaffAssignment[];
}>();

// ── State ────────────────────────────────────────────────────────────────────
const beneficiaries  = ref<BeneficiaryListItem[]>([]);
const pagination     = ref<BeneficiaryListPagination | null>(null);
const isLoading      = ref(false);
const loadError      = ref('');
const currentPage    = ref(1);
const localSearch    = ref('');
const filterSex      = ref('');
const filterDisability = ref('');
const filterLocation = ref('');

// ── Debounced search ─────────────────────────────────────────────────────────
let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(localSearch, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentPage.value = 1;
    fetch();
  }, 320);
});

// ── Fetch ────────────────────────────────────────────────────────────────────
async function fetch() {
  isLoading.value = true;
  loadError.value = '';
  try {
    const result = await cfsApi.getBeneficiariesList(
      {
        page:              currentPage.value,
        page_size:         20,
        search:            localSearch.value    || undefined,
        sex:               filterSex.value      || undefined,
        disability_status: filterDisability.value || undefined,
        cfs_location_id:   filterLocation.value || undefined,
      },
      props.token,
    );
    beneficiaries.value = result.beneficiaries;
    pagination.value    = result.pagination;
  } catch (e: any) {
    loadError.value = e?.message || 'Failed to load beneficiaries';
  } finally {
    isLoading.value = false;
  }
}

function resetPage() {
  currentPage.value = 1;
  fetch();
}

function goPage(p: number) {
  currentPage.value = p;
  fetch();
}

// ── Pagination strip ─────────────────────────────────────────────────────────
const pageNumbers = computed<(number | '...')[]>(() => {
  const total = pagination.value?.total_pages ?? 1;
  const cur   = currentPage.value;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (cur > 3) pages.push('...');
  for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
  if (cur < total - 2) pages.push('...');
  pages.push(total);
  return pages;
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function fullName(b: BeneficiaryListItem): string {
  return [b.personal_name, b.father_name, b.family_name].filter(Boolean).join(' ');
}
function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
}
function sexClass(sex: string): string {
  return sex === 'female' ? 'ben-badge--female' : 'ben-badge--male';
}
function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getFacilitator(locationId?: string): string {
  if (!locationId || !props.assignments) return '—';
  const a = props.assignments.find(a => a.cfs_location_id === locationId && a.is_active && a.role === 'facilitator');
  return a?.full_name || 'Unassigned';
}

onMounted(fetch);
</script>

<style scoped>
/* ── Wrapper ──────────────────────────────────────────────────────────────── */
.ben-table-wrap {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Toolbar ──────────────────────────────────────────────────────────────── */
.ben-toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ben-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* Search box */
.ben-search {
  position: relative;
  display: flex;
  align-items: center;
}

.ben-search__icon {
  position: absolute;
  left: 10px;
  color: var(--text-muted);
  pointer-events: none;
}

.ben-search__input {
  width: 240px;
  padding: 7px 32px 7px 32px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.15s;
}

.ben-search__input:focus {
  border-color: var(--primary);
}

.ben-search__clear {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1rem;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
}

/* Select filters */
.ben-select {
  padding: 7px 10px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.82rem;
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s;
}

.ben-select:focus {
  border-color: var(--primary);
}

.ben-count {
  margin-left: auto;
  font-size: 0.78rem;
  color: var(--text-muted);
  white-space: nowrap;
}

/* ── Loading skeleton ─────────────────────────────────────────────────────── */
.ben-skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ben-skeleton__row {
  height: 44px;
  border-radius: var(--radius-sm);
  background: linear-gradient(110deg, var(--bg-panel) 30%, rgba(255,255,255,0.04) 50%, var(--bg-panel) 70%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border: 1px solid var(--border-color);
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Error ────────────────────────────────────────────────────────────────── */
.ben-error {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid #ef4444;
  border-radius: var(--radius-sm);
  color: #ef4444;
  font-size: 0.85rem;
}

.ben-btn-retry {
  margin-left: auto;
  padding: 5px 12px;
  background: transparent;
  border: 1px solid #ef4444;
  border-radius: var(--radius-sm);
  color: #ef4444;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.ben-btn-retry:hover { background: #ef4444; color: #fff; }

/* ── Empty ────────────────────────────────────────────────────────────────── */
.ben-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 0;
  color: var(--text-muted);
  text-align: center;
}

.ben-empty p {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.ben-empty span {
  font-size: 0.8rem;
}

/* ── Table ────────────────────────────────────────────────────────────────── */
.ben-table-scroll {
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.ben-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.84rem;
}

.ben-table thead tr {
  border-bottom: 1px solid var(--border-color);
  background: var(--hover-bg);
}

.ben-table th {
  padding: 10px 14px;
  text-align: left;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  white-space: nowrap;
}

.ben-table__row {
  border-bottom: 1px solid var(--border-color);
  transition: background 0.12s;
}

.ben-table__row:last-child { border-bottom: none; }

.ben-table__row:hover { background: var(--hover-bg); }

.ben-table td {
  padding: 10px 14px;
  color: var(--text-secondary);
  vertical-align: middle;
}

/* Name cell */
.ben-name-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ben-name {
  font-weight: 600;
  color: var(--text-primary);
}

.ben-lang {
  font-size: 0.72rem;
  color: var(--text-muted);
}

/* Guardian cell */
.ben-guardian-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ben-phone {
  font-size: 0.72rem;
  color: var(--text-muted);
}

/* Date cell */
.ben-date-cell {
  white-space: nowrap;
}

/* Location cell */
.ben-location-cell {
  font-size: 0.82rem;
  color: var(--primary);
  font-weight: 500;
}

.ben-staff-cell {
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* Badges */
.ben-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
}

.ben-badge--female {
  background: rgba(236, 72, 153, 0.12);
  color: #ec4899;
}

.ben-badge--male {
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
}

.ben-badge--neutral {
  background: var(--hover-bg);
  color: var(--text-muted);
}

.ben-badge--disability {
  background: rgba(167, 139, 250, 0.15);
  color: #a78bfa;
}

/* ── Pagination ───────────────────────────────────────────────────────────── */
.ben-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding-top: 4px;
}

.ben-page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.12s;
}

.ben-page-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}

.ben-page-btn--active {
  background: var(--primary);
  border-color: var(--primary);
  color: #000;
  font-weight: 700;
}

.ben-page-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.ben-page-ellipsis {
  padding: 0 4px;
  color: var(--text-muted);
  font-size: 0.82rem;
}

/* ── Responsive ───────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .ben-search__input { width: 100%; }
  .ben-filters { flex-direction: column; align-items: stretch; }
  .ben-select { width: 100%; }
  .ben-count { margin-left: 0; }
}
</style>
