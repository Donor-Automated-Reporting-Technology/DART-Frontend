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

        <!--
          PSS module tiles.
          DART-71 (UX): "Coming soon" tiles are hidden until each feature
          ships, per UX guide §empty-states. New tiles are added here as
          their respective tickets land (Activity Library, Today's Sessions,
          Reports).
        -->
        <div class="grid">
          <button
            type="button"
            class="tile tile--action"
            @click="goTo(`/activities/${frameworkId}/pss/setup`)"
          >
            <AppIcon name="calendar" :size="20" class="tile-icon" />
            <h2 class="tile-title">New Schedule</h2>
            <p class="tile-sub">Build a weekly schedule for your CFS location and age group.</p>
            <span class="tile-pill tile-pill--ready">Available</span>
          </button>
        </div>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { frameworkApi } from '../../../../services/frameworkApi'

definePageMeta({ layout: false, middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const frameworkId = route.params.id as string

function goTo(path: string) {
  router.push(path)
}

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
/*
  DART-71: token sweep. All colours come from app/assets/css/main.css
  via the canonical tokens listed in design-system/DART_UX_REFERENCE.md
  §3. No hex literals, no fallbacks — see UX guide §4 for why fallbacks
  silently break dark mode. Single-accent rule: --primary only.
*/
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
  color: var(--primary);
}
.hero-title {
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--text-primary);
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
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  /* ≥44px tap target on the action tile (Apple HIG); 140 covers it */
  min-height: 140px;
}

.tile-icon {
  color: var(--primary);
}
.tile-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 4px 0 0;
}
.tile-sub {
  font-size: 0.82rem;
  color: var(--text-secondary);
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
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--bg-surface);
  color: var(--text-muted);
}
.tile-pill--ready {
  background: var(--primary-dim);
  color: var(--primary);
}

.tile--action {
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  transition: border-color 120ms, transform 120ms, box-shadow 120ms;
}
.tile--action:hover {
  border-color: var(--primary);
  transform: translateY(-1px);
  box-shadow: var(--shadow-elevated);
}
.tile--action:focus-visible {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.state {
  padding: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-muted);
}
.state--error { color: var(--error); }

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: pulse 1.4s infinite;
}
.pulse-dot:nth-child(2) { animation-delay: 0.2s; }
.pulse-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes pulse { 0%,80%,100% { opacity: 0.3; } 40% { opacity: 1; } }
</style>
