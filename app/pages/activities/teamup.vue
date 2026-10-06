<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Projects', href: '/activities' },
      { title: 'TeamUp', href: '/activities/teamup', current: true },
    ]"
  >
    <div class="tu-page">
      <div v-if="!notFound" class="tu-stack"><div class="tu-skeleton" /></div>
      <div v-else class="tu-card">
        <strong>TeamUp is not switched on</strong>
        <span class="tu-muted">In Settings → Projects, open a logframe output and use “Add activity” with the TeamUp module.</span>
        <NuxtLink to="/activities" class="tu-btn">Go to projects</NuxtLink>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
/**
 * Legacy entry point (sidebar / activity config link to /activities/teamup).
 * Finds the project that has TeamUp switched on and redirects to its hub.
 */
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { frameworkApi } from '../../services/frameworkApi'
import { isTeamUpActivity } from '../../services/teamupApi'

definePageMeta({ layout: false, middleware: ['auth'] })

const router = useRouter()
const notFound = ref(false)

onMounted(async () => {
  try {
    const { frameworks } = await frameworkApi.listFrameworks()
    for (const fw of frameworks ?? []) {
      const acts: any[] = ((await frameworkApi.getActivities(fw.id)) as any).activities ?? []
      const teamup = acts.find(isTeamUpActivity)
      if (teamup) {
        await router.replace(`/activities/${fw.id}/teamup?fa=${teamup.id}`)
        return
      }
    }
  } catch {
    // fall through to the "not switched on" message
  }
  notFound.value = true
})
</script>
