<template>
  <NuxtLayout name="app" :breadcrumbs="[{ title: 'Beneficiaries', href: '/beneficiaries', current: true }]">
    <div class="ben-page">
      <div class="page-header">
        <div class="header-row">
          <div>
            <h1 class="page-title">Beneficiaries</h1>
            <p class="page-subtitle">{{ list.total.value }} registered</p>
          </div>
          <div class="header-actions">
            <button class="btn-secondary" @click="list.exportExcel" title="Export Excel">
              <AppIcon name="download" :size="14" />
              Export
            </button>
            <NuxtLink to="/beneficiaries/register" class="btn-primary">
              <AppIcon name="user-plus" :size="14" />
              Register New
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <input
          v-model="list.search.value"
          type="text"
          class="field-input search-input"
          placeholder="Search by name…"
          @input="debouncedSearch"
        />
        <select v-model="list.centreId.value" class="field-input filter-select" @change="list.applyFilter">
          <option value="">All Centres</option>
          <option v-for="sp in locationStore.allServicePoints" :key="sp.id" :value="sp.id">
            {{ sp.name }}
          </option>
        </select>
      </div>

      <!-- Error -->
      <p v-if="list.error.value" class="api-err">{{ list.error.value }}</p>

      <!-- Loading -->
      <div v-if="list.loading.value" class="loading-msg">Loading beneficiaries…</div>

      <!-- Table -->
      <BeneficiaryTable v-else :beneficiaries="list.beneficiaries.value" />

      <!-- Pagination -->
      <div v-if="list.totalPages.value > 1" class="pagination">
        <button class="page-btn" :disabled="list.page.value <= 1" @click="list.prevPage">
          ‹ Prev
        </button>
        <span class="page-info">Page {{ list.page.value }} of {{ list.totalPages.value }}</span>
        <button class="page-btn" :disabled="list.page.value >= list.totalPages.value" @click="list.nextPage">
          Next ›
        </button>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useBeneficiaryList } from '../../composables/useBeneficiaryList'
import { useLocationStore } from '../../stores/location'
import BeneficiaryTable from '../../components/beneficiaries/BeneficiaryTable.vue'

definePageMeta({
  layout: false,
  middleware: ['auth'],
})

const list = useBeneficiaryList()
const locationStore = useLocationStore()

let searchTimer: ReturnType<typeof setTimeout> | null = null
function debouncedSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => list.applyFilter(), 400)
}

onMounted(() => {
  list.fetchBeneficiaries()
  locationStore.fetchLocations()
})
</script>

<style scoped>
.ben-page {
  max-width: 900px;
}

.page-header { margin-bottom: 20px; }

.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 2px;
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

/* Filters */
.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.search-input { flex: 1; min-width: 180px; }
.filter-select { min-width: 140px; }

.field-input {
  padding: 8px 11px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.82rem;
  font-family: inherit;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.field-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-dim);
}

select.field-input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 8px center;
  background-repeat: no-repeat;
  background-size: 16px;
  padding-right: 32px;
}

/* Buttons */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  transition: opacity 0.15s;
}
.btn-primary:hover { opacity: 0.9; }

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s;
}
.btn-secondary:hover { border-color: var(--text-primary); color: var(--text-primary); }

.api-err {
  font-size: 0.78rem;
  color: var(--error);
  padding: 8px 12px;
  background: color-mix(in srgb, var(--error) 8%, transparent);
  border-radius: var(--radius-sm);
  margin: 0 0 12px;
}

.loading-msg {
  font-size: 0.84rem;
  color: var(--text-muted);
  padding: 24px 0;
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px 0;
}

.page-btn {
  padding: 6px 14px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: border-color 0.15s;
}
.page-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.page-info {
  font-size: 0.78rem;
  color: var(--text-muted);
}
</style>
