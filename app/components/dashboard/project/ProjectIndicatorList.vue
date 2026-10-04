<template>
  <section class="panel" aria-label="Indicators">
    <div class="list-head">
      <h2 class="panel-title">Indicators <span class="panel-count">{{ visibleCount }} of {{ totalCount }}</span></h2>
      <div class="filters">
        <button
          v-if="impactFilter"
          type="button"
          class="chip chip--impact"
          aria-pressed="true"
          :title="`Show all impacts`"
          @click="emit('clear-impact')"
        >Impact {{ filteredImpactNumber }} <span aria-hidden="true">×</span></button>
        <button
          v-for="f in FILTERS"
          :key="f.key"
          type="button"
          class="chip"
          :aria-pressed="filter === f.key"
          @click="filter = f.key"
        >{{ f.label }}<span v-if="f.key !== 'all'" class="chip-n num">{{ counts[f.key] }}</span></button>
      </div>
    </div>

    <div class="thead">
      <span>Indicator</span>
      <span class="r">Target</span>
      <span>Progress<template v-if="expected"> · line marks {{ expected }}% expected</template></span>
      <span class="r">Status</span>
    </div>

    <p v-if="!visibleCount" class="panel-empty">
      {{ totalCount ? 'No indicators match this filter.' : 'No indicators yet. Add them in Settings → Projects → Logframe.' }}
    </p>

    <template v-for="group in visibleGroups" :key="group.id">
      <div class="group">
        <span class="group-title">
          <template v-if="group.number">Impact {{ group.number }} · </template>{{ group.title }}
        </span>
        <span class="group-meta">
          <span v-if="group.progress !== null" class="num">{{ group.progress }}%</span>
          <NuxtLink v-if="group.link" :to="group.link" class="group-link">Open impact →</NuxtLink>
        </span>
      </div>

      <template v-for="row in group.rows" :key="row.ind.id">
        <div
          class="row"
          tabindex="0"
          role="button"
          :aria-expanded="open === row.ind.id"
          @click="toggle(row.ind.id)"
          @keydown.enter.prevent="toggle(row.ind.id)"
          @keydown.space.prevent="toggle(row.ind.id)"
        >
          <div class="ti">
            <div class="t">{{ row.ind.indicator }}</div>
            <div class="c">{{ [row.ind.code, row.levelLabel].filter(Boolean).join(' · ') }}</div>
          </div>

          <div class="tg num">
            <template v-if="hasTarget(row.ind.target_value)">{{ formatNumber(row.ind.target_value) }}</template>
            <span v-else class="muted">—</span>
          </div>

          <div class="prog">
            <template v-if="row.progress !== null">
              <div class="track">
                <i :class="`fill--${row.status}`" :style="{ width: `${Math.min(row.progress, 100)}%` }" />
                <b v-if="expected" class="track-expected" :style="{ left: `${expected}%` }" />
              </div>
              <div class="lbl">
                <span class="num">{{ formatNumber(row.ind.actual_value) }} of {{ formatNumber(row.ind.target_value) }}{{ row.ind.unit ? ` ${row.ind.unit}` : '' }}</span>
                <span class="num">{{ row.progress }}%</span>
              </div>
            </template>
            <span v-else class="lbl">{{ row.fieldCount ? `${row.fieldCount} target field${row.fieldCount === 1 ? '' : 's'} · open for detail` : 'No target set' }}</span>
          </div>

          <div class="stat">
            <span class="pill" :class="`pill--${row.status}`">{{ STATUS_LABELS[row.status] }}</span>
            <span v-if="row.issues" class="dq">● {{ row.issues }} to set up</span>
          </div>
        </div>

        <div v-if="open === row.ind.id" class="detail">
          <div>
            <div class="eyebrow">Indicator</div>
            <p>{{ row.ind.indicator }}</p>

            <div class="eyebrow detail-gap">{{ levelTypeLabel(row.ind.level_type) }}</div>
            <p>{{ row.ind.level_title }}</p>

            <div class="eyebrow detail-gap">Linked activities</div>
            <ul v-if="row.activities.length" class="detail-acts">
              <li v-for="a in row.activities" :key="a.id">
                <NuxtLink :to="activityDashboardRoute(a.module, a.id)" class="detail-act">
                  <span>{{ a.name }}<small v-if="!a.is_active"> · inactive</small></span>
                  <span class="num">{{ formatNumber(a.actual_count) }} enrolled</span>
                </NuxtLink>
              </li>
            </ul>
            <p v-else>None yet. Link activities from the indicator in Settings → Logframe.</p>

            <div class="kv">
              <span v-if="row.ind.unit"><b>Unit</b> {{ row.ind.unit }}</span>
              <span v-if="row.ind.baseline_value != null"><b>Baseline</b> {{ formatNumber(row.ind.baseline_value) }}</span>
              <span v-if="hasTarget(row.ind.target_value)"><b>Target</b> {{ formatNumber(row.ind.target_value) }}</span>
              <span><b>Actual</b> {{ formatNumber(row.ind.actual_value) }}</span>
            </div>
          </div>

          <div>
            <template v-if="row.ind.target_fields?.length">
              <div class="eyebrow">Target fields</div>
              <div v-for="(tf, i) in row.ind.target_fields" :key="i" class="dbar">
                <span class="dbar-label" :title="targetFieldSourceLabel(tf)">{{ tf.label }}</span>
                <span class="tr"><i v-if="tf.target != null && tf.actual != null" :style="{ width: `${Math.min(tf.percentage, 100)}%` }" /></span>
                <span class="n num">
                  <template v-if="tf.actual != null">{{ formatNumber(tf.actual) }}<template v-if="tf.target != null"> / {{ formatNumber(tf.target) }}</template></template>
                  <template v-else-if="tf.target != null">— / {{ formatNumber(tf.target) }}</template>
                  <template v-else>—</template>
                </span>
              </div>
            </template>

            <div class="eyebrow" :class="{ 'detail-gap': row.ind.target_fields?.length }">Setup checks</div>
            <div class="checks">
              <div v-for="(c, i) in row.checks" :key="i" class="check" :class="`check--${c.level}`">
                <span class="m">{{ c.level === 'ok' ? '✓' : '!' }}</span>
                <span>{{ c.text }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { activityDashboardRoute } from '~/utils/activityConfig'
import {
  STATUS_LABELS,
  formatNumber,
  hasTarget,
  levelTypeLabel,
  targetFieldSourceLabel,
} from '~/utils/projectDashboard'
import type { IndicatorGroup } from '~/utils/projectDashboard'

const props = defineProps<{
  groups: IndicatorGroup[]
  expected: number | null
  impactFilter: string | null
}>()

const emit = defineEmits<{ 'clear-impact': [] }>()

type FilterKey = 'all' | 'behind' | 'setup'
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'behind', label: 'Behind or needs attention' },
  { key: 'setup', label: 'Needs setup' },
]

const filter = ref<FilterKey>('all')
const open = ref<string | null>(null)

function toggle(id: string) {
  open.value = open.value === id ? null : id
}

const allRows = computed(() => props.groups.flatMap(g => g.rows))
const totalCount = computed(() => allRows.value.length)

function matches(row: IndicatorGroup['rows'][number], key: FilterKey): boolean {
  if (key === 'behind') return row.status === 'bad' || row.status === 'warn'
  if (key === 'setup') return row.issues > 0
  return true
}

const inImpact = computed(() =>
  props.impactFilter ? props.groups.filter(g => g.id === props.impactFilter) : props.groups,
)

const counts = computed(() => {
  const rows = inImpact.value.flatMap(g => g.rows)
  return {
    all: rows.length,
    behind: rows.filter(r => matches(r, 'behind')).length,
    setup: rows.filter(r => matches(r, 'setup')).length,
  }
})

const visibleGroups = computed(() =>
  inImpact.value
    .map(g => ({ ...g, rows: g.rows.filter(r => matches(r, filter.value)) }))
    .filter(g => g.rows.length),
)
const visibleCount = computed(() => visibleGroups.value.reduce((s, g) => s + g.rows.length, 0))

const filteredImpactNumber = computed(() => props.groups.find(g => g.id === props.impactFilter)?.number ?? '')
</script>
