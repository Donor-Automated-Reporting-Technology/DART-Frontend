<template>
  <!-- WellReach mark ("Joyful W"): a child with arms raised. `bare` drops the
       rounded square for use on a coloured background. -->
  <svg :width="size" :height="size" viewBox="0 0 48 48" aria-hidden="true">
    <rect v-if="!bare" width="48" height="48" rx="13" fill="#0E7C66" />
    <path d="M9 18 L16.5 35 L24 23 L31.5 35 L39 18" fill="none" stroke="#FFFFFF" :stroke-width="bare ? 5 : 4.6" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="24" cy="12.5" :r="bare ? 4.4 : 3.8" fill="#F2A541" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number; bare?: boolean }>(), { size: 32, bare: false })
</script>
