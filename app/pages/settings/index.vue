<template>
  <NuxtLayout name="app" :breadcrumbs="[{ title: 'Settings', href: '/settings', current: true }]">
    <div class="page-placeholder">
      <h1>Settings</h1>
      <p>Organization settings — coming in Sprint F2.</p>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: ['auth', 'role-guard'],
  allowedRoles: ['org_admin', 'program_manager'],
})
</script>
