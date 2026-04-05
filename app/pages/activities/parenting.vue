<template>
  <NuxtLayout name="app" :breadcrumbs="[
    { title: 'Activities', href: '/dashboard' },
    { title: 'Parenting', href: '/activities/parenting', current: true },
  ]">
    <div class="page-placeholder">
      <h1>Parenting Sessions</h1>
      <p>Parenting cohort sessions — coming in Sprint F6.</p>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: ['auth', 'role-guard'],
  requiredActivity: 'PARENTING',
})
</script>
