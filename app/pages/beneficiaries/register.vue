<template>
  <NuxtLayout name="app" :breadcrumbs="[
    { title: 'Beneficiaries', href: '/beneficiaries' },
    { title: 'Register', href: '/beneficiaries/register', current: true },
  ]">
    <div class="page-placeholder">
      <h1>Register Beneficiary</h1>
      <p>Registration form — coming in Sprint F3.</p>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: ['auth'],
})
</script>
