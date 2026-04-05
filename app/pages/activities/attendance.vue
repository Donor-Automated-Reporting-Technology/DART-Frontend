<template>
  <NuxtLayout name="app" :breadcrumbs="[
    { title: 'Activities', href: '/dashboard' },
    { title: 'Attendance', href: '/activities/attendance', current: true },
  ]">
    <div class="page-placeholder">
      <h1>Attendance</h1>
      <p>Daily attendance tracking — coming in Sprint F4.</p>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: ['auth', 'role-guard'],
  requiredActivity: 'CFS_ATTENDANCE',
})
</script>
