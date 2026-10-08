<template>
  <!-- Inline field error with a small icon. Lives inside a polite live region
       so screen readers announce it when it appears. -->
  <div :id="id" class="field-error-region" aria-live="polite">
    <p v-if="message" class="ui-error">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
      <span>{{ message }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ id?: string; message?: string }>()
</script>

<style scoped>
.field-error-region:empty { display: none; }
</style>
