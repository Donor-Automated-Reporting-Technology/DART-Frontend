<template>
  <div class="panel">
    <div class="panel-head">
      <h2 class="panel-title">Progress by year</h2>
      <div v-if="impacts.length > 1" class="pager" role="group" aria-label="Impacts">
        <button type="button" class="pager-btn" :disabled="index === 0" aria-label="Previous impact" @click="go(-1)">‹</button>
        <span class="pager-label num">{{ index + 1 }} of {{ impacts.length }}</span>
        <button type="button" class="pager-btn" :disabled="index >= impacts.length - 1" aria-label="Next impact" @click="go(1)">›</button>
      </div>
    </div>

    <div v-if="current" class="yp-impact">
      <div class="yp-impact-head">
        <span class="yp-impact-title" :title="current.title">Impact {{ current.number }} · {{ current.title }}</span>
        <span class="yp-impact-total num">{{ formatNumber(current.actual) }}<template v-if="current.target"> of {{ formatNumber(current.target) }}</template></span>
      </div>

      <div class="yp-legend">
        <span><i class="sw yp-sw-target" />Target</span>
        <span><i class="sw yp-sw-actual" />Reached</span>
      </div>

      <div class="yp-cols">
        <div
          v-for="y in current.years"
          :key="y.year"
          class="yp-col"
          :class="{ 'yp-col--now': y.year === currentYear }"
          :title="columnTitle(y)"
        >
          <span class="yp-lab num">{{ y.future && !y.actual ? '—' : y.target ? `${y.pct}%` : formatNumber(y.actual) }}</span>
          <span class="yp-bars">
            <span v-if="y.target" class="yp-bar yp-bar--target" :style="{ height: `${scale(y.target)}%` }" />
            <span class="yp-bar yp-bar--actual" :style="{ height: `${scale(y.actual)}%` }" />
          </span>
          <span class="yp-x">{{ y.label }}<b v-if="y.year === currentYear" class="yp-now">Now</b></span>
        </div>
      </div>
      <p v-if="!current.hasYearTargets" class="yp-note">No year targets yet, showing reach only.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatNumber, type ImpactYears, type YearPoint } from '~/utils/projectDashboard'

const props = defineProps<{
  impacts: ImpactYears[]
  currentYear: number | null
  /** The impact on screen, shared with the indicator list. */
  active: string | null
}>()

const emit = defineEmits<{ select: [id: string] }>()

const index = computed(() => Math.max(props.impacts.findIndex(imp => imp.id === props.active), 0))
const current = computed(() => props.impacts[index.value] ?? null)

function go(step: number) {
  const next = props.impacts[index.value + step]
  if (next) emit('select', next.id)
}

/** Bars share one scale so the impact's years compare directly. */
function scale(value: number): number {
  const max = Math.max(...(current.value?.years ?? []).map(y => Math.max(y.target, y.actual)), 1)
  return Math.max((value / max) * 100, value > 0 ? 2 : 0)
}

function columnTitle(y: YearPoint): string {
  if (y.future && !y.actual) return `${y.label}: not started${y.target ? ` · target ${formatNumber(y.target)}` : ''}`
  return y.target
    ? `${y.label}: ${formatNumber(y.actual)} reached of ${formatNumber(y.target)} (${y.pct}%)`
    : `${y.label}: ${formatNumber(y.actual)} reached, no year target`
}
</script>
