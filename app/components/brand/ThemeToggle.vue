<template>
  <!-- Light/dark switch shared by the app, landing and auth pages. The choice
       is stored once (useTheme → localStorage "dart-theme"). Shows a moon in
       light mode and a sun in dark mode. -->
  <button
    class="theme-btn"
    type="button"
    :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggleTheme"
  >
    <svg class="icon icon-moon" :class="{ hidden: isDark }" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z" />
    </svg>
    <svg class="icon icon-sun" :class="{ hidden: !isDark }" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { useTheme } from '../../composables/useTheme'

const { isDark, toggleTheme } = useTheme()
</script>

<style scoped>
.theme-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
  background: var(--bg-panel, transparent);
  color: var(--text-primary, currentColor);
  cursor: pointer;
  transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
}
.theme-btn:hover {
  border-color: var(--primary, #0E7C66);
  color: var(--primary, #0E7C66);
}
.theme-btn:focus-visible {
  outline: 2px solid var(--primary, #0E7C66);
  outline-offset: 2px;
}
.icon.hidden {
  display: none;
}
@media (prefers-reduced-motion: reduce) {
  .theme-btn { transition: none; }
}
</style>
