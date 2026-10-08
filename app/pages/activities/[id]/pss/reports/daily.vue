<!--
  PSS Daily Facilitator Report.

  Calls GET /api/v1/pss/schedules/:id/daily-report?date=YYYY-MM-DD and
  renders the report as a facilitator memo (PRD §10.2):

    Cover  → Date, schedule, CFS location
    1.     → Attendance (totals, gender, age, disability)
    2..n.  → Per-session narrative (objectives, activities, observations,
              protection notes, challenges, follow-ups, reflection)
    Last.  → Day summary (children reached, flagged total)

  Visual language mirrors today.vue and the PSS hub: 720px column,
  page-header + btn-back, var(--bg-panel) cards, pill primitives,
  tokens only (DART_UX_REFERENCE §3 / §6).
-->
<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="report-page">

      <!-- ═══ Page Header ═══ -->
      <header class="page-header">
        <div class="header-row">
          <div>
            <h1 class="page-title">Daily facilitator report</h1>
            <p class="page-subtitle">
              Auto-generated narrative for one schedule and day.
            </p>
          </div>
          <NuxtLink :to="`/activities/${frameworkId}/pss`" class="btn-back">
            <AppIcon name="arrow-left" :size="14" />
            <span class="btn-text">PSS</span>
          </NuxtLink>
        </div>
      </header>

      <!-- ═══ Filter strip ═══ -->
      <section class="filter-strip" aria-label="Report filters">
        <label class="field">
          <span class="field-label">Schedule</span>
          <select v-model="scheduleId" class="field-input" :disabled="loading">
            <option value="">Select a schedule…</option>
            <option v-for="s in schedules" :key="s.id" :value="s.id">
              {{ s.name }}
            </option>
          </select>
        </label>
        <label class="field">
          <span class="field-label">Date</span>
          <input
            v-model="date"
            type="date"
            class="field-input"
            :disabled="loading"
          />
        </label>
        <button
          type="button"
          class="btn-primary"
          :disabled="!canFetch || loading"
          @click="fetchReport"
        >
          <span v-if="loading" class="spinner" />
          {{ loading ? 'Loading…' : 'Load report' }}
        </button>
      </section>

      <!-- ═══ Action toolbar (only when a report is loaded) ═══ -->
      <div v-if="report && !loading" class="toolbar no-print">
        <button type="button" class="btn-ghost" @click="fetchReport">
          <AppIcon name="refresh-cw" :size="14" />
          <span>Refresh</span>
        </button>
        <button type="button" class="btn-ghost" @click="printReport">
          <AppIcon name="printer" :size="14" />
          <span>Print</span>
        </button>
        <button type="button" class="btn-ghost" @click="copyJson">
          <AppIcon name="copy" :size="14" />
          <span>{{ copied ? 'Copied' : 'Copy JSON' }}</span>
        </button>
        <button type="button" class="btn-ghost" @click="downloadWord">
          <AppIcon name="download" :size="14" />
          <span>Download Word</span>
        </button>
      </div>

      <!-- ═══ Error ═══ -->
      <div v-if="error" class="state state--error" role="alert">
        <AppIcon name="alert-circle" :size="14" />
        {{ error }}
      </div>

      <!-- ═══ Empty / loading ═══ -->
      <div v-else-if="loading" class="state">Loading report…</div>

      <div v-else-if="!report" class="state">
        Choose a schedule and date, then press <strong>Load report</strong>.
      </div>

      <!-- ═══ Report ═══ -->
      <article v-else class="report" id="report-printable">

        <!-- Memo letterhead -->
        <section class="memo">
          <div class="memo-eyebrow">Daily facilitator report</div>
          <div v-if="organisationName" class="memo-org">
            {{ organisationName }}
          </div>
          <div v-if="projectName" class="memo-project">
            <span class="memo-project-label">Project:</span>
            {{ projectName }}
            <span v-if="partnerName" class="memo-partner">· {{ partnerName }}</span>
          </div>
          <div class="memo-activity">Activity: Structured PSS Sessions</div>

          <hr class="memo-rule" />

          <dl class="memo-meta">
            <div><dt>To</dt><dd>Programme officer / supervisor</dd></div>
            <div>
              <dt>From</dt>
              <dd>{{ primaryFacilitatorName }} <span class="memo-role">(Facilitator)</span></dd>
            </div>
            <div><dt>Date</dt><dd>{{ formatDateLong(report.date) }}</dd></div>
            <div>
              <dt>Location</dt>
              <dd>{{ cfsLocationName(report.cfs_location_id) }}</dd>
            </div>
            <div>
              <dt>Schedule</dt>
              <dd>{{ scheduleName(report.schedule_id) }}</dd>
            </div>
          </dl>

          <hr class="memo-rule" />

          <div class="cover-pills">
            <span class="pill pill--period">
              {{ report.sessions.length }}
              session{{ report.sessions.length === 1 ? '' : 's' }}
            </span>
            <span class="pill pill--age">
              {{ report.participants.total }} children reached
            </span>
            <span
              v-if="flaggedTotal > 0"
              class="pill pill--flag"
            >
              {{ flaggedTotal }} flagged for protection follow-up
            </span>
            <span v-else class="pill pill--done">No protection flags</span>
          </div>
        </section>

        <!-- 1. Attendance -->
        <section class="report-section">
          <header class="section-head">
            <span class="section-no">1</span>
            <h3 class="section-title">Attendance</h3>
          </header>

          <p v-if="report.participants.total === 0" class="narrative narrative--muted">
            No children were registered as attending today.
          </p>

          <template v-else>
            <p class="narrative">
              Today
              <strong>{{ report.participants.total }}</strong>
              {{ report.participants.total === 1 ? 'child' : 'children' }}
              attended PSS at
              <strong>{{ cfsLocationName(report.cfs_location_id) }}</strong>,
              broken down as
              <strong>{{ report.participants.girls }}</strong>
              {{ report.participants.girls === 1 ? 'girl' : 'girls' }}
              and
              <strong>{{ report.participants.boys }}</strong>
              {{ report.participants.boys === 1 ? 'boy' : 'boys' }}.
            </p>

            <p class="narrative">
              By age band,
              <strong>{{ report.participants.age_6_9 }}</strong>
              {{ report.participants.age_6_9 === 1 ? 'child was' : 'children were' }}
              aged 6–9,
              <strong>{{ report.participants.age_10_14 }}</strong>
              {{ report.participants.age_10_14 === 1 ? 'was' : 'were' }}
              aged 10–14, and
              <strong>{{ report.participants.age_15_17 }}</strong>
              {{ report.participants.age_15_17 === 1 ? 'was' : 'were' }}
              aged 15–17.
              <template v-if="report.participants.with_disabilities > 0">
                Of those present,
                <strong>{{ report.participants.with_disabilities }}</strong>
                {{ report.participants.with_disabilities === 1 ? 'child lives' : 'children live' }}
                with a disability.
              </template>
              <template v-else>
                No participants today were registered as living with a disability.
              </template>
            </p>
          </template>
        </section>

        <!-- Sessions (2..n) -->
        <section
          v-for="(s, idx) in report.sessions"
          :key="s.session_id"
          class="report-section"
        >
          <header class="section-head">
            <span class="section-no">{{ idx + 2 }}</span>
            <h3 class="section-title">Session {{ idx + 1 }}</h3>
            <span class="pill pill--period">
              {{ s.time_period === 'morning' ? 'Morning' : 'Afternoon' }}
            </span>
            <span class="pill pill--age">Age {{ s.age_group }}</span>
            <span
              v-if="s.status === 'completed'"
              class="pill pill--done"
            >Completed</span>
            <span
              v-else
              class="pill pill--running"
            >In progress</span>
          </header>

          <p class="session-byline">
            Facilitated by <strong>{{ facilitatorName(s.facilitator_id) }}</strong>
          </p>

          <!-- Objectives -->
          <div v-if="s.objectives && s.objectives.length" class="block">
            <div class="block-label">Objectives</div>
            <ul class="prose-list">
              <li v-for="(o, i) in s.objectives" :key="i">{{ o }}</li>
            </ul>
          </div>

          <!-- Activities — rich rows -->
          <div v-if="s.activities && s.activities.length" class="block">
            <div class="block-label">
              Activities completed
              <span class="block-tag">
                {{ completedActivityCount(s) }} / {{ s.activities.length }}
              </span>
            </div>
            <ol class="activity-list">
              <li
                v-for="a in orderedActivities(s)"
                :key="a.id"
                class="activity-row"
                :class="a.status === 'completed' ? 'activity-row--done' : 'activity-row--pending'"
              >
                <div class="activity-head">
                  <span class="activity-name">{{ a.activity_name }}</span>
                  <span
                    class="pill"
                    :class="a.status === 'completed' ? 'pill--done' : 'pill--running'"
                  >{{ a.status === 'completed' ? 'Done' : 'Skipped' }}</span>
                </div>
                <p v-if="a.activity_aim" class="activity-aim">{{ a.activity_aim }}</p>
                <p v-if="a.notes" class="activity-notes">
                  <span class="activity-notes-label">Note:</span>
                  {{ a.notes }}
                </p>
              </li>
            </ol>
          </div>

          <!-- Key observations -->
          <div v-if="s.key_observations" class="block">
            <div class="block-label">Key observations</div>
            <p class="narrative">{{ s.key_observations }}</p>
          </div>

          <!-- Protection notes + flagged children list -->
          <div
            v-if="s.protection_notes || s.flagged_children.length > 0"
            class="block"
          >
            <div class="block-label">
              Child protection notes
              <span
                v-if="s.flagged_children.length > 0"
                class="block-tag block-tag--warn"
              >
                Action required ·
                {{ s.flagged_children.length }}
                child{{ s.flagged_children.length === 1 ? '' : 'ren' }}
              </span>
            </div>
            <p v-if="s.protection_notes" class="narrative">{{ s.protection_notes }}</p>

            <ul v-if="s.flagged_children.length > 0" class="flag-list">
              <li
                v-for="f in s.flagged_children"
                :key="f.id"
                class="flag-row"
              >
                <div class="flag-head">
                  <AppIcon name="alert-triangle" :size="14" />
                  <span class="flag-bid">Beneficiary {{ shortId(f.beneficiary_id) }}</span>
                  <span class="flag-time">{{ formatTime(f.flagged_at) }}</span>
                </div>
                <p class="flag-concern">{{ f.concern }}</p>
              </li>
            </ul>
          </div>

          <!-- Challenges -->
          <div v-if="s.challenges" class="block">
            <div class="block-label">Challenges</div>
            <p class="narrative">{{ s.challenges }}</p>
          </div>

          <!-- Follow-ups -->
          <div v-if="s.follow_up_actions && s.follow_up_actions.length" class="block">
            <div class="block-label">Follow-up actions</div>
            <ul class="prose-list">
              <li v-for="(f, i) in s.follow_up_actions" :key="i">{{ f }}</li>
            </ul>
          </div>

          <!-- Reflection -->
          <div v-if="s.reflection" class="block">
            <div class="block-label">Facilitator reflection</div>
            <p class="narrative narrative--quote">{{ s.reflection }}</p>
          </div>
        </section>

        <!-- Summary footer -->
        <section class="report-section report-section--summary">
          <header class="section-head">
            <span class="section-no">{{ report.sessions.length + 2 }}</span>
            <h3 class="section-title">Day summary</h3>
          </header>
          <p class="narrative">
            We delivered
            <strong>{{ report.sessions.length }}</strong>
            {{ report.sessions.length === 1 ? 'session' : 'sessions' }}
            today, reaching
            <strong>{{ report.participants.total }}</strong>
            {{ report.participants.total === 1 ? 'child' : 'children' }}.
            <template v-if="flaggedTotal > 0">
              <strong>{{ flaggedTotal }}</strong>
              {{ flaggedTotal === 1 ? 'child was' : 'children were' }}
              flagged for child-protection follow-up and have been escalated
              to the case-management lead.
            </template>
            <template v-else>
              No children were flagged for protection follow-up.
            </template>
          </p>
          <p class="signoff">
            Submitted by <strong>{{ primaryFacilitatorName }}</strong> on
            {{ formatDateLong(report.date) }} at
            {{ cfsLocationName(report.cfs_location_id) }}.
          </p>
        </section>

        <div v-if="report.sessions.length === 0" class="state">
          No sessions were recorded for this date.
        </div>
      </article>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import {
  usePssSchedulesApi,
  type PssDailyFacilitatorReportDto,
  type PssDailyReportSessionDto,
  type PssScheduleDto,
} from '~/services/pss/schedulesApi';
import { cfsApi } from '~/services/cfsApi';
import { frameworkApi } from '~/services/frameworkApi';
import { useAuthStore } from '~/stores/auth';
import type { StaffAssignment } from '~/interfaces/cfs';
import type { Framework } from '~/interfaces/framework';

definePageMeta({ layout: false, middleware: ['auth'] });

const route = useRoute();
const frameworkId = route.params.id as string;
const api = usePssSchedulesApi();
const auth = useAuthStore();

const schedules = ref<PssScheduleDto[]>([]);
const scheduleId = ref<string>('');
const date = ref<string>(todayLocalIso());
const loading = ref(false);

// Name-resolution caches.
const facilitatorMap = ref<Map<string, string>>(new Map());
const cfsLocationMap = ref<Map<string, string>>(new Map());
const framework = ref<Framework | null>(null);
const error = ref<string | null>(null);
const report = ref<PssDailyFacilitatorReportDto | null>(null);
const copied = ref(false);

const breadcrumbs = computed(() => [
  { title: 'Projects', href: '/activities' },
  { title: 'Project', href: `/activities/${frameworkId}` },
  { title: 'PSS', href: `/activities/${frameworkId}/pss` },
  { title: 'Daily report', href: route.fullPath, current: true },
]);

const canFetch = computed(() => Boolean(scheduleId.value && date.value));

const flaggedTotal = computed(() =>
  (report.value?.sessions ?? []).reduce(
    (n, s) => n + (s.flagged_children?.length ?? 0),
    0,
  ),
);

const organisationName = computed(() => auth.orgName ?? '');

const projectName = computed(() => framework.value?.project_name ?? '');

const partnerName = computed(() => framework.value?.partner_name ?? '');

/**
 * The facilitator named on the memo letterhead.
 *
 * If the loaded report has at least one session, prefer that facilitator
 * (the field officer who actually ran the day). Otherwise fall back to
 * the signed-in user — useful for the empty/initial state.
 */
const primaryFacilitatorName = computed(() => {
  const sessions = report.value?.sessions ?? [];
  if (sessions.length > 0 && sessions[0]?.facilitator_id) {
    return facilitatorName(sessions[0].facilitator_id);
  }
  return auth.userName ?? '—';
});

function todayLocalIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateLong(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function scheduleName(id: string): string {
  return schedules.value.find((s) => s.id === id)?.name ?? id;
}

function shortId(id: string): string {
  if (!id) return '—';
  return id.length > 12 ? id.slice(0, 8) + '…' : id;
}

/**
 * Resolve a CFS location UUID to its display name.
 *
 * Order: signed-in user's own assignment → staff-assignments directory →
 * graceful fallback ("CFS <short-id>"). The directory is hydrated from
 * `cfs/staff-assignments`, which already returns `location_name`.
 */
function cfsLocationName(id: string): string {
  if (!id) return '—';
  if (auth.cfsLocationId === id && auth.cfsLocationName) {
    return auth.cfsLocationName;
  }
  const fromMap = cfsLocationMap.value.get(id);
  if (fromMap) return fromMap;
  return `CFS ${shortId(id)}`;
}

/**
 * Resolve a facilitator UUID to their full name. Same fallback chain as
 * `cfsLocationName` — own user first, directory next, then a short id.
 */
function facilitatorName(id: string): string {
  if (!id) return '—';
  if (auth.userId === id && auth.userName) return auth.userName;
  const fromMap = facilitatorMap.value.get(id);
  if (fromMap) return fromMap;
  return `Facilitator ${shortId(id)}`;
}

function formatTime(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function orderedActivities(s: PssDailyReportSessionDto) {
  return [...s.activities].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
  );
}

function completedActivityCount(s: PssDailyReportSessionDto): number {
  return s.activities.filter((a) => a.status === 'completed').length;
}

async function loadSchedules(): Promise<void> {
  try {
    schedules.value = await api.list();
    if (!scheduleId.value && schedules.value.length > 0) {
      scheduleId.value = schedules.value[0]!.id;
    }
  } catch (err) {
    error.value = (err as Error).message ?? 'Could not load schedules.';
  }
}

/**
 * Hydrate the framework so we can show a real Project / Partner header.
 * Failures are non-fatal — we just fall back to the schedule name + org.
 */
async function loadFramework(): Promise<void> {
  try {
    const res = await frameworkApi.listFrameworks();
    framework.value =
      (res.frameworks ?? []).find((f) => f.id === frameworkId) ?? null;
  } catch {
    framework.value = null;
  }
}

/**
 * Build name-lookup maps from staff-assignments. Each row already carries
 * `full_name`, `cfs_location_id`, and `location_name` so a single GET
 * resolves both facilitator and CFS-location IDs that the daily-report
 * endpoint returns.
 */
async function loadStaffDirectory(): Promise<void> {
  try {
    const res = await cfsApi.getStaffAssignments();
    const staff: StaffAssignment[] = res.assignments ?? [];
    const fmap = new Map<string, string>();
    const lmap = new Map<string, string>();
    for (const a of staff) {
      if (a.user_id && a.full_name) fmap.set(a.user_id, a.full_name);
      if (a.cfs_location_id && a.location_name) {
        lmap.set(a.cfs_location_id, a.location_name);
      }
    }
    facilitatorMap.value = fmap;
    cfsLocationMap.value = lmap;
  } catch {
    /* directory is best-effort — fall back to "CFS <short-id>" */
  }
}

async function fetchReport(): Promise<void> {
  if (!canFetch.value) return;
  loading.value = true;
  error.value = null;
  try {
    report.value = await api.getDailyReport(scheduleId.value, date.value);
  } catch (err) {
    report.value = null;
    error.value = (err as Error).message ?? 'Could not load the report.';
  } finally {
    loading.value = false;
  }
}

function printReport(): void {
  if (typeof window !== 'undefined') window.print();
}

async function copyJson(): Promise<void> {
  if (!report.value) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(report.value, null, 2));
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    error.value = 'Could not copy to clipboard.';
  }
}

/**
 * Build the report as a Microsoft Word document and download it.
 *
 * We don't ship `docx`/`html-docx-js` — both would balloon the bundle for
 * a single page. Instead we use the long-standing trick of writing an
 * HTML payload that Word opens natively when the file extension is
 * `.doc` and the MIME type is `application/msword`. The facilitator can
 * then edit the document like any other Word file.
 *
 * The HTML uses inline styles only (Word ignores most external CSS),
 * Calibri 11pt body / serif headings, no card chrome — just a memo
 * letterhead, narrative attendance, per-session prose blocks, and a
 * sign-off paragraph.
 */
function downloadWord(): void {
  if (!report.value) return;
  const r = report.value;

  const esc = (v: unknown): string =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  const nl2br = (v: string): string => esc(v).replace(/\n/g, '<br/>');

  /*
   * Word document typography — mirrors facilitator_report.docx exactly.
   * Arial throughout (with Arial Unicode MS preferred for diacritics),
   * sizes 18 / 14 / 12 / 11 / 10pt, bold-underlined sub-block labels,
   * paragraph-bottom borders for horizontal rules, no tables.
   *
   * Source of truth: /Users/user/software-development/Dart-docs/facilitator_report.docx
   */
  const css = `
    @page Section1 {
      size: 8.27in 11.69in;
      margin: 22mm 22mm 22mm 22mm;
      mso-page-orientation: portrait;
      mso-header-margin: 12mm;
      mso-footer-margin: 12mm;
    }
    div.Section1 { page: Section1; }

    /*
     * Single-font policy. The reference docx uses Arial; we keep Arial
     * Unicode MS first in the chain so diacritics in NGO names render
     * cleanly and Word silently substitutes Arial when AUMS is missing.
     */
    *, body, p, h1, h2, h3, h4, li, td, span, b, i, em, strong, div, ol, ul {
      font-family: 'Arial Unicode MS', Arial, sans-serif !important;
      mso-ascii-font-family: 'Arial Unicode MS';
      mso-hansi-font-family: 'Arial Unicode MS';
      mso-bidi-font-family: 'Arial Unicode MS';
      mso-fareast-font-family: 'Arial Unicode MS';
    }

    body {
      font-size: 11pt;
      color: #000;
      line-height: 1.4;
      mso-line-height-rule: at-least;
    }

    /* Document title — 18pt bold (sz=36 in docx). */
    p.title {
      font-size: 18pt;
      font-weight: 700;
      margin: 0 0 12pt;
    }

    /* Organisation — 12pt bold (sz=24). */
    p.org {
      font-size: 12pt;
      font-weight: 700;
      margin: 0 0 6pt;
    }

    /* Project line + meta block — 11pt bold (sz=22). */
    p.lead {
      font-size: 11pt;
      font-weight: 700;
      margin: 0 0 6pt;
    }

    /* Horizontal rule — grey paragraph border, like the docx pBdr. */
    hr.rule {
      border: 0;
      border-top: 1pt solid #999;
      margin: 14pt 0;
    }

    /* Top-level section heading — 14pt bold (sz=28). */
    h2.section {
      font-size: 14pt;
      font-weight: 700;
      color: #000;
      margin: 20pt 0 10pt;
      line-height: 1.3;
    }

    /* Session sub-heading — 12pt bold (sz=24). */
    h3.session {
      font-size: 12pt;
      font-weight: 700;
      color: #000;
      margin: 18pt 0 6pt;
      line-height: 1.3;
    }

    /* 'Facilitated by:' line — 11pt bold (sz=22). */
    p.byline {
      font-size: 11pt;
      font-weight: 700;
      margin: 0 0 12pt;
    }

    /* Sub-block label — 11pt bold UNDERLINED (matches docx). */
    p.label {
      font-size: 11pt;
      font-weight: 700;
      text-decoration: underline;
      margin: 14pt 0 6pt;
    }

    /* Body paragraph — 11pt regular. */
    p.body {
      font-size: 11pt;
      margin: 4pt 0 8pt;
      line-height: 1.45;
    }

    /*
     * Hyphen-prefixed list items — we render lists as <p class="bullet">
     * with a leading dash so Word doesn't second-guess the marker. Solid
     * 11pt left indent groups the dash with body text without colliding.
     */
    p.bullet {
      font-size: 11pt;
      margin: 3pt 0 3pt 22pt;
      text-indent: -14pt;
      line-height: 1.45;
    }

    /*
     * Activity row — bold 11pt name on the dash line, then 10pt aim and
     * 10pt note as their own indented paragraphs (sits flush under the
     * activity-name line, no extra dash).
     */
    p.activity {
      font-size: 11pt;
      margin: 8pt 0 2pt 22pt;
      text-indent: -14pt;
      line-height: 1.45;
    }
    p.activity-aim {
      font-size: 10pt;
      margin: 0 0 2pt 22pt;
      line-height: 1.4;
    }
    p.activity-note {
      font-size: 10pt;
      margin: 0 0 4pt 22pt;
      line-height: 1.4;
    }
    .activity-name { font-weight: 700; }
    .activity-note-label { font-weight: 700; }

    /* Sign-off line at the bottom — 10pt (sz=20). */
    p.signoff {
      font-size: 10pt;
      margin: 14pt 0 0;
    }

    .skipped {
      font-style: italic;
      color: #555;
      font-weight: 400;
    }

    h2.section, h3.session, p.label, p.byline { page-break-after: avoid; }
    p.body, p.bullet, p.activity, p.activity-aim, p.activity-note { page-break-inside: avoid; }
  `;

  // ── Letterhead ───────────────────────────────────────────────────────
  // Mirrors the docx exactly: title, org, single-line project+activity.
  const orgLine = organisationName.value
    ? `<p class="org">${esc(organisationName.value)}</p>`
    : '';
  const projectLine = projectName.value
    ? `<p class="lead">Project: ${esc(projectName.value)}${
        partnerName.value ? ` \u2014 ${esc(partnerName.value)}` : ''
      } &nbsp;&nbsp;&nbsp;&nbsp; Activity: Structured PSS Sessions</p>`
    : `<p class="lead">Activity: Structured PSS Sessions</p>`;

  // Meta block — five bold 11pt paragraphs (To / From / Date / Location /
  // Schedule), each with a double-space after the colon to match the docx.
  const metaRows: Array<[string, string]> = [
    ['To', 'Programme Officer / Supervisor'],
    ['From', `${primaryFacilitatorName.value} (Facilitator)`],
    ['Date', formatDateLong(r.date)],
    ['Location', cfsLocationName(r.cfs_location_id)],
    ['Schedule', scheduleName(r.schedule_id)],
  ];
  const metaBlock = metaRows
    .map(([k, v]) => `<p class="lead">${esc(k)}:&nbsp;&nbsp;${esc(v)}</p>`)
    .join('');

  // ── Attendance narrative (no cards, bold numbers) ────────────────────
  const p = r.participants;
  let attendance: string;
  if (p.total === 0) {
    attendance = `<p class="body"><i>No children were registered as attending today.</i></p>`;
  } else {
    const childWord = p.total === 1 ? 'child' : 'children';
    const girlWord = p.girls === 1 ? 'girl' : 'girls';
    const boyWord = p.boys === 1 ? 'boy' : 'boys';
    const ageVerb6 = p.age_6_9 === 1 ? 'child was' : 'children were';
    const ageVerb10 = p.age_10_14 === 1 ? 'was' : 'were';
    const ageVerb15 = p.age_15_17 === 1 ? 'was' : 'were';
    const disabilityClause =
      p.with_disabilities > 0
        ? ` Of those present, <b>${p.with_disabilities}</b> ${
            p.with_disabilities === 1 ? 'child lives' : 'children live'
          } with a disability.`
        : ' No participants today were registered as living with a disability.';

    attendance = `
      <p class="body">
        Today <b>${p.total}</b> ${childWord} attended PSS at
        <b>${esc(cfsLocationName(r.cfs_location_id))}</b>, broken down as
        <b>${p.girls}</b> ${girlWord} and <b>${p.boys}</b> ${boyWord}.
      </p>
      <p class="body">
        By age band, <b>${p.age_6_9}</b> ${ageVerb6} aged 6&ndash;9,
        <b>${p.age_10_14}</b> ${ageVerb10} aged 10&ndash;14, and
        <b>${p.age_15_17}</b> ${ageVerb15} aged 15&ndash;17.
        ${disabilityClause}
      </p>
    `;
  }

  // ── Sessions ─────────────────────────────────────────────────────────
  // Per-session block order mirrors facilitator_report.docx exactly:
  //   Session N header
  //   Facilitated by: ...
  //   Objectives             (bold + underlined label, bulleted list)
  //   Activities Completed   (bold + underlined label, numbered list)
  //   Key Observations       (bold + underlined label, body paragraph)
  //   Child Protection Notes (bold + underlined label, body + flag list)
  //   Challenges             (bold + underlined label, body paragraph)
  //   Follow-Up Actions      (bold + underlined label, bulleted list)
  //   Facilitator Reflection (bold + underlined label, body paragraph)
  // HRs separate consecutive sessions.
  const sessionsHtml = r.sessions
    .map((s, idx) => {
      const period = s.time_period === 'morning' ? 'Morning' : 'Afternoon';
      const flagsCount = s.flagged_children.length;

      const sessionHeader = `
        <h3 class="session">Session ${idx + 1}: ${period}, Age ${esc(s.age_group)}</h3>
        <p class="byline">Facilitated by:&nbsp; ${esc(facilitatorName(s.facilitator_id))}</p>
        <p class="body">&nbsp;</p>
      `;

      const objectivesBlock = s.objectives && s.objectives.length
        ? `<p class="label">Objectives</p>
           ${s.objectives.map((o) => `<p class="bullet">-&nbsp;&nbsp;${esc(o)}</p>`).join('')}`
        : '';

      const activitiesBlock = s.activities && s.activities.length
        ? (() => {
            const ordered = [...s.activities].sort(
              (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
            );
            const items = ordered
              .map((a) => {
                const skipped = a.status === 'completed'
                  ? ''
                  : ' <span class="skipped">(skipped)</span>';
                const aim = a.activity_aim
                  ? `<p class="activity-aim">${esc(a.activity_aim)}</p>`
                  : '';
                const note = a.notes
                  ? `<p class="activity-note"><span class="activity-note-label">Note:</span> ${esc(a.notes)}</p>`
                  : '';
                return `<p class="activity">-&nbsp;&nbsp;<span class="activity-name">${esc(a.activity_name)}</span>${skipped}</p>${aim}${note}`;
              })
              .join('');
            return `<p class="label">Activities Completed (${completedActivityCount(s)} of ${s.activities.length})</p>
                    ${items}`;
          })()
        : '';

      const observationsBlock = s.key_observations
        ? `<p class="label">Key Observations</p>
           <p class="body">${nl2br(s.key_observations)}</p>`
        : '';

      let protectionBlock = '';
      if (s.protection_notes || flagsCount > 0) {
        let body = '';
        if (s.protection_notes) {
          body += `<p class="body">${nl2br(s.protection_notes)}</p>`;
        }
        if (flagsCount > 0) {
          const items = s.flagged_children
            .map((f) => {
              const time = formatTime(f.flagged_at);
              const suffix = time ? ` (${esc(time)})` : '';
              return `<p class="bullet">-&nbsp;&nbsp;<b>${esc(shortId(f.beneficiary_id))}</b> — ${esc(f.concern)}${suffix}</p>`;
            })
            .join('');
          body += items;
        }
        protectionBlock = `<p class="label">Child Protection Notes</p>${body}`;
      }

      const challengesBlock = s.challenges
        ? `<p class="label">Challenges</p>
           <p class="body">${nl2br(s.challenges)}</p>`
        : '';

      const followUpBlock = s.follow_up_actions && s.follow_up_actions.length
        ? `<p class="label">Follow-Up Actions</p>
           ${s.follow_up_actions.map((f) => `<p class="bullet">-&nbsp;&nbsp;${esc(f)}</p>`).join('')}`
        : '';

      const reflectionBlock = s.reflection
        ? `<p class="label">Facilitator Reflection</p>
           <p class="body">${nl2br(s.reflection)}</p>`
        : '';

      const sessionContent = [
        sessionHeader,
        objectivesBlock,
        activitiesBlock,
        observationsBlock,
        protectionBlock,
        challengesBlock,
        followUpBlock,
        reflectionBlock,
      ]
        .filter(Boolean)
        .join('\n');

      // HR between consecutive sessions, none after the last.
      const trailingHr =
        idx < r.sessions.length - 1 ? '<hr class="rule" />' : '';
      return sessionContent + trailingHr;
    })
    .join('\n');

  // ── Day summary narrative ────────────────────────────────────────────
  const sessionsCount = r.sessions.length;
  const summary =
    sessionsCount === 0
      ? `<p class="body"><i>No sessions were recorded for this date.</i></p>`
      : `
        <p class="body">
          We delivered <b>${sessionsCount}</b> ${sessionsCount === 1 ? 'session' : 'sessions'}
          today, reaching <b>${p.total}</b> ${p.total === 1 ? 'child' : 'children'}.
          ${
            flaggedTotal.value > 0
              ? `<b>${flaggedTotal.value}</b> ${
                  flaggedTotal.value === 1 ? 'child was' : 'children were'
                } flagged for child-protection follow-up and have been escalated to the case-management lead.`
              : 'No children were flagged for protection follow-up.'
          }
        </p>
      `;

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <title>Daily Facilitator Report — ${esc(formatDateLong(r.date))}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>${css}</style>
      </head>
      <body>
        <div class="Section1">
          <p class="title">Daily Facilitator Report</p>
          ${orgLine}
          ${projectLine}

          <hr class="rule" />

          ${metaBlock}

          <hr class="rule" />

          <h2 class="section">1.&nbsp;&nbsp;Attendance</h2>
          ${attendance}

          <hr class="rule" />

          <h2 class="section">2.&nbsp;&nbsp;Sessions Conducted</h2>
          ${sessionsHtml || `<p class="body">No sessions were recorded for this date.</p>`}

          <hr class="rule" />

          <h2 class="section">3.&nbsp;&nbsp;Day Summary</h2>
          ${summary}

          <hr class="rule" />

          <p class="signoff">Submitted by <b>${esc(primaryFacilitatorName.value)}</b>&nbsp;&nbsp;on ${esc(formatDateLong(r.date))} at ${esc(cfsLocationName(r.cfs_location_id))}.</p>
        </div>
      </body>
    </html>
  `;

  // BOM keeps Word happy with non-ASCII characters (en-dash, m-dash, etc.).
  const blob = new Blob(['﻿', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pss-daily-report-${r.date}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

onMounted(() => {
  void loadSchedules();
  void loadFramework();
  void loadStaffDirectory();
});
</script>

<style scoped>
/* Mirrors today.vue / pss/index.vue layout — 720 px column. */
.report-page {
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* ═══ Page Header ═══ */
.page-header { margin-bottom: 4px; }
.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.page-title {
  font-size: 1.35rem;
  font-weight: 750;
  color: var(--text-primary);
  margin: 0 0 2px;
  letter-spacing: -0.02em;
}
.page-subtitle {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0;
}
.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  text-decoration: none;
  font-weight: 500;
  white-space: nowrap;
  min-height: 36px;
  transition: border-color 0.15s, color 0.15s;
}
.btn-back:hover { border-color: var(--text-muted); color: var(--text-primary); }

/* ═══ Filter strip ═══ */
.filter-strip {
  display: grid;
  grid-template-columns: 1fr 180px auto;
  gap: 10px;
  align-items: end;
  padding: 12px 14px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}
.field { display: flex; flex-direction: column; gap: 8px; min-width: 0; }




.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  background: var(--primary);
  color: #fff;
  border: 1px solid var(--primary);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  min-height: 36px;
  font-family: inherit;
  transition: filter 0.15s;
}
.btn-primary:hover:not(:disabled) { filter: brightness(1.05); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* ═══ Action toolbar ═══ */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--bg-card);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
  min-height: 36px;
}
.btn-ghost:hover {
  background: var(--hover-bg);
  border-color: var(--primary);
  color: var(--text-primary);
}

/* ═══ States ═══ */
.state {
  padding: 32px 16px;
  border-radius: var(--radius-md);
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  text-align: center;
  font-size: 0.9rem;
}
.state--error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--error);
  background: var(--error-bg);
  border-color: rgba(248, 113, 113, 0.18);
  text-align: left;
}

/* ═══ Report ═══ */
.report {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Memo letterhead */
.memo {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 22px 24px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.memo-eyebrow {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--primary);
  margin-bottom: 4px;
}
.memo-org {
  font-size: 1.25rem;
  font-weight: 750;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  line-height: 1.2;
}
.memo-project {
  font-size: 0.9rem;
  color: var(--text-primary);
  line-height: 1.5;
}
.memo-project-label {
  color: var(--text-muted);
  font-weight: 650;
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  margin-right: 6px;
}
.memo-partner { color: var(--text-muted); margin-left: 4px; }
.memo-activity {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.5;
}
.memo-rule {
  border: 0;
  border-top: 1px solid var(--border-color);
  margin: 8px 0;
  width: 100%;
}
.memo-meta {
  display: grid;
  grid-template-columns: 80px 1fr;
  row-gap: 8px;
  column-gap: 12px;
  margin: 0;
}
.memo-meta > div {
  display: contents;
}
.memo-meta dt {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  align-self: center;
}
.memo-meta dd {
  margin: 0;
  font-size: 0.92rem;
  color: var(--text-primary);
  font-weight: 500;
  line-height: 1.4;
}
.memo-role {
  color: var(--text-muted);
  font-weight: 400;
  margin-left: 4px;
}
.cover-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }

/* Pills (mirror today.vue) */
.pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.7rem;
  font-weight: 650;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 3px 9px;
  border-radius: 999px;
  white-space: nowrap;
}
.pill--period { background: var(--primary-dim); color: var(--primary); }
.pill--age {
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}
.pill--done { background: var(--success-bg); color: var(--success); }
.pill--running { background: var(--warning-bg); color: var(--warning); }
.pill--flag { background: var(--error-bg); color: var(--error); }

/* Section */
.report-section {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}
.section-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--primary-dim);
  color: var(--primary);
  font-size: 0.72rem;
  font-weight: 700;
  flex-shrink: 0;
}
.section-title {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 650;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  flex: 1;
}

/* Narrative typography */
.narrative {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
}
.narrative--muted { color: var(--text-muted); font-style: italic; }
.narrative--quote {
  padding: 8px 14px;
  border-left: 3px solid var(--primary-dim);
  background: var(--hover-bg-subtle);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  font-style: italic;
  color: var(--text-secondary);
}
.narrative strong { color: var(--text-primary); font-weight: 650; }

/* Session blocks */
.session-byline {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-muted);
}
.session-byline .mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--text-secondary);
}
.block { display: flex; flex-direction: column; gap: 6px; }
.block-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.74rem;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}
.block-tag {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 2px 7px;
  border-radius: 999px;
  text-transform: uppercase;
}
.block-tag {
  background: var(--bg-input);
  color: var(--text-secondary);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: 999px;
  text-transform: uppercase;
}
.block-tag--warn { background: var(--error-bg); color: var(--error); }

/* Activity rows */
.activity-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  counter-reset: act;
}
.activity-row {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 10px 14px 10px 38px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  counter-increment: act;
}
.activity-row::before {
  content: counter(act);
  position: absolute;
  left: 12px;
  top: 12px;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--primary-dim);
  color: var(--primary);
  font-size: 0.68rem;
  font-weight: 700;
}
.activity-row--pending { opacity: 0.78; }
.activity-row--pending::before {
  background: var(--bg-input);
  color: var(--text-muted);
}
.activity-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.activity-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}
.activity-aim {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-muted);
  line-height: 1.45;
}
.activity-notes {
  margin: 4px 0 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.5;
  padding: 6px 10px;
  background: var(--hover-bg-subtle);
  border-radius: var(--radius-sm);
  border-left: 2px solid var(--primary-dim);
}
.activity-notes-label {
  font-weight: 650;
  color: var(--text-muted);
  text-transform: uppercase;
  font-size: 0.66rem;
  letter-spacing: 0.05em;
  margin-right: 6px;
}

/* Flag list */
.flag-list {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.flag-row {
  background: var(--error-bg);
  border: 1px solid rgba(248, 113, 113, 0.2);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.flag-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  color: var(--error);
}
.flag-bid {
  font-weight: 650;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.flag-time {
  margin-left: auto;
  font-size: 0.72rem;
  color: var(--text-muted);
}
.flag-concern {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.5;
  color: var(--text-primary);
}

.prose-list {
  margin: 0;
  padding-left: 20px;
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--text-primary);
}
.prose-list li { margin-bottom: 4px; }
.prose-list li:last-child { margin-bottom: 0; }

/* Summary */
.report-section--summary { background: var(--bg-card); }
.signoff {
  margin: 4px 0 0;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
  font-size: 0.82rem;
  color: var(--text-muted);
  font-style: italic;
  line-height: 1.5;
}

.spinner {
  width: 11px; height: 11px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Responsive */
@media (max-width: 600px) {
  .header-row { flex-direction: column; gap: 10px; }
  .btn-text { display: none; }
  .filter-strip { grid-template-columns: 1fr; }
  .memo-meta { grid-template-columns: 1fr; row-gap: 4px; }
  .memo-meta > div { display: flex; flex-direction: column; gap: 0; }
  .memo-meta dt { padding-top: 4px; }
  .report-section { padding: 16px; }
  .memo { padding: 18px; }
}

/* Print rules that reach this component's own elements live here.
   Layout chrome (sidebar, topbar, breadcrumbs) lives outside the
   <style scoped> reach, so the rest of the print isolation is in the
   non-scoped <style> block below. */
@media print {
  .no-print,
  .filter-strip,
  .btn-back { display: none !important; }
  .report-page { max-width: none; gap: 12px; }
  .report-section, .memo {
    box-shadow: none;
    border-color: #ccc;
    page-break-inside: avoid;
  }
}
</style>

<!--
  Non-scoped print rules.

  The page is wrapped in `<NuxtLayout name="app">` which renders the
  sidebar, topbar, breadcrumbs and a glassy app shell — all of which would
  otherwise be photographed onto the paper. Scoped CSS can't reach those
  selectors, so we use a non-scoped block to isolate the printable
  article and re-paint dark-mode tokens for white paper.
-->
<style>
@media print {
  /* Reset the page surface so the dark-mode palette doesn't bleed through. */
  html, body {
    background: #fff !important;
    color: #111 !important;
  }

  /* Hide everything in the document, then re-show only the report tree.
     This is the classic visibility-isolation trick — `display: none` on
     ancestors would clip absolute children, so we use `visibility`. */
  body * {
    visibility: hidden !important;
  }
  #report-printable,
  #report-printable * {
    visibility: visible !important;
  }

  /* Lift the report out of the app shell so it occupies the full page. */
  #report-printable {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    color: #111 !important;
  }

  /* Re-paint the dark tokens for paper. */
  #report-printable .memo,
  #report-printable .report-section {
    background: #fff !important;
    border: 1px solid #d4d4d8 !important;
    box-shadow: none !important;
    color: #111 !important;
    page-break-inside: avoid;
  }
  #report-printable .memo-eyebrow {
    color: #1d4ed8 !important; /* darker blue for ink */
  }
  #report-printable .memo-org,
  #report-printable .section-title,
  #report-printable .activity-name,
  #report-printable .narrative,
  #report-printable .narrative strong,
  #report-printable .memo-meta dd,
  #report-printable .memo-project {
    color: #111 !important;
  }
  #report-printable .memo-meta dt,
  #report-printable .memo-project-label,
  #report-printable .memo-partner,
  #report-printable .memo-activity,
  #report-printable .memo-role,
  #report-printable .block-label,
  #report-printable .session-byline,
  #report-printable .activity-aim,
  #report-printable .signoff,
  #report-printable .activity-notes-label {
    color: #555 !important;
  }
  #report-printable .narrative--quote {
    background: #f4f4f5 !important;
    border-left-color: #1d4ed8 !important;
    color: #111 !important;
  }
  #report-printable .activity-notes {
    background: #f4f4f5 !important;
    border-left-color: #1d4ed8 !important;
    color: #111 !important;
  }
  #report-printable .activity-row {
    background: #fff !important;
    border-color: #d4d4d8 !important;
  }
  #report-printable .activity-row::before {
    background: #e0e7ff !important;
    color: #1d4ed8 !important;
  }
  #report-printable .section-no {
    background: #e0e7ff !important;
    color: #1d4ed8 !important;
  }
  #report-printable .pill {
    border: 1px solid #d4d4d8 !important;
    background: #f4f4f5 !important;
    color: #111 !important;
  }
  #report-printable .pill--flag,
  #report-printable .flag-row,
  #report-printable .block-tag--warn {
    background: #fef2f2 !important;
    border-color: #fecaca !important;
    color: #b91c1c !important;
  }
  #report-printable .flag-head,
  #report-printable .flag-bid {
    color: #b91c1c !important;
  }
  #report-printable .memo-rule {
    border-top-color: #d4d4d8 !important;
  }
  #report-printable hr { border-color: #d4d4d8 !important; }

  /* Page setup — narrow margins so the memo occupies the sheet. */
  @page {
    size: A4;
    margin: 14mm 14mm 16mm;
  }
}
</style>
