<template>
  <div class="location-breakdown">
    <div class="lb-header">
      <h3 class="lb-title">By Location</h3>
      <span class="lb-count">{{ locations.length }} locations</span>
    </div>

    <div v-if="locations.length === 0" class="empty">
      <p>No locations configured yet.</p>
      <NuxtLink to="/settings/locations" class="link-setup">Set up locations</NuxtLink>
    </div>

    <div v-else class="loc-grid">
      <NuxtLink
        v-for="loc in locations"
        :key="loc.id"
        class="loc-card"
        :to="`/dashboard?location=${loc.id}`"
      >
        <span class="loc-name">{{ loc.name }}</span>
        <div class="loc-stats">
          <div class="loc-stat">
            <span class="stat-val">{{ loc.children_count }}</span>
            <span class="stat-label">Beneficiaries</span>
          </div>
          <div class="loc-stat">
            <span class="stat-val">{{ loc.centre_count }}</span>
            <span class="stat-label">Centres</span>
          </div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LocationSummary } from '../../interfaces/dashboard'

defineProps<{ locations: LocationSummary[] }>()
</script>

<style scoped>
.location-breakdown {
  background: var(--bg-card);
  border: 1px solid var(--border-color, #E5E5EA);
  border-radius: var(--radius-lg, 20px);
  overflow: hidden;
}

.lb-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 22px;
}

.lb-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-primary, #1D1D1F);
  margin: 0;
}

.lb-count {
  font-size: 0.72rem;
  color: var(--text-muted, #AEAEB2);
  background: var(--hover-bg);
  padding: 2px 8px;
  border-radius: 10px;
}

.loc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
  padding: 4px 22px 22px;
}

.loc-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  background: var(--bg-surface, rgba(0,0,0,0.015));
  border: 1px solid var(--border-color, #E5E5EA);
  border-radius: var(--radius-md, 16px);
  text-decoration: none;
  transition: box-shadow 0.15s, transform 0.15s;
  cursor: pointer;
}

.loc-card:hover {
  box-shadow: var(--shadow-elevated);
  transform: translateY(-1px);
  text-decoration: none;
}

.loc-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary, #1D1D1F);
}

.loc-stats {
  display: flex;
  gap: 18px;
}

.loc-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-val {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary, #1D1D1F);
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted, #AEAEB2);
}

.empty {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty p { margin: 0; }

.link-setup {
  font-size: 0.82rem;
  color: var(--primary);
  text-decoration: none;
  font-weight: 500;
}

.link-setup:hover { text-decoration: underline; }
</style>
