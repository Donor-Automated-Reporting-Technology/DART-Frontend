<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="drawer-overlay" @click.self="$emit('close')">
        <aside class="drawer-panel" role="dialog" aria-label="Advanced Filters">
          <!-- Header -->
          <div class="drawer-header">
            <h2 class="drawer-title">Advanced Filters</h2>
            <button class="drawer-close" @click="$emit('close')" aria-label="Close filter panel">
              <AppIcon name="x" :size="16" />
            </button>
          </div>

          <!-- Body -->
          <div class="drawer-body">
            <!-- Status -->
            <div class="drawer-section">
              <label class="drawer-label">Status</label>
              <select v-model="local.status" class="drawer-select">
                <option value="">All Statuses</option>
                <option value="verified">Verified</option>
                <option value="active">Active</option>
                <option value="in_review">In Review</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <!-- Beneficiary Type -->
            <div class="drawer-section">
              <label class="drawer-label">Type</label>
              <div class="drawer-radio-group">
                <label class="drawer-radio">
                  <input type="radio" v-model="local.beneficiaryType" value="all" />
                  <span>All</span>
                </label>
                <label class="drawer-radio">
                  <input type="radio" v-model="local.beneficiaryType" value="child" />
                  <span>Child</span>
                </label>
                <label class="drawer-radio">
                  <input type="radio" v-model="local.beneficiaryType" value="adult" />
                  <span>Adult</span>
                </label>
              </div>
            </div>

            <!-- Region / Centre -->
            <div class="drawer-section">
              <label class="drawer-label">Centre / Location</label>
              <select v-model="local.centreId" class="drawer-select">
                <option value="">All Centres</option>
                <option v-for="sp in servicePoints" :key="sp.id" :value="sp.id">
                  {{ sp.name }}
                </option>
              </select>
            </div>

            <!-- Disability Status -->
            <div class="drawer-section">
              <label class="drawer-label">Disability Status</label>
              <select v-model="local.disabilityStatus" class="drawer-select">
                <option value="">Any</option>
                <option value="none">No Disability</option>
                <option value="vision">Vision</option>
                <option value="hearing">Hearing</option>
                <option value="physical">Physical</option>
                <option value="intellectual">Intellectual</option>
                <option value="multiple">Multiple</option>
              </select>
            </div>

            <!-- Date Joined -->
            <div class="drawer-section">
              <label class="drawer-label">Date Joined</label>
              <div class="date-range">
                <input type="date" v-model="local.dateJoinedFrom" class="drawer-input" placeholder="From" />
                <span class="date-sep">to</span>
                <input type="date" v-model="local.dateJoinedTo" class="drawer-input" placeholder="To" />
              </div>
            </div>

            <!-- Household Size -->
            <div class="drawer-section">
              <label class="drawer-label">Household Size</label>
              <div class="range-inputs">
                <input
                  type="number"
                  v-model.number="local.householdSizeMin"
                  class="drawer-input drawer-input--small"
                  placeholder="Min"
                  min="0"
                />
                <span class="date-sep">–</span>
                <input
                  type="number"
                  v-model.number="local.householdSizeMax"
                  class="drawer-input drawer-input--small"
                  placeholder="Max"
                  min="0"
                />
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="drawer-footer">
            <button class="drawer-btn drawer-btn--ghost" @click="resetFilters">
              Reset
            </button>
            <button class="drawer-btn drawer-btn--primary" @click="applyFilters">
              Apply Filters
            </button>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'

interface DrawerFilters {
  status: string
  beneficiaryType: string
  centreId: string
  disabilityStatus: string
  dateJoinedFrom: string
  dateJoinedTo: string
  householdSizeMin: number | null
  householdSizeMax: number | null
}

const props = defineProps<{
  open: boolean
  filters: DrawerFilters
  servicePoints: Array<{ id: string; name: string }>
}>()

const emit = defineEmits<{
  close: []
  apply: [filters: DrawerFilters]
  reset: []
}>()

const local = reactive<DrawerFilters>({ ...props.filters })

watch(() => props.filters, (v) => { Object.assign(local, v) }, { deep: true })
watch(() => props.open, (isOpen) => {
  if (isOpen) Object.assign(local, props.filters)
})

function applyFilters() {
  emit('apply', { ...local })
  emit('close')
}

function resetFilters() {
  local.status = ''
  local.beneficiaryType = 'all'
  local.centreId = ''
  local.disabilityStatus = ''
  local.dateJoinedFrom = ''
  local.dateJoinedTo = ''
  local.householdSizeMin = null
  local.householdSizeMax = null
  emit('reset')
  emit('close')
}
</script>

<style scoped>
/* ── Overlay ─────────────────────────────────────────────────────── */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 500;
  display: flex;
  justify-content: flex-end;
}

/* ── Panel ────────────────────────────────────────────────────────── */
.drawer-panel {
  width: 360px;
  max-width: 90vw;
  height: 100vh;
  background: var(--bg-panel);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-elevated);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.drawer-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.drawer-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  background: none;
  border: none;
  border-radius: 50%;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.drawer-close:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

/* ── Body ─────────────────────────────────────────────────────────── */
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.drawer-section { display: flex; flex-direction: column; gap: 6px; }

.drawer-label {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.drawer-select,
.drawer-input {
  height: 44px;
  padding: 0 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 0.84rem;
  font-family: inherit;
  transition: border-color 0.15s;
  box-sizing: border-box;
  width: 100%;
}

.drawer-select:focus,
.drawer-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.drawer-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 10px center;
  background-repeat: no-repeat;
  background-size: 16px;
  padding-right: 34px;
}

.drawer-input--small { width: 100%; }

.date-range,
.range-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-range .drawer-input,
.range-inputs .drawer-input { flex: 1; }

.date-sep {
  font-size: 0.78rem;
  color: var(--text-muted);
  flex-shrink: 0;
}

/* ── Radio group ──────────────────────────────────────────────────── */
.drawer-radio-group {
  display: flex;
  gap: 4px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 3px;
}

.drawer-radio {
  flex: 1;
  position: relative;
  cursor: pointer;
}

.drawer-radio input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.drawer-radio span {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.15s;
  min-height: 44px;
}

.drawer-radio input:checked + span {
  background: var(--primary-dim);
  color: var(--primary);
  font-weight: 600;
}

/* ── Footer ───────────────────────────────────────────────────────── */
.drawer-footer {
  display: flex;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.drawer-btn {
  flex: 1;
  height: 44px;
  border-radius: 10px;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  border: none;
}

.drawer-btn--ghost {
  background: var(--hover-bg);
  color: var(--text-secondary);
}
.drawer-btn--ghost:hover {
  background: var(--hover-bg-subtle);
  color: var(--text-primary);
}

.drawer-btn--primary {
  background: var(--primary);
  color: #fff;
}
.drawer-btn--primary:hover {
  opacity: 0.9;
}

/* ── Transition ───────────────────────────────────────────────────── */
.drawer-enter-active { transition: opacity 0.22s ease; }
.drawer-leave-active { transition: opacity 0.18s ease; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }

.drawer-enter-active .drawer-panel {
  animation: drawer-slide-in 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}
.drawer-leave-active .drawer-panel {
  animation: drawer-slide-out 0.2s ease-in;
}

@keyframes drawer-slide-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@keyframes drawer-slide-out {
  from { transform: translateX(0); }
  to { transform: translateX(100%); }
}
</style>
