<template>
  <!--
    DashStatCard — shadcn SectionCards style
    ───────────────────────────────────────────────────────────────────────────
    Layout (top → bottom):
      ┌─────────────────────────────┐
      │ ALL-CAPS LABEL   [▲ +3 pill]│
      │                             │
      │  28                         │
      │                             │
      │ Small muted description     │
      └─────────────────────────────┘

    Props:
      label  — section heading shown in ALL-CAPS muted text
      value  — primary metric (large bold number)
      sub    — optional description shown below the value
      trend  — optional number; positive → green ↑ pill, negative → red ↓ pill
  -->
  <div class="stat-card">

    <!-- Top row: label (left) + optional trend badge (right) -->
    <div class="stat-card__top">
      <span class="stat-card__label">{{ label }}</span>

      <!--
        Trend badge — rendered only when the `trend` prop is provided.
        Uses Unicode arrows so no extra icon component is needed.
      -->
      <span
        v-if="trend !== undefined"
        class="stat-card__trend"
        :class="trend >= 0 ? 'stat-card__trend--up' : 'stat-card__trend--down'"
        aria-label="`Trend: ${trend >= 0 ? 'up' : 'down'} ${Math.abs(trend)}`"
      >
        <!-- Arrow character: ↑ for positive, ↓ for negative -->
        {{ trend >= 0 ? '↑' : '↓' }}
        <!-- Numeric magnitude without a sign — direction is shown by the arrow -->
        {{ Math.abs(trend) }}
      </span>
    </div>

    <!-- Primary metric value — large and bold -->
    <div class="stat-card__value">{{ value }}</div>

    <!-- Optional description line below the value -->
    <p v-if="sub" class="stat-card__sub">{{ sub }}</p>

  </div>
</template>

<script setup lang="ts">
/**
 * DashStatCard
 *
 * A single summary metric card rendered in the dashboard stats grid.
 * Styled to match the shadcn/ui SectionCards pattern: dark panel,
 * uppercase label, large number, and an optional directional trend pill.
 *
 * Usage:
 *   <DashStatCard
 *     label="Reports Submitted"
 *     :value="23"
 *     sub="This period"
 *     :trend="3"
 *   />
 */

defineProps<{
  /** Section heading — rendered in small ALL-CAPS muted style */
  label: string;

  /** Primary displayed metric — the large bold number */
  value: string | number;

  /** Optional description rendered in small muted text below the value */
  sub?: string;

  /**
   * Optional trend indicator.
   *   Positive value  → green pill with ↑ arrow
   *   Negative value  → red   pill with ↓ arrow
   *   Omitted / undefined → no badge shown
   */
  trend?: number;
}>();
</script>

<style scoped>
/* ── Card shell ───────────────────────────────────────────────────────────── */

.stat-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  /* Smooth hover lift */
  transition: border-color 0.16s, box-shadow 0.16s;
}

.stat-card:hover {
  border-color: var(--border-color);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.35);
}

/* ── Top row: label + trend badge ────────────────────────────────────────── */

.stat-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

/* ALL-CAPS muted label, 12 px */
.stat-card__label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  user-select: none;
}

/* ── Trend pill badge ────────────────────────────────────────────────────── */

.stat-card__trend {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 20px;       /* pill shape */
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1;
}

/* Positive trend: green background + text */
.stat-card__trend--up {
  background-color: var(--success-bg);
  color: var(--third);       /* var(--third) = #3b8884 (teal/green) */
}

/* Negative trend: red background + text */
.stat-card__trend--down {
  background-color: var(--error-bg);
  color: var(--error);
}

/* ── Primary value — large bold number ───────────────────────────────────── */

.stat-card__value {
  font-size: 1.75rem;        /* ~28 px */
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
  letter-spacing: -0.5px;
}

/* ── Description — small muted text ─────────────────────────────────────── */

.stat-card__sub {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.4;
}

/* ── Responsive: smaller padding on mobile ───────────────────────────────── */

@media (max-width: 480px) {
  .stat-card {
    padding: 16px 18px;
  }

  .stat-card__value {
    font-size: 1.5rem;
  }
}
</style>
