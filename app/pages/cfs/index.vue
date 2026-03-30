<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="cfs-dashboard">
      <div class="dashboard-header">
        <h1 class="page-title">Child Friendly Spaces</h1>
        <p class="page-subtitle">
          Safe structured spaces providing PSS and recreational activities for children
        </p>
      </div>

      <div class="dashboard-cards">
        <!-- Configuration Card — Admin only -->
        <NuxtLink v-if="isAdmin" to="/cfs/configuration" class="dashboard-card">
          <div class="card-icon">
            <AppIcon name="settings" :size="24" />
          </div>
          <div class="card-content">
            <h3 class="card-title">Configuration</h3>
            <p class="card-description">
              Configure CFS locations, grant targets, and session types
            </p>
          </div>
          <div class="card-arrow">
            <AppIcon name="chevron-right" :size="20" />
          </div>
        </NuxtLink>

        <!-- Staff Management Card — Admin only -->
        <NuxtLink v-if="isAdmin" to="/cfs/staff-management" class="dashboard-card">
          <div class="card-icon">
            <AppIcon name="users" :size="24" />
          </div>
          <div class="card-content">
            <h3 class="card-title">Staff Management</h3>
            <p class="card-description">
              Create staff accounts and manage CFS location assignments
            </p>
          </div>
          <div class="card-arrow">
            <AppIcon name="chevron-right" :size="20" />
          </div>
        </NuxtLink>

        <!-- Registration Card — Staff only -->
        <NuxtLink v-if="isStaff" to="/cfs/registration" class="dashboard-card">
          <div class="card-icon">
            <AppIcon name="user-plus" :size="24" />
          </div>
          <div class="card-content">
            <h3 class="card-title">Registration</h3>
            <p class="card-description">
              Register new beneficiaries for CFS programs
            </p>
          </div>
          <div class="card-arrow">
            <AppIcon name="chevron-right" :size="20" />
          </div>
        </NuxtLink>

        <!-- Attendance Card — Staff only -->
        <NuxtLink v-if="isStaff" to="/cfs/attendance" class="dashboard-card">
          <div class="card-icon">
            <AppIcon name="check-square" :size="24" />
          </div>
          <div class="card-content">
            <h3 class="card-title">Attendance</h3>
            <p class="card-description">
              Record session attendance for CFS beneficiaries
            </p>
          </div>
          <div class="card-arrow">
            <AppIcon name="chevron-right" :size="20" />
          </div>
        </NuxtLink>

        <!-- Analytics Card -->
        <NuxtLink v-if="isStaff" to="/dashboard" class="dashboard-card">
          <div class="card-icon">
            <AppIcon name="bar-chart" :size="24" />
          </div>
          <div class="card-content">
            <h3 class="card-title">Analytics</h3>
            <p class="card-description">
              View your location's reach, attendance, and activity frequency
            </p>
          </div>
          <div class="card-arrow">
            <AppIcon name="chevron-right" :size="20" />
          </div>
        </NuxtLink>

        <!-- Reports Card (Coming Soon) -->
        <div class="dashboard-card dashboard-card--disabled">
          <div class="card-icon">
            <AppIcon name="file-text" :size="24" />
          </div>
          <div class="card-content">
            <h3 class="card-title">Reports</h3>
            <p class="card-description">
              Generate and export CFS activity reports
            </p>
          </div>
          <span class="card-badge">Soon</span>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '../../stores/auth';
import AppIcon from '../../components/interfaces/AppIcon.vue';
import type { Breadcrumb } from '../../interfaces/dashboard';

definePageMeta({ middleware: 'auth', layout: false });
useHead({ title: 'Child Friendly Spaces — DART' });

const authStore = useAuthStore();

/** Check if user is admin (org_admin) */
const isAdmin = computed(() => authStore.userRole === 'org_admin');

/** Check if user is staff (facilitator, case_worker) */
const isStaff = computed(() =>
  authStore.userRole === 'facilitator' || authStore.userRole === 'case_worker'
);

const breadcrumbs: Breadcrumb[] = [
  { title: 'Activities', href: '/cfs' },
  { title: 'Child Friendly Spaces', href: '/cfs', current: true },
];
</script>

<style scoped>
.cfs-dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0;
}

.dashboard-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
}

.dashboard-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s ease;
  position: relative;
}

.dashboard-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.dashboard-card--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dashboard-card--disabled:hover {
  border-color: var(--border-color);
  transform: none;
  box-shadow: none;
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: var(--primary-dim);
  border-radius: var(--radius-sm);
  color: var(--primary);
  flex-shrink: 0;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
}

.card-description {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.card-arrow {
  color: var(--text-muted);
  flex-shrink: 0;
}

.card-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .dashboard-cards {
    grid-template-columns: 1fr;
  }

  .page-title {
    font-size: 1.5rem;
  }
}
</style>
