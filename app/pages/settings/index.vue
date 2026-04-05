<template>
  <NuxtLayout name="app" :breadcrumbs="[{ title: 'Settings', href: '/settings', current: true }]">
    <div class="settings-hub">
      <div class="page-header">
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Manage your organisation, framework, and locations.</p>
      </div>

      <div class="cards-grid">
        <!-- Organisation card -->
        <NuxtLink to="/settings/organization" class="settings-card">
          <div class="card-icon">
            <AppIcon name="building" :size="22" />
          </div>
          <div class="card-body">
            <h2 class="card-title">Organisation</h2>
            <p class="card-desc">Update your organisation name and country.</p>
          </div>
          <AppIcon name="chevron-right" :size="16" class="card-arrow" />
        </NuxtLink>

        <!-- Framework card -->
        <NuxtLink to="/settings/framework" class="settings-card">
          <div class="card-icon card-icon--framework">
            <AppIcon name="layers" :size="22" />
          </div>
          <div class="card-body">
            <h2 class="card-title">Framework</h2>
            <p class="card-desc">Configure your project framework, activities, and targets.</p>
          </div>
          <AppIcon name="chevron-right" :size="16" class="card-arrow" />
        </NuxtLink>

        <!-- Locations card -->
        <NuxtLink to="/settings/locations" class="settings-card">
          <div class="card-icon card-icon--locations">
            <AppIcon name="map-pin" :size="22" />
          </div>
          <div class="card-body">
            <h2 class="card-title">Locations</h2>
            <p class="card-desc">Manage parent locations and service points.</p>
          </div>
          <AppIcon name="chevron-right" :size="16" class="card-arrow" />
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
</script>

<style scoped>
.settings-hub {
  max-width: 760px;
}

.page-header {
  margin-bottom: 28px;
}

.page-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0;
}

.cards-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, background 0.15s;
}

.settings-card:hover {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 4%, var(--bg-panel));
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
  flex-shrink: 0;
}

.card-icon--framework {
  background: color-mix(in srgb, var(--success) 12%, transparent);
  color: var(--success);
}

.card-icon--locations {
  background: color-mix(in srgb, var(--accent, var(--primary)) 12%, transparent);
  color: var(--accent, var(--primary));
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 2px;
}

.card-desc {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0;
}

.card-arrow {
  flex-shrink: 0;
  color: var(--text-muted);
  opacity: 0.5;
  transition: opacity 0.15s;
}

.settings-card:hover .card-arrow {
  opacity: 1;
  color: var(--primary);
}
</style>
