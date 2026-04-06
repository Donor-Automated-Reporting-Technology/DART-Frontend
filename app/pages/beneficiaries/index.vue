<template>
  <NuxtLayout name="app" :breadcrumbs="[{ title: 'Beneficiaries', href: '/beneficiaries', current: true }]">
    <div class="ben-page">

      <!-- ═══ Page Header ═══ -->
      <div class="page-header">
        <div class="header-row">
          <div>
            <h1 class="page-title">Beneficiaries</h1>
            <p class="page-subtitle">{{ list.total.value }} registered</p>
          </div>
          <div class="header-actions">
            <button class="btn-secondary" @click="list.exportExcel" title="Export to Excel">
              <AppIcon name="download" :size="14" />
              <span class="btn-text">Export</span>
            </button>
            <NuxtLink to="/beneficiaries/register" class="btn-primary">
              <AppIcon name="user-plus" :size="14" />
              <span class="btn-text">Register New</span>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- ═══ Filter Bar + Chips ═══ -->
      <FilterBar
        v-model="list.search.value"
        :chips="filterChips"
        :active-tags="activeTags"
        :active-filter-count="activeFilterCount"
        :recent-searches="recentSearches"
        @search="handleSearch"
        @chip-toggle="handleChipToggle"
        @open-drawer="drawerOpen = true"
        @remove-tag="handleRemoveTag"
        @clear-all="handleClearAll"
      />

      <!-- ═══ Error ═══ -->
      <div v-if="list.error.value" class="api-err">
        <AppIcon name="alert-circle" :size="14" />
        {{ list.error.value }}
      </div>

      <!-- ═══ Skeleton Loading ═══ -->
      <BeneficiarySkeleton v-if="list.loading.value" :rows="8" />

      <!-- ═══ Table ═══ -->
      <BeneficiaryTable
        v-else
        :beneficiaries="list.beneficiaries.value"
        @edit="handleEdit"
        @print="handlePrint"
      />

      <!-- ═══ Pagination ═══ -->
      <div v-if="list.totalPages.value > 1" class="pagination">
        <button
          class="page-btn"
          :disabled="list.page.value <= 1"
          @click="list.prevPage"
          aria-label="Previous page"
        >
          <AppIcon name="chevron-left" :size="14" />
        </button>

        <template v-for="p in paginationRange" :key="p">
          <button
            v-if="p !== '...'"
            class="page-btn page-num"
            :class="{ 'page-num--active': p === list.page.value }"
            @click="list.goToPage(p as number)"
          >
            {{ p }}
          </button>
          <span v-else class="page-ellipsis">…</span>
        </template>

        <button
          class="page-btn"
          :disabled="list.page.value >= list.totalPages.value"
          @click="list.nextPage"
          aria-label="Next page"
        >
          <AppIcon name="chevron-right" :size="14" />
        </button>

        <span class="page-summary">
          {{ list.total.value }} total
        </span>
      </div>

      <!-- ═══ Filter Drawer ═══ -->
      <FilterDrawer
        :open="drawerOpen"
        :filters="drawerFilters"
        :service-points="locationStore.allServicePoints"
        @close="drawerOpen = false"
        @apply="handleDrawerApply"
        @reset="handleDrawerReset"
      />

    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBeneficiaryList } from '../../composables/useBeneficiaryList'
import { useLocationStore } from '../../stores/location'
import BeneficiaryTable from '../../components/beneficiaries/BeneficiaryTable.vue'
import BeneficiarySkeleton from '../../components/beneficiaries/BeneficiarySkeleton.vue'
import FilterBar from '../../components/beneficiaries/FilterBar.vue'
import FilterDrawer from '../../components/beneficiaries/FilterDrawer.vue'
import type { Beneficiary } from '../../interfaces/beneficiary'

definePageMeta({
  layout: false,
  middleware: ['auth'],
})

const list = useBeneficiaryList()
const locationStore = useLocationStore()

// ── Drawer state ──────────────────────────────────────────────────────────────
const drawerOpen = ref(false)

const drawerFilters = ref({
  status: '',
  beneficiaryType: 'all' as string,
  centreId: '',
  disabilityStatus: '',
  dateJoinedFrom: '',
  dateJoinedTo: '',
  householdSizeMin: null as number | null,
  householdSizeMax: null as number | null,
})

// ── Chip state ────────────────────────────────────────────────────────────────
const activeChip = ref('')

const filterChips = computed(() => [
  { label: 'All', value: '', active: activeChip.value === '' },
  { label: 'Active', value: 'active', active: activeChip.value === 'active' },
  { label: 'Verified', value: 'verified', active: activeChip.value === 'verified' },
  { label: 'Pending', value: 'pending', active: activeChip.value === 'pending' },
])

// ── Recent searches (stored in memory) ────────────────────────────────────────
const recentSearches = ref<string[]>([])

// ── Active filter tags (progressive disclosure) ──────────────────────────────
const activeTags = computed(() => {
  const tags: { key: string; label: string }[] = []
  if (activeChip.value) tags.push({ key: 'chip', label: `Status: ${activeChip.value}` })
  if (drawerFilters.value.centreId) {
    const sp = locationStore.allServicePoints.find((s: any) => s.id === drawerFilters.value.centreId)
    tags.push({ key: 'centre', label: `Centre: ${sp?.name ?? drawerFilters.value.centreId}` })
  }
  if (drawerFilters.value.disabilityStatus) tags.push({ key: 'disability', label: `Disability: ${drawerFilters.value.disabilityStatus}` })
  if (drawerFilters.value.beneficiaryType !== 'all') tags.push({ key: 'type', label: `Type: ${drawerFilters.value.beneficiaryType}` })
  if (drawerFilters.value.dateJoinedFrom) tags.push({ key: 'dateFrom', label: `From: ${drawerFilters.value.dateJoinedFrom}` })
  if (drawerFilters.value.dateJoinedTo) tags.push({ key: 'dateTo', label: `To: ${drawerFilters.value.dateJoinedTo}` })
  return tags
})

const activeFilterCount = computed(() => activeTags.value.length)

// ── Pagination range ──────────────────────────────────────────────────────────
const paginationRange = computed(() => {
  const total = list.totalPages.value
  const current = list.page.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | string)[] = [1]
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i)
  }
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
})

// ── Search handler ────────────────────────────────────────────────────────────
let searchTimer: ReturnType<typeof setTimeout> | null = null

function handleSearch(value: string) {
  list.search.value = value
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    if (value && !recentSearches.value.includes(value)) {
      recentSearches.value = [value, ...recentSearches.value].slice(0, 10)
    }
    list.applyFilter()
  }, 400)
}

// ── Chip toggle ───────────────────────────────────────────────────────────────
function handleChipToggle(value: string) {
  activeChip.value = value
  // Map chips to API filter
  list.applyFilter()
}

// ── Tag removal ───────────────────────────────────────────────────────────────
function handleRemoveTag(key: string) {
  switch (key) {
    case 'chip': activeChip.value = ''; break
    case 'centre': drawerFilters.value.centreId = ''; list.centreId.value = ''; break
    case 'disability': drawerFilters.value.disabilityStatus = ''; break
    case 'type': drawerFilters.value.beneficiaryType = 'all'; break
    case 'dateFrom': drawerFilters.value.dateJoinedFrom = ''; break
    case 'dateTo': drawerFilters.value.dateJoinedTo = ''; break
  }
  list.applyFilter()
}

function handleClearAll() {
  activeChip.value = ''
  drawerFilters.value = {
    status: '',
    beneficiaryType: 'all',
    centreId: '',
    disabilityStatus: '',
    dateJoinedFrom: '',
    dateJoinedTo: '',
    householdSizeMin: null,
    householdSizeMax: null,
  }
  list.centreId.value = ''
  list.search.value = ''
  list.applyFilter()
}

// ── Drawer apply/reset ────────────────────────────────────────────────────────
function handleDrawerApply(filters: typeof drawerFilters.value) {
  drawerFilters.value = { ...filters }
  list.centreId.value = filters.centreId
  list.applyFilter()
}

function handleDrawerReset() {
  drawerFilters.value = {
    status: '',
    beneficiaryType: 'all',
    centreId: '',
    disabilityStatus: '',
    dateJoinedFrom: '',
    dateJoinedTo: '',
    householdSizeMin: null,
    householdSizeMax: null,
  }
  list.centreId.value = ''
  list.applyFilter()
}

// ── Row actions ───────────────────────────────────────────────────────────────
function handleEdit(b: Beneficiary) {
  // TODO: navigate to edit page when ready
  console.log('Edit', b.id)
}

function handlePrint(b: Beneficiary) {
  // TODO: print report
  console.log('Print', b.id)
}

// ── Init ──────────────────────────────────────────────────────────────────────
onMounted(() => {
  list.fetchBeneficiaries()
  locationStore.fetchLocations()
})
</script>

<style scoped>
.ben-page {
  max-width: 1120px;
}

/* ═══ Page Header ═══ */
.page-header { margin-bottom: 20px; }

.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
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

.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* ═══ Buttons ═══ */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  transition: opacity 0.15s, transform 0.1s;
  font-family: inherit;
  min-height: 44px;
}
.btn-primary:hover { opacity: 0.9; }
.btn-primary:active { transform: scale(0.98); }

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  font-size: 0.84rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s;
  font-family: inherit;
  min-height: 44px;
}
.btn-secondary:hover { border-color: var(--text-muted); color: var(--text-primary); }

/* ═══ Error ═══ */
.api-err {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--error);
  padding: 10px 14px;
  background: var(--error-bg);
  border: 1px solid rgba(255, 59, 48, 0.12);
  border-radius: 12px;
  margin: 0 0 16px;
}

/* ═══ Pagination ═══ */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 20px 0 8px;
  flex-wrap: wrap;
}

.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  color: var(--text-secondary);
  font-size: 0.84rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s;
  font-family: inherit;
}

.page-btn:hover:not(:disabled) {
  background: var(--hover-bg);
  color: var(--text-primary);
}
.page-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.page-num {
  font-variant-numeric: tabular-nums;
}

.page-num--active {
  background: var(--primary-dim);
  color: var(--primary);
  font-weight: 700;
  border-color: var(--primary);
}

.page-ellipsis {
  min-width: 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.84rem;
  user-select: none;
}

.page-summary {
  margin-left: 12px;
  font-size: 0.76rem;
  color: var(--text-muted);
}

/* ═══ Responsive ═══ */
@media (max-width: 640px) {
  .btn-text { display: none; }
  .btn-primary, .btn-secondary { padding: 10px 12px; }
  .page-summary { display: none; }
}
</style>
