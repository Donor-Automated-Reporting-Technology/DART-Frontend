<template>
  <NuxtLayout name="app" :breadcrumbs="[{ title: 'Staff', href: '/staff', current: true }]">
    <div class="page-placeholder">
      <h1>Staff Management</h1>
      <p>Staff management — coming in Sprint F5.</p>
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
