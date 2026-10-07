<template>
  <div class="lp">
    <!-- ═══ Hero: light grey with frosted glass ═══ -->
    <div class="hero">
      <div class="glow" style="width: 560px; height: 560px; left: -180px; top: -240px; background: rgba(14, 124, 102, 0.14)" />
      <div class="glow" style="width: 520px; height: 520px; right: -120px; top: 140px; background: rgba(242, 165, 65, 0.16)" />
      <div class="glow" style="width: 420px; height: 420px; right: 28%; top: 40px; background: rgba(14, 124, 102, 0.1)" />

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
          <NuxtLink to="/login" class="btn btn-quiet">Sign in</NuxtLink>
          <a href="#waitlist" class="btn btn-ink">Join the waitlist</a>
        </div>
      </header>

      <section id="top" class="wrap hero-body">
        <div class="hero-copy">
          <span class="pill glass-light"><span class="pill-tag">Free</span>Now testing with NGOs in South Sudan</span>
          <h1>From field register to donor report — <span class="hl">in minutes,</span> not days.</h1>
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
          <p class="proof">Works offline <b>·</b> Donor-ready Excel &amp; Word <b>·</b> Every figure traces to a child's record</p>
        </div>

        <div class="hero-visual" aria-hidden="true">
          <div class="dash glass-light">
            <div class="dash-head">
              <div>
                <div class="muted-sm">Project dashboard · demo data</div>
                <div class="dash-title">Child Protection — Year 2</div>
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
              <div class="phone-head"><span>Today's session</span><span class="offline">Offline · saved</span></div>
              <div class="muted-xs">Safe space · Sector 4</div>
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
              <span class="fact-value">{{ fact.value }}</span><span>{{ fact.text }}</span>
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
              <span class="step-text">Everything after it — counting, targets, reports — is automatic.</span>
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

    <!-- ═══ What changes ═══ -->
    <section class="section dark">
      <div class="glow" style="width: 560px; height: 560px; right: -120px; top: -160px; background: rgba(14, 124, 102, 0.16)" />
      <div class="glow" style="width: 420px; height: 420px; left: -120px; bottom: -180px; background: rgba(242, 165, 65, 0.05)" />
      <div class="wrap">
        <p class="eyebrow amber">What changes</p>
        <h2 class="narrow on-dark">Less time compiling. More time with children.</h2>
        <div class="changes glass-dark">
          <div v-for="c in changes" :key="c.task" class="change">
            <p class="eyebrow muted">{{ c.task }}</p>
            <p class="before">{{ c.before }}</p>
            <p class="after">{{ c.after }}</p>
          </div>
        </div>
        <p class="footnote">Pilot targets set with SSWOCO.</p>
      </div>
    </section>

    <!-- ═══ Why + safeguarding ═══ -->
    <section class="section">
      <div class="wrap">
        <p class="eyebrow">Why WellReach</p>
        <h2 class="wide">Other tools do one piece. WellReach does the whole chain.</h2>
        <p class="lead dark">
          Built for Child-Friendly Spaces and psychosocial support, from offline field capture to donor-ready evidence. We
          connect to case management — we don't replace it.
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
            <p>Thank you — we'll reply to your email soon.</p>
          </div>
          <form v-else class="form light" @submit.prevent="sendContact">
            <div class="grid2">
              <label class="field">Name<input v-model="contact.form.name" type="text" autocomplete="name" required maxlength="120"></label>
              <label class="field">Email<input v-model="contact.form.email" type="email" autocomplete="email" required maxlength="160"></label>
            </div>
            <label class="field">Organisation <span class="optional">(optional)</span><input v-model="contact.form.organisation" type="text" autocomplete="organization" maxlength="160"></label>
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

definePageMeta({ layout: false })

useHead({
  title: 'WellReach — from field register to donor report',
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

const bars = [
  { label: 'PSS — children attending', value: 82, color: '#0E7C66' },
  { label: 'TeamUp — curriculum completed', value: 64, color: '#0E7C66' },
  { label: 'Parenting — caregivers reached', value: 41, color: '#F2A541' },
]
const attendance = [
  { name: 'Achol D.', status: 'Present' },
  { name: 'Deng M.', status: 'Present' },
  { name: 'Nyakim G.', status: 'Excused' },
  { name: 'Ladu P.', status: 'Present' },
]
const facts = [
  { value: '3–4 days', text: 'to assemble one monthly programme report' },
  { value: '≈30%', text: 'less humanitarian funding in 2024–25, with the same reporting demands' },
  { value: '0 IDs', text: 'on paper — the same child counted twice, and no way to check' },
]
const chain = [
  { title: 'Paper register', text: 'The facilitator writes names and ticks by hand in the safe space.', copy: 0 },
  { title: 'Supervisor tally', text: 'Registers are re-counted at the end of the day.', copy: 1 },
  { title: 'Excel database', text: 'A data manager types the tallies into a spreadsheet.', copy: 2 },
  { title: 'Word report', text: 'Figures are filtered, counted and pasted into the donor template.', copy: 3 },
  { title: 'Donor re-types it', text: 'Into their own system — weeks after the session happened.', copy: 4 },
]
const steps = [
  { who: '01 · Facilitators', title: 'The field', color: '#0E7C66', text: "Run today's session, mark attendance in a few taps and register children — offline. It syncs when signal returns." },
  { who: '02 · M&E officers', title: 'The programme', color: '#9FD2C4', text: "Set up each donor's logframe — outcomes, indicators, yearly targets — and link the activities that count." },
  { who: '03 · Directors & donors', title: 'The evidence', color: '#CDE6DF', text: 'See who is reached — by sex, age, disability and location — and whether every target is on track.' },
  { who: '04 · Data managers', title: 'The report', color: '#F2A541', text: 'Export donor-format Excel and Word reports in one click. Days of compiling become minutes.' },
]
const features = [
  { title: 'Offline-first app', text: 'Installs on any phone; keeps working with no signal.', icon: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M10 18h4"/>' },
  { title: 'One record per child', text: 'A unique ID across every activity — no double counting.', icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>' },
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
  'Seven roles, facilitator to director — each sees only what the job needs.',
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
.lp {
  --ink: #0B2A27;
  --teal: #0E7C66;
  --teal-dark: #0A5C4C;
  --mint: #7FD1BC;
  --amber: #F2A541;
  --text: #2B3B38;
  --text-2: #3E4F4B;
  --muted: #5F6B69;
  --line: #DDE4E2;
  --paper: #FBFAF7;
  --charcoal: #0E1214;
  font-family: Manrope, system-ui, sans-serif;
  color: var(--text);
  background: var(--paper);
  font-size: 17px;
  line-height: 1.6;
  overflow-x: hidden;
}
.lp h1, .lp h2, .lp h3 { font-family: Sora, system-ui, sans-serif; letter-spacing: -0.025em; color: var(--ink); margin: 0; }
.lp a { color: var(--teal-dark); }
.wrap { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 24px; box-sizing: border-box; position: relative; }
.glow { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; }

/* Glass */
.glass-light {
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  box-shadow: 0 0 0 1px rgba(11, 42, 39, 0.05), 0 18px 50px rgba(11, 42, 39, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9);
}
.glass-dark {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 30px 80px rgba(0, 0, 0, 0.35);
  border-radius: 22px;
}

/* Buttons */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 0 22px; border-radius: 12px; font: 700 16px Manrope, sans-serif; text-decoration: none; border: 0; cursor: pointer; box-sizing: border-box; color: var(--ink); }
.btn:disabled { opacity: 0.7; cursor: wait; }
.btn-primary { background: var(--teal); color: #fff !important; box-shadow: 0 10px 28px rgba(14, 124, 102, 0.25); }
.btn-ink { background: var(--ink); color: #fff !important; }
.btn-quiet { padding: 0 14px; color: var(--ink) !important; }

/* Hero */
.hero { position: relative; overflow: hidden; background: #F1F3F2; border-bottom: 1px solid #E3E8E6; }
.nav { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 80px; flex-wrap: wrap; z-index: 2; }
.brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.wordmark { font-family: Sora, sans-serif; font-weight: 800; font-size: 22px; letter-spacing: -0.02em; color: var(--ink); }
.wordmark span { color: var(--teal); }
.wordmark.on-dark { color: #fff; font-size: 24px; }
.wordmark.on-dark span { color: var(--mint); }
.nav-links { display: flex; gap: 28px; font-weight: 600; font-size: 15px; padding: 10px 24px; border-radius: 999px; }
.nav-links a { text-decoration: none; color: var(--text); }
.nav-actions { display: flex; gap: 8px; align-items: center; }
.hero-body { display: flex; flex-wrap: wrap; gap: 56px; align-items: center; padding-top: 64px; padding-bottom: 96px; z-index: 1; }
.hero-copy { flex: 1 1 500px; min-width: 0; }
.pill { display: inline-flex; align-items: center; gap: 10px; padding: 7px 14px 7px 8px; border-radius: 999px; font-size: 14px; font-weight: 600; }
.pill-tag { background: var(--amber); color: var(--ink); font-weight: 800; font-size: 12px; padding: 3px 9px; border-radius: 999px; }
.hero h1 { font-weight: 800; font-size: clamp(42px, 5.4vw, 70px); line-height: 1.02; margin-top: 24px; }
.hl { color: var(--teal); }
.lead { font-size: 19px; color: var(--text-2); margin: 24px 0 0; max-width: 560px; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 36px; }
.proof { margin: 36px 0 0; font-size: 15px; color: var(--muted); }
.proof b { color: #D08A1E; }
.hero-visual { flex: 1 1 460px; min-width: 0; position: relative; min-height: 480px; }
.dash { position: absolute; right: 0; top: 0; left: 168px; padding: 24px; box-sizing: border-box; border-radius: 22px; }
.dash-head { display: flex; justify-content: space-between; align-items: center; }
.muted-sm { font-size: 13px; color: var(--muted); font-weight: 600; }
.dash-title { font-family: Sora, sans-serif; font-weight: 700; font-size: 18px; color: var(--ink); }
.live-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--teal); box-shadow: 0 0 0 4px rgba(14, 124, 102, 0.15); }
.dash-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 22px; }
.stat-label { font-size: 11px; color: var(--muted); font-weight: 700; }
.stat-value { font-family: Sora, sans-serif; font-size: 24px; font-weight: 800; color: var(--ink); line-height: 1.2; }
.bars { margin-top: 22px; display: flex; flex-direction: column; gap: 14px; }
.bar-label { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; font-weight: 600; }
.bar-track { height: 6px; background: rgba(11, 42, 39, 0.08); border-radius: 99px; margin-top: 7px; }
.bar-fill { height: 6px; border-radius: 99px; }
.dash-foot { margin-top: 22px; padding-top: 16px; border-top: 1px solid rgba(11, 42, 39, 0.08); display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; }
.dash-foot .link { color: var(--teal-dark); }
.phone { position: absolute; left: 0; bottom: 0; width: 190px; border-radius: 32px; padding: 9px; }
.phone-screen { background: #fff; border-radius: 24px; padding: 16px 14px; min-height: 300px; box-sizing: border-box; color: var(--ink); font-size: 12px; box-shadow: inset 0 0 0 1px rgba(11, 42, 39, 0.06); }
.phone-head { display: flex; justify-content: space-between; align-items: center; font-weight: 800; }
.offline { font-size: 10px; font-weight: 700; color: #8A5A00; background: #FDF1DC; padding: 2px 8px; border-radius: 99px; }
.muted-xs { font-size: 11px; color: var(--muted); margin: 2px 0 6px; }
.phone-row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid #EEF2F1; }
.present { font-weight: 800; color: var(--teal-dark); }
.excused { font-weight: 800; color: #6B7A77; }
.phone-btn { margin-top: 12px; background: var(--teal); color: #fff; text-align: center; border-radius: 10px; padding: 9px; font-weight: 700; }
.pilot { border-top: 1px solid rgba(11, 42, 39, 0.08); position: relative; z-index: 1; }
.pilot-row { display: flex; flex-wrap: wrap; gap: 10px 36px; justify-content: center; padding-top: 22px; padding-bottom: 22px; font-size: 15px; color: var(--muted); }
.pilot-row strong { color: var(--ink); }

/* Sections */
.section { position: relative; overflow: hidden; padding: 112px 0; }
.section.white { background: #fff; border-top: 1px solid #E3E8E6; }
.section.dark { background: var(--charcoal); color: #fff; }
.eyebrow { margin: 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--teal-dark); }
.eyebrow.grey { color: #6B7A77; }
.eyebrow.amber { color: var(--amber); }
.eyebrow.muted { color: #8D9795; }
.section h2 { font-weight: 700; font-size: clamp(32px, 3.8vw, 50px); line-height: 1.08; margin-top: 14px; }
.section h2.narrow { max-width: 760px; }
.section h2.wide { max-width: 860px; }
.section h2.smaller { font-size: clamp(28px, 3vw, 40px); line-height: 1.12; }
.section h2.on-dark { color: #fff; }
.lead.dark { color: var(--text-2); max-width: 760px; margin-top: 18px; }
.dark .lead { color: #C3C9C8; }
.split { display: flex; flex-wrap: wrap; gap: 56px 64px; }
.split.center { align-items: center; }
.col { flex: 1 1 420px; min-width: 0; }
.narrow-col { flex-basis: 320px; }

/* Problem */
.facts { margin-top: 44px; }
.fact { display: flex; gap: 20px; align-items: baseline; padding: 18px 0; border-top: 1px solid var(--line); color: var(--text-2); }
.fact:last-child { border-bottom: 1px solid var(--line); }
.fact-value { font-family: Sora, sans-serif; font-weight: 800; font-size: 44px; color: var(--ink); min-width: 170px; line-height: 1; white-space: nowrap; }
.chain { position: relative; padding-left: 8px; }
.chain-line { position: absolute; left: 31px; top: 28px; bottom: 120px; width: 2px; background: repeating-linear-gradient(to bottom, #C6D1CE 0 6px, transparent 6px 12px); }
.chain ol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 30px; position: relative; }
.chain li, .chain-fix { display: flex; gap: 22px; }
.node { flex: none; width: 48px; height: 48px; border-radius: 50%; background: #fff; border: 2px solid #C6D1CE; font: 700 15px Sora, sans-serif; color: var(--ink); display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.node.last { background: var(--amber); border-color: var(--amber); }
.node-fix { background: var(--teal); border: 0; box-shadow: 0 0 0 6px rgba(14, 124, 102, 0.12), 0 0 30px rgba(14, 124, 102, 0.35); }
.step-title { display: block; font: 700 20px Sora, sans-serif; color: var(--ink); }
.step-title.fix { color: var(--teal-dark); }
.step-text { display: block; color: #4A5A57; }
.copy-tag { font: 800 12px Manrope, sans-serif; color: #8A5A00; background: #FDF1DC; padding: 3px 9px; border-radius: 99px; margin-left: 8px; vertical-align: middle; }
.chain-fix { margin-top: 36px; align-items: center; }
.quote { margin: 88px 0 0; padding-left: 28px; border-left: 3px solid var(--amber); max-width: 900px; }
.quote blockquote { margin: 0; font: 500 clamp(22px, 2.4vw, 30px)/1.4 Sora, sans-serif; color: var(--ink); }
.quote figcaption { margin-top: 16px; color: #4A5A57; font-size: 15px; font-weight: 600; }

/* How */
.steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0 32px; margin-top: 56px; }
.step { border-top: 3px solid; padding-top: 22px; margin-bottom: 32px; }
.step h3 { font-weight: 700; font-size: 22px; margin-top: 10px; }
.step p:last-child { margin: 10px 0 0; color: var(--text-2); }

/* Features */
.feature-list { flex: 2 1 560px; list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 0 40px; }
.feature-list li { display: flex; gap: 16px; padding: 22px 0; border-top: 1px solid var(--line); }
.feature-list svg { flex: none; color: var(--teal); }
.feature-list strong { display: block; color: var(--ink); }
.feature-list span span { color: #4A5A57; }

/* What changes */
.changes { margin-top: 48px; padding: 8px 32px; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0 40px; }
.change { padding: 24px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
.change p { margin: 0; }
.before { margin-top: 8px !important; color: #8D9795; text-decoration: line-through; }
.after { margin-top: 2px !important; font: 700 24px Sora, sans-serif; color: var(--mint); }
.footnote { margin: 16px 0 0; font-size: 14px; color: #8D9795; }

/* Why table */
.table-scroll { overflow-x: auto; margin-top: 40px; }
table { width: 100%; min-width: 640px; border-collapse: collapse; font-size: 16px; }
th, td { padding: 16px 0; text-align: left; border-bottom: 1px solid #E3E8E6; vertical-align: top; }
th { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #4A5A57; font-weight: 700; }
td.tool { font-weight: 700; color: var(--ink); width: 26%; }
.safeguarding { margin-top: 96px; align-items: flex-start; }
.checklist { list-style: none; margin: 0; padding: 0; }
.checklist li { display: flex; gap: 14px; padding: 16px 0; border-top: 1px solid var(--line); }
.checklist li:last-child { border-bottom: 1px solid var(--line); }
.checklist svg { flex: none; margin-top: 3px; color: var(--teal); }

/* Waitlist + forms */
.perks { list-style: none; margin: 28px 0 0; padding: 0; display: flex; flex-direction: column; gap: 14px; color: #DADFDE; }
.perks li { display: flex; gap: 12px; }
.perks svg { flex: none; margin-top: 4px; color: var(--mint); }
.form-card { padding: 32px; box-sizing: border-box; }
.form { display: flex; flex-direction: column; gap: 16px; }
.grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 14px; font-weight: 600; color: #DADFDE; }
.field input, .field select, .field textarea { min-height: 46px; border-radius: 10px; padding: 0 14px; font: 16px Manrope, sans-serif; box-sizing: border-box; width: 100%; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.22); color: #fff; }
.field select option { color: var(--ink); }
.field textarea { padding: 12px 14px; min-height: 140px; resize: vertical; }
.field input:focus, .field select:focus, .field textarea:focus { outline: 2px solid var(--mint); outline-offset: 1px; }
.form.light .field { color: var(--text); }
.form.light .field input, .form.light .field textarea { background: #fff; border: 1px solid #CBD6D3; color: var(--ink); }
.form.light .field input:focus, .form.light .field textarea:focus { outline-color: var(--teal); }
.optional { font-weight: 500; color: #6B7A77; }
.hp { position: absolute; left: -10000px; width: 1px; height: 1px; opacity: 0; }
.form-error { margin: 0; padding: 10px 14px; border-radius: 10px; background: #FEF2F2; color: #991B1B; font-size: 14px; }
.fineprint { margin: 0; font-size: 13px; color: #8D9795; }
.sent { text-align: center; padding: 32px 8px; }
.sent-icon { width: 56px; height: 56px; margin: 0 auto; border-radius: 50%; background: rgba(127, 209, 188, 0.15); display: flex; align-items: center; justify-content: center; color: var(--mint); box-shadow: 0 0 30px rgba(127, 209, 188, 0.35); }
.sent h3 { color: #fff; font-size: 24px; margin-top: 18px; }
.sent p { margin: 8px 0 0; color: #C3C9C8; }
.contact-sent { padding: 28px 0; border-top: 3px solid var(--teal); }
.contact-sent h3 { font-size: 24px; }
.contact-sent p { margin: 8px 0 0; color: var(--text-2); }

/* Contact */
.contact-list { margin-top: 36px; }
.contact-list a { display: flex; gap: 16px; align-items: center; padding: 18px 0; border-top: 1px solid var(--line); text-decoration: none; }
.contact-list a:last-child { border-bottom: 1px solid var(--line); }
.contact-list svg { flex: none; color: var(--teal); }
.contact-list small { display: block; font-size: 13px; color: #6B7A77; font-weight: 600; }
.contact-list strong { display: block; color: var(--ink); }

/* Footer */
.footer { background: var(--charcoal); color: #C3C9C8; }
.footer-cols { display: flex; flex-wrap: wrap; gap: 40px 56px; padding-top: 72px; padding-bottom: 48px; font-size: 15px; }
.footer-brand { flex: 2 1 320px; min-width: 0; }
.footer-brand p { margin: 16px 0 0; max-width: 340px; }
.footer nav, .footer-contact { flex: 1 1 140px; display: flex; flex-direction: column; gap: 10px; }
.footer-contact { flex-basis: 220px; }
.footer-head { color: #fff; font-weight: 700; margin-bottom: 4px; }
.footer a { color: #C3C9C8; text-decoration: none; }
.footer a:hover { color: #fff; }
.footer-bottom { border-top: 1px solid rgba(255, 255, 255, 0.1); }
.footer-bottom-row { display: flex; flex-wrap: wrap; gap: 10px 24px; justify-content: space-between; padding-top: 20px; padding-bottom: 24px; font-size: 14px; color: #8D9795; }

@media (max-width: 760px) {
  .nav-links { display: none; }
  .hero-visual { min-height: 0; }
  .dash { position: static; width: 100%; }
  .phone { display: none; }
  .fact-value { min-width: 120px; font-size: 34px; }
  .section { padding: 80px 0; }
}
</style>
