<template>
  <div class="landing">

    <!-- ── Navbar ──────────────────────────────────────────────────────────── -->
    <nav class="landing-nav">
      <div class="nav-inner">
        <NuxtLink to="/" class="nav-logo">DART</NuxtLink>
        <div class="nav-links">
          <a href="#features" class="nav-link">Features</a>
          <a href="#how-it-works" class="nav-link">How It Works</a>
          <NuxtLink to="/login" class="nav-link">Log In</NuxtLink>
          <NuxtLink to="/register" class="nav-cta">Get Started</NuxtLink>
        </div>
      </div>
    </nav>

    <!-- ── Hero ────────────────────────────────────────────────────────────── -->
    <section class="hero">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="hero-content">
        <span class="hero-badge">Offline-First &middot; Real-Time Sync</span>
        <h1 class="hero-title">
          Donor Automated<br />Report
          <span class="hero-highlight">Technology</span>
        </h1>
        <p class="hero-sub">
          Streamline beneficiary registration, attendance tracking, and donor
          reporting for Child-Friendly Spaces — even without internet.
        </p>
        <div class="hero-actions">
          <NuxtLink to="/register" class="btn-primary">Create Account</NuxtLink>
          <NuxtLink to="/login" class="btn-secondary">Log In</NuxtLink>
        </div>
      </div>
      <div class="hero-visual" aria-hidden="true">
        <div class="hero-card hero-card--1">
          <div class="hc-icon hc-icon--blue">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <span class="hc-label">Beneficiaries</span>
          <span class="hc-value">1,284</span>
        </div>
        <div class="hero-card hero-card--2">
          <div class="hc-icon hc-icon--green">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <span class="hc-label">Attendance Today</span>
          <span class="hc-value">96%</span>
        </div>
        <div class="hero-card hero-card--3">
          <div class="hc-icon hc-icon--purple">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <span class="hc-label">Reports Generated</span>
          <span class="hc-value">42</span>
        </div>
      </div>
    </section>

    <!-- ── Features ────────────────────────────────────────────────────────── -->
    <section id="features" class="features">
      <div class="section-inner">
        <h2 class="section-title">Built for the Field</h2>
        <p class="section-sub">
          Everything your team needs to manage Child-Friendly Spaces efficiently.
        </p>
        <div class="features-grid">
          <div v-for="f in features" :key="f.title" class="feature-card">
            <div class="feature-icon" :style="{ background: f.bg }">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" v-html="f.icon" />
            </div>
            <h3>{{ f.title }}</h3>
            <p>{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── How it works ────────────────────────────────────────────────────── -->
    <section id="how-it-works" class="how-it-works">
      <div class="section-inner">
        <h2 class="section-title">Get Started in Minutes</h2>
        <p class="section-sub">Three simple steps to transform your program management.</p>
        <div class="steps-row">
          <div v-for="(s, i) in steps" :key="i" class="step-card">
            <span class="step-num">{{ i + 1 }}</span>
            <h3>{{ s.title }}</h3>
            <p>{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── CTA Banner ──────────────────────────────────────────────────────── -->
    <section class="cta-section">
      <div class="cta-inner">
        <h2>Ready to streamline your CFS operations?</h2>
        <p>Join organizations already using DART to deliver better outcomes.</p>
        <NuxtLink to="/register" class="btn-primary btn-lg">Get Started — It's Free</NuxtLink>
      </div>
    </section>

    <!-- ── Footer ──────────────────────────────────────────────────────────── -->
    <footer class="landing-footer">
      <div class="footer-inner">
        <span class="footer-logo">DART</span>
        <span class="footer-copy">&copy; {{ new Date().getFullYear() }} DART Inc. All rights reserved.</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false });

const features = [
  {
    title: 'Offline-First',
    desc: 'Register beneficiaries and record attendance without internet. Data syncs automatically when connectivity returns.',
    icon: '<path d="M1 1l22 22"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>',
    bg: 'var(--primary-dim)',
  },
  {
    title: 'Beneficiary Registration',
    desc: 'Capture detailed profiles with consent tracking, vulnerability flags, and caregiver information in a guided workflow.',
    icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
    bg: 'var(--success-bg)',
  },
  {
    title: 'Attendance Tracking',
    desc: 'Quick session-based attendance with real-time stats, daily summaries, and automatic report generation.',
    icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/>',
    bg: 'var(--accent-dim)',
  },
  {
    title: 'Donor Reports',
    desc: 'Auto-generated reports with breakdowns by age, gender, and session type — ready to share with donors instantly.',
    icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
    bg: 'var(--warning-bg)',
  },
  {
    title: 'Staff Management',
    desc: 'Assign staff to locations, manage roles and permissions, and track team performance across sessions.',
    icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    bg: 'var(--primary-dim)',
  },
  {
    title: 'Real-Time Dashboard',
    desc: 'Live overview of registrations, attendance, and program KPIs — personalized for admins and field staff.',
    icon: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    bg: 'var(--accent-dim)',
  },
];

const steps = [
  { title: 'Register Your Organization', desc: 'Create an account, set up your org profile, and select your donors and activities.' },
  { title: 'Configure Your CFS', desc: 'Add locations, assign staff, define session types, and set grant targets.' },
  { title: 'Start Tracking', desc: 'Register beneficiaries, record attendance, and let DART generate donor reports automatically.' },
];
</script>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────────────── */
.landing {
  min-height: 100vh;
  background: var(--bg-dark);
  color: var(--text-primary);
  overflow-x: hidden;
}

/* ── Navbar ──────────────────────────────────────────────────────────────── */
.landing-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  backdrop-filter: blur(var(--glass-blur));
  background: var(--glass-bg);
  border-bottom: 1px solid var(--border-subtle);
}
.nav-inner {
  max-width: 1140px;
  margin: 0 auto;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nav-logo {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  background: var(--gradient-brand);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-decoration: none;
}
.nav-links {
  display: flex;
  align-items: center;
  gap: 24px;
}
.nav-link {
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s;
}
.nav-link:hover {
  color: var(--text-primary);
}
.nav-cta {
  font-size: 0.875rem;
  font-weight: 600;
  padding: 8px 18px;
  border-radius: var(--radius-sm);
  background: var(--gradient-brand);
  color: #fff;
  text-decoration: none;
  transition: opacity 0.2s;
}
.nav-cta:hover {
  opacity: 0.9;
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */
.hero {
  position: relative;
  max-width: 1140px;
  margin: 0 auto;
  padding: 140px 24px 80px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: center;
}
.hero-glow {
  position: absolute;
  top: -60px;
  left: -120px;
  width: 520px;
  height: 520px;
  background: radial-gradient(circle, rgba(96, 165, 250, 0.12) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}
.hero-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--primary);
  background: var(--primary-dim);
  padding: 6px 14px;
  border-radius: 20px;
  margin-bottom: 20px;
}
.hero-title {
  font-size: 3.25rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin: 0 0 20px;
}
.hero-highlight {
  background: var(--gradient-brand);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.hero-sub {
  font-size: 1.1rem;
  line-height: 1.65;
  color: var(--text-secondary);
  max-width: 480px;
  margin: 0 0 32px;
}
.hero-actions {
  display: flex;
  gap: 14px;
}

/* ── Hero floating cards ─────────────────────────────────────────────────── */
.hero-visual {
  position: relative;
  height: 360px;
}
.hero-card {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 16px 22px;
  box-shadow: var(--shadow-card);
  animation: float 6s ease-in-out infinite;
}
.hero-card--1 { top: 20px; left: 30px; animation-delay: 0s; }
.hero-card--2 { top: 140px; right: 10px; animation-delay: 2s; }
.hero-card--3 { bottom: 20px; left: 50px; animation-delay: 4s; }
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
.hc-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.hc-icon--blue  { background: var(--primary-dim); color: var(--primary); }
.hc-icon--green { background: var(--success-bg); color: var(--success); }
.hc-icon--purple { background: var(--accent-dim); color: var(--accent); }
.hc-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.hc-value {
  font-size: 1.25rem;
  font-weight: 700;
  margin-left: auto;
}

/* ── Buttons ──────────────────────────────────────────────────────────────── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 28px;
  font-size: 0.9375rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  background: var(--gradient-brand);
  color: #fff;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
}
.btn-primary:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 28px;
  font-size: 0.9375rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  text-decoration: none;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
}
.btn-secondary:hover {
  background: var(--bg-card-hover);
  transform: translateY(-1px);
}
.btn-lg { padding: 16px 36px; font-size: 1rem; }

/* ── Sections ─────────────────────────────────────────────────────────────── */
.section-inner {
  max-width: 1140px;
  margin: 0 auto;
  padding: 0 24px;
}
.section-title {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-align: center;
  margin: 0 0 12px;
}
.section-sub {
  text-align: center;
  color: var(--text-secondary);
  max-width: 520px;
  margin: 0 auto 48px;
  font-size: 1.05rem;
  line-height: 1.6;
}

/* ── Features ─────────────────────────────────────────────────────────────── */
.features {
  padding: 80px 0;
  background: var(--bg-panel);
  border-top: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
}
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
.feature-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 28px;
  transition: border-color 0.25s, box-shadow 0.25s;
}
.feature-card:hover {
  border-color: var(--primary);
  box-shadow: var(--shadow-glow);
}
.feature-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
  color: var(--text-primary);
}
.feature-card h3 {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0 0 8px;
}
.feature-card p {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0;
}

/* ── How it works ─────────────────────────────────────────────────────────── */
.how-it-works {
  padding: 80px 0;
}
.steps-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}
.step-card {
  text-align: center;
  padding: 32px 24px;
}
.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--gradient-brand);
  color: #fff;
  font-size: 1.1rem;
  font-weight: 800;
  margin-bottom: 18px;
}
.step-card h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 10px;
}
.step-card p {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

/* ── CTA Section ──────────────────────────────────────────────────────────── */
.cta-section {
  padding: 80px 24px;
}
.cta-inner {
  max-width: 680px;
  margin: 0 auto;
  text-align: center;
  background: var(--gradient-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 56px 40px;
}
.cta-inner h2 {
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0 0 12px;
}
.cta-inner p {
  color: var(--text-secondary);
  margin: 0 0 32px;
  font-size: 1.05rem;
}

/* ── Footer ───────────────────────────────────────────────────────────────── */
.landing-footer {
  border-top: 1px solid var(--border-subtle);
  padding: 24px 0;
}
.footer-inner {
  max-width: 1140px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.footer-logo {
  font-weight: 800;
  font-size: 1.1rem;
  background: var(--gradient-brand);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.footer-copy {
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* ── Responsive ───────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .hero {
    grid-template-columns: 1fr;
    padding-top: 110px;
    padding-bottom: 40px;
  }
  .hero-title { font-size: 2.25rem; }
  .hero-visual { display: none; }
  .features-grid,
  .steps-row {
    grid-template-columns: 1fr;
  }
  .nav-links { gap: 14px; }
  .nav-link { display: none; }
  .nav-link:last-of-type { display: inline; }
}
</style>
