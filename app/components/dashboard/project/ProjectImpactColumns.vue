<template>
  <div class="panel">
    <div class="panel-head">
      <h2 class="panel-title">Progress by impact</h2>
      <span class="panel-note">
        <template v-if="expected"><i class="legend-dash" aria-hidden="true" />{{ expected }}% expected by now · </template>Select to filter
      </span>
    </div>

    <div class="cols" :style="{ '--expected': expected ?? 0 }">
      <div
        v-if="expected"
        class="cols-expected"
        :title="`${expected}% of the project period has passed`"
      />

      <button
        v-for="imp in impacts"
        :key="imp.id"
        type="button"
        class="col"
        :aria-pressed="selected === imp.id"
        :aria-label="`Impact ${imp.number}: ${imp.progress === null ? 'no targets yet' : `${imp.progress}% of target`}`"
        :title="imp.title"
        @click="emit('select', selected === imp.id ? null : imp.id)"
      >
        <span class="col-lab num">{{ imp.progress === null ? '—' : `${imp.progress}%` }}</span>
        <span class="col-bar">
          <span
            v-if="imp.progress !== null"
            class="col-done"
            :class="`col-done--${imp.status}`"
            :style="{ height: `${imp.progress}%` }"
          />
        </span>
      </button>
    </div>

    <div class="colx">
      <span v-for="imp in impacts" :key="imp.id" :title="imp.title">Impact {{ imp.number }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IndicatorStatus } from '~/utils/projectDashboard'

defineProps<{
  impacts: { id: string; number: string; title: string; progress: number | null; status: IndicatorStatus }[]
  /** Share of the project period elapsed, drawn as the "expected" line. */
  expected: number | null
  selected: string | null
}>()

const emit = defineEmits<{ select: [id: string | null] }>()
</script>
