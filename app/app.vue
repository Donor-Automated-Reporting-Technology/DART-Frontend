<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <NamedExportDialog />
  </div>
</template>

<script setup lang="ts">
import NamedExportDialog from './components/reports/NamedExportDialog.vue'

// Unregister stale service workers in development to prevent cached pages
if (import.meta.dev && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const reg of registrations) {
      reg.unregister()
      console.log('[dev] Unregistered stale service worker')
    }
  })
}
</script>
