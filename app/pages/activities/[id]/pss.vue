<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="pss-page">
      <!-- Loading -->
      <div v-if="loading" class="state state--loading">
        <div class="pulse-dot" /><div class="pulse-dot" /><div class="pulse-dot" />
      </div>

      <!-- Not allowed (non-CP framework) -->
      <div v-else-if="notAllowed" class="state state--error">
        <AppIcon name="alert-circle" :size="18" />
        <span>PSS is only available for Child Protection projects.</span>
      </div>

      <template v-else>
        <!-- Hero -->
        <div class="hero">
          <AppIcon name="puzzle" :size="24" class="hero-icon" />
          <div>
            <h1 class="hero-title">Structured PSS Activities</h1>
            <p class="hero-sub">Plan and run UNICEF psychosocial support sessions</p>
          </div>
        </div>

        <!-- Empty placeholder grid -->
        <div class="grid">
          <div class="tile tile--coming">
            <AppIcon name="library" :size="20" class="tile-icon" />
            <h2 class="tile-title">Activity Library</h2>
            <p class="tile-sub">Browse the 69 built-in PSS sub-activities and your custom ones.</p>
            <span class="tile-pill">Coming soon</span>
          </div>

          <div class="tile tile--coming">
            <AppIcon name="calendar" :size="20" class="tile-icon" />
            <h2 class="tile-title">Schedules</h2>
            <p class="tile-sub">Build weekly schedules per CFS location and age group.</p>
            <span class="tile-pill">Coming soon</span>
          </div>

          <div class="tile tile--coming">
            <AppIcon name="check-square" :size="20" class="tile-icon" />
            <h2 class="tile-title">Today's Sessions</h2>
            <p class="tile-sub">Run today's scheduled PSS sub-activities and mark delivery.</p>
            <span class="tile-pill">Coming soon</span>
          </div>

          <div class="tile tile--coming">
            <AppIcon name="bar-chart-2" :size="20" class="tile-icon" />
            <h2 class="tile-title">Reports</h2>
            <p class="tile-sub">Coverage and delivery analytics for PSS programmes.</p>
            <span class="tile-pill">Coming soon</span>
          </div>
        </div>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { frameworkApi } from '../../../services/frameworkApi'

definePageMeta({ layout: false, middleware: ['auth'] })

const route = useRoute()
const frameworkId = route.params.id as string

const loading = ref(true)
const notAllowed = ref(false)

const breadcrumbs = computed(() => [
  { title: 'Projects', href: '/activities' },
  { title: 'Project', href: `/activities/${frameworkId}` },
  { title: 'PSS', href: `/activities/${frameworkId}/pss`, current: true },
])

onMounted(async () => {
  try {
    const res = await frameworkApi.listFrameworks()
    const fw = (res.frameworks ?? []).find((f: any) => f.id === frameworkId)
    notAllowed.value = !fw || fw.framework_type !== 'child_protection'
  } catch {
    notAllowed.value = true
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.pss-page {
  max-width: 960px;
  padding-bottom: 48px;
}

.hero {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}
.hero-icon {
  color: var(--accent, #4f46e5);
}
.hero-title {
  font-size: 1.4rem;
  font-weight: 600;
  margin: 0;
}
.hero-sub {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 2px 0 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.tile {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 18px;
  background: var(--surface, #fff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 12px;
  min-height: 140px;
}

.tile-icon {
  color: var(--accent, #4f46e5);
}
.tile-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 4px 0 0;
}
.tile-sub {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.4;
}
.tile-pill {
  position: absolute;
  top: 14px;
  right: 14px;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--muted-bg, #f3f4f6);
  color: var(--text-muted);
}
.tile--coming {
  opacity: 0.85;
}

.state {
  padding: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-muted);
}
.state--error { color: #b91c1c; }
.pulse-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--text-muted); animation: pulse 1.4s infinite;
}
.pulse-dot:nth-child(2) { animation-delay: 0.2s; }
.pulse-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes pulse { 0%,80%,100% { opacity: 0.3; } 40% { opacity: 1; } }
</style>
