<template>
  <!-- Shared frame for login and register: a dark brand panel on the left
       (desktop only) and a calm, compact form area on the right. -->
  <div class="auth">
    <aside class="brand-panel" aria-hidden="true">
      <div class="glow glow-teal" />
      <div class="glow glow-amber" />
      <NuxtLink to="/" class="brand" tabindex="-1">
        <WellReachMark :size="34" />
        <span class="wordmark">Well<span>Reach</span></span>
      </NuxtLink>

      <div class="panel-middle">
      <div class="panel-copy">
        <h2>{{ headline }}</h2>
        <p>{{ lead }}</p>
      </div>

      <!-- A glimpse of the product: today's field work, synced -->
      <div class="glass-card">
        <div class="card-top">
          <span class="pill"><span class="dot" />Synced just now</span>
          <span class="card-meta">Today</span>
        </div>
        <div class="card-stat"><strong>48</strong> children attended</div>
        <div class="card-row"><span>PSS sessions</span><span>3 of 3</span></div>
        <div class="track"><div class="fill" style="width: 100%" /></div>
        <div class="card-row"><span>TeamUp groups</span><span>2 of 3</span></div>
        <div class="track"><div class="fill amber" style="width: 66%" /></div>
      </div>
      </div>

      <p class="panel-foot">Trusted reports. More children reached.</p>
    </aside>

    <main class="form-side">
      <div class="form-top">
        <NuxtLink to="/" class="back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
          Home
        </NuxtLink>
        <ThemeToggle />
      </div>

      <div class="form-wrap" :class="{ wide }">
        <NuxtLink to="/" class="mobile-brand" aria-label="WellReach home">
          <WellReachMark :size="40" />
        </NuxtLink>
        <slot />
      </div>

      <p class="copyright">© {{ year }} WellReach</p>
    </main>
  </div>
</template>

<script setup lang="ts">
import WellReachMark from './WellReachMark.vue'
import ThemeToggle from './ThemeToggle.vue'

withDefaults(defineProps<{ headline: string; lead: string; wide?: boolean }>(), { wide: false })

const year = new Date().getFullYear()

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap' },
  ],
})
</script>

<style scoped>
.auth {
  min-height: 100vh;
  display: flex;
  background: var(--bg-dark);
  font-family: Manrope, system-ui, sans-serif;
}

/* Brand panel (always dark, like the landing page's bands) */
.brand-panel {
  overflow: hidden;
  flex: 0 0 44%;
  max-width: 620px;
  /* Stays in view while a long form (register) scrolls. */
  position: sticky;
  top: 0;
  height: 100vh;
  align-self: flex-start;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 40px;
  padding: 40px 48px;
  box-sizing: border-box;
  background: #0E1214;
  color: #fff;
}
.glow { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; }
.glow-teal { width: 520px; height: 520px; left: -160px; top: -180px; background: rgba(14, 124, 102, 0.35); }
.glow-amber { width: 380px; height: 380px; right: -140px; bottom: -120px; background: rgba(242, 165, 65, 0.12); }
.brand { position: relative; display: inline-flex; align-items: center; gap: 10px; text-decoration: none; }
.wordmark { font-family: Sora, sans-serif; font-weight: 800; font-size: 20px; letter-spacing: -0.02em; color: #fff; }
.wordmark span { color: #7FD1BC; }
.panel-middle { position: relative; display: flex; flex-direction: column; gap: 36px; }
.panel-copy { position: relative; }
.panel-copy h2 { margin: 0; font-family: Sora, sans-serif; font-weight: 600; font-size: 30px; line-height: 1.15; letter-spacing: -0.02em; color: #fff; }
.panel-copy p { margin: 12px 0 0; max-width: 360px; font-size: 16px; line-height: 1.6; color: #C3C9C8; }

.glass-card {
  position: relative;
  max-width: 340px;
  padding: 20px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 24px 60px rgba(0, 0, 0, 0.35);
  font-size: 13px;
  color: #DADFDE;
}
.card-top { display: flex; justify-content: space-between; align-items: center; }
.pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px 4px 8px; border-radius: 999px; background: rgba(127, 209, 188, 0.14); color: #7FD1BC; font-size: 11px; font-weight: 700; line-height: 1; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: #7FD1BC; box-shadow: 0 0 8px #7FD1BC; }
.card-meta { color: #8D9795; font-size: 12px; }
.card-stat { margin: 16px 0 14px; color: #C3C9C8; }
.card-stat strong { font-family: Sora, sans-serif; font-size: 28px; color: #fff; margin-right: 6px; }
.card-row { display: flex; justify-content: space-between; margin-top: 10px; }
.track { height: 5px; margin-top: 6px; border-radius: 99px; background: rgba(255, 255, 255, 0.1); }
.fill { height: 5px; border-radius: 99px; background: #7FD1BC; }
.fill.amber { background: #F2A541; }
.panel-foot { position: relative; margin: 0; font-size: 13px; color: #8D9795; }

/* Form side */
.form-side { flex: 1; min-width: 0; display: flex; flex-direction: column; padding: 24px 32px; box-sizing: border-box; }
.form-top { display: flex; justify-content: space-between; align-items: center; }
.back { display: inline-flex; align-items: center; gap: 6px; color: var(--text-secondary); text-decoration: none; font-size: 14px; font-weight: 600; }
.back:hover { color: var(--text-primary); }
.form-wrap { flex: 1; width: 100%; max-width: 380px; margin: 0 auto; display: flex; flex-direction: column; justify-content: center; padding: 32px 0; }
.form-wrap.wide { max-width: 520px; }
.mobile-brand { display: none; margin-bottom: 20px; }
.copyright { margin: 0; text-align: center; font-size: 12px; color: var(--text-muted, var(--text-secondary)); }

@media (max-width: 900px) {
  .brand-panel { display: none; }
  .mobile-brand { display: inline-flex; }
  .form-side { padding: 20px; }
}
</style>
