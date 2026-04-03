<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="registration-page">
      <div class="page-header">
        <h1 class="page-title">Registration</h1>
        <p class="page-subtitle">Add a new beneficiary to your active Child Friendly Space.</p>
      </div>

      <BeneficiaryRegistrationForm />
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import BeneficiaryRegistrationForm from '../../components/cfs/BeneficiaryRegistrationForm.vue';
import type { Breadcrumb } from '../../interfaces/dashboard';

definePageMeta({ middleware: ['auth', 'role-guard'], layout: false, allowedRoles: ['facilitator', 'case_worker'] });
useHead({ title: 'Beneficiary Registration — DART' });

const breadcrumbs: Breadcrumb[] = [
  { title: 'Activities', href: '/cfs' },
  { title: 'Child Friendly Spaces', href: '/cfs' },
  { title: 'Registration', href: '/cfs/registration', current: true },
];
</script>

<style scoped>
.registration-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 900px;
  margin: 0 auto;
}
.page-header {
  margin-bottom: 16px;
  text-align: center;
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
</style>
