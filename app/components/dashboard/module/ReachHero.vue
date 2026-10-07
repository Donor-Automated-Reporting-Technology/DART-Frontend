<template>
  <div class="reach-hero">
    <div class="reach-top">
      <span class="reach-icon"><AppIcon name="users" :size="20" /></span>
      <span v-if="badge" class="reach-badge">{{ badge }}</span>
    </div>
    <div class="reach-primary">
      <span class="reach-big">{{ total }}</span>
      <span class="reach-label">
        {{ label }}<template v-if="target"> · {{ pct }}% of {{ target }} target</template>
      </span>
    </div>
    <div class="reach-splits">
      <div class="split split--girls">
        <span class="split-dot" />
        <span class="split-value">{{ girls }}</span>
        <span class="split-label">{{ girlsLabel }}</span>
      </div>
      <div class="split split--boys">
        <span class="split-dot" />
        <span class="split-value">{{ boys }}</span>
        <span class="split-label">{{ boysLabel }}</span>
      </div>
      <div class="split split--disability">
        <span class="split-dot" />
        <span class="split-value">{{ withDisability }}</span>
        <span class="split-label">With Disability</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Reach card shared by every activity-module dashboard (TeamUp, Parenting,
 * Community Dialogue, Mass Awareness…). Mirrors the organisation-level
 * "Total Unique Beneficiaries" hero: one big number with girls / boys /
 * disability split cards underneath.
 */
import { computed } from 'vue'
import AppIcon from '../../interfaces/AppIcon.vue'

const props = withDefaults(defineProps<{
  total: number
  girls: number
  boys: number
  withDisability: number
  label?: string
  badge?: string
  target?: number
  girlsLabel?: string
  boysLabel?: string
}>(), { label: 'Children reached', girlsLabel: 'Girls', boysLabel: 'Boys' })

const pct = computed(() => (props.target ? Math.round((props.total / props.target) * 100) : 0))
</script>

<style scoped>
.reach-hero {
  position: relative;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg, 16px);
  padding: 22px;
  display: flex;
  flex-direction: column;
}
.reach-hero::before {
  content: '';
  position: absolute;
  top: -40px;
  right: -40px;
  width: 160px;
  height: 160px;
  background: radial-gradient(circle, var(--data-teal-dim) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}
.reach-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.reach-icon { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 10px; background: var(--data-teal-dim); color: var(--data-teal); }
.reach-badge { font-size: 0.68rem; font-weight: 600; color: var(--text-muted); background: var(--hover-bg); padding: 4px 10px; border-radius: 20px; }
.reach-primary { display: flex; flex-direction: column; gap: 4px; margin-bottom: 20px; }
.reach-big { font-size: 2.8rem; font-weight: 800; color: var(--text-primary); line-height: 1; letter-spacing: -1px; font-variant-numeric: tabular-nums; }
.reach-label { font-size: 0.82rem; font-weight: 500; color: var(--text-secondary); }
.reach-splits { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.split { display: flex; flex-direction: column; gap: 4px; padding: 14px 12px; border-radius: var(--radius-md, 12px); }
.split-dot { width: 6px; height: 6px; border-radius: 50%; margin-bottom: 2px; }
.split-value { font-size: 1.35rem; font-weight: 700; line-height: 1.2; font-variant-numeric: tabular-nums; }
.split-label { font-size: 0.68rem; font-weight: 500; color: var(--text-muted); }
.split--girls { background: var(--data-teal-dim); }
.split--girls .split-dot { background: var(--data-teal); }
.split--girls .split-value { color: var(--data-teal); }
.split--boys { background: var(--data-purple-dim); }
.split--boys .split-dot { background: var(--data-purple); }
.split--boys .split-value { color: var(--data-purple); }
.split--disability { background: rgba(255, 149, 0, 0.08); }
.split--disability .split-dot { background: var(--warning); }
.split--disability .split-value { color: var(--warning); }
@media (max-width: 480px) {
  .reach-splits { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .split { padding: 10px 8px; }
  .split-value { font-size: 1.1rem; }
}
</style>
