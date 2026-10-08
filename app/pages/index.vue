<template>
  <div class="lp">
    <!-- ═══ Hero: light grey with frosted glass ═══ -->
    <div class="hero">
      <div class="glow glow-a" style="width: 560px; height: 560px; left: -180px; top: -240px" />
      <div class="glow glow-b" style="width: 520px; height: 520px; right: -120px; top: 140px" />
      <div class="glow glow-c" style="width: 420px; height: 420px; right: 28%; top: 40px" />

      <header class="wrap nav">
        <a href="#top" class="brand" aria-label="WellReach home">
          <WellReachMark :size="36" />
          <span class="wordmark">Well<span>Reach</span></span>
        </a>
        <nav aria-label="Main" class="nav-links glass-light">
          <a href="#problem">Why</a>
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#contact">Contact</a>
        </nav>
        <div class="nav-actions">
          <ThemeToggle class="nav-theme" />
          <NuxtLink to="/register" class="btn btn-primary">Get started</NuxtLink>
        </div>
      </header>

      <section id="top" class="wrap hero-body">
        <div class="hero-copy">
          <span class="pill glass-light"><span class="pill-tag">Free</span>Now testing with NGOs in South Sudan</span>
          <h1>From field register to donor report <span class="hl">in minutes,</span> not days.</h1>
          <p class="lead">
            WellReach is the offline-first platform for child protection and psychosocial support programmes. Facilitators
            record every session on a phone, even with no signal. Managers and donors see trusted, logframe-ready results
            the same day.
          </p>
          <div class="actions">
            <a href="#waitlist" class="btn btn-primary">
              Join the waitlist
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </a>
            <a href="#how" class="btn glass-light">See how it works</a>
          </div>
          <ul class="proof">
            <li v-for="point in proofPoints" :key="point">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              {{ point }}
            </li>
          </ul>
        </div>

        <div class="hero-visual" aria-hidden="true">
          <div class="dash glass-light">
            <div class="dash-head">
              <div>
                <div class="muted-sm">Project dashboard · demo data</div>
                <div class="dash-title">Child Protection, Year 2</div>
              </div>
              <span class="live-dot" />
            </div>
            <div class="dash-stats">
              <div><div class="stat-label">Children reached</div><div class="stat-value">1,284</div></div>
              <div><div class="stat-label">Girls · boys</div><div class="stat-value">52 · 48</div></div>
              <div><div class="stat-label">Targets on track</div><div class="stat-value hl">7/9</div></div>
            </div>
            <div class="bars">
              <div v-for="bar in bars" :key="bar.label">
                <div class="bar-label"><span>{{ bar.label }}</span><span>{{ bar.value }}%</span></div>
                <div class="bar-track"><div class="bar-fill" :style="{ width: bar.value + '%', background: bar.color }" /></div>
              </div>
            </div>
            <div class="dash-foot"><span>Weekly report ready</span><span class="link">Download Word · Excel</span></div>
          </div>
          <div class="phone glass-light">
            <div class="phone-screen">
              <span class="phone-status"><span class="status-dot" />Saved offline</span>
              <div class="phone-head">Today's session</div>
              <div class="muted-xs">Safe space, Sector 4</div>
              <div v-for="row in attendance" :key="row.name" class="phone-row">
                <span>{{ row.name }}</span><span :class="row.status === 'Present' ? 'present' : 'excused'">{{ row.status }}</span>
              </div>
              <div class="phone-btn">Save attendance</div>
            </div>
          </div>
        </div>
      </section>

      <div class="pilot">
        <div class="wrap pilot-row">
          <strong>Built with SSWOCO in South Sudan</strong>
          <span>TF Protection project · DRA Joint Response</span>
          <span>Malakal PoC · Melut · Wadakona</span>
        </div>
      </div>
    </div>

    <!-- ═══ Problem: the chain ═══ -->
    <section id="problem" class="section">
      <div class="wrap split">
        <div class="col">
          <p class="eyebrow">The problem</p>
          <h2>Reporting shouldn't take longer than the programme.</h2>
          <p class="lead dark">
            Between a child attending a session and a donor seeing the evidence, the data is copied by hand four times.
            Every copy costs days and loses accuracy.
          </p>
          <div class="facts">
            <div v-for="fact in facts" :key="fact.value" class="fact">
              <span class="fact-value">{{ fact.value }}</span><span class="fact-text">{{ fact.text }}</span>
            </div>
          </div>
        </div>
        <div class="col chain">
          <div class="chain-line" />
          <ol>
            <li v-for="(step, i) in chain" :key="step.title">
              <span class="node" :class="{ last: i === chain.length - 1 }">0{{ i + 1 }}</span>
              <span>
                <span class="step-title">{{ step.title }}<span v-if="step.copy" class="copy-tag">copy {{ step.copy }}</span></span>
                <span class="step-text">{{ step.text }}</span>
              </span>
            </li>
          </ol>
          <div class="chain-fix">
            <span class="node node-fix"><WellReachMark :size="22" bare /></span>
            <span>
              <span class="step-title fix">With WellReach: one entry, in the field.</span>
              <span class="step-text">Everything after it is automatic: counting, targets and reports.</span>
            </span>
          </div>
        </div>
      </div>
      <div class="wrap">
        <figure class="quote">
          <blockquote>
            “This process is very inaccurate and analysis is very difficult to do manually. The people working on the
            ground are not collecting beneficiary data correctly since it is done manually.”
          </blockquote>
          <figcaption>Executive Director, SSWOCO · South Sudan, March 2026</figcaption>
        </figure>
      </div>
    </section>

    <!-- ═══ How it works ═══ -->
    <section id="how" class="section white">
      <div class="wrap">
        <p class="eyebrow">How it works</p>
        <h2 class="narrow">One flow, from the safe space to the donor.</h2>
        <div class="steps">
          <div v-for="step in steps" :key="step.title" class="step" :style="{ borderTopColor: step.color }">
            <p class="eyebrow grey">{{ step.who }}</p>
            <h3>{{ step.title }}</h3>
            <p>{{ step.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ Features ═══ -->
    <section id="features" class="section">
      <div class="wrap split">
        <div class="col narrow-col">
          <p class="eyebrow">Features</p>
          <h2>Everything a protection programme reports on.</h2>
          <p class="lead dark">Designed with field staff in Malakal, for shared phones, weak signal and busy days.</p>
        </div>
        <ul class="col feature-list">
          <li v-for="f in features" :key="f.title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="f.icon" />
            <span><strong>{{ f.title }}</strong><span>{{ f.text }}</span></span>
          </li>
        </ul>
      </div>
    </section>

    <!-- ═══ What changes: before / after comparison ═══ -->
    <section class="section dark">
      <div class="glow" style="width: 560px; height: 560px; right: -120px; top: -160px; background: rgba(14, 124, 102, 0.16)" />
      <div class="glow" style="width: 420px; height: 420px; left: -120px; bottom: -180px; background: rgba(242, 165, 65, 0.05)" />
      <div class="wrap changes-layout">
        <div class="changes-intro">
          <p class="eyebrow amber">What changes</p>
          <h2 class="on-dark">Less time compiling. More time with children.</h2>
          <p class="lead">What field teams and managers get back once the paperwork stops.</p>
          <p class="footnote">Pilot targets set with SSWOCO.</p>
        </div>

        <div class="compare glass-dark" role="table" aria-label="Today compared with WellReach">
          <div class="compare-head" role="row">
            <span role="columnheader">Task</span>
            <span role="columnheader">Today</span>
            <span aria-hidden="true" />
            <span role="columnheader" class="now-head">With WellReach</span>
          </div>
          <div v-for="c in changes" :key="c.task" class="compare-row" role="row">
            <span class="task" role="cell">{{ c.task }}</span>
            <span class="was" role="cell">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
              {{ c.before }}
            </span>
            <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            <span class="now" role="cell">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              {{ c.after }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ Why + safeguarding ═══ -->
    <section class="section">
      <div class="wrap">
        <p class="eyebrow">Why WellReach</p>
        <h2 class="wide">Other tools do one piece. WellReach does the whole chain.</h2>
        <p class="lead dark">
          Built for Child-Friendly Spaces and psychosocial support, from offline field capture to donor-ready evidence. We
          connect to case management rather than replace it.
        </p>
        <div class="table-scroll">
          <table>
            <thead><tr><th scope="col">Tool</th><th scope="col">What it does well</th><th scope="col">The gap WellReach fills</th></tr></thead>
            <tbody>
              <tr v-for="t in tools" :key="t.name"><td class="tool">{{ t.name }}</td><td>{{ t.good }}</td><td>{{ t.gap }}</td></tr>
            </tbody>
          </table>
        </div>

        <div class="split safeguarding">
          <div class="col">
            <p class="eyebrow">Safeguarding</p>
            <h2 class="smaller">Children's data, protected by design.</h2>
          </div>
          <ul class="col checklist">
            <li v-for="item in safeguards" :key="item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ═══ Waitlist ═══ -->
    <section id="waitlist" class="section dark">
      <div class="glow" style="width: 640px; height: 640px; left: -200px; top: -200px; background: rgba(14, 124, 102, 0.18)" />
      <div class="glow" style="width: 460px; height: 460px; right: -100px; bottom: -200px; background: rgba(242, 165, 65, 0.06)" />
      <div class="wrap split center">
        <div class="col">
          <p class="eyebrow amber">Free while we test</p>
          <h2 class="on-dark">Join the WellReach testing programme.</h2>
          <p class="lead">
            We are opening WellReach to a small group of NGOs running child protection and psychosocial support
            programmes. Testing is free.
          </p>
          <ul class="perks">
            <li v-for="perk in perks" :key="perk">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              {{ perk }}
            </li>
          </ul>
        </div>

        <div class="col form-card glass-dark">
          <div v-if="waitlist.sent" role="status" class="sent">
            <div class="sent-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <h3>You're on the list.</h3>
            <p>Thank you. We'll email you when your testing place is ready.</p>
          </div>
          <form v-else class="form" @submit.prevent="joinWaitlist">
            <div class="grid2">
              <label class="field">Full name<input v-model="waitlist.form.full_name" type="text" autocomplete="name" required maxlength="120"></label>
              <label class="field">Work email<input v-model="waitlist.form.email" type="email" autocomplete="email" required maxlength="160"></label>
            </div>
            <div class="grid2">
              <label class="field">Organisation<input v-model="waitlist.form.organisation" type="text" autocomplete="organization" required maxlength="160"></label>
              <label class="field">Country<input v-model="waitlist.form.country" type="text" autocomplete="country-name" maxlength="80"></label>
            </div>
            <label class="field">Your role
              <select v-model="waitlist.form.role">
                <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
              </select>
            </label>
            <!-- Honeypot: hidden from people, bots fill it -->
            <input v-model="waitlist.form.website" class="hp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">
            <p v-if="waitlist.error" class="form-error" role="alert">{{ waitlist.error }}</p>
            <button type="submit" class="btn btn-primary" :disabled="waitlist.sending">
              {{ waitlist.sending ? 'Joining…' : 'Join the waitlist' }}
            </button>
            <p class="fineprint">We only use your details to contact you about testing.</p>
          </form>
        </div>
      </div>
    </section>

    <!-- ═══ Contact ═══ -->
    <section id="contact" class="section">
      <div class="wrap split">
        <div class="col">
          <p class="eyebrow">Contact</p>
          <h2>Talk to us.</h2>
          <p class="lead dark">Questions about WellReach, a partnership, or a demo for your team? Send a message or reach us directly.</p>
          <div class="contact-list">
            <a :href="`mailto:${CONTACT_EMAIL}`">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
              <span><small>Email</small><strong>{{ CONTACT_EMAIL }}</strong></span>
            </a>
            <a :href="`tel:${CONTACT_PHONE}`">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>
              <span><small>Phone / WhatsApp</small><strong>{{ CONTACT_PHONE_DISPLAY }}</strong></span>
            </a>
          </div>
        </div>

        <div class="col">
          <div v-if="contact.sent" role="status" class="contact-sent">
            <h3>Message sent.</h3>
            <p>Thank you. We'll reply to your email soon.</p>
          </div>
          <form v-else class="form light" @submit.prevent="sendContact">
            <div class="grid2">
              <label class="field">Name<input v-model="contact.form.name" type="text" autocomplete="name" required maxlength="120"></label>
              <label class="field">Email<input v-model="contact.form.email" type="email" autocomplete="email" required maxlength="160"></label>
            </div>
            <label class="field"><span>Organisation <span class="optional">(optional)</span></span><input v-model="contact.form.organisation" type="text" autocomplete="organization" maxlength="160"></label>
            <label class="field">Message<textarea v-model="contact.form.message" rows="5" required maxlength="4000" /></label>
            <input v-model="contact.form.website" class="hp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">
            <p v-if="contact.error" class="form-error" role="alert">{{ contact.error }}</p>
            <div><button type="submit" class="btn btn-ink" :disabled="contact.sending">{{ contact.sending ? 'Sending…' : 'Send message' }}</button></div>
          </form>
        </div>
      </div>
    </section>

    <!-- ═══ Footer ═══ -->
    <footer class="footer">
      <div class="wrap footer-cols">
        <div class="footer-brand">
          <div class="brand">
            <WellReachMark :size="40" />
            <span class="wordmark on-dark">Well<span>Reach</span></span>
          </div>
          <p>Trusted reports. More children reached. The offline-first platform for child protection and psychosocial support programmes.</p>
        </div>
        <nav aria-label="Product">
          <span class="footer-head">Product</span>
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#waitlist">Join the waitlist</a>
          <NuxtLink to="/login">Sign in</NuxtLink>
        </nav>
        <nav aria-label="Company">
          <span class="footer-head">Company</span>
          <a href="#problem">Why WellReach</a>
          <a href="https://sswoco.org">SSWOCO</a>
          <a href="#contact">Contact</a>
        </nav>
        <div class="footer-contact">
          <span class="footer-head">Get in touch</span>
          <a :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a>
          <a :href="`tel:${CONTACT_PHONE}`">{{ CONTACT_PHONE_DISPLAY }}</a>
          <span>Serving NGOs in South Sudan and East Africa</span>
        </div>
      </div>
      <div class="footer-bottom">
        <div class="wrap footer-bottom-row">
          <span>© {{ year }} WellReach. Built with SSWOCO in South Sudan.</span>
          <span>Free during testing</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import WellReachMark from '../components/brand/WellReachMark.vue'
import ThemeToggle from '../components/brand/ThemeToggle.vue'

definePageMeta({ layout: false })

useHead({
  // In-page links (Why, Contact…) scroll smoothly; see main.css.
  htmlAttrs: { class: 'smooth-scroll' },
  title: 'WellReach: from field register to donor report',
  meta: [{ name: 'description', content: 'The offline-first platform for child protection and psychosocial support programmes. Field data to donor-ready reports in minutes.' }],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@500;600;700;800&display=swap' },
  ],
})

const CONTACT_EMAIL = 'mubarak.admin@sswoco.org'
const CONTACT_PHONE = '+250792574679'
const CONTACT_PHONE_DISPLAY = '+250 792 574 679'
const year = new Date().getFullYear()

const proofPoints = ['Works offline', 'Donor-ready Excel & Word', "Every figure traces to a child's record"]
const bars = [
  { label: 'Children attending PSS', value: 82, color: '#0E7C66' },
  { label: 'Completed the TeamUp curriculum', value: 64, color: '#0E7C66' },
  { label: 'Caregivers reached by Parenting', value: 41, color: '#F2A541' },
]
const attendance = [
  { name: 'Achol D.', status: 'Present' },
  { name: 'Deng M.', status: 'Present' },
  { name: 'Nyakim G.', status: 'Excused' },
  { name: 'Ladu P.', status: 'Present' },
]
const facts = [
  { value: '3–4 days', text: 'to build one monthly programme report' },
  { value: '≈30%', text: 'less humanitarian funding in 2024–25' },
  { value: '0 IDs', text: 'on paper, so children get counted twice' },
]
const chain = [
  { title: 'Paper register', text: 'The facilitator writes names and ticks by hand in the safe space.', copy: 0 },
  { title: 'Supervisor tally', text: 'Registers are re-counted at the end of the day.', copy: 1 },
  { title: 'Excel database', text: 'A data manager types the tallies into a spreadsheet.', copy: 2 },
  { title: 'Word report', text: 'Figures are filtered, counted and pasted into the donor template.', copy: 3 },
  { title: 'Donor re-types it', text: 'Into their own system, weeks after the session happened.', copy: 4 },
]
const steps = [
  { who: '01 · Facilitators', title: 'The field', color: '#0E7C66', text: "Run today's session, mark attendance in a few taps and register children, all offline. It syncs when signal returns." },
  { who: '02 · M&E officers', title: 'The programme', color: '#9FD2C4', text: "Set up each donor's logframe with outcomes, indicators and yearly targets, then link the activities that count." },
  { who: '03 · Directors & donors', title: 'The evidence', color: '#CDE6DF', text: 'See who is reached by sex, age, disability and location, and whether every target is on track.' },
  { who: '04 · Data managers', title: 'The report', color: '#F2A541', text: 'Export donor-format Excel and Word reports in one click. Days of compiling become minutes.' },
]
const features = [
  { title: 'Offline-first app', text: 'Installs on any phone; keeps working with no signal.', icon: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M10 18h4"/>' },
  { title: 'One record per child', text: 'A unique ID across every activity, so nothing is counted twice.', icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>' },
  { title: 'Psychosocial support', text: 'Daily schedules, session steps, smiley evaluations.', icon: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5s1.3 1.8 3.5 1.8 3.5-1.8 3.5-1.8M9 9.5h.01M15 9.5h.01"/>' },
  { title: 'Group programmes', text: 'TeamUp, Parenting and Community Dialogue, with curricula.', icon: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M2 20c0-3 2.7-5 6-5s6 2 6 5M12 20c0-3 2.7-5 6-5"/>' },
  { title: "Your donor's logframe", text: 'Outcomes, indicators and yearly targets, per donor.', icon: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>' },
  { title: 'Live dashboards', text: 'Reach by sex, age, disability and location.', icon: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>' },
  { title: 'Donor-ready exports', text: 'DRA-format Excel; Word session, daily and weekly reports.', icon: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M12 12v6M9 15l3 3 3-3"/>' },
  { title: 'Safe by design', text: 'Seven roles; facilitators see only their own locations.', icon: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>' },
]
const changes = [
  { task: 'Monthly report', before: '3–4 working days', after: 'Under 2 hours' },
  { task: 'Counting a child', before: 'Counted again in every activity', after: 'One ID, everywhere' },
  { task: 'Baseline scores', before: '40 minutes in paper files', after: 'Instant' },
  { task: 'Donor indicators', before: 'Counted by hand in Excel', after: 'Calculated live' },
  { task: 'Data loss', before: 'Paper lost to floods', after: 'On device, backed up' },
  { task: 'Audit trail', before: "Figures can't be verified", after: 'Traced to the record' },
]
const tools = [
  { name: 'KoboToolbox', good: 'Free, offline data collection', gap: 'Workflows and donor reporting' },
  { name: 'Primero / CPIMS+', good: 'Case management', gap: 'CFS attendance and PSS reporting' },
  { name: 'CommCare', good: 'Robust offline case management', gap: 'Built for CFS; affordable at scale' },
  { name: 'ActivityInfo', good: 'Simple activity monitoring', gap: 'CFS-specific analytics' },
  { name: 'Excel & paper', good: 'Everyone knows it', gap: 'Accuracy, safety and days of manual work' },
]
const safeguards = [
  "No child's record is ever shown outside the organisation that owns it.",
  'Seven roles from facilitator to director. Each sees only what the job needs.',
  'Raw data downloads are limited to managers and M&E staff.',
]
const perks = [
  'Early access for your field team and managers',
  'Set-up help: your logframe, locations and staff',
  'A direct say in what we build next',
]
const roles = ['Programme manager', 'M&E / data manager', 'Director', 'Field supervisor or facilitator', 'Donor or UN agency', 'Other']

const waitlist = reactive({
  form: { full_name: '', email: '', organisation: '', country: '', role: roles[0], website: '' },
  sending: false,
  sent: false,
  error: '',
})
const contact = reactive({
  form: { name: '', email: '', organisation: '', message: '', website: '' },
  sending: false,
  sent: false,
  error: '',
})

function errorText(e: any): string {
  if (e?.statusCode === 429) return 'Too many attempts. Please wait a minute and try again.'
  const fields = e?.data?.errors ? Object.values(e.data.errors) : []
  if (fields.length) return fields.join(' · ')
  return e?.data?.message ?? `Something went wrong. Please try again or email ${CONTACT_EMAIL}.`
}

async function joinWaitlist() {
  waitlist.sending = true
  waitlist.error = ''
  try {
    await $fetch('/api/v1/public/waitlist', { method: 'POST', body: waitlist.form })
    waitlist.sent = true
  } catch (e) {
    waitlist.error = errorText(e)
  } finally {
    waitlist.sending = false
  }
}

async function sendContact() {
  contact.sending = true
  contact.error = ''
  try {
    await $fetch('/api/v1/public/contact', { method: 'POST', body: contact.form })
    contact.sent = true
  } catch (e) {
    contact.error = errorText(e)
  } finally {
    contact.sending = false
  }
}
</script>

<style scoped>
/* ── Tokens: light by default, dark when the platform theme is dark ── */
.lp {
  --ink: #0B2A27;
  --text: #2B3B38;
  --text-2: #3E4F4B;
  --muted: #5F6B69;
  --faint: #6B7A77;
  --teal: #0E7C66;
  --teal-text: #0A5C4C;
  --hl: #0E7C66;
  --mint: #8AF0D2;
  --amber: #F2A541;
  --amber-text: #B9780F;
  --chip-bg: #FDF1DC;
  --chip-text: #8A5A00;
  --page: #FBFAF7;
  --surface: #FFFFFF;
  --hero: #F1F3F2;
  --line: #DDE4E2;
  --line-2: #E3E8E6;
  --node-line: #C6D1CE;
  --row-line: #EEF2F1;
  --track: rgba(11, 42, 39, 0.08);
  --band: #0E1214;
  --glow-a: rgba(14, 124, 102, 0.14);
  --glow-b: rgba(242, 165, 65, 0.16);
  --glow-c: rgba(14, 124, 102, 0.1);
  --glass-bg: rgba(255, 255, 255, 0.55);
  --glass-border: rgba(255, 255, 255, 0.75);
  --glass-shadow: 0 0 0 1px rgba(11, 42, 39, 0.05), 0 18px 50px rgba(11, 42, 39, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9);
  --input-bg: #FFFFFF;
  --input-border: #CBD6D3;
  --btn-ink-bg: #0B2A27;
  --btn-ink-text: #FFFFFF;

  font-family: Manrope, system-ui, sans-serif;
  color: var(--text);
  background: var(--page);
  font-size: 16px;
  line-height: 1.6;
  overflow-x: hidden;
}
[data-theme='dark'] .lp {
  --ink: #EEF3F1;
  --text: #C9D2D0;
  --text-2: #B3BEBB;
  --muted: #8E9A97;
  --faint: #8E9A97;
  --teal-text: #8AF0D2;
  --hl: #8AF0D2;
  --amber-text: #F2B967;
  --chip-bg: rgba(242, 165, 65, 0.14);
  --chip-text: #F2C27A;
  --page: #0B0F10;
  --surface: #11171A;
  --hero: #0E1416;
  --line: #233033;
  --line-2: #1E2A2D;
  --node-line: #34474A;
  --row-line: #223033;
  --track: rgba(255, 255, 255, 0.1);
  --band: #121A1C;
  --glow-a: rgba(14, 124, 102, 0.22);
  --glow-b: rgba(242, 165, 65, 0.08);
  --glow-c: rgba(14, 124, 102, 0.12);
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-shadow: 0 18px 50px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  --input-bg: #0E1416;
  --input-border: #2C3B3E;
  --btn-ink-bg: #EEF3F1;
  --btn-ink-text: #0B2A27;
}

.lp h1, .lp h2, .lp h3 { font-family: Sora, system-ui, sans-serif; letter-spacing: -0.02em; color: var(--ink); margin: 0; }
.lp a { color: var(--teal-text); }
.wrap { width: 100%; max-width: 1160px; margin: 0 auto; padding: 0 24px; box-sizing: border-box; position: relative; }
.glow { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; }
.glow-a { background: var(--glow-a); }
.glow-b { background: var(--glow-b); }
.glow-c { background: var(--glow-c); }
section[id] { scroll-margin-top: 16px; }

/* Glass */
.glass-light {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  box-shadow: var(--glass-shadow);
}
.glass-dark {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 30px 80px rgba(0, 0, 0, 0.3);
  border-radius: 20px;
}

/* Buttons */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 20px; border-radius: 11px; font: 600 15px Manrope, sans-serif; text-decoration: none; border: 0; cursor: pointer; box-sizing: border-box; color: var(--ink); }
.btn:disabled { opacity: 0.7; cursor: wait; }
.btn-primary { background: var(--teal); color: #fff !important; box-shadow: 0 8px 24px rgba(14, 124, 102, 0.22); }
.btn-ink { background: var(--btn-ink-bg); color: var(--btn-ink-text) !important; }
.btn { white-space: nowrap; }

/* Hero */
.hero { position: relative; overflow: hidden; background: var(--hero); border-bottom: 1px solid var(--line-2); }
.nav { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 72px; flex-wrap: wrap; z-index: 2; }
.brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.wordmark { font-family: Sora, sans-serif; font-weight: 700; font-size: 20px; letter-spacing: -0.02em; color: var(--ink); }
.wordmark span { color: var(--hl); }
.wordmark.on-dark { color: #fff; font-size: 22px; }
.wordmark.on-dark span { color: var(--mint); }
.nav-links { display: flex; gap: 26px; font-weight: 600; font-size: 14px; padding: 9px 22px; border-radius: 999px; }
.nav-links a { text-decoration: none; color: var(--text); }
.nav-links a:hover { color: var(--ink); }
.nav-actions { display: flex; gap: 10px; align-items: center; }
/* The theme button matches the frosted menu pill. */
.nav-theme { background: var(--glass-bg); border-color: var(--glass-border); color: var(--ink); box-shadow: var(--glass-shadow); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
.nav-theme:hover { color: var(--teal-text); border-color: var(--teal); }
.nav-actions .btn-primary { min-height: 40px; padding: 0 18px; box-shadow: 0 6px 18px rgba(14, 124, 102, 0.2); }
.hero-body { display: flex; flex-wrap: wrap; gap: 48px 120px; align-items: center; padding-top: 72px; padding-bottom: 104px; z-index: 1; }
.hero-copy { flex: 1 1 420px; min-width: 0; max-width: 520px; }
.pill { display: inline-flex; align-items: center; gap: 10px; padding: 6px 14px 6px 7px; border-radius: 999px; font-size: 13px; font-weight: 600; color: var(--text); }
.pill-tag { background: var(--amber); color: #0B2A27; font-weight: 700; font-size: 11px; padding: 3px 9px; border-radius: 999px; }
.hero h1 { font-weight: 700; font-size: clamp(30px, 3.3vw, 44px); line-height: 1.14; letter-spacing: -0.025em; margin-top: 20px; text-wrap: balance; }
.hl { color: var(--hl); }
.hero h1 .hl { white-space: nowrap; }
[data-theme='dark'] .lp .hl { text-shadow: 0 0 28px rgba(138, 240, 210, 0.28); }
.lead { font-size: 17px; line-height: 1.65; color: var(--text-2); margin: 18px 0 0; max-width: 500px; text-wrap: pretty; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }
.proof { list-style: none; margin: 26px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px 20px; font-size: 13px; color: var(--muted); }
.proof li { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.proof svg { color: var(--teal-text); }
.hero-visual { flex: 1 1 480px; min-width: 0; position: relative; min-height: 440px; }
.dash { position: absolute; right: 0; top: 0; left: 156px; padding: 22px; box-sizing: border-box; border-radius: 20px; }
.dash-head { display: flex; justify-content: space-between; align-items: center; }
.muted-sm { font-size: 12px; color: var(--muted); font-weight: 600; }
.dash-title { font-family: Sora, sans-serif; font-weight: 600; font-size: 16px; color: var(--ink); }
.live-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--teal); box-shadow: 0 0 0 4px rgba(14, 124, 102, 0.15); }
.dash-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 20px; }
.stat-label { font-size: 11px; color: var(--muted); font-weight: 600; }
.stat-value { font-family: Sora, sans-serif; font-size: 22px; font-weight: 700; color: var(--ink); line-height: 1.25; }
.stat-value.hl { color: var(--hl); }
.bars { margin-top: 20px; display: flex; flex-direction: column; gap: 13px; }
.bar-label { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; font-weight: 600; color: var(--text); }
.bar-track { height: 6px; background: var(--track); border-radius: 99px; margin-top: 6px; }
.bar-fill { height: 6px; border-radius: 99px; }
.dash-foot { margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--track); display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; color: var(--text); }
.dash-foot .link { color: var(--teal-text); }
.phone { position: absolute; left: 0; bottom: 0; width: 178px; border-radius: 30px; padding: 8px; }
.phone-screen { background: var(--surface); border-radius: 23px; padding: 15px 13px; min-height: 290px; box-sizing: border-box; color: var(--ink); font-size: 12px; box-shadow: inset 0 0 0 1px var(--track); }
.phone-status { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px 4px 8px; border-radius: 999px; background: var(--chip-bg); color: var(--chip-text); font-size: 10px; font-weight: 600; line-height: 1; white-space: nowrap; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--amber); }
.phone-head { margin-top: 10px; font-weight: 700; font-size: 13px; }
.muted-xs { font-size: 11px; color: var(--muted); margin: 2px 0 6px; }
.phone-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--row-line); }
.present { font-weight: 700; color: var(--teal-text); }
.excused { font-weight: 700; color: var(--faint); }
.phone-btn { margin-top: 14px; background: var(--teal); color: #fff; text-align: center; border-radius: 999px; padding: 10px 14px; font-weight: 600; line-height: 1; }
.pilot { border-top: 1px solid var(--track); position: relative; z-index: 1; }
.pilot-row { display: flex; flex-wrap: wrap; gap: 8px 32px; justify-content: center; padding-top: 18px; padding-bottom: 18px; font-size: 14px; color: var(--muted); }
.pilot-row strong { color: var(--ink); font-weight: 600; }

/* Sections */
.section { position: relative; overflow: hidden; padding: 96px 0; }
.section.white { background: var(--surface); border-top: 1px solid var(--line-2); }
.section.dark { background: var(--band); color: #fff; }
.eyebrow { margin: 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: var(--teal-text); }
.eyebrow.grey { color: var(--faint); }
.eyebrow.amber { color: var(--amber); }
.eyebrow.muted { color: #8D9795; }
.section h2 { font-weight: 600; font-size: clamp(26px, 2.8vw, 38px); line-height: 1.12; margin-top: 12px; }
.section h2.narrow { max-width: 700px; }
.section h2.wide { max-width: 800px; }
.section h2.smaller { font-size: clamp(22px, 2.2vw, 30px); line-height: 1.18; }
.section h2.on-dark { color: #fff; }
.lead.dark { color: var(--text-2); max-width: 700px; margin-top: 16px; }
.dark .lead { color: #C3C9C8; }
.split { display: flex; flex-wrap: wrap; gap: 48px 64px; }
.split.center { align-items: center; }
.col { flex: 1 1 420px; min-width: 0; }
.narrow-col { flex-basis: 300px; }

/* Problem: facts as a quiet three-column row */
.facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 36px; border-top: 1px solid var(--line); }
.fact { display: flex; flex-direction: column; gap: 4px; padding: 18px 16px 0 0; }
.fact + .fact { border-left: 1px solid var(--line); padding-left: 16px; }
.fact-value { font-family: Sora, sans-serif; font-weight: 600; font-size: 24px; line-height: 1.2; color: var(--ink); white-space: nowrap; }
.fact-text { font-size: 13px; line-height: 1.45; color: var(--muted); }
.chain { position: relative; padding-left: 6px; }
.chain-line { position: absolute; left: 26px; top: 24px; bottom: 104px; width: 2px; background: repeating-linear-gradient(to bottom, var(--node-line) 0 6px, transparent 6px 12px); }
.chain ol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 24px; position: relative; }
.chain li, .chain-fix { display: flex; gap: 18px; }
.node { flex: none; width: 42px; height: 42px; border-radius: 50%; background: var(--surface); border: 2px solid var(--node-line); font: 600 13px Sora, sans-serif; color: var(--ink); display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.node.last { background: var(--amber); border-color: var(--amber); color: #0B2A27; }
.node-fix { background: var(--teal); border: 0; box-shadow: 0 0 0 6px rgba(14, 124, 102, 0.12), 0 0 26px rgba(14, 124, 102, 0.3); }
.step-title { display: block; font: 600 17px Sora, sans-serif; color: var(--ink); }
.step-title.fix { color: var(--teal-text); }
.step-text { display: block; font-size: 15px; color: var(--muted); }
.copy-tag { font: 700 11px Manrope, sans-serif; color: var(--chip-text); background: var(--chip-bg); padding: 2px 8px; border-radius: 99px; margin-left: 8px; vertical-align: middle; }
.chain-fix { margin-top: 30px; align-items: center; }
.quote { margin: 72px 0 0; padding-left: 24px; border-left: 3px solid var(--amber); max-width: 820px; }
.quote blockquote { margin: 0; font: 500 clamp(18px, 1.9vw, 23px)/1.45 Sora, sans-serif; color: var(--ink); }
.quote figcaption { margin-top: 14px; color: var(--muted); font-size: 14px; font-weight: 600; }

/* How */
.steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 0 28px; margin-top: 48px; }
.step { border-top: 3px solid; padding-top: 20px; margin-bottom: 28px; }
.step h3 { font-weight: 600; font-size: 18px; margin-top: 8px; }
.step p:last-child { margin: 8px 0 0; color: var(--text-2); font-size: 15px; }

/* Features */
.feature-list { flex: 2 1 560px; list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 0 40px; }
.feature-list li { display: flex; gap: 14px; padding: 18px 0; border-top: 1px solid var(--line); font-size: 15px; }
.feature-list svg { flex: none; color: var(--teal-text); }
.feature-list strong { display: block; color: var(--ink); font-weight: 600; }
.feature-list span span { color: var(--muted); }

/* What changes: before / after comparison */
.changes-layout { display: flex; flex-wrap: wrap; gap: 40px 64px; align-items: center; }
.changes-intro { flex: 1 1 300px; min-width: 0; }
.changes-intro h2 { max-width: 420px; font-size: clamp(24px, 2.5vw, 32px); }
.changes-intro .lead { max-width: 380px; }
.compare { flex: 2 1 600px; min-width: 0; padding: 6px 28px 10px; }
.compare-head, .compare-row { display: grid; grid-template-columns: minmax(120px, 0.85fr) 1fr 16px 1fr; gap: 18px; align-items: center; }
.compare-head { padding: 16px 0 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.12); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: #8D9795; }
.compare-head .now-head { color: var(--mint); padding-left: 10px; }
.compare-row { padding: 16px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.07); }
.compare-row:last-child { border-bottom: 0; }
.task { font-size: 15px; font-weight: 600; color: #fff; }
.was { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #8D9795; }
.was svg { flex: none; color: #5E6A68; }
.arrow { color: rgba(255, 255, 255, 0.28); }
.now { justify-self: start; display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px 6px 10px; border-radius: 999px; background: rgba(138, 240, 210, 0.12); box-shadow: inset 0 0 0 1px rgba(138, 240, 210, 0.22); font: 600 14px Sora, sans-serif; color: var(--mint); white-space: nowrap; }
.now svg { flex: none; }
.footnote { margin: 18px 0 0; font-size: 13px; color: #8D9795; }

/* Why table */
.table-scroll { overflow-x: auto; margin-top: 36px; }
table { width: 100%; min-width: 620px; border-collapse: collapse; font-size: 15px; }
th, td { padding: 14px 0; text-align: left; border-bottom: 1px solid var(--line-2); vertical-align: top; color: var(--text); }
th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); font-weight: 600; }
td.tool { font-weight: 600; color: var(--ink); width: 26%; }
.safeguarding { margin-top: 80px; align-items: flex-start; }
.checklist { list-style: none; margin: 0; padding: 0; font-size: 15px; }
.checklist li { display: flex; gap: 12px; padding: 14px 0; border-top: 1px solid var(--line); }
.checklist li:last-child { border-bottom: 1px solid var(--line); }
.checklist svg { flex: none; margin-top: 3px; color: var(--teal-text); }

/* Waitlist + forms */
.perks { list-style: none; margin: 24px 0 0; padding: 0; display: flex; flex-direction: column; gap: 12px; color: #DADFDE; font-size: 15px; }
.perks li { display: flex; gap: 12px; }
.perks svg { flex: none; margin-top: 4px; color: var(--mint); }
.form-card { padding: 28px; box-sizing: border-box; }
.form { display: flex; flex-direction: column; gap: 14px; }
.grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: #DADFDE; }
.field input, .field select, .field textarea { min-height: 44px; border-radius: 10px; padding: 0 13px; font: 15px Manrope, sans-serif; box-sizing: border-box; width: 100%; background: rgba(255, 255, 255, 0.07); border: 1px solid rgba(255, 255, 255, 0.2); color: #fff; }
.field select option { color: #0B2A27; }
.field textarea { padding: 11px 13px; min-height: 130px; resize: vertical; }
.field input:focus, .field select:focus, .field textarea:focus { outline: 2px solid var(--mint); outline-offset: 1px; }
.form.light .field { color: var(--text); }
.form.light .field input, .form.light .field textarea { background: var(--input-bg); border: 1px solid var(--input-border); color: var(--ink); }
.form.light .field input:focus, .form.light .field textarea:focus { outline-color: var(--teal); }
.optional { font-weight: 500; color: var(--faint); }
.hp { position: absolute; left: -10000px; width: 1px; height: 1px; opacity: 0; }
.form-error { margin: 0; padding: 10px 14px; border-radius: 10px; background: #FEF2F2; color: #991B1B; font-size: 14px; }
.fineprint { margin: 0; font-size: 12px; color: #8D9795; }
.sent { text-align: center; padding: 28px 8px; }
.sent-icon { width: 52px; height: 52px; margin: 0 auto; border-radius: 50%; background: rgba(127, 209, 188, 0.15); display: flex; align-items: center; justify-content: center; color: var(--mint); box-shadow: 0 0 30px rgba(127, 209, 188, 0.3); }
.sent h3 { color: #fff; font-size: 21px; margin-top: 16px; }
.sent p { margin: 8px 0 0; color: #C3C9C8; }
.contact-sent { padding: 24px 0; border-top: 3px solid var(--teal); }
.contact-sent h3 { font-size: 21px; }
.contact-sent p { margin: 8px 0 0; color: var(--text-2); }

/* Contact */
.contact-list { margin-top: 32px; }
.contact-list a { display: flex; gap: 14px; align-items: center; padding: 16px 0; border-top: 1px solid var(--line); text-decoration: none; }
.contact-list a:last-child { border-bottom: 1px solid var(--line); }
.contact-list svg { flex: none; color: var(--teal-text); }
.contact-list small { display: block; font-size: 12px; color: var(--faint); font-weight: 600; }
.contact-list strong { display: block; color: var(--ink); font-size: 15px; font-weight: 600; }

/* Footer */
.footer { background: var(--band); color: #C3C9C8; }
.footer-cols { display: flex; flex-wrap: wrap; gap: 36px 56px; padding-top: 64px; padding-bottom: 44px; font-size: 14px; }
.footer-brand { flex: 2 1 320px; min-width: 0; }
.footer-brand p { margin: 14px 0 0; max-width: 340px; }
.footer nav, .footer-contact { flex: 1 1 140px; display: flex; flex-direction: column; gap: 9px; }
.footer-contact { flex-basis: 220px; }
.footer-head { color: #fff; font-weight: 600; margin-bottom: 4px; }
.footer a { color: #C3C9C8; text-decoration: none; }
.footer a:hover { color: #fff; }
.footer-bottom { border-top: 1px solid rgba(255, 255, 255, 0.08); }
.footer-bottom-row { display: flex; flex-wrap: wrap; gap: 10px 24px; justify-content: space-between; padding-top: 18px; padding-bottom: 22px; font-size: 13px; color: #8D9795; }

@media (max-width: 760px) {
  .compare { padding: 4px 20px 8px; }
  .compare-head { display: none; }
  .compare-row { grid-template-columns: 1fr 1fr; grid-template-areas: 'task task' 'was now'; gap: 8px 14px; }
  .task { grid-area: task; }
  .was { grid-area: was; }
  .now { grid-area: now; font-size: 13px; white-space: normal; }
  .arrow { display: none; }
  .nav-links { display: none; }
  .nav { flex-wrap: nowrap; }
  .actions .btn { flex: 1 1 100%; }
  .hero-visual { min-height: 0; }
  .dash { position: static; width: 100%; }
  .phone { display: none; }
  .section { padding: 72px 0; }
  .facts { grid-template-columns: 1fr; }
  .fact + .fact { border-left: 0; padding-left: 0; border-top: 1px solid var(--line); }
  .fact { padding: 14px 0; flex-direction: row; align-items: baseline; gap: 14px; }
  .fact-value { min-width: 96px; font-size: 22px; }
}

@media (max-width: 520px) {
  .nav-actions .btn-primary { padding: 0 16px; }
  .wordmark { font-size: 18px; }
}

</style>
