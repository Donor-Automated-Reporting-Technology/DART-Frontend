<template>
  <NuxtLayout name="app" :breadcrumbs="[
    { title: 'Activities', href: '/dashboard' },
    { title: 'Case Management', href: '/activities/case-management', current: true },
  ]">
    <div class="page-placeholder">
      <h1>Case Management</h1>
      <p>Case management workflow — coming in Sprint F7.</p>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: ['auth', 'role-guard'],
  requiredActivity: 'CASE_MANAGEMENT',
})
</script>
