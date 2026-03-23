<template>
  <!--
    Step3ActivityConfirm.vue — Onboarding Step 3
    Compact activity list with instant per-row toggles.
    Calls PATCH /api/v1/onboarding/activities/:id immediately on toggle.
    Confirm re-fetches status; step complete if ≥ 1 activity is active.
  -->
  <div class="s3-wrap">

    <!-- Info banner -->
    <div class="info-bar">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>You can change these at any time in <strong>Settings › Activities</strong></span>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="state-row">
      <span class="spinner" />
      <span class="state-text">Loading activities…</span>
    </div>

    <!-- Load error -->
    <div v-else-if="loadError" class="state-row state-row--error">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>{{ loadError }}</span>
      <button class="retry-btn" @click="loadActivities">Retry</button>
    </div>

    <template v-else>

      <!-- All-deactivated warning -->
      <div v-if="allOff" class="warn-bar">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        At least one activity must stay active to continue.
      </div>

      <!-- Toggle error -->
      <p v-if="toggleError" class="api-err">{{ toggleError }}</p>

      <!-- Activity rows -->
      <div class="activity-list">
        <div
          v-for="act in activities"
          :key="act.id"
          class="act-row"
          :class="{ 'act-row--off': !act.is_active }"
        >
          <!-- Left: donor badge + name + description -->
          <div class="act-body">
            <span class="donor-badge">{{ act.donor }}</span>
            <span class="act-name">{{ act.name }}</span>
            <span class="act-desc">{{ act.description }}</span>
          </div>

          <!-- Right: toggle -->
          <div class="act-toggle">
            <span v-if="togglingId === act.id" class="spinner spinner--sm" />
            <button
              v-else
              type="button"
              class="toggle"
              :class="act.is_active ? 'toggle--on' : 'toggle--off'"
              role="switch"
              :aria-checked="act.is_active"
              :aria-label="`${act.is_active ? 'Deactivate' : 'Activate'} ${act.name}`"
              @click="toggle(act)"
            >
              <span class="knob" />
            </button>
            <span class="toggle-lbl" :class="{ 'toggle-lbl--off': !act.is_active }">
              {{ act.is_active ? 'Active' : 'Off' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Confirm -->
      <div class="actions">
        <button
          type="button"
          class="btn-primary"
          :disabled="allOff || isConfirming"
          @click="confirm"
        >
          <span v-if="isConfirming" class="btn-spinner btn-spinner--dark" />
          {{ isConfirming ? 'Confirming…' : 'Confirm activities' }}
          <svg v-if="!isConfirming" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore }       from '../../../stores/auth'
import { useOnboardingStore } from '../../../stores/onboarding'
import {
  fetchOnboardingActivities,
  toggleActivity as apiToggle,
} from '../../../services/onboardingApi'
import { ApiError } from '../../../services/api'
import type { OnboardingActivity } from '../../../interfaces/onboarding'

const emit = defineEmits<{ (e: 'complete'): void }>()

const authStore       = useAuthStore()
const onboardingStore = useOnboardingStore()

const activities   = ref<OnboardingActivity[]>([])
const isLoading    = ref(false)
const loadError    = ref('')
const togglingId   = ref('')
const toggleError  = ref('')
const isConfirming = ref(false)

const allOff = computed(
  () => activities.value.length > 0 && activities.value.every(a => !a.is_active),
)

// ── Load ──────────────────────────────────────────────────────────────────────

async function loadActivities() {
  loadError.value = ''
  isLoading.value = true
  try {
    activities.value = await fetchOnboardingActivities(authStore.accessToken ?? undefined)
  } catch (e: any) {
    loadError.value = e?.message ?? 'Failed to load activities'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadActivities)

// ── Toggle ────────────────────────────────────────────────────────────────────

async function toggle(act: OnboardingActivity) {
  if (togglingId.value) return
  toggleError.value = ''
  togglingId.value  = act.id
  const prev        = act.is_active
  act.is_active     = !prev
  try {
    await apiToggle(act.id, { is_active: act.is_active }, authStore.accessToken ?? undefined)
  } catch (e: any) {
    act.is_active    = prev
    toggleError.value = e instanceof ApiError
      ? (e.message ?? 'Failed to save')
      : 'Connection error — please try again'
  } finally {
    togglingId.value = ''
  }
}

// ── Confirm ───────────────────────────────────────────────────────────────────

async function confirm() {
  if (allOff.value) return
  isConfirming.value = true
  try {
    await onboardingStore.fetchStatus()
    emit('complete')
  } catch (e: any) {
    toggleError.value = e?.message ?? 'Failed to confirm — please try again'
  } finally {
    isConfirming.value = false
  }
}
</script>

<style scoped>
/* ── Wrapper ──────────────────────────────────────────────────────────────── */
.s3-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 600px;
}

/* ── Info bar ─────────────────────────────────────────────────────────────── */
.info-bar {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  background: var(--primary-dim);
  border: 1px solid rgba(108,177,255,0.3);
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.45;
}

.info-bar svg { flex-shrink: 0; color: var(--primary); }

/* ── State rows ───────────────────────────────────────────────────────────── */
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

/* ── Warn bar ─────────────────────────────────────────────────────────────── */
.warn-bar {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  background: var(--warning-bg);
  border: 1px solid var(--warning);
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  color: var(--warning);
}

.warn-bar svg { flex-shrink: 0; }

/* ── API error ────────────────────────────────────────────────────────────── */
.api-err {
  margin: 0;
  padding: 9px 12px;
  background: var(--error-bg);
  border: 1px solid var(--error);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  color: var(--error);
}

/* ── Activity list ────────────────────────────────────────────────────────── */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
}

/* ── Activity row ─────────────────────────────────────────────────────────── */
.act-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 11px 14px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-subtle);
  transition: opacity 0.2s;
}

.act-row:last-child { border-bottom: none; }

.act-row--off { opacity: 0.5; }

/* ── Activity body ────────────────────────────────────────────────────────── */
.act-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.donor-badge {
  display: inline-flex;
  align-self: flex-start;
  padding: 1px 7px;
  background: var(--success-bg);
  border: 1px solid var(--third);
  border-radius: 20px;
  font-size: 0.62rem;
  font-weight: 600;
  color: var(--third);
  letter-spacing: 0.03em;
  white-space: nowrap;
  margin-bottom: 1px;
}

.act-name {
  font-size: 0.845rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.act-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Toggle area ──────────────────────────────────────────────────────────── */
.act-toggle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  min-width: 44px;
}

/* ── Toggle pill ──────────────────────────────────────────────────────────── */
.toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.toggle--on  { background: var(--primary); }
.toggle--off { background: var(--border-color); }

.knob {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  top: 3px;
  transition: left 0.18s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
}

.toggle--on  .knob { left: calc(100% - 17px); }
.toggle--off .knob { left: 3px; }

/* ── Toggle label ─────────────────────────────────────────────────────────── */
.toggle-lbl {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--primary);
  letter-spacing: 0.02em;
}

.toggle-lbl--off { color: var(--text-muted); }

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
  border: 2px solid rgba(255,255,255,0.2);
  border-left-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
  flex-shrink: 0;
}

.spinner--sm {
  width: 18px;
  height: 18px;
  border-color: rgba(108,177,255,0.25);
  border-left-color: var(--primary);
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

/* ── Responsive ───────────────────────────────────────────────────────────── */
@media (max-width: 480px) {
  .act-row { padding: 10px 12px; gap: 10px; }
  .act-desc { display: none; }
}
</style>
