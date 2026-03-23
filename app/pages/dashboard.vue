<template>
  <!--
    dashboard.vue
    ─────────────────────────────────────────────────────────────────────────────
    The main dashboard page.  Layout is applied manually via <NuxtLayout> so that
    we can pass breadcrumbs directly as a prop.

    Visible sections:
      0. Onboarding banner — org_admin only, until all 4 steps are complete
      1. Page greeting     — time-of-day salutation + today's date
      2. Stat cards        — 4 summary metrics in a responsive grid
      3. Recent reports    — compact table of the 5 most recent donor reports
  -->
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">

    <div class="dashboard-page">

      <!-- ── 0. Onboarding banner (org_admin only) ───────────────────────────── -->
      <OnboardingBanner />

      <!-- ── 1. Greeting header ──────────────────────────────────────────────── -->
      <div class="page-greeting">
        <div class="greeting-body">
          <h1 class="greeting-title">
            {{ greetingText }},
            <span class="greeting-name">{{ firstName }}</span>
          </h1>
          <p class="greeting-date">{{ todayLabel }}</p>
        </div>
      </div>

      <!-- ── 2. Stat cards ───────────────────────────────────────────────────── -->
      <!--
        4 cards in a row on desktop  → 2 × 2 on tablet  → 1 col on mobile.
        Trend is passed only where a directional indicator is meaningful.
      -->
      <div class="stats-grid">
        <DashStatCard
          label="Total Donors"
          :value="stats.totalDonors"
          sub="Registered donors"
        />

        <DashStatCard
          label="Active Projects"
          :value="stats.activeProjects"
          sub="Currently running"
        />

        <DashStatCard
          label="Reports Submitted"
          :value="stats.reportsSubmitted"
          sub="This period"
          :trend="3"
        />

        <DashStatCard
          label="Pending Reports"
          :value="stats.pendingReports"
          sub="Awaiting submission"
          :trend="-1"
        />
      </div>

      <!-- ── 3. Recent reports table ─────────────────────────────────────────── -->
      <DashRecentReports :reports="recentReports" />

    </div>

  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore }      from '../stores/auth';
import { useDashboard }      from '../composables/useDashboard';
import DashStatCard          from '../components/dashboard/DashStatCard.vue';
import DashRecentReports     from '../components/dashboard/DashRecentReports.vue';
import OnboardingBanner      from '../components/onboarding/OnboardingBanner.vue';
import type { Breadcrumb }   from '../interfaces/dashboard';

// ── Page metadata ──────────────────────────────────────────────────────────────
// Layout applied manually below so breadcrumbs can be passed as a prop.
definePageMeta({ middleware: 'auth', layout: false });

useHead({ title: 'Dashboard — DART' });

// ── Breadcrumbs ────────────────────────────────────────────────────────────────
const breadcrumbs: Breadcrumb[] = [
  { title: 'Home',      href: '/'          },
  { title: 'Dashboard', href: '/dashboard', current: true },
];

// ── Dashboard composable ───────────────────────────────────────────────────────
const {
  stats,
  recentReports,
  todayLabel, // ComputedRef<string> — e.g. "Monday, 24 March 2025"
} = useDashboard();

// ── Auth store ─────────────────────────────────────────────────────────────────
const authStore = useAuthStore();

/**
 * First name extracted from the stored user display name.
 * Falls back to "there" so "Good morning, there" still reads naturally.
 */
const firstName = computed<string>(() => {
  const name = authStore.userName ?? 'there';
  return name.split(' ')[0];
});

/**
 * Reactive greeting text based on the current hour.
 * Defined inline to avoid vue-tsc inference issues with the composable's
 * plain-function return type.  Re-evaluates if the component is kept alive
 * across a midnight boundary (edge case).
 */
const greetingText = computed<string>(() => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
});
</script>

<style scoped>
/* ── Page wrapper ─────────────────────────────────────────────────────────── */

.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1280px;
}

/* ── Greeting header ──────────────────────────────────────────────────────── */

.page-greeting {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.greeting-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.greeting-title {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 600;
  color: var(--text-secondary);
  line-height: 1.25;
}

.greeting-name {
  color: var(--text-primary);
}

.greeting-date {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-muted);
}

/* ── Stats grid ───────────────────────────────────────────────────────────── */

.stats-grid {
  display: grid;
  /* 4 equal columns on desktop */
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

/* ── Responsive: tablet (≤ 1024px) — 2 × 2 ───────────────────────────────── */

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ── Responsive: mobile (≤ 640px) — keep 2-col but tighten gap ───────────── */

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .dashboard-page {
    gap: 16px;
  }

  .greeting-title {
    font-size: 1.2rem;
  }
}

/* ── Responsive: very small (≤ 400px) — single column ────────────────────── */

@media (max-width: 400px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
