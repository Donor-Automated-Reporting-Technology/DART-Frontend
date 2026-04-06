<template>
  <!--
    AppLayout — shadcn sidebar-07 style
    ─────────────────────────────────────────────────────────────────────────────
    Structure:
      [Sidebar 220px fixed] | [SidebarInset: sticky header + scrollable content]

    Desktop: sidebar collapses to a 56px icon-only rail; state persisted to
             localStorage so the preference survives page navigation.
    Mobile:  sidebar slides off-screen as a full-width overlay; hamburger
             trigger + dark backdrop used; collapse state is ignored.
  -->
  <div
    class="app-shell"
    :class="{
      'sidebar-open':      sidebarOpen,
      'sidebar-collapsed': sidebarCollapsed,
    }"
  >

    <!-- ═══════════════════════════════════════════════════════════════════════
         SIDEBAR
         ═══════════════════════════════════════════════════════════════════════ -->
    <aside class="sidebar" aria-label="Application navigation">

      <!-- ── Brand / Logo block ─────────────────────────────────────────────── -->
      <div class="sidebar-brand">
        <!-- Square logo mark -->
        <div class="brand-mark" aria-hidden="true">D</div>

        <!-- Brand text: app name + org (hidden when collapsed) -->
        <div class="brand-copy">
          <span class="brand-name">DART</span>
          <span class="brand-org truncate">{{ displayOrg }}</span>
        </div>

        <!-- Close button — only rendered/shown on mobile -->
        <button
          class="mobile-close-btn"
          @click="sidebarOpen = false"
          aria-label="Close navigation panel"
        >
          <AppIcon name="x" :size="15" />
        </button>
      </div>

      <!-- ── Navigation body ────────────────────────────────────────────────── -->
      <nav class="sidebar-nav" role="navigation">

        <!-- Group: Platform (Admin & Staff) ────────────────────────────── -->
        <div class="nav-group" v-if="isAdmin || isStaff || isManager">
          <p class="nav-group-label">Platform</p>

          <NuxtLink
            to="/dashboard"
            class="nav-item"
            active-class="nav-item--active"
            title="Dashboard Insights"
            @click="closeSidebarOnMobile"
          >
            <AppIcon name="layout-dashboard" :size="15" class="nav-icon" />
            <span class="nav-label">Dashboard</span>
          </NuxtLink>
        </div>

        <!-- Group: Beneficiaries ────────────────────────────────────── -->
        <div class="nav-group" v-if="isAdmin || isStaff || isManager">
          <p class="nav-group-label">Beneficiaries</p>

          <NuxtLink
            to="/beneficiaries"
            class="nav-item"
            active-class="nav-item--active"
            title="Beneficiary Registry"
            @click="closeSidebarOnMobile"
          >
            <AppIcon name="user-plus" :size="15" class="nav-icon" />
            <span class="nav-label">Beneficiaries</span>
          </NuxtLink>
        </div>

        <!-- Group: Activities (dynamic from framework) ──────────────── -->
        <div class="nav-group" v-if="hasActivities">
          <p class="nav-group-label">Activities</p>

          <NuxtLink
            v-for="activity in sidebarActivities"
            :key="activity.code"
            :to="activity.route"
            class="nav-item"
            active-class="nav-item--active"
            :title="activity.label"
            @click="closeSidebarOnMobile"
          >
            <AppIcon :name="activity.icon" :size="15" class="nav-icon" />
            <span class="nav-label">{{ activity.label }}</span>
          </NuxtLink>
        </div>

        <!-- Group: Staff (Admin/Manager only) ──────────────────────── -->
        <div class="nav-group" v-if="isAdmin || isManager">
          <p class="nav-group-label">Staff</p>

          <NuxtLink
            to="/staff"
            class="nav-item"
            active-class="nav-item--active"
            title="Staff Management"
            @click="closeSidebarOnMobile"
          >
            <AppIcon name="users" :size="15" class="nav-icon" />
            <span class="nav-label">Staff</span>
          </NuxtLink>
        </div>

        <!-- Group: Reports (all users) ───────────────────────────────── -->
        <div class="nav-group" v-if="isAdmin || isManager">
          <p class="nav-group-label">Reports</p>

          <NuxtLink
            to="/reports"
            class="nav-item"
            active-class="nav-item--active"
            title="Reports"
            @click="closeSidebarOnMobile"
          >
            <AppIcon name="file-text" :size="15" class="nav-icon" />
            <span class="nav-label">Reports</span>
          </NuxtLink>
        </div>

        <!-- Group: Settings (Admin/Manager only) ──────────────────── -->
        <div class="nav-group" v-if="isAdmin || isManager">
          <p class="nav-group-label">Settings</p>

          <NuxtLink
            to="/settings"
            class="nav-item"
            active-class="nav-item--active"
            title="Settings"
            @click="closeSidebarOnMobile"
          >
            <AppIcon name="settings" :size="15" class="nav-icon" />
            <span class="nav-label">Settings</span>
          </NuxtLink>
        </div>

      </nav>

      <!-- ── User chip (footer) ─────────────────────────────────────────────── -->
      <div class="sidebar-footer">
        <!-- CFS Location badge for staff -->
        <div
          v-if="isStaff && authStore.cfsLocationName"
          class="cfs-location-badge"
          :title="authStore.cfsLocationName"
        >
          <AppIcon name="map-pin" :size="13" class="cfs-location-icon" />
          <span class="cfs-location-name truncate">{{ authStore.cfsLocationName }}</span>
        </div>

        <!-- Logout link -->
        <button
          class="logout-btn"
          @click="handleLogout"
          title="Log out"
        >
          <AppIcon name="log-out" :size="15" class="logout-btn-icon" />
          <span class="nav-label">Log out</span>
        </button>

        <div
          class="user-chip"
          :title="displayName"
        >
          <!-- Avatar circle with initials -->
          <div class="user-avatar" aria-hidden="true">{{ userInitials }}</div>

          <!-- Name + email (hidden when collapsed) -->
          <div class="user-meta">
            <span class="user-display-name truncate">{{ displayName }}</span>
            <span class="user-display-sub truncate">{{ displaySub }}</span>
          </div>
        </div>
      </div>

    </aside>

    <!-- ── Mobile overlay backdrop ──────────────────────────────────────────── -->
    <!--
      Rendered at all times; only becomes visible (and pointer-active)
      when .sidebar-open is applied to the shell on mobile.
    -->
    <div
      class="sidebar-overlay"
      :class="{ 'sidebar-overlay--active': sidebarOpen }"
      @click="sidebarOpen = false"
      aria-hidden="true"
    />

    <!-- ═══════════════════════════════════════════════════════════════════════
         SIDEBAR INSET  (sticky header + scrollable page content)
         ═══════════════════════════════════════════════════════════════════════ -->
    <div class="sidebar-inset">

      <!-- ── Sticky site header ─────────────────────────────────────────────── -->
      <header class="site-header">

        <!-- Left side: trigger + separator + breadcrumbs -->
        <div class="header-start">

          <!-- Hamburger / sidebar trigger -->
          <!--
            Desktop: toggles the collapsed icon-rail state.
            Mobile:  toggles the slide-in overlay.
          -->
          <button
            class="sidebar-trigger"
            @click="toggleSidebar"
            :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
            :aria-expanded="sidebarOpen || !sidebarCollapsed"
          >
            <AppIcon
              :name="sidebarCollapsed ? 'panel-left-open' : 'panel-left-close'"
              :size="17"
            />
          </button>

          <!-- Thin vertical rule separating trigger from breadcrumbs -->
          <div class="header-separator" aria-hidden="true" />

          <!-- Breadcrumb trail (injected by each page via the breadcrumbs prop) -->
          <nav
            v-if="breadcrumbs?.length"
            class="breadcrumbs"
            aria-label="Page breadcrumb"
          >
            <template v-for="(crumb, idx) in breadcrumbs" :key="crumb.href">
              <!-- Parent crumb — muted, clickable -->
              <NuxtLink
                v-if="!crumb.current"
                :to="crumb.href"
                class="bc-link"
              >
                {{ crumb.title }}
              </NuxtLink>

              <!-- Current page crumb — white, not a link -->
              <span v-else class="bc-current">{{ crumb.title }}</span>

              <!-- Slash separator between items -->
              <span
                v-if="idx < breadcrumbs.length - 1"
                class="bc-slash"
                aria-hidden="true"
              >/</span>
            </template>
          </nav>
        </div>

        <!-- Right side: theme toggle + onboarding pill -->
        <div class="header-end">
          <!-- Theme toggle button -->
          <button
            class="header-theme-btn"
            type="button"
            :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            @click="toggleTheme"
          >
            <AppIcon :name="isDark ? 'moon' : 'sun'" :size="16" />
          </button>

          <div
            v-if="showOnboardingPill"
            class="onboarding-pill"
            aria-live="polite"
          >
            <AppIcon name="zap" :size="12" class="pill-icon" />
            <span>
              {{ onboardingStore.remainingCount }}
              {{ onboardingStore.remainingCount === 1 ? 'step' : 'steps' }} remaining
            </span>
          </div>
        </div>

      </header>

      <!-- ── Scrollable page content ────────────────────────────────────────── -->
      <main class="page-content">
        <slot />
      </main>

    </div><!-- /sidebar-inset -->

  </div><!-- /app-shell -->
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useAuthStore }       from '../stores/auth';
import { useOnboardingStore } from '../stores/onboarding';
import { useTheme }           from '../composables/useTheme';
import AppIcon from '../components/interfaces/AppIcon.vue';
import { ACTIVITY_CONFIG }    from '../utils/activityConfig';
import type { Breadcrumb } from '../interfaces/dashboard';

// ─── Theme ────────────────────────────────────────────────────────────────────
const { isDark, toggleTheme } = useTheme();

// ─── Props ────────────────────────────────────────────────────────────────────

/**
 * Breadcrumbs to render in the sticky header.
 * Each page provides its own trail via definePageMeta / NuxtLayout props.
 */
const props = defineProps<{
  breadcrumbs?: Breadcrumb[];
}>();

// ─── Auth state ───────────────────────────────────────────────────────────────

const authStore = useAuthStore();

/** User's full display name — falls back to 'User' before auth hydrates */
const displayName = computed(() => authStore.userName ?? 'User');

/** Organisation name — falls back to 'DART' before auth hydrates */
const displayOrg = computed(() => authStore.orgName ?? 'DART');

/**
 * Secondary line in the user chip.
 * Shows the user's email if available, otherwise falls back to the org name,
 * then a generic placeholder.
 */
const displaySub = computed(
  () => authStore.userEmail ?? authStore.orgName ?? 'DART',
);

// ─── Role-based access control ────────────────────────────────────────────────

/** Check if user is admin (org_admin) */
const isAdmin = computed(() => authStore.userRole === 'org_admin');

/** Check if user is staff (facilitator, case_worker) */
const isStaff = computed(() =>
  authStore.userRole === 'facilitator' || authStore.userRole === 'case_worker'
);

/** Check if user is a manager (program_manager) or admin */
const isManager = computed(() =>
  authStore.userRole === 'org_admin' || authStore.userRole === 'program_manager'
);

/**
 * Dynamic sidebar activity items built from the auth store's frameworkActivities.
 * Falls back to the old `activities` array for backward compat during migration.
 */
const sidebarActivities = computed(() => {
  // New framework-based approach
  if (authStore.frameworkActivities.length > 0) {
    return authStore.frameworkActivities
      .filter((fa) => fa.is_active && fa.template?.code)
      .map((fa) => {
        const code = fa.template!.code
        const config = ACTIVITY_CONFIG[code]
        return config ? { code, ...config } : null
      })
      .filter(Boolean) as Array<{ code: string; icon: string; label: string; route: string }>
  }
  // Backward compat: old activities array (string[])
  if (authStore.activities?.includes('Child Friendly Spaces')) {
    return [
      { code: 'CFS_ATTENDANCE', icon: 'check-square', label: 'Attendance', route: '/cfs/attendance' },
    ]
  }
  return []
});

/** Whether the user has any activities to show */
const hasActivities = computed(() => sidebarActivities.value.length > 0);

// ─── Onboarding pill ──────────────────────────────────────────────────────────

const onboardingStore = useOnboardingStore();

/**
 * Show the "N steps remaining" pill in the sticky header for org_admin users.
 * Disappears automatically once onboarding_complete is set to true.
 */
const showOnboardingPill = computed<boolean>(
  () =>
    authStore.userRole === 'org_admin' &&
    !onboardingStore.onboarding_complete &&
    onboardingStore.remainingCount > 0,
);

/**
 * Kick off the onboarding status fetch when the layout mounts.
 * Scoped to org_admin to avoid unnecessary API calls for other roles.
 */
onMounted(() => {
  if (authStore.userRole === 'org_admin') {
    onboardingStore.fetchStatus();
  }
});

/**
 * Two-letter initials derived from the user's display name.
 * e.g. "Nyawelo Deng" → "ND"
 */
const userInitials = computed(() => {
  const name = authStore.userName ?? 'U';
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase();
});

// ─── Sidebar — mobile overlay ─────────────────────────────────────────────────

/**
 * Controls whether the sidebar overlay is open on mobile.
 * On desktop this flag has no visual effect — the sidebar is always visible.
 */
const sidebarOpen = ref(false);

/**
 * Called by nav-item click handlers.
 * Closes the mobile overlay automatically when the user navigates.
 */
function closeSidebarOnMobile(): void {
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    sidebarOpen.value = false;
  }
}

// ─── Sidebar — desktop collapse ───────────────────────────────────────────────

const COLLAPSE_KEY = 'dart_sidebar_collapsed';

/**
 * When true the sidebar shrinks to a 56 px icon-only rail on desktop.
 * Initialised from localStorage so the preference persists across navigations.
 */
const sidebarCollapsed = ref<boolean>(
  import.meta.client
    ? localStorage.getItem(COLLAPSE_KEY) === 'true'
    : false,
);

/** Persist the collapsed preference whenever it changes. */
watch(sidebarCollapsed, (val) => {
  if (import.meta.client) {
    localStorage.setItem(COLLAPSE_KEY, String(val));
  }
});

/**
 * Single toggle handler for the header trigger button.
 *
 * - Mobile  (≤ 768 px): toggles the overlay open/closed.
 * - Desktop (> 768 px): toggles the collapsed icon-rail state.
 */
function toggleSidebar(): void {
  if (typeof window !== 'undefined' && window.innerWidth <= 768) {
    sidebarOpen.value = !sidebarOpen.value;
  } else {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

const router = useRouter();

async function handleLogout(): Promise<void> {
  authStore.clearSession();
  await router.push('/login');
}
</script>

<style scoped>
/* ─── Layout shell ─────────────────────────────────────────────────────────── */

.app-shell {
  display: flex;
  min-height: 100vh;
  background-color: var(--bg-dark);
  color: var(--text-primary);
}

/* ─── Sidebar ──────────────────────────────────────────────────────────────── */

.sidebar {
  /* Fixed to the left edge, full viewport height */
  position: fixed;
  inset: 0 auto 0 0;
  width: var(--sidebar-width);
  background-color: var(--sidebar-bg);
  backdrop-filter: blur(var(--glass-blur, 20px));
  -webkit-backdrop-filter: blur(var(--glass-blur, 20px));
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  z-index: 200;
  /* Slide transition for mobile open/close */
  transition: transform 0.22s ease, width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  /* Clip content that overflows when collapsing */
  overflow: hidden;
}

/* ── Brand block ───────────────────────────────────────────────────────────── */

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  height: var(--topbar-height);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
  /* Prevent text wrapping during the width transition */
  white-space: nowrap;
}

/* Square logo mark with primary colour fill */
.brand-mark {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background-color: var(--primary);
  color: #000;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  user-select: none;
}

/* Text block: "DART" + org name */
.brand-copy {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  min-width: 0;
  transition: opacity 0.15s ease;
}

.brand-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 1.5px;
  line-height: 1.2;
}

.brand-org {
  font-size: 0.68rem;
  color: var(--text-muted);
  line-height: 1.4;
}

/* Close button — hidden on desktop, shown on mobile via @media */
.mobile-close-btn {
  display: none;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 5px;
  border-radius: var(--radius-sm);
  line-height: 0;
  flex-shrink: 0;
  transition: color 0.15s, background 0.15s;
}

.mobile-close-btn:hover {
  color: var(--text-primary);
  background: var(--hover-bg);
}

/* ── Nav body ──────────────────────────────────────────────────────────────── */

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  /* Scrollbar hidden but scroll still works */
  scrollbar-width: none;
  padding: 14px 8px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.sidebar-nav::-webkit-scrollbar {
  display: none;
}

/* Each nav group (Platform, Management, System…) */
.nav-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

/* Tiny all-caps section label */
.nav-group-label {
  margin: 0 0 6px 0;
  padding: 0 8px;
  font-size: 0.62rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--text-muted);
  user-select: none;
  transition: opacity 0.15s ease;
  white-space: nowrap;
}

/* Individual nav item — base styles shared by links and disabled spans */
.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.845rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  cursor: pointer;
  transition: background 0.14s, color 0.14s, padding 0.25s cubic-bezier(0.4, 0, 0.2, 1), justify-content 0.25s;
  user-select: none;
  line-height: 1;
  /* Prevent item from shrinking the icon */
  min-height: 32px;
  white-space: nowrap;
}

.nav-item:hover {
  background: var(--hover-bg-subtle);
  color: var(--text-primary);
  text-decoration: none;
}

/* Active / current page */
.nav-item--active {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.nav-icon {
  flex-shrink: 0;
  color: inherit;
}

/* Nav item text label */
.nav-label {
  transition: opacity 0.15s ease;
}

/* Sub-item indentation */
.nav-item--sub {
  padding-left: 32px;
  font-size: 0.8rem;
  opacity: 0.9;
}

.nav-item--sub .nav-icon {
  font-size: 0.85rem;
}

/* "Coming soon" items — dimmed, non-interactive */
.nav-item--soon {
  opacity: 0.38;
  cursor: not-allowed;
}

.nav-item--soon:hover {
  background: none;
  color: var(--text-secondary);
}

/* Small pill badge: "Soon" */
.nav-soon-tag {
  margin-left: auto;
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  padding: 2px 5px;
  border-radius: 4px;
  background: var(--hover-bg);
  color: var(--text-muted);
  flex-shrink: 0;
  white-space: nowrap;
  transition: opacity 0.15s ease;
}

/* ── Sidebar footer — user chip ────────────────────────────────────────────── */

.sidebar-footer {
  padding: 8px;
  border-top: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

/* Logout button — rendered inline in the footer */
.logout-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px;
  margin-bottom: 4px;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.14s, color 0.14s;
  white-space: nowrap;
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.logout-btn-icon {
  flex-shrink: 0;
}

/* Full-width row that looks like a user display */
.user-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px;
  border-radius: var(--radius-sm);
  min-width: 0;
  white-space: nowrap;
}

/* Avatar circle with primary-tinted initials */
.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--primary-dim);
  color: var(--primary);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid rgba(96, 165, 250, 0.15);
}

/* Text column next to avatar */
.user-meta {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  min-width: 0;
  transition: opacity 0.15s ease;
}

.user-display-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}

/* Email / org secondary line */
.user-display-sub {
  font-size: 0.67rem;
  color: var(--text-muted);
  line-height: 1.4;
}

/* ── CFS Location badge (staff only) ───────────────────────────────────────── */

.cfs-location-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  margin-bottom: 6px;
  background: var(--primary-dim);
  border: 1px solid rgba(96, 165, 250, 0.12);
  border-radius: var(--radius-sm);
  white-space: nowrap;
  overflow: hidden;
  transition: opacity 0.15s ease;
}

.cfs-location-icon {
  flex-shrink: 0;
  color: var(--primary);
}

.cfs-location-name {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--primary);
  letter-spacing: 0.2px;
}

/* ── Header theme toggle ───────────────────────────────────────────────────── */

.header-theme-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  background: var(--hover-bg);
  border: 1px solid var(--border-color);
  border-radius: 50%;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.header-theme-btn:hover {
  background: var(--primary-dim);
  color: var(--primary);
  border-color: var(--primary);
  transform: scale(1.05);
}

/* ── Mobile overlay backdrop ───────────────────────────────────────────────── */

.sidebar-overlay {
  /* Hidden on desktop — enabled by display:block on mobile via @media */
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  z-index: 150;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.22s ease;
}

/* ─── Sidebar inset (right panel) ─────────────────────────────────────────── */

.sidebar-inset {
  flex: 1;
  /* Offset content by the fixed sidebar width */
  margin-left: var(--sidebar-width);
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* Matches the sidebar width transition */
  transition: margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ─── Sticky site header ──────────────────────────────────────────────────── */

.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: var(--topbar-height);
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
}

/* Left cluster: trigger + rule + breadcrumbs */
.header-start {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Placeholder — extend with actions/avatar later */
.header-end {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Hamburger trigger — borderless icon button */
.sidebar-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  line-height: 0;
  flex-shrink: 0;
  transition: color 0.14s, background 0.14s;
}

.sidebar-trigger:hover {
  color: var(--text-primary);
  background: var(--hover-bg-subtle);
}

/* Thin vertical rule between trigger and breadcrumbs */
.header-separator {
  width: 1px;
  height: 16px;
  background-color: var(--border-color);
  flex-shrink: 0;
}

/* Breadcrumb trail */
.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
}

/* Non-current crumb link — muted */
.bc-link {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.14s;
}

.bc-link:hover {
  color: var(--text-primary);
  text-decoration: none;
}

/* Current page crumb — white, non-interactive */
.bc-current {
  color: var(--text-primary);
  font-weight: 500;
}

/* Slash separator between crumbs */
.bc-slash {
  color: var(--text-muted);
  font-size: 0.72rem;
  user-select: none;
}

/* ─── Scrollable page content ─────────────────────────────────────────────── */

.page-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DESKTOP: Collapsed sidebar (icon-only rail)
   All collapse styles are gated behind min-width: 769px so that mobile
   behaviour is completely unaffected even when the collapsed flag is true.
   ═══════════════════════════════════════════════════════════════════════════ */

@media (min-width: 769px) {

  /* Shrink the sidebar to the collapsed rail width */
  .app-shell.sidebar-collapsed .sidebar {
    width: var(--sidebar-collapsed-width);
  }

  /* Shift the main content area to match */
  .app-shell.sidebar-collapsed .sidebar-inset {
    margin-left: var(--sidebar-collapsed-width);
  }

  /* ── Hide text elements ──────────────────────────────────────────────────── */

  /* Brand text block */
  .app-shell.sidebar-collapsed .brand-copy {
    opacity: 0;
    pointer-events: none;
    /* width:0 lets the brand-mark stay centred in the narrowed header */
    flex: 0;
    min-width: 0;
    overflow: hidden;
  }

  /* Section group labels */
  .app-shell.sidebar-collapsed .nav-group-label {
    opacity: 0;
    height: 0;
    margin: 0;
    overflow: hidden;
  }

  /* Nav item text */
  .app-shell.sidebar-collapsed .nav-label {
    opacity: 0;
    width: 0;
    overflow: hidden;
  }

  /* "Soon" badge */
  .app-shell.sidebar-collapsed .nav-soon-tag {
    opacity: 0;
    width: 0;
    overflow: hidden;
  }

  /* User meta (name + email) */
  .app-shell.sidebar-collapsed .user-meta {
    opacity: 0;
    flex: 0;
    min-width: 0;
    overflow: hidden;
  }

  /* ── Centre icons inside nav items ─────────────────────────────────────── */

  .app-shell.sidebar-collapsed .nav-item {
    justify-content: center;
    padding: 8px 0;
    gap: 0;
  }

  /* ── Centre the user avatar chip ───────────────────────────────────────── */

  .app-shell.sidebar-collapsed .user-chip {
    justify-content: center;
    gap: 0;
  }

  /* ── Centre the logout icon when collapsed ─────────────────────────────── */

  .app-shell.sidebar-collapsed .logout-btn {
    justify-content: center;
    padding: 8px 0;
    gap: 0;
  }

  /* ── Centre the brand mark ─────────────────────────────────────────────── */

  .app-shell.sidebar-collapsed .sidebar-brand {
    justify-content: center;
    padding: 0;
  }
}

/* ─── Responsive: mobile ─────────────────────────────────────────────────────
   Breakpoint ≤ 768px: sidebar slides off-screen; overlay + trigger activate.
   ─────────────────────────────────────────────────────────────────────────── */

@media (max-width: 768px) {
  /* Sidebar hides off to the left */
  .sidebar {
    transform: translateX(-100%);
  }

  /* Show mobile close button inside the brand block */
  .mobile-close-btn {
    display: flex;
  }

  /* Overlay rendered (opacity still 0 until open) */
  .sidebar-overlay {
    display: block;
  }

  /* Main content takes full width on mobile */
  .sidebar-inset {
    margin-left: 0;
  }

  /* Tighter content padding on small screens */
  .page-content {
    padding: 16px;
  }

  /* ── Open state: triggered by .sidebar-open class on .app-shell ── */

  .app-shell.sidebar-open .sidebar {
    transform: translateX(0);
  }

  .app-shell.sidebar-open .sidebar-overlay {
    opacity: 1;
    pointer-events: auto;
  }
}

/* ─── Responsive: very small screens ────────────────────────────────────── */

@media (max-width: 480px) {
  .page-content {
    padding: 12px;
  }

  .site-header {
    padding: 0 12px;
  }
}

/* ─── Onboarding pill ─────────────────────────────────────────────────────── */

.onboarding-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: var(--primary-dim);
  border: 1px solid var(--primary);
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--primary);
  white-space: nowrap;
  letter-spacing: 0.2px;
  transition: opacity 0.3s ease;
  user-select: none;
}

.pill-icon {
  flex-shrink: 0;
  color: var(--primary);
}
</style>
