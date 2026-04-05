<template>
  <NuxtLayout name="app" :breadcrumbs="[
    { title: 'Activities', href: '/dashboard' },
    { title: 'Mass Awareness', href: '/activities/mass-awareness', current: true },
  ]">
    <div class="page-placeholder">
      <h1>Mass Awareness</h1>
      <p>Mass awareness events — coming in Sprint F6.</p>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: ['auth', 'role-guard'],
  requiredActivity: 'MASS_AWARENESS',
})
</script>
