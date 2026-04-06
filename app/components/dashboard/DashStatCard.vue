<template>
  <div class="stat-card" :class="{ 'stat-card--accent': accent }">

    <!-- Top row: icon (left) + optional trend badge (right) -->
    <div class="stat-card__top">
      <div v-if="icon" class="stat-card__icon" :class="`stat-card__icon--${iconColor || 'primary'}`">
        <AppIcon :name="icon" :size="18" />
      </div>
      <span
        v-if="trend !== undefined"
        class="stat-card__trend"
        :class="trend >= 0 ? 'stat-card__trend--up' : 'stat-card__trend--down'"
      >
        {{ trend >= 0 ? '\u2191' : '\u2193' }}
        {{ Math.abs(trend) }}%
      </span>
    </div>

    <!-- Primary metric value -->
    <div class="stat-card__value">{{ value }}</div>

    <!-- Label -->
    <span class="stat-card__label">{{ label }}</span>

    <!-- Optional description line -->
    <p v-if="sub" class="stat-card__sub">{{ sub }}</p>

  </div>
</template>

<script setup lang="ts">
import AppIcon from '../interfaces/AppIcon.vue';

defineProps<{
  label: string;
  value: string | number;
  sub?: string;
  trend?: number;
  icon?: string;
  iconColor?: 'primary' | 'success' | 'warning' | 'accent';
  accent?: boolean;
}>();
</script>

<style scoped>
.stat-card {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border-color, #E5E5EA);
  border-radius: var(--radius-lg, 20px);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  overflow: hidden;
}

.stat-card:hover {
  box-shadow: var(--shadow-elevated);
  transform: translateY(-1px);
}

.stat-card--accent {
  background: var(--primary-dim);
  border-color: rgba(0, 122, 255, 0.10);
}

/* Top row */
.stat-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

/* Icon circle */
.stat-card__icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md, 16px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-card__icon--primary {
  background: var(--primary-dim);
  color: var(--primary);
}

.stat-card__icon--success {
  background: var(--success-bg);
  color: var(--success);
}

.stat-card__icon--warning {
  background: var(--warning-bg);
  color: var(--warning);
}

.stat-card__icon--accent {
  background: var(--primary-dim);
  color: var(--primary);
}

/* Label */
.stat-card__label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary, #86868B);
  line-height: 1.3;
}

/* Trend pill */
.stat-card__trend {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1;
}

.stat-card__trend--up {
  background-color: var(--success-bg);
  color: var(--success);
  font-weight: 700;
}

.stat-card__trend--down {
  background-color: var(--warning-bg);
  color: var(--warning);
}

/* Value */
.stat-card__value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary, #1D1D1F);
  line-height: 1;
  letter-spacing: -0.5px;
  font-variant-numeric: tabular-nums;
}

/* Description */
.stat-card__sub {
  margin: 2px 0 0;
  font-size: 0.75rem;
  color: var(--text-muted, #AEAEB2);
  line-height: 1.4;
}

@media (max-width: 480px) {
  .stat-card {
    padding: 18px;
  }
  .stat-card__value {
    font-size: 1.65rem;
  }
}
</style>
