<template>
  <NuxtLayout name="app" :breadcrumbs="[{ title: 'Settings', href: '/settings', current: true }]">
    <div class="settings-hub">

      <!-- ═══ Page Header ═══ -->
      <div class="page-header">
        <div class="header-row">
          <div>
            <h1 class="page-title">Settings</h1>
            <p class="page-subtitle">Manage your organisation, framework, and locations</p>
          </div>
        </div>
      </div>

      <!-- ═══ Settings Cards ═══ -->
      <div class="cards-grid">
        <NuxtLink
          v-for="card in settingsCards"
          :key="card.to"
          :to="card.to"
          class="settings-card"
        >
          <div class="card-icon" :class="card.iconClass">
            <AppIcon :name="card.icon" :size="20" />
          </div>
          <div class="card-body">
            <h2 class="card-title">{{ card.title }}</h2>
            <p class="card-desc">{{ card.desc }}</p>
          </div>
          <span class="card-arrow">
            <AppIcon name="chevron-right" :size="15" />
          </span>
        </NuxtLink>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: ['auth', 'role-guard'],
  allowedRoles: ['org_admin', 'program_manager'],
})

const settingsCards = [
  {
    to: '/settings/organization',
    icon: 'building',
    iconClass: 'card-icon--org',
    title: 'Organisation',
    desc: 'Update your organisation name, country, and description.',
  },
  {
    to: '/settings/framework',
    icon: 'layers',
    iconClass: 'card-icon--framework',
    title: 'Framework',
    desc: 'Configure your project framework, activities, and targets.',
  },
  {
    to: '/settings/locations',
    icon: 'map-pin',
    iconClass: 'card-icon--locations',
    title: 'Locations',
    desc: 'Manage parent locations and service points.',
  },
]
</script>

<style scoped>
.settings-hub {
  max-width: 800px;
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

/* ═══ Cards Grid ═══ */
.cards-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, background 0.15s, transform 0.1s;
}

.settings-card:hover {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 3%, var(--bg-panel));
}

.settings-card:active {
  transform: scale(0.995);
}

/* ═══ Card Icon ═══ */
.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.settings-card:hover .card-icon {
  transform: scale(1.04);
}

.card-icon--org {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
}

.card-icon--framework {
  background: color-mix(in srgb, var(--success) 10%, transparent);
  color: var(--success);
}

.card-icon--locations {
  background: color-mix(in srgb, var(--accent, var(--primary)) 10%, transparent);
  color: var(--accent, var(--primary));
}

/* ═══ Card Body ═══ */
.card-body {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 3px;
}

.card-desc {
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

/* ═══ Card Arrow ═══ */
.card-arrow {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--text-muted);
  opacity: 0.4;
  transition: opacity 0.15s, transform 0.15s;
}

.settings-card:hover .card-arrow {
  opacity: 1;
  color: var(--primary);
  transform: translateX(2px);
}

/* ═══ Responsive ═══ */
@media (max-width: 640px) {
  .settings-card {
    padding: 16px;
    gap: 12px;
  }

  .card-icon {
    width: 40px;
    height: 40px;
  }
}
</style>
