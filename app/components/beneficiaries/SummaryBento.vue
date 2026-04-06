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
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.bento__subtitle {
  font-size: 0.8rem;
  color: #6E6E73;
  margin: 0 0 20px;
}

.bento__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.bento__card {
  background: var(--input-field-bg, #FBFBFD);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 18px;
}

.bento__card--wide {
  grid-column: span 2;
}

.bento__card-title {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6E6E73;
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
  color: #6E6E73;
  font-weight: 400;
  flex-shrink: 0;
}

.bento__dd {
  font-size: 0.82rem;
  color: var(--text-primary);
  font-weight: 500;
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
