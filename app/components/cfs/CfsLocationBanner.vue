<template>
  <!--
    CfsLocationBanner (Simple Edition)
    ─────────────────────────────────────────────────────────────────────────────
    A clean, professional header for the facilitator dashboard.
    Uses a subtle linear gradient for a modern yet focused aesthetic.
  -->
  <div class="loc-header">
    <div class="loc-header__main">
      <div class="loc-header__icon-box">
        <AppIcon name="map-pin" :size="24" />
      </div>
      <div class="loc-header__content">
        <p class="loc-header__eyebrow">Assigned Facility</p>
        <h2 class="loc-header__name">{{ location.name || 'Universal CFS' }}</h2>
        
        <div class="loc-header__tags">
          <span v-if="facilitatorName" class="tag tag--user">
            <AppIcon name="user" :size="13" />
            {{ facilitatorName }}
          </span>
          <span v-if="location.sector" class="tag">
            <AppIcon name="layout-grid" :size="13" />
            {{ location.sector }}
          </span>
          <span v-if="location.geographic_area" class="tag">
            <AppIcon name="map" :size="13" />
            {{ location.geographic_area }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '../interfaces/AppIcon.vue';

defineProps<{
  location: {
    id: string;
    name: string;
    sector: string;
    geographic_area: string;
  };
  /** Optional facilitator name to display */
  facilitatorName?: string | null;
}>();
</script>

<style scoped>
.loc-header {
  position: relative;
  width: 100%;
  border-radius: var(--radius-lg);
  padding: 1.75rem 2rem;
  /* Clean, subtle linear gradient (Primary-ish) */
  background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.12) 0%, rgba(var(--primary-rgb), 0.04) 100%);
  border: 1px solid var(--primary-dim);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  animation: fadeInDown 0.5s ease-out;
}

.loc-header__main {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.loc-header__icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: var(--primary-dim);
  border: 1px solid var(--primary);
  border-radius: var(--radius-md);
  color: var(--primary);
  flex-shrink: 0;
}

.loc-header__content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.loc-header__eyebrow {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--primary);
  opacity: 0.9;
}

.loc-header__name {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.loc-header__tags {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 6px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.tag--user {
  background: var(--primary-dim);
  border-color: var(--primary);
  color: var(--primary);
}

@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 640px) {
  .loc-header { padding: 1.25rem 1.5rem; }
  .loc-header__name { font-size: 1.25rem; }
  .loc-header__main { gap: 1rem; }
  .loc-header__icon-box { width: 48px; height: 48px; }
}
</style>
