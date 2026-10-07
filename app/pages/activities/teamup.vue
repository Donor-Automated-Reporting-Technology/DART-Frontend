<template>
  <CohortLegacyRedirect program="teamup" />
</template>

<script setup lang="ts">
definePageMeta({ layout: false, middleware: ['auth'] })
</script>
