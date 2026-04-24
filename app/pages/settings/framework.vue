<script setup lang="ts">
// Legacy route — settings restructure moved Framework under Projects.
definePageMeta({
  layout: false,
  middleware: ['auth'],
})
await navigateTo('/settings/projects', { redirectCode: 301 })
</script>

<template>
  <div />
</template>
