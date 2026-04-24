<template>
  <nav class="dash-breadcrumb" aria-label="Dashboard navigation">
    <NuxtLink to="/dashboard" class="crumb-home" title="Dashboard home">
      <AppIcon name="home" :size="14" />
    </NuxtLink>
    <span class="crumb-sep">
      <AppIcon name="chevron-right" :size="12" />
    </span>
    <template v-for="(crumb, i) in crumbs" :key="crumb.href">
      <NuxtLink
        v-if="!crumb.current"
        :to="crumb.href"
        class="crumb-link"
      >
        {{ crumb.title }}
      </NuxtLink>
      <span v-else class="crumb-current">{{ crumb.title }}</span>
      <span v-if="i < crumbs.length - 1" class="crumb-sep">
        <AppIcon name="chevron-right" :size="12" />
      </span>
    </template>
  </nav>
</template>

<script setup lang="ts">
import AppIcon from '../interfaces/AppIcon.vue'

export interface BreadcrumbItem {
  title: string
  href: string
  current?: boolean
}

defineProps<{ crumbs: BreadcrumbItem[] }>()
</script>

<style scoped>
.dash-breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  margin-bottom: 20px;
  padding: 10px 16px;
  background: var(--surface-secondary, var(--bg-input, rgba(0,0,0,0.02)));
  border: 1px solid var(--border-subtle, rgba(0,0,0,0.06));
  border-radius: var(--radius-md, 12px);
}

.crumb-home {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted, #AEAEB2);
  text-decoration: none;
  transition: color 0.15s;
}
.crumb-home:hover {
  color: var(--primary, #6366F1);
}

.crumb-link {
  color: var(--primary, #6366F1);
  text-decoration: none;
  transition: color 0.15s;
}
.crumb-link:hover {
  color: var(--primary-700, #4338CA);
  text-decoration: underline;
}

.crumb-current {
  color: var(--text-primary, #1D1D1F);
  font-weight: 600;
}

.crumb-sep {
  color: var(--text-muted, #AEAEB2);
  display: flex;
  align-items: center;
  opacity: 0.5;
}
</style>
