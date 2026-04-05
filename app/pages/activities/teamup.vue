<template>
  <NuxtLayout name="app" :breadcrumbs="[
    { title: 'Activities', href: '/dashboard' },
    { title: 'TeamUp', href: '/activities/teamup', current: true },
  ]">
    <div class="page-placeholder">
      <h1>TeamUp</h1>
      <p>Cohort-based TeamUp sessions — coming in Sprint F4.</p>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: ['auth', 'role-guard'],
  requiredActivity: 'TEAMUP',
})
</script>
