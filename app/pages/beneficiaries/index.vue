<template>
  <NuxtLayout name="app" :breadcrumbs="[{ title: 'Beneficiaries', href: '/beneficiaries', current: true }]">
    <div class="page-placeholder">
      <h1>Beneficiaries</h1>
      <p>Beneficiary registry — coming in Sprint F3.</p>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: ['auth'],
})
</script>
