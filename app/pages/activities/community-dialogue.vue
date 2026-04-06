<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Activities', href: '/activities' },
      { title: 'Community Dialogue', href: '/activities/community-dialogue', current: true },
    ]"
  >
    <div class="coming-soon-page">
      <div class="coming-soon-card">
        <div class="coming-soon-icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h1 class="coming-soon-title">Community Dialogue</h1>
        <p class="coming-soon-desc">Community dialogue session tracking</p>
        <div class="coming-soon-badge">Coming Soon</div>
        <p class="coming-soon-note">
          This feature is not yet available in the current version.<br />
          Only <strong>Daily Attendance</strong> is active for now.
        </p>
        <NuxtLink to="/activities/attendance" class="btn-primary">
          Go to Attendance
        </NuxtLink>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: false, middleware: ['auth'] })
</script>

<style scoped>
.coming-soon-page {
  display: flex;
  justify-content: center;
  padding: 40px 16px;
}

.coming-soon-card {
  text-align: center;
  max-width: 420px;
  padding: 48px 32px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
}

.coming-soon-icon {
  color: var(--text-muted);
  margin-bottom: 20px;
}

.coming-soon-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 6px;
}

.coming-soon-desc {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0 0 20px;
}

.coming-soon-badge {
  display: inline-block;
  padding: 4px 14px;
  background: color-mix(in srgb, var(--warning) 12%, transparent);
  color: var(--warning);
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 10px;
  margin-bottom: 16px;
}

.coming-soon-note {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin: 0 0 20px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
}

.btn-primary:hover {
  opacity: 0.9;
}
</style>
