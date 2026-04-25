<script setup lang="ts">
/**
 * PssDayStepper — mobile day-by-day weekly schedule editor.
 *
 * Jira: DART-43 (sub-task of DART-36 — facilitator builds a weekly
 * schedule for a CFS).
 *
 * What this component renders
 * ---------------------------
 * Exactly ONE day from the schedule's `activeDays`. The day shows a grid
 * of "section cards", one per (timePeriod × ageGroup) combination. Each
 * section card holds 0–4 activity slots:
 *
 *   ┌─────────────────────────────────────────────┐
 *   │ Header  — Mon ◀  1 of 5  ▶                   │
 *   ├─────────────────────────────────────────────┤
 *   │ Morning · Age 6–10                           │
 *   │ ┌─────────────────────────────────────────┐ │
 *   │ │ ⠿  Tag Game        [Play]  [6–10]   ×  │ │
 *   │ │ ⠿  Listening Circle[Wellbeing][6–10] × │ │
 *   │ └─────────────────────────────────────────┘ │
 *   │ [ + Add Activity ]                           │
 *   ├─────────────────────────────────────────────┤
 *   │ Morning · Age 11–14                          │
 *   │   No activities yet — tap + Add              │
 *   │ [ + Add Activity ]                           │
 *   └─────────────────────────────────────────────┘
 *
 * Strict separation of concerns
 * -----------------------------
 * • Stateless presentation. The component never mutates `schedule.templateSlots`
 *   itself; every change is emitted to the parent (`add-activity`,
 *   `remove-slot`, `reorder-slots`). The parent owns the schedule store.
 * • The activity picker (DART-38) is parent-owned. We emit `add-activity`
 *   with the `{ day, timePeriod, ageGroup }` context; the parent opens
 *   the picker, gathers a selection, and writes the new slot back into
 *   the schedule.
 * • Activity display data (name, category, age tag) is resolved through
 *   a `getActivity` lookup callback so this component does not need to
 *   know how the parent stores its activity catalogue (Pinia store,
 *   IndexedDB read, fetch result — caller's choice).
 * • Edit-lock honoured via a `lockedSections` list. Locked sections
 *   show a lock icon and disable add/remove/reorder.
 *
 * Accessibility (DART ticket: "Accessible: keyboard nav for ◀ ▶,
 *  focus order top→bottom within each day")
 * ---------------------------------------------------------------------
 * • The day-nav buttons are real `<button>` elements with `aria-label`s.
 * • Left/Right arrow keys on the header advance days while focus is
 *   inside the header region.
 * • The day announcement region (`role="status"`, `aria-live="polite"`)
 *   reads e.g. "Monday, day 1 of 5" when the day changes.
 * • Each section is a `<section>` with `aria-labelledby` pointing at its
 *   visible heading; sections render in (timePeriod × ageGroup) order so
 *   tab order is naturally top-to-bottom.
 * • Drag handles use ARIA grabbed/dropEffect; tap-and-hold reorder is
 *   the touch path, with explicit move-up / move-down buttons exposed to
 *   keyboard users (always available, even on desktop).
 *
 * What this component does NOT do
 * -------------------------------
 * No API calls. No persistence. No router calls. No toast emission. No
 * PssActivityPicker import. The owning page wires those concerns.
 */

import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Lock,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from 'lucide-vue-next'
import type {
  PssActivityCategory,
  PssActivityAgeGroup,
  PssDayOfWeek,
  PssScheduleAgeGroup,
  PssScheduleRecord,
  PssTemplateSlot,
  PssTimePeriod,
  PssTimePeriodLabel,
} from '../../interfaces/pssDb'

// ─── Public types ───────────────────────────────────────────────────────────

/** Minimal activity shape this component needs to render a slot. */
export interface PssDayStepperActivityView {
  name: string
  category: PssActivityCategory
  ageGroup: PssActivityAgeGroup
}

/** Identifies one section card on a given day. */
export interface PssDayStepperSectionRef {
  day: PssDayOfWeek
  timePeriod: PssTimePeriodLabel
  ageGroup: PssScheduleAgeGroup
}

/** Subset of `PssScheduleRecord` we actually need. */
export type PssDayStepperSchedule = Pick<
  PssScheduleRecord,
  'activeDays' | 'timePeriods' | 'ageGroups' | 'templateSlots'
>

// ─── Props / emits ──────────────────────────────────────────────────────────

interface Props {
  /** Schedule slice to render. */
  schedule: PssDayStepperSchedule
  /** Lookup callback — caller maps activityId → display fields. */
  getActivity: (activityId: string) => PssDayStepperActivityView | undefined
  /** Sections that must not be edited (sessions already started). */
  lockedSections?: PssDayStepperSectionRef[]
  /** Index into `schedule.activeDays` of the currently visible day (v-model). */
  currentDayIndex?: number
  /** Maximum slots a section may hold. PRD/TRD says 4. */
  maxSlotsPerSection?: number
  /** Global disable — overrides per-section lock state. */
  disabled?: boolean
  /** Disable the swipe-to-navigate gesture. */
  disableSwipe?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  lockedSections: () => [],
  currentDayIndex: 0,
  maxSlotsPerSection: 4,
  disabled: false,
  disableSwipe: false,
})

const emit = defineEmits<{
  /** Two-way binding for the day pointer. */
  (e: 'update:currentDayIndex', index: number): void
  /** Parent must open the picker (DART-38) and write a new slot back. */
  (e: 'add-activity', section: PssDayStepperSectionRef): void
  /** Remove a single slot. */
  (e: 'remove-slot', slot: PssTemplateSlot): void
  /**
   * Section was reordered. Payload contains all slots that belong to
   * the section, in their NEW order; `order` field is already 1-indexed
   * to match the canonical contract.
   */
  (e: 'reorder-slots', payload: PssDayStepperSectionRef & {
    slots: PssTemplateSlot[]
  }): void
}>()

// ─── Day-name formatting ────────────────────────────────────────────────────

const DAY_LABELS: Readonly<Record<PssDayOfWeek, string>> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

const TIME_PERIOD_LABELS: Readonly<Record<PssTimePeriodLabel, string>> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
}

const CATEGORY_LABELS: Readonly<Record<PssActivityCategory, string>> = {
  play: 'Play',
  wellbeing: 'Wellbeing',
  learn: 'Learn',
}

function ageLabel(ag: PssActivityAgeGroup | PssScheduleAgeGroup): string {
  if (ag === 'all') return 'All'
  if (ag === 'parents') return 'Parents'
  return ag
}

// ─── Day navigation ─────────────────────────────────────────────────────────

const totalDays = computed(() => props.schedule.activeDays.length)

const safeIndex = computed(() => {
  if (totalDays.value === 0) return 0
  const i = props.currentDayIndex
  if (i < 0) return 0
  if (i >= totalDays.value) return totalDays.value - 1
  return i
})

const currentDay = computed<PssDayOfWeek | null>(() => {
  return props.schedule.activeDays[safeIndex.value] ?? null
})

const canGoPrev = computed(() => safeIndex.value > 0)
const canGoNext = computed(() => safeIndex.value < totalDays.value - 1)

function goTo(index: number): void {
  if (index < 0 || index >= totalDays.value) return
  if (index === safeIndex.value) return
  emit('update:currentDayIndex', index)
}

function goPrev(): void { goTo(safeIndex.value - 1) }
function goNext(): void { goTo(safeIndex.value + 1) }

// ARIA live announcement when the day changes.
const dayAnnouncement = computed(() => {
  if (!currentDay.value) return ''
  const total = totalDays.value
  const pos = safeIndex.value + 1
  return `${DAY_LABELS[currentDay.value]}, day ${pos} of ${total}`
})

function onHeaderKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    goPrev()
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    goNext()
  }
}

// ─── Swipe-to-navigate ──────────────────────────────────────────────────────

const SWIPE_THRESHOLD_PX = 60
const swipeStartX = ref<number | null>(null)
const swipeStartY = ref<number | null>(null)

function onTouchStart(event: TouchEvent): void {
  if (props.disableSwipe) return
  const t = event.touches[0]
  if (!t) return
  swipeStartX.value = t.clientX
  swipeStartY.value = t.clientY
}

function onTouchEnd(event: TouchEvent): void {
  if (props.disableSwipe) return
  if (swipeStartX.value === null || swipeStartY.value === null) return
  const t = event.changedTouches[0]
  if (!t) {
    swipeStartX.value = null
    swipeStartY.value = null
    return
  }
  const dx = t.clientX - swipeStartX.value
  const dy = t.clientY - swipeStartY.value
  swipeStartX.value = null
  swipeStartY.value = null
  // Only treat as a horizontal swipe if X dominates Y (not a scroll).
  if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return
  if (Math.abs(dx) < Math.abs(dy) * 1.2) return
  if (dx < 0) goNext()
  else goPrev()
}

// ─── Section building ───────────────────────────────────────────────────────

interface SectionView {
  ref: PssDayStepperSectionRef
  /** Pretty heading: "Morning · Age 6–10". */
  heading: string
  /** Stable id for `aria-labelledby`. */
  headingId: string
  isLocked: boolean
  slots: PssTemplateSlot[]
}

function sectionKey(s: PssDayStepperSectionRef): string {
  return `${s.day}|${s.timePeriod}|${s.ageGroup}`
}

const lockedSectionKeys = computed<Set<string>>(() => {
  return new Set(props.lockedSections.map(sectionKey))
})

const visibleSections = computed<SectionView[]>(() => {
  const day = currentDay.value
  if (!day) return []

  const periods: PssTimePeriod[] = props.schedule.timePeriods
  const ageGroups: PssScheduleAgeGroup[] = props.schedule.ageGroups
  const allSlots = props.schedule.templateSlots

  // Group day's slots by section key for O(slots) lookup.
  const slotsByKey = new Map<string, PssTemplateSlot[]>()
  for (const slot of allSlots) {
    if (slot.day !== day) continue
    const key = sectionKey({
      day: slot.day,
      timePeriod: slot.timePeriod,
      ageGroup: slot.ageGroup,
    })
    const arr = slotsByKey.get(key)
    if (arr) arr.push(slot)
    else slotsByKey.set(key, [slot])
  }
  // Sort each section by `order` so display reflects intent.
  for (const arr of slotsByKey.values()) {
    arr.sort((a, b) => a.order - b.order)
  }

  const out: SectionView[] = []
  for (const period of periods) {
    for (const ageGroup of ageGroups) {
      const ref: PssDayStepperSectionRef = {
        day,
        timePeriod: period.label,
        ageGroup,
      }
      const key = sectionKey(ref)
      out.push({
        ref,
        heading: `${TIME_PERIOD_LABELS[period.label]} · Age ${ageGroup} (${period.startTime}–${period.endTime})`,
        headingId: `pss-stepper-section-${key.replace(/\|/g, '-')}`,
        isLocked: lockedSectionKeys.value.has(key),
        slots: slotsByKey.get(key) ?? [],
      })
    }
  }
  return out
})

// ─── Slot mutations (delegated to parent) ──────────────────────────────────

function isSectionEditable(section: SectionView): boolean {
  return !props.disabled && !section.isLocked
}

function onAddActivity(section: SectionView): void {
  if (!isSectionEditable(section)) return
  if (section.slots.length >= props.maxSlotsPerSection) return
  emit('add-activity', section.ref)
}

function onRemoveSlot(section: SectionView, slot: PssTemplateSlot): void {
  if (!isSectionEditable(section)) return
  emit('remove-slot', slot)
}

/**
 * Re-emit a section's slot array with new `order` values. Used by both
 * the keyboard / button reorder path AND the touch-drag finish path.
 */
function emitReorder(
  section: SectionView,
  newSlots: PssTemplateSlot[],
): void {
  if (!isSectionEditable(section)) return
  const reindexed = newSlots.map((s, i) => ({ ...s, order: i + 1 }))
  emit('reorder-slots', { ...section.ref, slots: reindexed })
}

function moveSlot(
  section: SectionView,
  slot: PssTemplateSlot,
  delta: -1 | 1,
): void {
  const idx = section.slots.indexOf(slot)
  if (idx < 0) return
  const target = idx + delta
  if (target < 0 || target >= section.slots.length) return
  const next = section.slots.slice()
  const [moved] = next.splice(idx, 1)
  if (!moved) return
  next.splice(target, 0, moved)
  emitReorder(section, next)
}

// ─── Pointer-drag reorder ───────────────────────────────────────────────────

interface DragState {
  sectionKey: string
  slotActivityId: string
  startY: number
}

const dragState = ref<DragState | null>(null)
/** Local optimistic order while a drag is in progress. */
const dragPreviewOrder = ref<PssTemplateSlot[] | null>(null)

function onSlotPointerDown(
  event: PointerEvent,
  section: SectionView,
  slot: PssTemplateSlot,
): void {
  // Only left-button / primary touch.
  if (event.button !== 0 && event.pointerType === 'mouse') return
  if (!isSectionEditable(section)) return
  if (section.slots.length < 2) return

  // Capture the pointer so subsequent move/up events fire on the same
  // element even if the pointer leaves it.
  const target = event.currentTarget as HTMLElement | null
  target?.setPointerCapture?.(event.pointerId)

  dragState.value = {
    sectionKey: sectionKey(section.ref),
    slotActivityId: slot.activityId,
    startY: event.clientY,
  }
  dragPreviewOrder.value = section.slots.slice()
}

function onSlotPointerMove(
  event: PointerEvent,
  section: SectionView,
): void {
  if (!dragState.value) return
  if (dragState.value.sectionKey !== sectionKey(section.ref)) return
  const preview = dragPreviewOrder.value
  if (!preview) return

  // Find the slot we're currently over by hit-testing.
  const elements = document.elementsFromPoint(event.clientX, event.clientY)
  const overSlotEl = elements.find((el) =>
    el instanceof HTMLElement &&
    el.dataset.psssection === dragState.value!.sectionKey &&
    el.dataset.pssslot,
  ) as HTMLElement | undefined
  if (!overSlotEl) return

  const targetActivityId = overSlotEl.dataset.pssslot
  if (!targetActivityId) return
  if (targetActivityId === dragState.value.slotActivityId) return

  const fromIdx = preview.findIndex(
    (s) => s.activityId === dragState.value!.slotActivityId,
  )
  const toIdx = preview.findIndex((s) => s.activityId === targetActivityId)
  if (fromIdx < 0 || toIdx < 0) return

  const next = preview.slice()
  const [moved] = next.splice(fromIdx, 1)
  if (!moved) return
  next.splice(toIdx, 0, moved)
  dragPreviewOrder.value = next
}

function onSlotPointerUp(
  event: PointerEvent,
  section: SectionView,
): void {
  const state = dragState.value
  if (!state) return
  if (state.sectionKey !== sectionKey(section.ref)) return

  const target = event.currentTarget as HTMLElement | null
  target?.releasePointerCapture?.(event.pointerId)

  const finalOrder = dragPreviewOrder.value
  dragState.value = null
  dragPreviewOrder.value = null

  if (!finalOrder) return
  // Only emit if the order actually changed.
  const changed = finalOrder.some(
    (slot, i) => section.slots[i]?.activityId !== slot.activityId,
  )
  if (!changed) return
  emitReorder(section, finalOrder)
}

function onSlotPointerCancel(): void {
  dragState.value = null
  dragPreviewOrder.value = null
}

// If the schedule data changes (parent commits the reorder, or external
// edit), reset any in-flight drag preview to avoid stale rendering.
watch(
  () => props.schedule.templateSlots,
  () => {
    dragState.value = null
    dragPreviewOrder.value = null
  },
)

// Tear down on unmount in case a drag is mid-flight.
onBeforeUnmount(() => {
  dragState.value = null
  dragPreviewOrder.value = null
})

// ─── Render helpers ─────────────────────────────────────────────────────────

/**
 * Slots to render in `section`. While a drag is in progress for this
 * section, show the optimistic preview order so the UI is responsive.
 */
function renderedSlots(section: SectionView): PssTemplateSlot[] {
  if (
    dragState.value &&
    dragState.value.sectionKey === sectionKey(section.ref) &&
    dragPreviewOrder.value
  ) {
    return dragPreviewOrder.value
  }
  return section.slots
}

function isDragging(section: SectionView, slot: PssTemplateSlot): boolean {
  return !!(
    dragState.value &&
    dragState.value.sectionKey === sectionKey(section.ref) &&
    dragState.value.slotActivityId === slot.activityId
  )
}
</script>

<template>
  <div
    class="pss-day-stepper"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <!-- ── Header / day navigation ─────────────────────────────────── -->
    <header
      class="pss-day-stepper__header"
      tabindex="0"
      @keydown="onHeaderKeydown"
      role="toolbar"
      aria-label="Day navigation"
    >
      <button
        type="button"
        class="pss-day-stepper__nav-btn"
        :disabled="!canGoPrev"
        :aria-label="canGoPrev ? `Previous day` : `Previous day (disabled)`"
        @click="goPrev"
      >
        <ChevronLeft :size="20" aria-hidden="true" />
      </button>

      <div class="pss-day-stepper__title">
        <span v-if="currentDay" class="pss-day-stepper__day-name">
          {{ DAY_LABELS[currentDay] }}
        </span>
        <span v-if="totalDays > 0" class="pss-day-stepper__position">
          {{ safeIndex + 1 }} of {{ totalDays }}
        </span>
      </div>

      <button
        type="button"
        class="pss-day-stepper__nav-btn"
        :disabled="!canGoNext"
        :aria-label="canGoNext ? `Next day` : `Next day (disabled)`"
        @click="goNext"
      >
        <ChevronRight :size="20" aria-hidden="true" />
      </button>
    </header>

    <!-- Off-screen live region for day announcements. -->
    <span class="pss-day-stepper__sr-only" role="status" aria-live="polite">
      {{ dayAnnouncement }}
    </span>

    <!-- ── Empty schedule guard ────────────────────────────────────── -->
    <div
      v-if="totalDays === 0"
      class="pss-day-stepper__empty-day"
      role="status"
    >
      No active days configured. Toggle days on in setup to begin.
    </div>

    <!-- ── Section list ────────────────────────────────────────────── -->
    <div v-else class="pss-day-stepper__sections">
      <section
        v-for="section in visibleSections"
        :key="`${section.ref.timePeriod}-${section.ref.ageGroup}`"
        class="pss-section"
        :class="{ 'pss-section--locked': section.isLocked }"
        :aria-labelledby="section.headingId"
      >
        <header class="pss-section__header">
          <h3 :id="section.headingId" class="pss-section__heading">
            {{ section.heading }}
          </h3>
          <span
            v-if="section.isLocked"
            class="pss-section__lock"
            :title="'Section locked — sessions have started'"
          >
            <Lock :size="16" aria-hidden="true" />
            <span class="pss-day-stepper__sr-only">Locked</span>
          </span>
        </header>

        <ul
          v-if="renderedSlots(section).length > 0"
          class="pss-section__slots"
          role="list"
        >
          <li
            v-for="(slot, slotIdx) in renderedSlots(section)"
            :key="slot.activityId + '|' + slotIdx"
            class="pss-slot"
            :class="{ 'pss-slot--dragging': isDragging(section, slot) }"
            :data-psssection="sectionKey(section.ref)"
            :data-pssslot="slot.activityId"
            @pointerdown="onSlotPointerDown($event, section, slot)"
            @pointermove="onSlotPointerMove($event, section)"
            @pointerup="onSlotPointerUp($event, section)"
            @pointercancel="onSlotPointerCancel"
          >
            <span
              class="pss-slot__handle"
              :aria-grabbed="isDragging(section, slot) ? 'true' : 'false'"
              :aria-label="`Drag handle for activity ${slotIdx + 1}`"
            >
              <GripVertical :size="18" aria-hidden="true" />
            </span>

            <div class="pss-slot__body">
              <span class="pss-slot__name">
                {{ getActivity(slot.activityId)?.name ?? 'Unknown activity' }}
              </span>
              <span class="pss-slot__meta">
                <span
                  v-if="getActivity(slot.activityId)"
                  class="pss-slot__badge"
                  :class="`pss-slot__badge--${getActivity(slot.activityId)!.category}`"
                >
                  {{ CATEGORY_LABELS[getActivity(slot.activityId)!.category] }}
                </span>
                <span class="pss-slot__age">
                  Age {{ ageLabel(slot.ageGroup) }}
                </span>
              </span>
            </div>

            <div class="pss-slot__controls">
              <button
                type="button"
                class="pss-slot__icon-btn"
                :disabled="!isSectionEditable(section) || slotIdx === 0"
                :aria-label="`Move ${getActivity(slot.activityId)?.name ?? 'activity'} up`"
                @click.stop="moveSlot(section, slot, -1)"
              >
                <ArrowUp :size="16" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="pss-slot__icon-btn"
                :disabled="!isSectionEditable(section) || slotIdx === renderedSlots(section).length - 1"
                :aria-label="`Move ${getActivity(slot.activityId)?.name ?? 'activity'} down`"
                @click.stop="moveSlot(section, slot, 1)"
              >
                <ArrowDown :size="16" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="pss-slot__icon-btn pss-slot__icon-btn--danger"
                :disabled="!isSectionEditable(section)"
                :aria-label="`Remove ${getActivity(slot.activityId)?.name ?? 'activity'}`"
                @click.stop="onRemoveSlot(section, slot)"
              >
                <X :size="16" aria-hidden="true" />
              </button>
            </div>
          </li>
        </ul>

        <p v-else class="pss-section__empty" role="status">
          No activities yet — tap + Add
        </p>

        <button
          type="button"
          class="pss-section__add"
          :disabled="
            !isSectionEditable(section) ||
            section.slots.length >= maxSlotsPerSection
          "
          :aria-label="`Add activity to ${section.heading}`"
          @click="onAddActivity(section)"
        >
          <Plus :size="18" aria-hidden="true" />
          <span>Add Activity</span>
          <span
            v-if="section.slots.length >= maxSlotsPerSection"
            class="pss-section__add-note"
          >
            (Max {{ maxSlotsPerSection }})
          </span>
        </button>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* WCAG-AA on the dark theme background (#0f0f1a). */
.pss-day-stepper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: #e5e7eb;
  font-family: inherit;
  /* Disable native horizontal swipe pull-to-refresh during touch nav. */
  touch-action: pan-y;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.pss-day-stepper__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #1a1a2e;
  border: 1px solid #27273a;
  border-radius: 12px;
  outline: none;
}

.pss-day-stepper__header:focus-visible {
  border-color: #818cf8;
  box-shadow: 0 0 0 2px rgba(129, 140, 248, 0.4);
}

.pss-day-stepper__title {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.pss-day-stepper__day-name {
  font-size: 17px;
  font-weight: 700;
  color: #f3f4f6;
}

.pss-day-stepper__position {
  font-size: 12px;
  font-weight: 500;
  color: #9ca3af;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
}

.pss-day-stepper__nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: #27273a;
  color: #e5e7eb;
  border: 1px solid #3a3a52;
  border-radius: 10px;
  cursor: pointer;
  padding: 0;
}

.pss-day-stepper__nav-btn:hover:not(:disabled),
.pss-day-stepper__nav-btn:focus-visible {
  background: #3a3a52;
  outline: none;
  border-color: #818cf8;
}

.pss-day-stepper__nav-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* ── Section list ────────────────────────────────────────────────────────── */
.pss-day-stepper__sections {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pss-day-stepper__empty-day {
  padding: 24px 16px;
  text-align: center;
  font-size: 14px;
  background: #1a1a2e;
  border: 1px dashed #3a3a52;
  border-radius: 12px;
  color: #9ca3af;
}

.pss-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #1a1a2e;
  border: 1px solid #27273a;
  border-radius: 12px;
}

.pss-section--locked {
  opacity: 0.78;
  background: #14141f;
}

.pss-section__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pss-section__heading {
  flex: 1;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #c7d2fe;
  letter-spacing: 0.01em;
}

.pss-section__lock {
  display: inline-flex;
  align-items: center;
  color: #9ca3af;
}

.pss-section__slots {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pss-section__empty {
  margin: 4px 0 0;
  padding: 12px;
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
  background: #0f0f1a;
  border: 1px dashed #27273a;
  border-radius: 8px;
}

.pss-section__add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  min-height: 44px;
  background: transparent;
  color: #c7d2fe;
  border: 1px dashed #4b5563;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.pss-section__add:hover:not(:disabled),
.pss-section__add:focus-visible {
  background: rgba(129, 140, 248, 0.08);
  border-color: #818cf8;
  outline: none;
}

.pss-section__add:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pss-section__add-note {
  font-size: 11px;
  font-weight: 500;
  color: #9ca3af;
}

/* ── Slot row ────────────────────────────────────────────────────────────── */
.pss-slot {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #0f0f1a;
  border: 1px solid #27273a;
  border-radius: 8px;
  /* Reorder is the primary touch interaction — don't let scrolling steal it. */
  touch-action: none;
  user-select: none;
}

.pss-slot--dragging {
  background: #1f1f33;
  border-color: #818cf8;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.pss-slot__handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  cursor: grab;
}

.pss-slot--dragging .pss-slot__handle {
  cursor: grabbing;
  color: #c7d2fe;
}

.pss-slot__body {
  min-width: 0; /* allow text to truncate */
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pss-slot__name {
  font-size: 14px;
  font-weight: 600;
  color: #f3f4f6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pss-slot__meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #9ca3af;
}

.pss-slot__badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.pss-slot__badge--play     { background: #1e3a8a; color: #93c5fd; }
.pss-slot__badge--wellbeing { background: #14532d; color: #86efac; }
.pss-slot__badge--learn    { background: #4a1d6f; color: #d8b4fe; }

.pss-slot__age {
  color: #9ca3af;
}

.pss-slot__controls {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.pss-slot__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  color: #d1d5db;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
}

.pss-slot__icon-btn:hover:not(:disabled),
.pss-slot__icon-btn:focus-visible {
  background: rgba(255, 255, 255, 0.06);
  border-color: #3a3a52;
  outline: none;
}

.pss-slot__icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.pss-slot__icon-btn--danger:hover:not(:disabled),
.pss-slot__icon-btn--danger:focus-visible {
  color: #fca5a5;
  border-color: #b91c1c;
}

/* ── A11y utility ────────────────────────────────────────────────────────── */
.pss-day-stepper__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ── ≤360 px refinements ─────────────────────────────────────────────────── */
@media (max-width: 360px) {
  .pss-section { padding: 10px; }
  .pss-section__heading { font-size: 13px; }
  .pss-slot { grid-template-columns: 24px 1fr auto; gap: 6px; padding: 6px 8px; }
  .pss-slot__icon-btn { width: 28px; height: 28px; }
}
</style>
