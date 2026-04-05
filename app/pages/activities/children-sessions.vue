<template>
  <NuxtLayout name="app" :breadcrumbs="[
    { title: 'Activities', href: '/dashboard' },
    { title: 'Children Sessions', href: '/activities/children-sessions', current: true },
  ]">
    <div class="page-placeholder">
      <h1>Children Sessions</h1>
      <p>CP awareness topic tracking — coming in Sprint F4.</p>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: ['auth', 'role-guard'],
  requiredActivity: 'CHILDREN_SESSIONS',
})
</script>
