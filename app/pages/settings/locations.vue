<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Settings', href: '/settings' },
      { title: 'Locations', href: '/settings/locations', current: true },
    ]"
  >
    <div class="settings-loc">
      <div class="page-header">
        <div class="header-row">
          <div>
            <h1 class="page-title">Locations</h1>
            <p class="page-subtitle">Manage parent locations and their service points (CFS centres).</p>
          </div>
          <button class="btn-primary" @click="openAddLocation">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Location
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="locStore.loading && locStore.locations.length === 0" class="loading-msg">Loading locations…</div>

      <!-- Error -->
      <p v-if="locStore.error" class="api-err">{{ locStore.error }}</p>

      <!-- Tree -->
      <LocationTree
        :locations="locStore.locations"
        @edit-location="openEditLocation"
        @add-service-point="openAddSP"
        @edit-service-point="openEditSP"
        @delete-service-point="confirmDeleteSP"
      />

      <!-- Back link -->
      <div class="actions" style="margin-top: 20px;">
        <NuxtLink to="/settings" class="btn-secondary">Back to Settings</NuxtLink>
      </div>

      <!-- ── Modal overlay ──────────────────────────────────────────────────── -->
      <Teleport to="body">
        <div v-if="modal.show" class="modal-backdrop" @click.self="closeModal">
          <div class="modal-box">
            <div class="modal-header">
              <h2 class="modal-title">{{ modal.title }}</h2>
              <button class="modal-close" @click="closeModal" aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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

              <p v-if="modal.error" class="api-err">{{ modal.error }}</p>

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
  max-width: 700px;
}

.page-header {
  margin-bottom: 24px;
}

.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0;
}

.loading-msg {
  font-size: 0.84rem;
  color: var(--text-muted);
  padding: 24px 0;
}

.api-err {
  font-size: 0.78rem;
  color: var(--error);
  padding: 8px 12px;
  background: color-mix(in srgb, var(--error) 8%, transparent);
  border-radius: var(--radius-sm);
  margin: 0 0 12px;
}

/* ── Buttons ──────────────────────────────────────────────────────────────── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
}

.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.btn-secondary:hover {
  border-color: var(--text-primary);
  color: var(--text-primary);
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.actions {
  display: flex;
  gap: 10px;
}

/* ── Modal ────────────────────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  padding: 16px;
}

.modal-box {
  width: 100%;
  max-width: 420px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-color);
}

.modal-title {
  font-size: 0.92rem;
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
}

.modal-close:hover { color: var(--text-primary); }

.modal-body {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
}

/* ── Fields ───────────────────────────────────────────────────────────────── */
.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 5px;
}

.optional {
  font-size: 0.65rem;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--text-muted);
  opacity: 0.7;
}

.field-input {
  width: 100%;
  padding: 9px 11px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
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
</style>
