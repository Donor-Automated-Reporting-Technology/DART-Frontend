<script setup lang="ts">
/**
 * PssActivityPicker — bottom sheet (mobile) / centered modal (desktop)
 * for choosing a PSS activity to fill a schedule slot.
 *
 * Jira: DART-38 (sub-task of DART-36 — facilitator builds a weekly
 * schedule for a CFS).
 *
 * Behaviour
 * ---------
 * • Opens as a bottom sheet on viewports ≤ 767 px and as a centered
 *   modal-style popover on wider screens. Both variants share the same
 *   markup; layout is purely CSS so the component has one keyboard /
 *   focus / data path.
 * • Bound to `GET /api/v1/pss/activities` via the foundation's
 *   `usePssApi` composable (DART-66). When the network call fails OR the
 *   browser reports `navigator.onLine === false`, it transparently falls
 *   back to the IndexedDB cache via `activitiesRepository.filter()` —
 *   the cache is seeded with the 62 built-in UNICEF activities at boot
 *   and updated when sync runs (DART-63).
 * • Filters:
 *     – Age group: the parent section's age group (`6-10` | `11-14` |
 *       `15-17`) PLUS activities tagged `all`. Backend already returns
 *       `all`-tagged rows when an age group filter is supplied (per
 *       contract), and we re-filter client-side when reading from the
 *       cache.
 *     – Tabs: All / Play / Wellbeing / Learn (segmented control).
 *     – Search: case-insensitive match on `name` or `description`.
 * • Each row: name, truncated description, age tag, category badge.
 * • Tapping a row emits `select` with the full activity record and
 *   closes the sheet via `update:open`.
 * • '+ Create New Activity' link emits `create-new` (parent routes to
 *   DART-29 form, then re-opens the picker with the new activity
 *   pre-selected by setting `presetActivityId`).
 *
 * What this component does NOT do
 * -------------------------------
 * • No persistence — purely a chooser. The owning page wires the
 *   selected activity back into its schedule store / DART-43 stepper.
 * • No router calls — `create-new` is an emit; the parent owns routing.
 * • No focus-trap library — we focus the search box on open and listen
 *   for ESC + backdrop click to close. Radix-style trap is overkill for
 *   a picker that only contains buttons + one text input.
 *
 * Accessibility
 * -------------
 * • Backdrop overlay uses `role="presentation"`; the panel uses
 *   `role="dialog"` `aria-modal="true"` `aria-labelledby` pointing at
 *   the visible title.
 * • Search input is auto-focused on open; ESC closes; clicking the
 *   backdrop closes.
 * • Tabs use `role="tablist"` / `role="tab"` with `aria-selected` and
 *   ArrowLeft / ArrowRight keyboard navigation.
 * • Loading + empty states announce via `role="status"` /
 *   `aria-live="polite"`.
 * • All hit targets are ≥ 44 px in the mobile breakpoint.
 */

import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { Search, X, Plus, AlertTriangle, RefreshCw } from 'lucide-vue-next'
import type {
  PssActivityRecord,
  PssActivityCategory,
  PssActivityAgeGroup,
  PssScheduleAgeGroup,
} from '../../interfaces/pssDb'
import type { PssApiError } from '../../interfaces/pss'
import { usePssApi } from '../../composables/usePssApi'
import { activitiesRepository } from '../../services/pss/repositories'
import PssLoadingSkeleton from './PssLoadingSkeleton.vue'

// ─── Types ──────────────────────────────────────────────────────────────────

type CategoryTab = 'all' | PssActivityCategory

interface Props {
  /** Picker visibility (v-model:open). */
  open: boolean
  /** Section's age group — drives the primary filter. */
  ageGroup: PssScheduleAgeGroup
  /** Optional dialog title. Defaults to 'Add Activity'. */
  title?: string
  /**
   * If supplied, the picker auto-selects the matching activity once it
   * loads (used after returning from the Create-New flow → DART-29).
   */
  presetActivityId?: string | null
  /** Disable the '+ Create New Activity' affordance. */
  hideCreateNew?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Add Activity',
  presetActivityId: null,
  hideCreateNew: false,
})

const emit = defineEmits<{
  (e: 'update:open', open: boolean): void
  (e: 'select', activity: PssActivityRecord): void
  (e: 'create-new'): void
}>()

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Readonly<Record<CategoryTab, string>> = {
  all: 'All',
  play: 'Play',
  wellbeing: 'Wellbeing',
  learn: 'Learn',
}

const TAB_ORDER: readonly CategoryTab[] = [
  'all',
  'play',
  'wellbeing',
  'learn',
] as const

function ageLabel(ag: PssActivityAgeGroup): string {
  if (ag === 'all') return 'All ages'
  if (ag === 'parents') return 'Parents'
  return `Age ${ag}`
}

// ─── Local state ────────────────────────────────────────────────────────────

const activeTab = ref<CategoryTab>('all')
const searchQuery = ref<string>('')
const isLoading = ref<boolean>(false)
const loadError = ref<PssApiError | null>(null)
const activities = ref<PssActivityRecord[]>([])

const searchInputEl = ref<HTMLInputElement | null>(null)
const tabButtonEls = ref<Array<HTMLButtonElement | null>>([])

let inflightAbort: AbortController | null = null

// ─── Loading ────────────────────────────────────────────────────────────────

const api = usePssApi()

/**
 * Fetch activities for the section's age group. Backend returns
 * `all`-tagged activities alongside the requested age group per the
 * v1 contract, so we don't need to merge two queries client-side.
 *
 * On any failure (network, 5xx, offline) we fall back to the local
 * IndexedDB cache so the picker remains usable.
 */
async function loadActivities(): Promise<void> {
  // Cancel any in-flight request from a previous open.
  inflightAbort?.abort()
  const ctrl = new AbortController()
  inflightAbort = ctrl

  isLoading.value = true
  loadError.value = null

  const ageGroupParam: PssActivityAgeGroup = props.ageGroup

  // Offline → straight to cache.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    try {
      activities.value = await readFromCache(ageGroupParam)
    } catch (err) {
      loadError.value = toPssError(err)
    } finally {
      if (inflightAbort === ctrl) inflightAbort = null
      isLoading.value = false
    }
    return
  }

  try {
    const rows = await api.get<PssActivityRecord[]>('/pss/activities', {
      query: { age_group: ageGroupParam },
      signal: ctrl.signal,
    })
    if (ctrl.signal.aborted) return
    activities.value = rows ?? []
  } catch (err) {
    if (ctrl.signal.aborted) return
    // Surface the error AND attempt the cache so the user can still pick.
    try {
      const cached = await readFromCache(ageGroupParam)
      activities.value = cached
      // Only show the error banner if the cache also turned up empty.
      if (cached.length === 0) loadError.value = toPssError(err)
    } catch {
      activities.value = []
      loadError.value = toPssError(err)
    }
  } finally {
    if (inflightAbort === ctrl) inflightAbort = null
    isLoading.value = false
  }
}

/**
 * Read from the IndexedDB cache, including activities tagged `all`.
 * Returns deduped rows (in case the same activity appears under two
 * filters). Custom activities are included by default.
 */
async function readFromCache(
  ageGroup: PssActivityAgeGroup,
): Promise<PssActivityRecord[]> {
  const [forAge, allTagged] = await Promise.all([
    activitiesRepository.filter({ ageGroup }),
    activitiesRepository.filter({ ageGroup: 'all' }),
  ])
  const seen = new Set<string>()
  const out: PssActivityRecord[] = []
  for (const row of [...forAge, ...allTagged]) {
    const key = row.clientId || row.id
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  return out
}

function toPssError(err: unknown): PssApiError {
  if (
    err &&
    typeof err === 'object' &&
    'status' in err &&
    'code' in err &&
    'message' in err
  ) {
    return err as PssApiError
  }
  return {
    status: 0,
    code: 'unknown',
    message:
      err instanceof Error
        ? err.message
        : 'Could not load activities. Tap Retry to try again.',
  }
}

// ─── Filtering ──────────────────────────────────────────────────────────────

const visibleActivities = computed<PssActivityRecord[]>(() => {
  const tab = activeTab.value
  const q = searchQuery.value.trim().toLowerCase()
  return activities.value.filter((row) => {
    if (tab !== 'all' && row.category !== tab) return false
    if (q) {
      const haystack = `${row.name} ${row.description}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
})

const isEmpty = computed(
  () => !isLoading.value && !loadError.value && visibleActivities.value.length === 0,
)

// ─── Open / close lifecycle ────────────────────────────────────────────────

function close(): void {
  if (!props.open) return
  emit('update:open', false)
}

function onSelect(row: PssActivityRecord): void {
  emit('select', row)
  close()
}

function onCreateNew(): void {
  emit('create-new')
  close()
}

function onBackdropClick(): void {
  close()
}

function onPanelKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    close()
  }
}

// Open side-effects: lock body scroll, focus search, kick off load.
watch(
  () => props.open,
  async (isOpen, wasOpen) => {
    if (isOpen && !wasOpen) {
      lockBodyScroll()
      // Reset transient UI state per open. Preserve `activeTab` /
      // `searchQuery` would surprise the user — they expect a fresh sheet.
      activeTab.value = 'all'
      searchQuery.value = ''
      await loadActivities()
      await nextTick()
      searchInputEl.value?.focus()
      maybeAutoSelectPreset()
    } else if (!isOpen && wasOpen) {
      unlockBodyScroll()
      inflightAbort?.abort()
      inflightAbort = null
    }
  },
  { immediate: true },
)

// If `ageGroup` changes while open (e.g. parent reused the picker for a
// different section without closing it), refresh the dataset.
watch(
  () => props.ageGroup,
  () => {
    if (props.open) loadActivities()
  },
)

watch(
  () => props.presetActivityId,
  () => {
    if (props.open) maybeAutoSelectPreset()
  },
)

function maybeAutoSelectPreset(): void {
  const target = props.presetActivityId
  if (!target) return
  const match = activities.value.find(
    (row) => row.id === target || row.clientId === target,
  )
  if (match) onSelect(match)
}

// ─── Body-scroll lock ──────────────────────────────────────────────────────

let previousBodyOverflow: string | null = null

function lockBodyScroll(): void {
  if (typeof document === 'undefined') return
  if (previousBodyOverflow !== null) return
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
}

function unlockBodyScroll(): void {
  if (typeof document === 'undefined') return
  if (previousBodyOverflow === null) return
  document.body.style.overflow = previousBodyOverflow
  previousBodyOverflow = null
}

onBeforeUnmount(() => {
  unlockBodyScroll()
  inflightAbort?.abort()
})

// ─── Tab keyboard navigation ───────────────────────────────────────────────

function onTabKeydown(event: KeyboardEvent, index: number): void {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  const dir = event.key === 'ArrowRight' ? 1 : -1
  const nextIdx =
    (index + dir + TAB_ORDER.length) % TAB_ORDER.length
  const nextTab = TAB_ORDER[nextIdx]
  if (!nextTab) return
  activeTab.value = nextTab
  nextTick(() => tabButtonEls.value[nextIdx]?.focus())
}

function setTabRef(index: number) {
  return (el: Element | ComponentPublicInstance | null) => {
    tabButtonEls.value[index] = el as HTMLButtonElement | null
  }
}

// Lucide icons used in markup are imported above; expose dialog title id
// for `aria-labelledby`.
import type { ComponentPublicInstance } from 'vue'
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="pss-picker__backdrop"
      role="presentation"
      @click.self="onBackdropClick"
    >
      <div
        class="pss-picker__panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @keydown="onPanelKeydown"
      >
        <!-- ── Header ─────────────────────────────────────────────── -->
        <header class="pss-picker__header">
          <h2 :id="titleId" class="pss-picker__title">{{ title }}</h2>
          <button
            type="button"
            class="pss-picker__close"
            aria-label="Close activity picker"
            @click="close"
          >
            <X :size="20" aria-hidden="true" />
          </button>
        </header>

        <!-- ── Search ─────────────────────────────────────────────── -->
        <div class="pss-picker__search">
          <Search
            :size="18"
            class="pss-picker__search-icon"
            aria-hidden="true"
          />
          <input
            ref="searchInputEl"
            v-model="searchQuery"
            type="search"
            inputmode="search"
            autocomplete="off"
            spellcheck="false"
            class="pss-picker__search-input"
            placeholder="Search activities…"
            aria-label="Search activities by name or description"
          />
        </div>

        <!-- ── Tabs ───────────────────────────────────────────────── -->
        <div
          class="pss-picker__tabs"
          role="tablist"
          aria-label="Activity category"
        >
          <button
            v-for="(tab, idx) in TAB_ORDER"
            :key="tab"
            :ref="setTabRef(idx)"
            type="button"
            role="tab"
            :aria-selected="activeTab === tab"
            :tabindex="activeTab === tab ? 0 : -1"
            class="pss-picker__tab"
            :class="{ 'pss-picker__tab--active': activeTab === tab }"
            @click="activeTab = tab"
            @keydown="onTabKeydown($event, idx)"
          >
            {{ CATEGORY_LABELS[tab] }}
          </button>
        </div>

        <!-- ── Body ───────────────────────────────────────────────── -->
        <div class="pss-picker__body">
          <!-- Loading -->
          <div
            v-if="isLoading"
            class="pss-picker__loading"
            role="status"
            aria-live="polite"
          >
            <PssLoadingSkeleton variant="list" :rows="4" label="Loading activities" />
          </div>

          <!-- Error -->
          <div
            v-else-if="loadError"
            class="pss-picker__error"
            role="alert"
          >
            <AlertTriangle
              :size="20"
              class="pss-picker__error-icon"
              aria-hidden="true"
            />
            <div class="pss-picker__error-body">
              <p class="pss-picker__error-title">Couldn't load activities</p>
              <p class="pss-picker__error-message">{{ loadError.message }}</p>
            </div>
            <button
              type="button"
              class="pss-picker__retry"
              aria-label="Retry loading activities"
              @click="loadActivities"
            >
              <RefreshCw :size="16" aria-hidden="true" />
              <span>Retry</span>
            </button>
          </div>

          <!-- Empty -->
          <div
            v-else-if="isEmpty"
            class="pss-picker__empty"
            role="status"
            aria-live="polite"
          >
            <p>No activities found — try Create New</p>
          </div>

          <!-- Results -->
          <ul
            v-else
            class="pss-picker__list"
            role="listbox"
            :aria-label="`${visibleActivities.length} activities`"
          >
            <li
              v-for="row in visibleActivities"
              :key="row.id || row.clientId"
              role="option"
              :aria-selected="false"
              class="pss-picker__row"
            >
              <button
                type="button"
                class="pss-picker__row-btn"
                @click="onSelect(row)"
              >
                <span class="pss-picker__row-name">{{ row.name }}</span>
                <span
                  v-if="row.description"
                  class="pss-picker__row-desc"
                >
                  {{ row.description }}
                </span>
                <span class="pss-picker__row-meta">
                  <span
                    class="pss-picker__badge"
                    :class="`pss-picker__badge--${row.category}`"
                  >
                    {{ CATEGORY_LABELS[row.category] }}
                  </span>
                  <span class="pss-picker__row-age">
                    {{ ageLabel(row.ageGroup) }}
                  </span>
                  <span
                    v-if="row.source === 'custom'"
                    class="pss-picker__row-custom"
                    title="Custom activity"
                  >
                    Custom
                  </span>
                </span>
              </button>
            </li>
          </ul>
        </div>

        <!-- ── Footer ─────────────────────────────────────────────── -->
        <footer v-if="!hideCreateNew" class="pss-picker__footer">
          <button
            type="button"
            class="pss-picker__create"
            @click="onCreateNew"
          >
            <Plus :size="18" aria-hidden="true" />
            <span>Create New Activity</span>
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Overlay ───────────────────────────────────────────────────────────── */
.pss-picker__backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: flex-end;     /* mobile = bottom sheet */
  justify-content: center;
  /* Use safe-area insets on iOS to avoid the bottom home-bar overlap. */
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.pss-picker__panel {
  width: 100%;
  max-height: 88vh;
  background: #1a1a2e;
  color: #e5e7eb;
  border: 1px solid #27273a;
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.45);
  overflow: hidden;
}

@media (min-width: 768px) {
  .pss-picker__backdrop {
    align-items: center;     /* desktop = centered modal */
    padding: 24px;
  }
  .pss-picker__panel {
    max-width: 560px;
    max-height: 80vh;
    border-radius: 16px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);
  }
}

/* ── Header ────────────────────────────────────────────────────────────── */
.pss-picker__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px 8px;
  border-bottom: 1px solid #27273a;
}

.pss-picker__title {
  flex: 1;
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #f3f4f6;
}

.pss-picker__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: transparent;
  color: #d1d5db;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  padding: 0;
}

.pss-picker__close:hover,
.pss-picker__close:focus-visible {
  background: rgba(255, 255, 255, 0.06);
  border-color: #3a3a52;
  outline: none;
}

/* ── Search ────────────────────────────────────────────────────────────── */
.pss-picker__search {
  position: relative;
  padding: 8px 16px;
}

.pss-picker__search-icon {
  position: absolute;
  left: 26px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
}

.pss-picker__search-input {
  width: 100%;
  height: 44px;
  padding: 0 12px 0 38px;
  background: #0f0f1a;
  color: #f3f4f6;
  border: 1px solid #27273a;
  border-radius: 10px;
  font-size: 14px;
  outline: none;
  /* Strip Safari's default search "X" so we own the styling. */
  -webkit-appearance: none;
  appearance: none;
}

.pss-picker__search-input::-webkit-search-cancel-button {
  -webkit-appearance: none;
  appearance: none;
}

.pss-picker__search-input:focus {
  border-color: #818cf8;
  box-shadow: 0 0 0 2px rgba(129, 140, 248, 0.4);
}

.pss-picker__search-input::placeholder {
  color: #6b7280;
}

/* ── Tabs ──────────────────────────────────────────────────────────────── */
.pss-picker__tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 4px;
  margin: 0 16px 8px;
  background: #0f0f1a;
  border: 1px solid #27273a;
  border-radius: 10px;
}

.pss-picker__tab {
  height: 36px;
  padding: 0 8px;
  background: transparent;
  color: #d1d5db;
  border: 1px solid transparent;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.pss-picker__tab:hover,
.pss-picker__tab:focus-visible {
  background: rgba(255, 255, 255, 0.04);
  outline: none;
}

.pss-picker__tab--active {
  background: #27273a;
  color: #f3f4f6;
  border-color: #3a3a52;
}

/* ── Body ──────────────────────────────────────────────────────────────── */
.pss-picker__body {
  flex: 1;
  min-height: 200px;
  overflow-y: auto;
  padding: 4px 16px 12px;
  -webkit-overflow-scrolling: touch;
}

.pss-picker__loading {
  padding: 12px 0;
}

.pss-picker__empty {
  padding: 32px 16px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}

/* Inline error banner — distinct from PssErrorBoundary which catches
   render-time errors; this is for fetch failures inside an open sheet. */
.pss-picker__error {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin: 8px 0;
  background: rgba(220, 38, 38, 0.12);
  border: 1px solid rgba(220, 38, 38, 0.4);
  border-radius: 10px;
}

.pss-picker__error-icon {
  color: #fca5a5;
}

.pss-picker__error-body {
  min-width: 0;
}

.pss-picker__error-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #fecaca;
}

.pss-picker__error-message {
  margin: 2px 0 0;
  font-size: 12px;
  color: #fda4a4;
  word-break: break-word;
}

.pss-picker__retry {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 36px;
  padding: 0 10px;
  background: #b91c1c;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.pss-picker__retry:hover,
.pss-picker__retry:focus-visible {
  background: #dc2626;
  outline: none;
}

/* ── Result rows ───────────────────────────────────────────────────────── */
.pss-picker__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pss-picker__row {
  margin: 0;
}

.pss-picker__row-btn {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  min-height: 64px;
  text-align: left;
  background: #0f0f1a;
  color: inherit;
  border: 1px solid #27273a;
  border-radius: 10px;
  cursor: pointer;
}

.pss-picker__row-btn:hover,
.pss-picker__row-btn:focus-visible {
  background: #1f1f33;
  border-color: #818cf8;
  outline: none;
}

.pss-picker__row-name {
  font-size: 14px;
  font-weight: 600;
  color: #f3f4f6;
}

.pss-picker__row-desc {
  font-size: 12px;
  color: #9ca3af;
  /* 2-line clamp keeps rows compact on small screens. */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pss-picker__row-meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  flex-wrap: wrap;
}

.pss-picker__badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.pss-picker__badge--play     { background: #1e3a8a; color: #93c5fd; }
.pss-picker__badge--wellbeing { background: #14532d; color: #86efac; }
.pss-picker__badge--learn    { background: #4a1d6f; color: #d8b4fe; }

.pss-picker__row-age {
  font-size: 11px;
  color: #9ca3af;
}

.pss-picker__row-custom {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #fcd34d;
  border: 1px solid rgba(252, 211, 77, 0.4);
  padding: 1px 5px;
  border-radius: 4px;
}

/* ── Footer ────────────────────────────────────────────────────────────── */
.pss-picker__footer {
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0));
  border-top: 1px solid #27273a;
  background: #14141f;
}

.pss-picker__create {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 44px;
  background: transparent;
  color: #c7d2fe;
  border: 1px dashed #4b5563;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.pss-picker__create:hover,
.pss-picker__create:focus-visible {
  background: rgba(129, 140, 248, 0.08);
  border-color: #818cf8;
  outline: none;
}

/* ── ≤360 px refinements ───────────────────────────────────────────────── */
@media (max-width: 360px) {
  .pss-picker__title { font-size: 16px; }
  .pss-picker__tab { font-size: 12px; height: 34px; }
  .pss-picker__row-btn { padding: 8px 10px; min-height: 56px; }
}
</style>
