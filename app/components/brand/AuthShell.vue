<template>
  <!-- Shared frame for login and register: one centred column on a plain
       theme background (with a faint grid), so switching between the two
       feels like the same screen. -->
  <div class="auth">
    <svg class="grid" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="auth-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0H0V32" fill="none" stroke="currentColor" stroke-width="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#auth-grid)" />
    </svg>

    <header class="top">
      <NuxtLink to="/" class="back ui-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
        Home
      </NuxtLink>
      <ThemeToggle />
    </header>

    <main class="column">
      <div class="intro">
        <NuxtLink to="/" class="logo" aria-label="WellReach home">
          <WellReachMark :size="40" />
        </NuxtLink>
        <h1 class="title">{{ title }}</h1>
        <p class="subtitle">{{ subtitle }}</p>
      </div>

      <div class="card">
        <slot />
      </div>

      <p v-if="$slots.switch" class="switch">
        <slot name="switch" />
      </p>
    </main>

    <p class="copyright">© {{ year }} WellReach</p>
  </div>
</template>

<script setup lang="ts">
import WellReachMark from './WellReachMark.vue'
import ThemeToggle from './ThemeToggle.vue'

defineProps<{ title: string; subtitle: string }>()

const year = new Date().getFullYear()

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;600&family=Sora:wght@600&display=swap' },
  ],
})
</script>

<style scoped>
.auth {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 16px 24px 24px;
  box-sizing: border-box;
  background: var(--bg-dark);
  color: var(--text-primary);
  font-family: Manrope, system-ui, sans-serif;
}

/* The one background detail: a faint grid in the theme's subtle border colour. */
.grid {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  color: var(--border-subtle);
  pointer-events: none;
}
[data-theme='light'] .grid { color: var(--border-color); }

.top {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 48px;
}
.back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  text-decoration: none;
}
.back:hover { text-decoration: underline; }

.column {
  position: relative;
  flex: 1;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  padding: 48px 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.intro { text-align: center; margin-bottom: 32px; }
.logo { display: inline-flex; border-radius: 12px; }
.logo:focus-visible { outline: 2px solid var(--primary); outline-offset: 4px; }
.title {
  margin: 24px 0 0;
  font-family: Sora, system-ui, sans-serif;
  font-size: 26px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.015em;
  color: var(--text-primary);
}
.subtitle {
  margin: 8px 0 0;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.5;
  color: var(--text-quiet);
}

/* Plain surface, thin border, one soft neutral shadow. */
.card {
  padding: 32px;
  border-radius: 16px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}

.switch {
  margin: 24px 0 0;
  text-align: center;
  font-size: 14px;
  font-weight: 400;
  color: var(--text-quiet);
}

.copyright {
  position: relative;
  margin: 0;
  text-align: center;
  font-size: 12px;
  color: var(--text-quiet);
}

@media (max-width: 520px) {
  .auth { padding: 8px 16px 16px; }
  .column { padding: 32px 0; }
  .card { padding: 24px; }
  .title { font-size: 24px; }
}
</style>
