<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Settings', href: '/settings' },
      { title: 'Locations', href: '/settings/locations', current: true },
    ]"
  >
    <div class="settings-loc">

      <!-- ═══ Page Header ═══ -->
      <div class="page-header">
        <div class="header-row">
          <div>
            <h1 class="page-title">Locations</h1>
            <p class="page-subtitle">
              {{ locStore.locations.length }} location{{ locStore.locations.length !== 1 ? 's' : '' }} configured
            </p>
          </div>
          <div class="header-actions">
            <NuxtLink to="/settings" class="btn-back">
              <AppIcon name="arrow-left" :size="14" />
              <span class="btn-text">Settings</span>
            </NuxtLink>
            <button class="btn-primary" @click="openAddLocation">
              <AppIcon name="plus" :size="14" />
              <span class="btn-text">Add Location</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="locStore.loading && locStore.locations.length === 0" class="loading-state">
        <div v-for="n in 3" :key="n" class="skeleton-row" />
      </div>

      <!-- Error -->
      <div v-if="locStore.error" class="api-err">
        <AppIcon name="alert-circle" :size="14" />
        {{ locStore.error }}
      </div>

      <!-- Empty state -->
      <div v-if="!locStore.loading && locStore.locations.length === 0 && !locStore.error" class="empty-state">
        <div class="empty-icon">
          <AppIcon name="map-pin" :size="28" />
        </div>
        <h3 class="empty-title">No locations yet</h3>
        <p class="empty-desc">Add your first location to start organising service points.</p>
        <button class="btn-primary" @click="openAddLocation">
          <AppIcon name="plus" :size="14" />
          Add Location
        </button>
      </div>

      <!-- Tree -->
      <LocationTree
        v-if="locStore.locations.length > 0"
        :locations="locStore.locations"
        @edit-location="openEditLocation"
        @add-service-point="openAddSP"
        @edit-service-point="openEditSP"
        @delete-service-point="confirmDeleteSP"
      />

      <!-- ══ Modal overlay ══ -->
      <Teleport to="body">
        <Transition name="modal">
          <div v-if="modal.show" class="modal-backdrop" @click.self="closeModal">
            <div class="modal-box">
              <div class="modal-header">
                <h2 class="modal-title">{{ modal.title }}</h2>
                <button class="modal-close" @click="closeModal" aria-label="Close">
                  <AppIcon name="x" :size="16" />
                </button>
              </div>
              <form class="modal-body" @submit.prevent="handleModalSave">
                <!-- Location name -->
                <div v-if="modal.type === 'location'" class="field">
                  <label class="field-label" for="modal-loc-name">Location name</label>
                  <input
                    id="modal-loc-name"
                    v-model="modal.fields.name"
                    type="text"
                    class="field-input"
                    placeholder="e.g. Juba Main"
                    autofocus
                  />
                </div>

                <!-- Service point fields -->
                <template v-if="modal.type === 'servicePoint'">
                  <div class="field">
                    <label class="field-label" for="modal-sp-name">Name</label>
                    <input
                      id="modal-sp-name"
                      v-model="modal.fields.name"
                      type="text"
                      class="field-input"
                      placeholder="e.g. CFS Centre A"
                      autofocus
                    />
                  </div>
                  <div class="field">
                    <label class="field-label" for="modal-sp-lang">
                      Language
                      <span class="optional">optional</span>
                    </label>
                    <input
                      id="modal-sp-lang"
                      v-model="modal.fields.language"
                      type="text"
                      class="field-input"
                      placeholder="e.g. Arabic"
                    />
                  </div>
                  <div class="field">
                    <label class="field-label" for="modal-sp-sector">
                      Sector
                      <span class="optional">optional</span>
                    </label>
                    <input
                      id="modal-sp-sector"
                      v-model="modal.fields.sector"
                      type="text"
                      class="field-input"
                      placeholder="e.g. Urban"
                    />
                  </div>
                </template>

                <div v-if="modal.error" class="api-err api-err--sm">
                  <AppIcon name="alert-circle" :size="13" />
                  {{ modal.error }}
                </div>

                <div class="modal-actions">
                  <button type="button" class="btn-secondary" @click="closeModal">Cancel</button>
                  <button type="submit" class="btn-primary" :disabled="modal.saving">
                    <span v-if="modal.saving" class="btn-spinner" />
                    {{ modal.saving ? 'Saving…' : 'Save' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { useLocationStore } from '../../stores/location'
import { locationApi } from '../../services/locationApi'
import LocationTree from '../../components/settings/LocationTree.vue'
import type { Location, ServicePoint } from '../../interfaces/location'

definePageMeta({
  layout: false,
  middleware: ['auth', 'role-guard'],
  allowedRoles: ['org_admin', 'program_manager'],
})

const locStore = useLocationStore()

interface ModalState {
  show: boolean
  title: string
  type: 'location' | 'servicePoint'
  mode: 'add' | 'edit'
  targetId: string
  fields: { name: string; language: string; sector: string }
  saving: boolean
  error: string
}

const modal = reactive<ModalState>({
  show: false,
  title: '',
  type: 'location',
  mode: 'add',
  targetId: '',
  fields: { name: '', language: '', sector: '' },
  saving: false,
  error: '',
})

onMounted(() => {
  locStore.fetchLocations()
})

// ── Modal helpers ─────────────────────────────────────────────────────────────

function resetModal() {
  modal.fields = { name: '', language: '', sector: '' }
  modal.saving = false
  modal.error = ''
}

function closeModal() {
  modal.show = false
}

function openAddLocation() {
  resetModal()
  modal.title = 'Add Location'
  modal.type = 'location'
  modal.mode = 'add'
  modal.show = true
}

function openEditLocation(loc: Location) {
  resetModal()
  modal.title = 'Edit Location'
  modal.type = 'location'
  modal.mode = 'edit'
  modal.targetId = loc.id
  modal.fields.name = loc.name
  modal.show = true
}

function openAddSP(locationId: string) {
  resetModal()
  modal.title = 'Add Service Point'
  modal.type = 'servicePoint'
  modal.mode = 'add'
  modal.targetId = locationId
  modal.show = true
}

function openEditSP(sp: ServicePoint) {
  resetModal()
  modal.title = 'Edit Service Point'
  modal.type = 'servicePoint'
  modal.mode = 'edit'
  modal.targetId = sp.id
  modal.fields.name = sp.name
  modal.fields.language = sp.language ?? ''
  modal.fields.sector = sp.sector ?? ''
  modal.show = true
}

async function confirmDeleteSP(spId: string) {
  if (!confirm('Delete this service point? This cannot be undone.')) return
  await locStore.deleteServicePoint(spId)
}

async function handleModalSave() {
  modal.error = ''
  if (!modal.fields.name.trim()) {
    modal.error = 'Name is required'
    return
  }

  modal.saving = true
  try {
    if (modal.type === 'location') {
      if (modal.mode === 'add') {
        await locStore.createLocation({ name: modal.fields.name.trim() })
      } else {
        await locationApi.updateLocation(modal.targetId, { name: modal.fields.name.trim() })
        await locStore.fetchLocations()
      }
    } else {
      const payload = {
        name: modal.fields.name.trim(),
        language: modal.fields.language.trim() || undefined,
        sector: modal.fields.sector.trim() || undefined,
      }
      if (modal.mode === 'add') {
        await locStore.addServicePoint(modal.targetId, payload)
      } else {
        await locStore.updateServicePoint(modal.targetId, payload)
      }
    }
    closeModal()
  } catch (e: any) {
    modal.error = e?.message ?? 'Save failed'
  } finally {
    modal.saving = false
  }
}
</script>

<style scoped>
.settings-loc {
  max-width: 760px;
}

/* ═══ Page Header ═══ */
.page-header {
  margin-bottom: 24px;
}

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
  min-height: 40px;
}
.btn-back:hover { border-color: var(--text-muted); color: var(--text-primary); }

/* ═══ Loading Skeleton ═══ */
.loading-state {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-row {
  height: 48px;
  background: var(--bg-card);
  border-radius: 8px;
  animation: pulse 1.6s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.3; }
}

/* ═══ Empty State ═══ */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 20px;
  background: var(--bg-panel);
  border: 1px dashed var(--border-color);
  border-radius: 10px;
}

.empty-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent, var(--primary)) 10%, transparent);
  color: var(--accent, var(--primary));
  margin-bottom: 14px;
}

.empty-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.empty-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0 0 18px;
}

/* ═══ Error ═══ */
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
  margin: 0 0 12px;
}

.api-err--sm {
  font-size: 0.78rem;
  padding: 8px 12px;
  margin: 0;
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
  border-radius: 8px;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  white-space: nowrap;
  font-family: inherit;
  min-height: 40px;
}
.btn-primary:hover { opacity: 0.9; }
.btn-primary:active { transform: scale(0.98); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.84rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: border-color 0.15s, color 0.15s;
  font-family: inherit;
  min-height: 40px;
}
.btn-secondary:hover { border-color: var(--text-muted); color: var(--text-primary); }

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ═══ Modal ═══ */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  padding: 16px;
}

.modal-box {
  width: 100%;
  max-width: 440px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-elevated);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  display: flex;
  border-radius: 6px;
  transition: background 0.1s, color 0.1s;
}

.modal-close:hover {
  color: var(--text-primary);
  background: var(--hover-bg);
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 6px;
}

/* Modal transition */
.modal-enter-active { transition: all 0.2s ease-out; }
.modal-leave-active { transition: all 0.15s ease-in; }
.modal-enter-from { opacity: 0; }
.modal-leave-to { opacity: 0; }
.modal-enter-from .modal-box { transform: scale(0.96) translateY(8px); }
.modal-leave-to .modal-box { transform: scale(0.98); }

/* ═══ Fields ═══ */
.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 5px;
}

.optional {
  font-size: 0.65rem;
  font-weight: 400;
  color: var(--text-muted);
  opacity: 0.7;
}

.field-input {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.845rem;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}

.field-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-dim);
}

/* ═══ Responsive ═══ */
@media (max-width: 640px) {
  .header-row { flex-direction: column; gap: 10px; }
  .header-actions { width: 100%; }
  .btn-text { display: none; }
  .btn-primary, .btn-secondary, .btn-back { padding: 10px 12px; }
}
</style>
