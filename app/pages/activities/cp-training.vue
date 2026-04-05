<template>
  <NuxtLayout name="app" :breadcrumbs="[
    { title: 'Activities', href: '/dashboard' },
    { title: 'CP Training', href: '/activities/cp-training', current: true },
  ]">
    <div class="page-placeholder">
      <h1>CP Training</h1>
      <p>CP training events — coming in Sprint F7.</p>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: ['auth', 'role-guard'],
  requiredActivity: 'CP_TRAINING',
})
</script>
