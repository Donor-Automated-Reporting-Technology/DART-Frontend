<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Projects', href: '/activities' },
      { title: cfg.label, href: route.fullPath, current: true },
    ]"
  >
    <div class="tu-page">
      <div v-if="!notFound" class="tu-stack"><div class="tu-skeleton" /></div>
      <div v-else class="tu-card">
        <strong>{{ cfg.label }} is not switched on</strong>
        <span class="tu-muted">In Settings → Projects, open a logframe output and use “Add activity” with the {{ cfg.label }} module.</span>
        <NuxtLink to="/activities" class="tu-btn">Go to projects</NuxtLink>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
/**
 * Old entry points (/activities/teamup, /activities/parenting, …) from the
 * sidebar and activity config: find the project that runs this programme and
 * open its hub.
 */
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { frameworkApi } from '../../services/frameworkApi'
import { cohortProgram, cohortProgramOf, type CohortProgramKey } from '../../utils/cohortPrograms'

const props = defineProps<{ program: CohortProgramKey }>()
const cfg = cohortProgram(props.program)
const route = useRoute()
const router = useRouter()
const notFound = ref(false)

onMounted(async () => {
  try {
    const { frameworks } = await frameworkApi.listFrameworks()
    for (const fw of frameworks ?? []) {
      const acts: any[] = ((await frameworkApi.getActivities(fw.id)) as any).activities ?? []
      const act = acts.find(a => cohortProgramOf(a)?.key === props.program)
      if (act) {
        await router.replace(`/activities/${fw.id}/${cfg.route}?fa=${act.id}`)
        return
      }
    }
  } catch {
    // fall through to the "not switched on" message
  }
  notFound.value = true
})
</script>
