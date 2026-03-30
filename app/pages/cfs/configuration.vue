<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="cfs-config-page">
      <div class="page-header">
        <h1 class="page-title">CFS Configuration</h1>
        <p class="page-subtitle">Configure Child Friendly Spaces settings for your organisation.</p>
      </div>

      <!-- Progress indicator -->
      <div class="progress-container">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" :style="{ width: progressPercentage + '%' }"></div>
        </div>
        <div class="progress-text">{{ progressPercentage }}% Completed</div>
      </div>

      <div class="stepper-content">
        <Step1StaffAssignment />
        <Step2GrantTargets />
        <Step3SessionTypes />
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { useCfsConfig } from '../../composables/useCfsConfig';
import Step1StaffAssignment from '../../components/cfs/Step1StaffAssignment.vue';
import Step2GrantTargets from '../../components/cfs/Step2GrantTargets.vue';
import Step3SessionTypes from '../../components/cfs/Step3SessionTypes.vue';
import type { Breadcrumb } from '../../interfaces/dashboard';

import { onMounted } from 'vue';

// ── Page metadata ──────────────────────────────────────────────────────────────
definePageMeta({ middleware: ['auth', 'role-guard'], layout: false, allowedRoles: ['org_admin'] });

useHead({ title: 'CFS Configuration — DART' });

// ── Breadcrumbs ────────────────────────────────────────────────────────────────
const breadcrumbs: Breadcrumb[] = [
  { title: 'Home',      href: '/'          },
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'CFS Config', href: '/cfs/configuration', current: true },
];

const {
  progressPercentage,
  fetchLocations,
  fetchStaffAssignments,
  fetchGrantTargets,
  fetchSessionTypes,
  cfsLocations,
  step1Completed,
  step2Completed,
  step3Completed
} = useCfsConfig();

onMounted(async () => {
  if (cfsLocations.value.length === 0) {
    await fetchLocations();
  }

  if (!step1Completed.value) {
    fetchStaffAssignments();
  }

  if (!step2Completed.value) {
    fetchGrantTargets();
  }

  if (!step3Completed.value) {
    fetchSessionTypes();
  }
});
</script>

<style scoped>
.cfs-config-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 900px;
  margin: 0 auto;
}
.page-header {
  margin-bottom: 8px;
}
.page-title {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--text-primary, #fff);
}
.page-subtitle {
  margin: 4px 0 0 0;
  font-size: 0.95rem;
  color: var(--text-muted, #aaa);
}

/* Progress Bar */
.progress-container {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
}
.progress-bar-bg {
  flex: 1;
  height: 8px;
  background: var(--bg-dark, #121212);
  border: 1px solid var(--border-subtle, #333);
  border-radius: 4px;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: var(--primary, #007bff);
  transition: width 0.3s ease;
}
.progress-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--primary, #007bff);
  min-width: 45px;
  text-align: right;
}

.stepper-content {
  display: flex;
  flex-direction: column;
}
</style>
