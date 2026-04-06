<template>
  <div class="bento">
    <h3 class="bento__title">Review &amp; Confirm</h3>
    <p class="bento__subtitle">Please verify everything looks correct before submitting.</p>

    <div class="bento__grid">
      <div
        v-for="group in groups"
        :key="group.title"
        class="bento__card"
        :class="{ 'bento__card--wide': group.wide }"
      >
        <h4 class="bento__card-title">{{ group.title }}</h4>
        <dl class="bento__list">
          <div v-for="item in group.items" :key="item.label" class="bento__row">
            <dt class="bento__dt">{{ item.label }}</dt>
            <dd class="bento__dd">{{ item.value || '—' }}</dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface BentoItem {
  label: string
  value: string
}

export interface BentoGroup {
  title: string
  items: BentoItem[]
  wide?: boolean
}

defineProps<{
  groups: BentoGroup[]
}>()
</script>

<style scoped>
.bento__title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.bento__subtitle {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0 0 20px;
}

.bento__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.bento__card {
  background: color-mix(in srgb, var(--bg-dark) 60%, var(--bg-panel));
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 16px 18px;
  transition: box-shadow 0.2s;
}

.bento__card:hover {
  box-shadow: 0 2px 12px color-mix(in srgb, var(--text-primary) 6%, transparent);
}

.bento__card--wide {
  grid-column: span 2;
}

.bento__card-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--primary);
  margin: 0 0 10px;
}

.bento__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
}

.bento__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.bento__dt {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 500;
  flex-shrink: 0;
}

.bento__dd {
  font-size: 0.82rem;
  color: var(--text-primary);
  font-weight: 600;
  text-align: right;
  margin: 0;
  min-width: 0;
  word-break: break-word;
}

@media (max-width: 560px) {
  .bento__grid {
    grid-template-columns: 1fr;
  }
  .bento__card--wide {
    grid-column: span 1;
  }
}
</style>
