<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="open" class="enroll-overlay" @click.self="$emit('close')">
        <Transition name="modal-slide" appear>
          <div class="enroll-modal">

            <!-- Header -->
            <div class="em-header">
              <div class="em-header-left">
                <div class="em-icon-wrap">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                </div>
                <div>
                  <h3 class="em-title">Enroll into CFS</h3>
                  <p class="em-subtitle">Select children to enroll into the CFS programme</p>
                </div>
              </div>
              <button class="em-close" @click="$emit('close')" aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <!-- Search + Select All -->
            <div class="em-toolbar">
              <div class="em-search-wrap">
                <svg class="em-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  ref="searchRef"
                  v-model="search"
                  type="text"
                  class="em-search"
                  placeholder="Search by name…"
                />
                <button v-if="search" class="em-search-clear" @click="search = ''">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <button
                v-if="!loading && filtered.length > 0"
                class="em-select-all"
                @click="toggleAll"
              >
                {{ allSelected ? 'Deselect All' : 'Select All' }}
              </button>
            </div>

            <!-- Counter chip -->
            <div v-if="!loading && beneficiaries.length > 0" class="em-counter">
              <span class="em-counter-num">{{ filtered.length }}</span>
              <span>{{ filtered.length === 1 ? 'child' : 'children' }} available</span>
            </div>

            <!-- List -->
            <div class="em-list">
              <!-- Loading skeleton -->
              <template v-if="loading">
                <div v-for="i in 5" :key="i" class="em-skeleton">
                  <div class="em-skel-avatar" />
                  <div class="em-skel-lines">
                    <div class="em-skel-line em-skel-line--name" />
                    <div class="em-skel-line em-skel-line--meta" />
                  </div>
                </div>
              </template>

              <!-- Empty -->
              <div v-else-if="filtered.length === 0" class="em-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="em-empty-icon"><circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                <p class="em-empty-text">
                  {{ search ? 'No children match your search' : 'All children are already enrolled' }}
                </p>
              </div>

              <!-- Beneficiary cards -->
              <TransitionGroup v-else name="em-card" tag="div">
                <label
                  v-for="b in filtered"
                  :key="b.id"
                  class="em-card"
                  :class="{ 'em-card--selected': selected.has(b.id) }"
                >
                  <div class="em-check-wrap">
                    <input type="checkbox" :checked="selected.has(b.id)" @change="toggle(b.id)" />
                    <div class="em-checkbox">
                      <svg v-if="selected.has(b.id)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  </div>

                  <div class="em-avatar" :class="b.sex === 'female' ? 'em-avatar--f' : 'em-avatar--m'">
                    {{ b.full_name.charAt(0).toUpperCase() }}
                  </div>

                  <div class="em-info">
                    <span class="em-name">{{ b.full_name }}</span>
                    <div class="em-badges">
                      <span class="em-badge">{{ b.age }}y</span>
                      <span class="em-badge" :class="b.sex === 'female' ? 'em-badge--f' : 'em-badge--m'">
                        {{ b.sex === 'female' ? 'Girl' : 'Boy' }}
                      </span>
                      <span v-if="b.disability_status && b.disability_status !== 'none'" class="em-badge em-badge--d">
                        Disability
                      </span>
                    </div>
                  </div>
                </label>
              </TransitionGroup>
            </div>

            <!-- Footer -->
            <div class="em-footer">
              <div class="em-footer-info">
                <Transition name="em-count-pop" mode="out-in">
                  <span :key="selected.size" class="em-selected-pill" :class="{ 'em-selected-pill--active': selected.size > 0 }">
                    {{ selected.size }} selected
                  </span>
                </Transition>
              </div>
              <div class="em-footer-actions">
                <button class="em-btn em-btn--ghost" @click="$emit('close')">Cancel</button>
                <button
                  class="em-btn em-btn--primary"
                  :disabled="selected.size === 0 || enrolling"
                  @click="enroll"
                >
                  <svg v-if="enrolling" class="em-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-dasharray="50" stroke-dashoffset="20"/></svg>
                  {{ enrolling ? 'Enrolling\u2026' : `Enroll ${selected.size > 0 ? selected.size : ''} ${selected.size === 1 ? 'Child' : 'Children'}` }}
                </button>
              </div>
            </div>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

export interface BeneficiaryOption {
  id: string
  full_name: string
  age: number
  sex: string
  disability_status?: string
}

const props = defineProps<{
  open: boolean
  beneficiaries: BeneficiaryOption[]
  enrolling?: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'enroll', ids: string[]): void
}>()

const search = ref('')
const selected = ref<Set<string>>(new Set())
const searchRef = ref<HTMLInputElement | null>(null)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return props.beneficiaries
  return props.beneficiaries.filter(b =>
    b.full_name.toLowerCase().includes(q),
  )
})

const allSelected = computed(() =>
  filtered.value.length > 0 && filtered.value.every(b => selected.value.has(b.id)),
)

function toggle(id: string) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}

function toggleAll() {
  if (allSelected.value) {
    const next = new Set(selected.value)
    for (const b of filtered.value) next.delete(b.id)
    selected.value = next
  } else {
    const next = new Set(selected.value)
    for (const b of filtered.value) next.add(b.id)
    selected.value = next
  }
}

function enroll() {
  emit('enroll', [...selected.value])
}

// Reset state + focus search on open
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    search.value = ''
    selected.value = new Set()
    nextTick(() => searchRef.value?.focus())
  }
})
</script>

<style scoped>
/* -- Overlay ------------------------------------------------ */
.enroll-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 16px;
}

/* -- Modal --------------------------------------------------- */
.enroll-modal {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  width: 520px;
  max-width: 100%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-elevated), 0 0 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

/* -- Header -------------------------------------------------- */
.em-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 22px 16px;
  border-bottom: 1px solid var(--border-subtle);
}

.em-header-left {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.em-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--primary-dim);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.em-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 2px;
  letter-spacing: -0.02em;
}

.em-subtitle {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0;
}

.em-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: var(--radius-sm);
  transition: background 0.15s, color 0.15s;
  margin: -4px -4px 0 0;
}

.em-close:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

/* -- Toolbar ------------------------------------------------- */
.em-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 22px 0;
}

.em-search-wrap {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.em-search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted);
  pointer-events: none;
}

.em-search {
  width: 100%;
  padding: 10px 34px 10px 38px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.84rem;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.em-search::placeholder { color: var(--text-muted); }
.em-search:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-dim); }

.em-search-clear {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
}

.em-search-clear:hover { color: var(--text-primary); }

.em-select-all {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--primary);
  background: var(--primary-dim);
  border: none;
  border-radius: 100px;
  padding: 7px 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}

.em-select-all:hover { background: var(--primary-hover); }

/* -- Counter ------------------------------------------------- */
.em-counter {
  padding: 8px 22px 0;
  font-size: 0.74rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
}

.em-counter-num {
  font-weight: 700;
  color: var(--text-secondary);
}

/* -- List ---------------------------------------------------- */
.em-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 22px 14px;
  min-height: 180px;
  max-height: 400px;
}

/* Skeleton */
.em-skeleton {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
}

.em-skel-avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--hover-bg);
  animation: em-pulse 1.5s ease-in-out infinite;
}

.em-skel-lines { flex: 1; display: flex; flex-direction: column; gap: 6px; }

.em-skel-line {
  height: 10px;
  border-radius: 5px;
  background: var(--hover-bg);
  animation: em-pulse 1.5s ease-in-out infinite;
}

.em-skel-line--name { width: 60%; }
.em-skel-line--meta { width: 35%; animation-delay: 0.15s; }

@keyframes em-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

/* Empty */
.em-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  gap: 12px;
}

.em-empty-icon { color: var(--text-muted); opacity: 0.5; }
.em-empty-text { font-size: 0.84rem; color: var(--text-muted); text-align: center; margin: 0; }

/* -- Card rows ----------------------------------------------- */
.em-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s;
  border: 1px solid transparent;
}

.em-card:hover { background: var(--hover-bg-subtle); }

.em-card--selected {
  background: var(--primary-dim);
  border-color: color-mix(in srgb, var(--primary) 20%, transparent);
}

/* Custom checkbox */
.em-check-wrap { position: relative; flex-shrink: 0; }
.em-check-wrap input { position: absolute; opacity: 0; width: 0; height: 0; }

.em-checkbox {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 2px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, border-color 0.15s;
  background: transparent;
}

.em-card--selected .em-checkbox {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

/* Avatar */
.em-avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
  font-weight: 700;
  flex-shrink: 0;
  text-transform: uppercase;
}

.em-avatar--f {
  background: rgba(251, 113, 133, 0.12);
  color: #fb7185;
}

.em-avatar--m {
  background: rgba(96, 165, 250, 0.12);
  color: #60a5fa;
}

/* Info */
.em-info { flex: 1; min-width: 0; }

.em-name {
  display: block;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.em-badges { display: flex; gap: 5px; flex-wrap: wrap; }

.em-badge {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 100px;
  background: var(--hover-bg);
  color: var(--text-secondary);
}

.em-badge--f { background: rgba(251, 113, 133, 0.1); color: #fb7185; }
.em-badge--m { background: rgba(96, 165, 250, 0.1); color: #60a5fa; }
.em-badge--d { background: rgba(251, 191, 36, 0.1); color: #fbbf24; }

/* -- Footer -------------------------------------------------- */
.em-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 22px;
  border-top: 1px solid var(--border-subtle);
  gap: 12px;
}

.em-footer-info { flex: 1; }

.em-selected-pill {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--text-muted);
  padding: 4px 12px;
  border-radius: 100px;
  background: var(--hover-bg);
  transition: background 0.2s, color 0.2s;
}

.em-selected-pill--active {
  background: var(--primary-dim);
  color: var(--primary);
}

.em-footer-actions { display: flex; gap: 8px; }

.em-btn {
  font-size: 0.82rem;
  font-weight: 600;
  font-family: inherit;
  padding: 10px 18px;
  border-radius: var(--radius-sm);
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background 0.15s, transform 0.1s, opacity 0.15s;
}

.em-btn:active { transform: scale(0.97); }

.em-btn--ghost {
  background: var(--hover-bg);
  color: var(--text-secondary);
}

.em-btn--ghost:hover { background: var(--hover-bg-subtle); color: var(--text-primary); }

.em-btn--primary {
  background: var(--primary);
  color: #fff;
}

.em-btn--primary:hover { filter: brightness(1.1); }
.em-btn--primary:disabled { opacity: 0.4; cursor: not-allowed; filter: none; }

/* Spinner */
.em-spinner {
  animation: em-spin 0.8s linear infinite;
}

@keyframes em-spin {
  to { transform: rotate(360deg); }
}

/* -- Transitions --------------------------------------------- */
.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity 0.25s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }

.modal-slide-enter-active { transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease; }
.modal-slide-leave-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.modal-slide-enter-from { transform: translateY(24px) scale(0.96); opacity: 0; }
.modal-slide-leave-to { transform: translateY(12px) scale(0.98); opacity: 0; }

.em-card-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.em-card-leave-active { transition: opacity 0.15s ease; }
.em-card-enter-from { opacity: 0; transform: translateX(-8px); }
.em-card-leave-to { opacity: 0; }

.em-count-pop-enter-active { transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s; }
.em-count-pop-leave-active { transition: opacity 0.1s; }
.em-count-pop-enter-from { transform: scale(0.8); opacity: 0; }
.em-count-pop-leave-to { opacity: 0; }

/* -- Scrollbar ----------------------------------------------- */
.em-list::-webkit-scrollbar { width: 6px; }
.em-list::-webkit-scrollbar-track { background: transparent; }
.em-list::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 3px; }
.em-list::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover); }

/* -- Mobile -------------------------------------------------- */
@media (max-width: 540px) {
  .enroll-modal { max-height: 92vh; border-radius: var(--radius-lg) var(--radius-lg) 0 0; }
  .enroll-overlay { align-items: flex-end; padding: 0; }
  .em-toolbar { flex-direction: column; align-items: stretch; }
  .em-select-all { align-self: flex-end; }
}
</style>
