<template>
  <div class="panel">
    <div class="panel-head">
      <h2 class="panel-title">Progress by year</h2>
      <div v-if="pageCount > 1" class="pager" role="group" aria-label="Impacts">
        <button type="button" class="pager-btn" :disabled="page === 0" aria-label="Previous impacts" @click="page--">‹</button>
        <span class="pager-label num">{{ page * PER_PAGE + 1 }}–{{ Math.min((page + 1) * PER_PAGE, impacts.length) }} of {{ impacts.length }}</span>
        <button type="button" class="pager-btn" :disabled="page >= pageCount - 1" aria-label="Next impacts" @click="page++">›</button>
      </div>
    </div>

    <div class="yp-legend">
      <span><i class="sw yp-sw-target" />Target</span>
      <span><i class="sw yp-sw-actual" />Reached</span>
    </div>

    <div v-for="imp in visible" :key="imp.id" class="yp-impact">
      <button
        type="button"
        class="yp-impact-head"
        :aria-pressed="selected === imp.id"
        :title="selected === imp.id ? 'Show all impacts' : 'Show only this impact below'"
        @click="emit('select', selected === imp.id ? null : imp.id)"
      >
        <span class="yp-impact-title">Impact {{ imp.number }} · {{ imp.title }}</span>
        <span class="yp-impact-total num">{{ formatNumber(imp.actual) }}<template v-if="imp.target"> of {{ formatNumber(imp.target) }}</template></span>
      </button>

      <div class="yp-cols">
        <div
          v-for="y in imp.years"
          :key="y.year"
          class="yp-col"
          :class="{ 'yp-col--now': y.year === currentYear }"
          :title="columnTitle(y)"
        >
          <span class="yp-lab num">{{ y.future && !y.actual ? '—' : y.target ? `${y.pct}%` : formatNumber(y.actual) }}</span>
          <span class="yp-bars">
            <span v-if="y.target" class="yp-bar yp-bar--target" :style="{ height: `${scale(imp, y.target)}%` }" />
            <span class="yp-bar yp-bar--actual" :style="{ height: `${scale(imp, y.actual)}%` }" />
          </span>
          <span class="yp-x">{{ y.label }}<b v-if="y.year === currentYear" class="yp-now">Now</b></span>
        </div>
      </div>
      <p v-if="!imp.hasYearTargets" class="yp-note">No year targets yet: showing reach only. Set them on the indicator in Settings → Logframe.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatNumber, type ImpactYears, type YearPoint } from '~/utils/projectDashboard'

const props = defineProps<{
  impacts: ImpactYears[]
  currentYear: number | null
  selected: string | null
}>()

const emit = defineEmits<{ select: [id: string | null] }>()

const PER_PAGE = 2
const page = ref(0)
const pageCount = computed(() => Math.ceil(props.impacts.length / PER_PAGE))
const visible = computed(() => props.impacts.slice(page.value * PER_PAGE, (page.value + 1) * PER_PAGE))

// Keep the selected impact on screen when it is chosen elsewhere.
watch(() => props.selected, (id) => {
  const i = props.impacts.findIndex(imp => imp.id === id)
  if (i >= 0) page.value = Math.floor(i / PER_PAGE)
})
watch(pageCount, (n) => { if (page.value >= n) page.value = Math.max(n - 1, 0) })

/** Bars share one scale per impact so its years compare directly. */
function scale(imp: ImpactYears, value: number): number {
  const max = Math.max(...imp.years.map(y => Math.max(y.target, y.actual)), 1)
  return Math.max((value / max) * 100, value > 0 ? 2 : 0)
}

function columnTitle(y: YearPoint): string {
  if (y.future && !y.actual) return `${y.label}: not started${y.target ? ` · target ${formatNumber(y.target)}` : ''}`
  return y.target
    ? `${y.label}: ${formatNumber(y.actual)} reached of ${formatNumber(y.target)} (${y.pct}%)`
    : `${y.label}: ${formatNumber(y.actual)} reached, no year target`
}
</script>
