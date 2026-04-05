<template>
  <NuxtLayout name="app" :breadcrumbs="[
    { title: 'Activities', href: '/dashboard' },
    { title: 'IGA / Livelihoods', href: '/activities/iga', current: true },
  ]">
    <div class="page-placeholder">
      <h1>IGA / Livelihoods</h1>
      <p>IGA participant tracking — coming in Sprint F7.</p>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: ['auth', 'role-guard'],
  requiredActivity: 'IGA',
})
</script>
