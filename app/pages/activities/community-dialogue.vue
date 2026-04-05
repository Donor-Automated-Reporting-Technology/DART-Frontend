<template>
  <NuxtLayout name="app" :breadcrumbs="[
    { title: 'Activities', href: '/dashboard' },
    { title: 'Community Dialogue', href: '/activities/community-dialogue', current: true },
  ]">
    <div class="page-placeholder">
      <h1>Community Dialogue</h1>
      <p>Community dialogue sessions — coming in Sprint F6.</p>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: ['auth', 'role-guard'],
  requiredActivity: 'COMMUNITY_DIALOGUE',
})
</script>
