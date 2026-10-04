<template>
  <div class="panel">
    <div class="panel-head">
      <h2 class="panel-title">Who we reach</h2>
      <div v-if="dimensions.length > 1" class="seg" role="group" aria-label="Breakdown">
        <button
          v-for="(d, i) in dimensions"
          :key="d.dimension"
          type="button"
          :aria-pressed="i === active"
          @click="active = i"
        >{{ d.label }}</button>
      </div>
      <span v-else-if="current" class="panel-note">{{ current.label }}</span>
    </div>

    <p v-if="!current" class="panel-empty">
      No breakdown yet. Add disaggregated targets to the logframe, or enrol beneficiaries, to see who the project reaches.
    </p>

    <template v-else>
      <div v-for="bar in bars" :key="bar.key" class="reach-row">
        <div class="reach-row-head">
          <span>{{ bar.label }}</span>
          <span class="num">{{ formatNumber(bar.total) }}</span>
        </div>
        <div class="stack" role="img" :aria-label="`${bar.label} by ${current.label.toLowerCase()}`">
          <i
            v-for="seg in bar.segments"
            :key="seg.key"
            :title="`${seg.label}: ${formatNumber(seg.value)} (${pct(seg.value, bar.total)}%)`"
            :style="{ flex: seg.value, background: seg.color }"
          />
        </div>
      </div>

      <div class="legend">
        <div v-for="g in groups" :key="g.key" class="legend-item">
          <span class="sw" :style="{ background: g.color }" />
          <span class="legend-label">{{ g.label }}</span>
          <span class="legend-value num">
            <template v-if="g.target">{{ formatNumber(g.actual) }} <small>of {{ formatNumber(g.target) }}</small></template>
            <template v-else>{{ formatNumber(g.actual) }}</template>
          </span>
        </div>
      </div>

      <div v-if="splits.length" class="split">
        <span v-for="s in splits" :key="s.label">{{ s.label }} <strong class="num">{{ s.value }}</strong></span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ProjectSummary, TargetDisaggregation } from '~/interfaces/dashboard'
import { formatNumber } from '~/utils/projectDashboard'

const props = defineProps<{
  disaggregations: TargetDisaggregation[]
  summary: ProjectSummary
}>()

// Categorical slots, fixed order (validated for colour-vision deficiency in
// both themes). A dimension with more values folds the rest into "Other".
const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', 'var(--series-6)']
const OTHER = 'var(--series-other)'

interface Group { key: string; label: string; target: number; actual: number; color: string }
interface Dimension { dimension: string; label: string; groups: Group[] }

function colourGroups(values: Omit<Group, 'color'>[]): Group[] {
  const kept = values.slice(0, SERIES.length - (values.length > SERIES.length ? 1 : 0))
  const rest = values.slice(kept.length)
  const out = kept.map((v, i) => ({ ...v, color: SERIES[i]! }))
  if (rest.length) {
    out.push({
      key: 'other', label: 'Other', color: OTHER,
      target: rest.reduce((s, v) => s + v.target, 0),
      actual: rest.reduce((s, v) => s + v.actual, 0),
    })
  }
  return out
}

/** Logframe dimensions, or enrolment by sex when the project has none. */
const dimensions = computed<Dimension[]>(() => {
  const fromLogframe = props.disaggregations
    .filter(d => d.values.some(v => v.target > 0 || v.actual > 0))
    .map(d => ({
      dimension: d.dimension,
      label: d.label,
      groups: colourGroups(d.values.map(v => ({ key: v.key, label: v.label, target: v.target, actual: v.actual }))),
    }))
  if (fromLogframe.length) return fromLogframe

  const { girls, boys, unique_beneficiaries } = props.summary
  if (!unique_beneficiaries) return []
  const other = Math.max(unique_beneficiaries - girls - boys, 0)
  return [{
    dimension: 'enrolment',
    label: 'Enrolled by sex',
    groups: colourGroups([
      { key: 'girls', label: 'Girls / female', target: 0, actual: girls },
      { key: 'boys', label: 'Boys / male', target: 0, actual: boys },
      ...(other ? [{ key: 'other', label: 'Not recorded', target: 0, actual: other }] : []),
    ]),
  }]
})

const active = ref(0)
const current = computed(() => dimensions.value[Math.min(active.value, dimensions.value.length - 1)] ?? null)
const groups = computed(() => current.value?.groups ?? [])

const sum = (key: 'target' | 'actual') => groups.value.reduce((s, g) => s + g[key], 0)

/** "Targeted" and "Reached" share the same colours so their mix compares at a glance. */
const bars = computed(() => {
  const rows: { key: string; label: string; total: number; segments: { key: string; label: string; value: number; color: string }[] }[] = []
  for (const [key, label] of [['target', 'Targeted'], ['actual', 'Reached']] as const) {
    const total = sum(key)
    if (!total) continue
    rows.push({
      key, label, total,
      segments: groups.value.filter(g => g[key] > 0).map(g => ({ key: g.key, label: g.label, value: g[key], color: g.color })),
    })
  }
  return rows
})

function pct(part: number, whole: number): number {
  return whole ? Math.round((part / whole) * 100) : 0
}

const splits = computed(() => {
  const out: { label: string; value: string }[] = []
  const target = sum('target')
  const actual = sum('actual')
  if (target) out.push({ label: 'Reached', value: `${pct(actual, target)}% of target` })
  else if (actual) out.push({ label: 'Total', value: formatNumber(actual) })
  const disability = props.summary.with_disability
  if (disability && props.summary.unique_beneficiaries) {
    out.push({ label: 'With a disability', value: `${formatNumber(disability)} (${pct(disability, props.summary.unique_beneficiaries)}%)` })
  }
  return out
})
</script>
