<template>
  <div class="dash-header">
    <!-- Left: greeting + org -->
    <div class="header-left">
      <p class="header-greeting">{{ greeting }}, <span class="header-name">{{ displayName }}</span></p>
      <p class="header-org">{{ displayOrg }}</p>
    </div>

    <!-- Right: today's date -->
    <div class="header-date">
      <span class="date-icon">
        <AppIcon name="calendar" :size="14" />
      </span>
      <span class="date-label">{{ todayLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '../../stores/auth';
import AppIcon from '../interfaces/AppIcon.vue';

const authStore = useAuthStore();

const displayName = computed(() => authStore.userName ?? 'User');
const displayOrg = computed(() => authStore.orgName ?? 'Your Organisation');

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
});

const todayLabel = computed(() =>
  new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  })
);
</script>

<style scoped>
.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1.5rem 1.75rem;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  position: relative;
  overflow: hidden;
}

.dash-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient-brand);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.header-greeting {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 600;
  color: var(--text-secondary);
  line-height: 1.3;
}

.header-name {
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
}

.header-org {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-muted);
  font-weight: 400;
}

.header-date {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.85rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  white-space: nowrap;
}

.date-icon {
  display: flex;
  align-items: center;
  color: var(--primary);
  flex-shrink: 0;
}

.date-label {
  font-size: 0.8rem;
  font-weight: 500;
}

@media (max-width: 480px) {
  .dash-header {
    padding: 1rem 1.25rem;
  }
  .header-greeting {
    font-size: 1.15rem;
  }
  .header-date {
    width: 100%;
    justify-content: center;
  }
}
</style>
