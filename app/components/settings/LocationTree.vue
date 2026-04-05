<template>
  <div class="loc-tree">
    <div
      v-for="loc in locations"
      :key="loc.location.id"
      class="loc-node"
    >
      <!-- Parent location header -->
      <div class="loc-header" @click="toggle(loc.location.id)">
        <button class="expand-btn" :aria-expanded="expanded[loc.location.id]" aria-label="Toggle">
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
            class="chevron" :class="{ 'chevron--open': expanded[loc.location.id] }"
          >
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        <AppIcon name="map-pin" :size="14" class="loc-icon" />
        <span class="loc-name">{{ loc.location.name }}</span>
        <span class="sp-count">{{ (loc.service_points ?? []).length }} service point{{ (loc.service_points ?? []).length !== 1 ? 's' : '' }}</span>

        <div class="loc-actions" @click.stop>
          <button class="icon-btn" title="Edit name" @click="$emit('editLocation', loc.location)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn" title="Add service point" @click="$emit('addServicePoint', loc.location.id)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </div>

      <!-- Service points (children) -->
      <div v-if="expanded[loc.location.id]" class="sp-list">
        <div v-if="(loc.service_points ?? []).length === 0" class="sp-empty">
          No service points yet.
        </div>

        <div
          v-for="sp in loc.service_points ?? []"
          :key="sp.id"
          class="sp-row"
        >
          <span class="sp-dot" />
          <span class="sp-name">{{ sp.name }}</span>
          <span v-if="sp.language" class="sp-tag">{{ sp.language }}</span>
          <span v-if="sp.sector" class="sp-tag">{{ sp.sector }}</span>

          <div class="sp-actions">
            <button class="icon-btn" title="Edit" @click="$emit('editServicePoint', sp)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="icon-btn icon-btn--danger" title="Delete" @click="$emit('deleteServicePoint', sp.id)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="locations.length === 0" class="tree-empty">
      <p>No locations yet. Add your first location to get started.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { LocationWithServicePoints } from '../../interfaces/location'
import type { Location, ServicePoint } from '../../interfaces/location'

defineProps<{
  locations: LocationWithServicePoints[]
}>()

defineEmits<{
  (e: 'editLocation', location: Location): void
  (e: 'addServicePoint', locationId: string): void
  (e: 'editServicePoint', sp: ServicePoint): void
  (e: 'deleteServicePoint', spId: string): void
}>()

const expanded = reactive<Record<string, boolean>>({})

function toggle(id: string) {
  expanded[id] = !expanded[id]
}
</script>

<style scoped>
.loc-tree {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ── Location node ────────────────────────────────────────────────────────── */
.loc-node {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.loc-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  transition: background 0.1s;
}

.loc-header:hover {
  background: color-mix(in srgb, var(--primary) 4%, transparent);
}

.expand-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
}

.chevron {
  transition: transform 0.15s;
}

.chevron--open {
  transform: rotate(90deg);
}

.loc-icon {
  color: var(--primary);
  flex-shrink: 0;
}

.loc-name {
  font-size: 0.845rem;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sp-count {
  font-size: 0.7rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.loc-actions {
  display: flex;
  gap: 4px;
  margin-left: auto;
  flex-shrink: 0;
}

/* ── Icon buttons ─────────────────────────────────────────────────────────── */
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.1s, color 0.1s, border-color 0.1s;
}

.icon-btn:hover {
  background: var(--bg-input);
  border-color: var(--border-color);
  color: var(--text-primary);
}

.icon-btn--danger:hover {
  color: var(--error);
  border-color: var(--error);
  background: color-mix(in srgb, var(--error) 6%, transparent);
}

/* ── Service points list ──────────────────────────────────────────────────── */
.sp-list {
  border-top: 1px solid var(--border-color);
  padding: 6px 14px 8px 38px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sp-empty {
  font-size: 0.78rem;
  color: var(--text-muted);
  padding: 6px 0;
}

.sp-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
}

.sp-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--border-color);
  flex-shrink: 0;
}

.sp-name {
  font-size: 0.82rem;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sp-tag {
  font-size: 0.65rem;
  padding: 1px 7px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-muted);
  white-space: nowrap;
}

.sp-actions {
  display: flex;
  gap: 2px;
  margin-left: auto;
  flex-shrink: 0;
}

/* ── Empty state ──────────────────────────────────────────────────────────── */
.tree-empty {
  padding: 20px 0;
}

.tree-empty p {
  font-size: 0.84rem;
  color: var(--text-muted);
  margin: 0;
}
</style>
