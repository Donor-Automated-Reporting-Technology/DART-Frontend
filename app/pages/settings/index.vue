<template>
  <NuxtLayout name="app" :breadcrumbs="[{ title: 'Settings', href: '/settings', current: true }]">
    <div class="settings-hub">
      <header class="page-header">
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">
          {{ roleName ? `You're signed in as ${roleName}. You see the settings your role can use.` : 'Your account and the settings your role can use.' }}
        </p>
      </header>

      <section v-for="group in visibleGroups" :key="group.key" class="group" :aria-labelledby="`grp-${group.key}`">
        <h2 :id="`grp-${group.key}`" class="group-title">{{ group.title }}</h2>
        <div class="cards">
          <NuxtLink v-for="card in group.cards" :key="card.to" :to="card.to" class="settings-card">
            <span class="card-icon" aria-hidden="true"><AppIcon :name="card.icon" :size="20" /></span>
            <span class="card-body">
              <span class="card-title">{{ card.title }}</span>
              <span class="card-desc">{{ card.desc }}</span>
            </span>
            <AppIcon name="chevron-right" :size="16" class="card-arrow" />
          </NuxtLink>
        </div>
      </section>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { meApi } from '../../services/meApi'

// Every signed-in user has Settings; each card shows only when their role
// grants one of its permissions.
definePageMeta({ layout: false, middleware: ['auth'] })
useHead({ title: 'Settings · WellReach' })

const auth = useAuthStore()
const roleName = computed(() => auth.orgRole?.name ?? '')

// Before the role has loaded once (first sign-in on an old session), fall
// back to the system role so admins still see their cards.
const legacy: Record<string, string[]> = {
  'org.manage': ['org_admin', 'program_manager'],
  'locations.manage': ['org_admin', 'program_manager'],
  'projects.manage': ['org_admin', 'program_manager'],
  'logframe.view': ['org_admin', 'program_manager', 'data_manager', 'supervisor', 'director'],
  'people.view': ['org_admin', 'program_manager'],
  'roles.manage': ['org_admin'],
  'reports.view': ['org_admin', 'program_manager', 'data_manager', 'supervisor', 'director'],
}
const can = (perm: string) =>
  auth.orgRole ? auth.can(perm) : (legacy[perm] ?? []).includes(auth.userRole ?? '')

interface Card { to: string; icon: string; title: string; desc: string; any: string[]; show?: () => boolean }
const groups: { key: string; title: string; cards: Card[] }[] = [
  { key: 'account', title: 'You', cards: [
    { to: '/settings/account', icon: 'user', title: 'My account', desc: 'Your name, phone, sign-in email and password.', any: [] },
  ] },
  { key: 'org', title: 'Organisation', cards: [
    { to: '/settings/organization', icon: 'building', title: 'Organisation profile', desc: 'Name, country and description.', any: ['org.manage'] },
    { to: '/settings/locations', icon: 'map-pin', title: 'Locations', desc: 'Locations, CFS centres and service points.', any: ['locations.manage'] },
  ] },
  { key: 'people', title: 'People & access', cards: [
    { to: '/settings/people', icon: 'users', title: 'People', desc: 'Who has which role, and who can sign in.', any: ['people.view'] },
    { to: '/staff', icon: 'user-plus', title: 'Staff & CFS assignments', desc: 'Add staff and assign them to CFS locations.', any: ['people.manage'],
      // The staff API is still admin-only; supervisors get it in the next phase.
      show: () => auth.userRole === 'org_admin' },
    { to: '/settings/roles', icon: 'shield', title: 'Roles & permissions', desc: 'Name your roles, set their level, data scope and permissions.', any: ['roles.manage'] },
  ] },
  { key: 'programmes', title: 'Programmes & M&E', cards: [
    { to: '/settings/projects', icon: 'layers', title: 'Projects & logframe', desc: 'Projects, activities, impacts, indicators and targets.', any: ['projects.manage', 'logframe.view'] },
  ] },
  { key: 'reports', title: 'Reports & data', cards: [
    { to: '/reports', icon: 'file-text', title: 'Reports', desc: 'Programme reports and data downloads.', any: ['reports.view'] },
  ] },
]

const visibleGroups = computed(() =>
  groups
    .map(g => ({ ...g, cards: g.cards.filter(c => (c.any.length === 0 || c.any.some(can)) && (c.show?.() ?? true)) }))
    .filter(g => g.cards.length > 0),
)

onMounted(() => {
  meApi.get().then(me => auth.setMe(me)).catch(() => {})
})
</script>

<style scoped>
.settings-hub { max-width: 800px; display: flex; flex-direction: column; gap: 32px; padding-bottom: 48px; }
.page-title { margin: 0; font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; color: var(--text-primary); }
.page-subtitle { margin: 4px 0 0; font-size: 0.9375rem; color: var(--text-quiet); }

.group { display: flex; flex-direction: column; gap: 8px; }
.group-title { margin: 0 0 4px; font-size: 0.8125rem; font-weight: 400; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-quiet); }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 8px; }

.settings-card {
  display: flex; align-items: center; gap: 16px;
  padding: 16px 20px; min-height: 72px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  text-decoration: none; color: inherit;
  transition: border-color 0.15s ease;
}
.settings-card:hover { border-color: var(--primary); text-decoration: none; }
.settings-card:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.card-icon {
  width: 40px; height: 40px; flex: none; border-radius: 10px;
  display: inline-flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--link);
}
.card-body { min-width: 0; display: flex; flex-direction: column; gap: 2px; flex: 1; }
.card-title { font-size: 0.9375rem; color: var(--text-primary); }
.card-desc { font-size: 0.8125rem; line-height: 1.45; color: var(--text-secondary); }
.card-arrow { flex: none; color: var(--text-secondary); }

@media (max-width: 640px) { .cards { grid-template-columns: 1fr; } }
</style>
