<template>
  <!-- Light/dark switch shared by the app, landing and auth pages.
       The choice is stored once (useTheme → localStorage "dart-theme"). -->
  <button
    class="theme-pill"
    type="button"
    :class="{ 'theme-pill--dark': isDark }"
    :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggleTheme"
  >
    <span class="theme-pill__icon"><AppIcon name="sun" :size="13" /></span>
    <span class="theme-pill__icon"><AppIcon name="moon" :size="13" /></span>
  </button>
</template>

<script setup lang="ts">
import { useTheme } from '../../composables/useTheme'

const { isDark, toggleTheme } = useTheme()
</script>

<style scoped>
.theme-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px;
  background: var(--hover-bg);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  flex-shrink: 0;
}
.theme-pill__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  color: var(--text-muted);
  transition: color 0.2s;
}
/* Light mode lights the sun; dark mode lights the moon. */
.theme-pill:not(.theme-pill--dark) .theme-pill__icon:first-child,
.theme-pill.theme-pill--dark .theme-pill__icon:last-child {
  color: var(--primary);
}
.theme-pill:not(.theme-pill--dark) {
  background: var(--primary-dim);
  border-color: var(--primary-hover);
}
.theme-pill:hover {
  border-color: var(--primary);
}
</style>
