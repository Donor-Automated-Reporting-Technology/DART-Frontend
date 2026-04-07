<template>
  <NuxtLayout name="app" :breadcrumbs="[{ title: 'Activities', href: '/activities', current: true }]">
    <div class="activities-hub">

      <!-- Hero header -->
      <div class="hero">
        <div class="hero-icon-wrap">
          <AppIcon name="layers" :size="22" class="hero-icon" />
        </div>
        <div>
          <h1 class="hero-title">Projects</h1>
          <p class="hero-sub">Select a project to view its activities</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="state state--loading">
        <div class="pulse-dot" /><div class="pulse-dot" /><div class="pulse-dot" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="state state--error">
        <AppIcon name="alert-circle" :size="18" />
        <span>{{ error }}</span>
      </div>

      <!-- Project cards -->
      <div v-else-if="frameworks.length" class="card-stack">
        <NuxtLink
          v-for="fw in frameworks"
          :key="fw.id"
          :to="`/activities/${fw.id}`"
          class="project-card"
        >
          <div class="card-icon-wrap" :class="`card-icon--${fw.framework_type}`">
            <AppIcon :name="frameworkIcon(fw.framework_type)" :size="18" />
          </div>

          <div class="card-content">
            <h2 class="card-name">{{ fw.project_name }}</h2>
            <p class="card-partner">{{ fw.partner_name }}</p>
          </div>

          <span class="card-pill">{{ formatType(fw.framework_type) }}</span>

          <div class="card-arrow">
            <AppIcon name="chevron-right" :size="16" />
          </div>
        </NuxtLink>
      </div>

      <!-- Empty -->
      <div v-else class="state state--empty">
        <div class="empty-icon-wrap">
          <AppIcon name="inbox" :size="28" />
        </div>
        <p class="empty-title">No projects yet</p>
        <p class="empty-text">Ask your admin to set up a framework in Settings.</p>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { frameworkApi } from '../../services/frameworkApi'
import type { Framework } from '../../interfaces/framework'

definePageMeta({ layout: false, middleware: ['auth'] })

const frameworks = ref<Framework[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const TYPE_LABELS: Record<string, string> = {
  child_protection: 'Child Protection',
  education: 'Education',
  health: 'Health',
  wash: 'WASH',
  livelihoods: 'Livelihoods',
}

const TYPE_ICONS: Record<string, string> = {
  child_protection: 'shield',
  education: 'book-open',
  health: 'heart',
  wash: 'droplet',
  livelihoods: 'briefcase',
}

function formatType(t: string) { return TYPE_LABELS[t] ?? t }
function frameworkIcon(t: string) { return TYPE_ICONS[t] ?? 'layers' }

async function fetchFrameworks() {
  loading.value = true
  error.value = null
  try {
    const res = await frameworkApi.listFrameworks()
    frameworks.value = res.frameworks ?? []
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load projects'
  } finally {
    loading.value = false
  }
}

onMounted(fetchFrameworks)
</script>

<style scoped>
.activities-hub {
  max-width: 720px;
  padding-bottom: 48px;
}

/* ── Hero Header ─────────────────────────────────────────────────────────── */
.hero {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}

.hero-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: var(--primary-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hero-icon {
  color: var(--primary);
}

.hero-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.025em;
  line-height: 1.2;
}

.hero-sub {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 2px 0 0;
}

/* ── Loading ─────────────────────────────────────────────────────────────── */
.state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 64px 24px;
  border-radius: var(--radius-lg);
}

.state--loading {
  gap: 6px;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
  opacity: 0.4;
  animation: pulse-bounce 1.4s ease-in-out infinite;
}

.pulse-dot:nth-child(2) { animation-delay: 0.16s; }
.pulse-dot:nth-child(3) { animation-delay: 0.32s; }

@keyframes pulse-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}

.state--error {
  background: var(--error-bg);
  color: var(--error);
  font-size: 0.84rem;
  font-weight: 500;
  border-radius: var(--radius-md);
  padding: 16px 20px;
  justify-content: flex-start;
}

/* ── Cards ───────────────────────────────────────────────────────────────── */
.card-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.project-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  text-decoration: none;
  color: inherit;
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.22s ease;
  position: relative;
  overflow: hidden;
}

.project-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-md);
  border: 1.5px solid transparent;
  transition: border-color 0.2s ease;
  pointer-events: none;
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-elevated);
}

.project-card:hover::after {
  border-color: var(--primary);
}

.project-card:active {
  transform: translateY(0) scale(0.99);
}

/* icon tint circles */
.card-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.project-card:hover .card-icon-wrap {
  transform: scale(1.08);
}

.card-icon--child_protection { background: rgba(96, 165, 250, 0.12); color: #60a5fa; }
.card-icon--education { background: rgba(167, 139, 250, 0.12); color: #a78bfa; }
.card-icon--health { background: rgba(251, 113, 133, 0.12); color: #fb7185; }
.card-icon--wash { background: rgba(45, 212, 191, 0.12); color: #2dd4bf; }
.card-icon--livelihoods { background: rgba(251, 191, 36, 0.12); color: #fbbf24; }

.card-content {
  flex: 1;
  min-width: 0;
}

.card-name {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}

.card-partner {
  font-size: 0.76rem;
  color: var(--text-secondary);
  margin: 2px 0 0;
}

.card-pill {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-secondary);
  padding: 4px 10px;
  border-radius: 100px;
  background: var(--hover-bg);
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.card-arrow {
  color: var(--text-muted);
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.project-card:hover .card-arrow {
  opacity: 1;
  transform: translateX(0);
  color: var(--primary);
}

/* ── Empty ───────────────────────────────────────────────────────────────── */
.state--empty {
  flex-direction: column;
  gap: 12px;
  padding: 80px 24px;
}

.empty-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--hover-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.empty-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.empty-text {
  font-size: 0.84rem;
  color: var(--text-secondary);
  margin: 0;
}

/* ── Mobile ──────────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .hero-icon-wrap { width: 40px; height: 40px; }
  .hero-title { font-size: 1.25rem; }

  .project-card { padding: 14px 16px; gap: 12px; }
  .card-icon-wrap { width: 36px; height: 36px; border-radius: 8px; }
  .card-pill { display: none; }
  .card-arrow { opacity: 0.5; transform: translateX(0); }
}
</style>
