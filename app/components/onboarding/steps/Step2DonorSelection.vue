<template>
  <!--
    Step2DonorSelection.vue — Onboarding Step 2
    Donor card grid: single-select active donors, greyed coming-soon donors.
    Calls POST /api/v1/onboarding/select-donor on confirm.
  -->
  <div class="s2-wrap">

    <!-- Loading -->
    <div v-if="isLoading" class="state-row">
      <span class="spinner" />
      <span class="state-text">Loading donors…</span>
    </div>

    <!-- Error -->
    <div v-else-if="loadError" class="state-row state-row--error">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>{{ loadError }}</span>
      <button class="retry-btn" @click="loadDonors">Retry</button>
    </div>

    <template v-else>

      <p class="hint">Select your primary donor. Only one donor can be active in this version.</p>

      <!-- Success message -->
      <div v-if="successMsg" class="success-bar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        {{ successMsg }}
      </div>

      <!-- API error -->
      <p v-if="apiError" class="api-err">{{ apiError }}</p>

      <!-- Donor grid -->
      <div class="donor-grid">
        <div
          v-for="donor in donors"
          :key="donor.id"
          class="donor-card"
          :class="{
            'card--selectable': donor.is_active,
            'card--selected':   selectedId === donor.id,
            'card--soon':       donor.coming_soon,
          }"
          :role="donor.is_active ? 'radio' : undefined"
          :aria-checked="selectedId === donor.id"
          :tabindex="donor.is_active ? 0 : -1"
          @click="select(donor)"
          @keydown.enter.space.prevent="select(donor)"
        >
          <!-- Coming soon badge -->
          <span v-if="donor.coming_soon" class="soon-badge">Coming soon</span>

          <!-- Selected checkmark -->
          <div v-if="selectedId === donor.id" class="check-mark" aria-hidden="true">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>

          <!-- Avatar -->
          <div class="donor-avatar" :class="{ 'avatar--dim': donor.coming_soon }">
            {{ initials(donor.name) }}
          </div>

          <h4 class="donor-name">{{ donor.name }}</h4>
          <p class="donor-desc">{{ donor.description }}</p>

          <!-- Footer: activity count + preview -->
          <div v-if="donor.is_active" class="card-foot">
            <span class="act-count">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              {{ donor.activity_count }} {{ donor.activity_count === 1 ? 'activity' : 'activities' }}
            </span>
            <button
              type="button"
              class="preview-btn"
              @click.stop="togglePreview(donor.id)"
            >
              Preview
              <svg
                width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.5" stroke-linecap="round"
                :style="previewOpen === donor.id ? 'transform:rotate(180deg)' : ''"
                style="transition: transform 0.2s; flex-shrink:0"
              ><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>

          <!-- Preview drawer -->
          <div v-if="previewOpen === donor.id" class="preview-drawer">
            <p class="preview-note">Activities that will be loaded:</p>
            <ul class="preview-list">
              <li v-for="n in donor.activity_count" :key="n" class="preview-item">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                Activity {{ n }} — {{ donor.name }}
              </li>
            </ul>
          </div>

        </div>
      </div>

      <!-- Confirm -->
      <div class="actions">
        <button
          type="button"
          class="btn-primary"
          :disabled="!selectedId || isConfirming"
          @click="confirm"
        >
          <span v-if="isConfirming" class="btn-spinner btn-spinner--dark" />
          {{ isConfirming ? 'Confirming…' : 'Confirm donor' }}
          <svg v-if="!isConfirming" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore }   from '../../../stores/auth'
import { fetchDonors, selectDonor as apiSelectDonor } from '../../../services/onboardingApi'
import { ApiError }       from '../../../services/api'
import type { Donor }     from '../../../interfaces/onboarding'

const emit = defineEmits<{ (e: 'complete'): void }>()

const authStore = useAuthStore()

const donors        = ref<Donor[]>([])
const isLoading     = ref(false)
const loadError     = ref('')
const selectedId    = ref('')
const isConfirming  = ref(false)
const apiError      = ref('')
const successMsg    = ref('')
const previewOpen   = ref('')

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

// ── Load ──────────────────────────────────────────────────────────────────────

async function loadDonors() {
  loadError.value = ''
  isLoading.value = true
  try {
    donors.value = await fetchDonors(authStore.accessToken ?? undefined)
  } catch (e: any) {
    loadError.value = e?.message ?? 'Failed to load donors'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadDonors)

// ── Select ────────────────────────────────────────────────────────────────────

function select(donor: Donor) {
  if (!donor.is_active) return
  selectedId.value = donor.id
  apiError.value   = ''
}

// ── Preview ───────────────────────────────────────────────────────────────────

function togglePreview(id: string) {
  previewOpen.value = previewOpen.value === id ? '' : id
}

// ── Confirm ───────────────────────────────────────────────────────────────────

async function confirm() {
  if (!selectedId.value) return
  apiError.value   = ''
  successMsg.value = ''
  isConfirming.value = true
  try {
    await apiSelectDonor(
      { donor_id: selectedId.value },
      authStore.accessToken ?? undefined,
    )
    const d = donors.value.find(x => x.id === selectedId.value)
    successMsg.value = `${d?.name ?? 'Donor'} selected — ${d?.activity_count ?? 0} activities loaded`
    await new Promise(r => setTimeout(r, 1100))
    emit('complete')
  } catch (e: any) {
    apiError.value = e instanceof ApiError ? (e.message ?? 'Failed') : 'Connection error'
  } finally {
    isConfirming.value = false
  }
}
</script>

<style scoped>
/* ── Wrapper ──────────────────────────────────────────────────────────────── */
.s2-wrap {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 640px;
}

.hint {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-muted);
}

/* ── States ───────────────────────────────────────────────────────────────── */
.state-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--text-secondary);
  padding: 8px 0;
}

.state-row--error {
  color: var(--error);
  padding: 9px 12px;
  background: var(--error-bg);
  border: 1px solid var(--error);
  border-radius: var(--radius-sm);
}

.state-text { color: var(--text-muted); }

.retry-btn {
  margin-left: auto;
  padding: 3px 10px;
  background: transparent;
  border: 1px solid var(--error);
  border-radius: var(--radius-sm);
  color: var(--error);
  font-size: 0.75rem;
  cursor: pointer;
}

/* ── Success / error ──────────────────────────────────────────────────────── */
.success-bar {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 12px;
  background: var(--success-bg);
  border: 1px solid var(--success);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  color: var(--third);
}

.api-err {
  margin: 0;
  padding: 9px 12px;
  background: var(--error-bg);
  border: 1px solid var(--error);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  color: var(--error);
}

/* ── Grid ─────────────────────────────────────────────────────────────────── */
.donor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

@media (max-width: 420px) {
  .donor-grid { grid-template-columns: 1fr; }
}

/* ── Card ─────────────────────────────────────────────────────────────────── */
.donor-card {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  overflow: hidden;
}

.card--selectable {
  cursor: pointer;
}

.card--selectable:hover {
  border-color: var(--primary);
  background: var(--bg-card-hover);
}

.card--selectable:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.card--selected {
  border-color: var(--primary);
  background: var(--primary-dim);
  box-shadow: 0 0 0 1px var(--primary);
}

.card--soon {
  opacity: 0.45;
  cursor: default;
}

/* ── Badges / indicators ──────────────────────────────────────────────────── */
.soon-badge {
  position: absolute;
  top: 9px;
  right: 9px;
  padding: 2px 7px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 0.62rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.check-mark {
  position: absolute;
  top: 9px;
  right: 9px;
  width: 20px;
  height: 20px;
  background: var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
}

/* ── Avatar ───────────────────────────────────────────────────────────────── */
.donor-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: var(--primary-dim);
  border: 1px solid var(--primary);
  color: var(--primary);
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  letter-spacing: 0.5px;
}

.avatar--dim {
  background: var(--bg-input);
  border-color: var(--border-color);
  color: var(--text-muted);
}

/* ── Card text ────────────────────────────────────────────────────────────── */
.donor-name {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}

.donor-desc {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

/* ── Card footer ──────────────────────────────────────────────────────────── */
.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--border-subtle);
  margin-top: 2px;
}

.act-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: var(--text-muted);
}

.preview-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: transparent;
  border: none;
  padding: 0;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
  white-space: nowrap;
}

.preview-btn:hover { color: var(--text-primary); }

/* ── Preview drawer ───────────────────────────────────────────────────────── */
.preview-drawer {
  padding: 8px 10px;
  background: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  margin-top: 2px;
}

.preview-note {
  margin: 0 0 6px;
  font-size: 0.7rem;
  color: var(--text-muted);
}

.preview-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.preview-item svg { color: var(--third); flex-shrink: 0; }

/* ── Actions ──────────────────────────────────────────────────────────────── */
.actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 2px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 18px;
  height: 36px;
  background: var(--primary);
  border: none;
  border-radius: var(--radius-sm);
  color: #000;
  font-size: 0.845rem;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s;
}

.btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

/* ── Spinners ─────────────────────────────────────────────────────────────── */
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.25);
  border-left-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
  flex-shrink: 0;
}

.btn-spinner {
  display: inline-block;
  width: 13px;
  height: 13px;
  border: 2px solid rgba(255,255,255,0.3);
  border-left-color: #fff;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
  flex-shrink: 0;
}

.btn-spinner--dark {
  border-color: rgba(0,0,0,0.2);
  border-left-color: #000;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
