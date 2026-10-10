<template>
  <NuxtLayout name="app" :breadcrumbs="[{ title: 'Settings', href: '/settings', current: true }]">
    <div class="settings-hub">
      <header class="page-header">
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">You see the settings your role can use.</p>
      </header>

      <!-- You: the profile row opens My account -->
      <NuxtLink to="/settings/account" class="profile-row">
        <span class="avatar" aria-hidden="true">{{ initials }}</span>
        <span class="row-body">
          <span class="row-title">{{ auth.userName ?? 'My account' }}</span>
          <span class="row-desc">{{ roleName ? `${roleName} · ` : '' }}Name, phone, sign-in email and password</span>
        </span>
        <AppIcon name="chevron-right" :size="16" class="row-arrow" />
      </NuxtLink>

      <section v-for="group in visibleGroups" :key="group.key" class="group" :aria-labelledby="`grp-${group.key}`">
        <h2 :id="`grp-${group.key}`" class="group-title">{{ group.title }}</h2>
        <ul class="list">
          <li v-for="card in group.cards" :key="card.to">
            <NuxtLink :to="card.to" class="row">
              <span class="row-icon" aria-hidden="true"><AppIcon :name="card.icon" :size="16" /></span>
              <span class="row-body">
                <span class="row-title">{{ card.title }}</span>
                <span class="row-desc">{{ card.desc }}</span>
              </span>
              <AppIcon name="chevron-right" :size="16" class="row-arrow" />
            </NuxtLink>
          </li>
        </ul>
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
const initials = computed(() =>
  (auth.userName ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || '?'
)

// Before the role has loaded once (first sign-in on an old session), fall
// back to the system role so admins still see their cards.
const legacy: Record<string, string[]> = {
  'org.manage': ['org_admin', 'program_manager'],
  'locations.manage': ['org_admin', 'program_manager'],
  'projects.manage': ['org_admin', 'program_manager'],
  'logframe.view': ['org_admin', 'program_manager', 'data_manager', 'director'],
  'people.view': ['org_admin', 'program_manager', 'supervisor'],
  'people.assign_locations': ['org_admin', 'program_manager'],
  'roles.manage': ['org_admin'],
  'data.export': ['org_admin', 'program_manager', 'data_manager'],
}
const can = (perm: string) =>
  auth.orgRole ? auth.can(perm) : (legacy[perm] ?? []).includes(auth.userRole ?? '')

interface Card { to: string; icon: string; title: string; desc: string; any: string[]; show?: () => boolean }
const groups: { key: string; title: string; cards: Card[] }[] = [
  { key: 'org', title: 'Organisation', cards: [
    { to: '/settings/organization', icon: 'building', title: 'Organisation profile', desc: 'Name, country and description.', any: ['org.manage'] },
    { to: '/settings/locations', icon: 'map-pin', title: 'Locations', desc: 'Locations, CFS centres and service points.', any: ['locations.manage'] },
  ] },
  { key: 'people', title: 'People & access', cards: [
    { to: '/settings/people', icon: 'users', title: 'People', desc: 'Who has which role, and who can sign in.', any: ['people.view'] },
    { to: '/staff', icon: 'user-plus', title: 'Staff', desc: 'Add staff and assign them to CFS locations.', any: ['people.assign_locations'],
      // The Staff page works across every CFS, so it needs a role that sees
      // the whole organisation. Others add people in People, for their own CFS.
      show: () => (auth.orgRole ? auth.orgRole.scope === 'organisation' : auth.userRole === 'org_admin') },
    { to: '/settings/roles', icon: 'shield', title: 'Roles & permissions', desc: 'Name your roles, set their level, data scope and permissions.', any: ['roles.manage'] },
  ] },
  { key: 'programmes', title: 'Programmes & M&E', cards: [
    { to: '/settings/projects', icon: 'layers', title: 'Projects & logframe', desc: 'Projects, activities, impacts, indicators and targets.', any: ['projects.manage', 'logframe.view'] },
  ] },
  { key: 'reports', title: 'Reports & data', cards: [
    { to: '/reports', icon: 'download', title: 'Reports & downloads', desc: 'Download project and activity data (Excel).', any: ['data.export'] },
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
.settings-hub { max-width: 720px; display: flex; flex-direction: column; gap: 32px; padding-bottom: 48px; }
.page-title { margin: 0; font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; color: var(--text-primary); }
.page-subtitle { margin: 4px 0 0; font-size: 0.9375rem; color: var(--text-quiet); }

/* One grouped list per category: rows divided by hairlines, one container. */
.group { display: flex; flex-direction: column; gap: 8px; }
.group-title { margin: 0; padding: 0 4px; font-size: 0.8125rem; font-weight: 400; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-quiet); }
.list { list-style: none; margin: 0; padding: 0; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; }
.list li + li .row { border-top: 1px solid var(--border-color); }

.row, .profile-row {
  display: flex; align-items: center; gap: 16px;
  min-height: 64px; padding: 12px 16px;
  text-decoration: none; color: inherit;
  transition: background-color 0.15s ease;
}
.row:hover, .profile-row:hover { background: var(--hover-bg); text-decoration: none; }
.row:focus-visible, .profile-row:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }

.profile-row { min-height: 80px; padding: 16px; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 12px; }
.avatar {
  width: 48px; height: 48px; flex: none; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--primary); color: var(--on-primary); font-size: 1rem;
}
.row-icon {
  width: 32px; height: 32px; flex: none; border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--link);
}
.row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.row-title { font-size: 0.9375rem; color: var(--text-primary); }
.row-desc { font-size: 0.8125rem; line-height: 1.45; color: var(--text-secondary); }
.row-arrow { flex: none; color: var(--text-secondary); }
</style>
