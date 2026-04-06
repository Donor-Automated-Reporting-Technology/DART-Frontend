<template>
  <div class="skeleton-table">
    <!-- Skeleton Filter Bar -->
    <div class="skeleton-filters">
      <div class="skeleton-search skeleton-pulse" />
      <div class="skeleton-chip skeleton-pulse" />
      <div class="skeleton-chip skeleton-pulse" />
      <div class="skeleton-chip skeleton-pulse" />
      <div class="skeleton-chip skeleton-pulse" />
    </div>

    <!-- Skeleton Table (desktop) -->
    <div class="skeleton-table-container">
      <div class="skeleton-header-row">
        <div class="skeleton-header-cell skeleton-pulse" v-for="i in 6" :key="'h'+i" />
      </div>
      <div
        v-for="row in rows"
        :key="row"
        class="skeleton-row"
        :class="{ 'skeleton-row--even': row % 2 === 0 }"
      >
        <!-- Avatar -->
        <div class="skeleton-cell skeleton-cell--avatar">
          <div class="skeleton-avatar skeleton-pulse" />
        </div>
        <!-- Name + Role block -->
        <div class="skeleton-cell skeleton-cell--name">
          <div class="skeleton-line skeleton-line--primary skeleton-pulse" />
          <div class="skeleton-line skeleton-line--secondary skeleton-pulse" />
        </div>
        <!-- Department -->
        <div class="skeleton-cell">
          <div class="skeleton-line skeleton-line--medium skeleton-pulse" />
        </div>
        <!-- Status -->
        <div class="skeleton-cell">
          <div class="skeleton-badge skeleton-pulse" />
        </div>
        <!-- Assigned Activities -->
        <div class="skeleton-cell skeleton-cell--number">
          <div class="skeleton-line skeleton-line--short skeleton-pulse" />
        </div>
        <!-- Last Active -->
        <div class="skeleton-cell">
          <div class="skeleton-line skeleton-line--long skeleton-pulse" />
        </div>
      </div>
    </div>

    <!-- Skeleton Cards (mobile) -->
    <div class="skeleton-cards">
      <div v-for="row in rows" :key="'m'+row" class="skeleton-card">
        <div class="skeleton-card-top">
          <div class="skeleton-avatar skeleton-pulse" />
          <div class="skeleton-card-text">
            <div class="skeleton-line skeleton-line--primary skeleton-pulse" />
            <div class="skeleton-line skeleton-line--secondary skeleton-pulse" />
          </div>
        </div>
        <div class="skeleton-card-bottom">
          <div class="skeleton-badge skeleton-pulse" />
          <div class="skeleton-line skeleton-line--short skeleton-pulse" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  rows?: number
}>()
</script>

<style scoped>
/* ── Pulse animation ────────────────────────────────────────────────────── */
@keyframes skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton-pulse {
  background: linear-gradient(
    90deg,
    var(--hover-bg) 25%,
    var(--hover-bg-subtle) 37%,
    var(--hover-bg) 63%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.8s ease-in-out infinite;
  border-radius: 6px;
}

/* ── Filter bar skeleton ────────────────────────────────────────────────── */
.skeleton-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.skeleton-search {
  height: 40px;
  flex: 1;
  min-width: 200px;
  border-radius: 10px;
}

.skeleton-chip {
  height: 36px;
  width: 80px;
  border-radius: 100px;
}

/* ── Table skeleton (desktop) ───────────────────────────────────────────── */
.skeleton-table-container {
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: var(--bg-panel);
}

.skeleton-header-row {
  display: grid;
  grid-template-columns: 48px 2fr 1fr 100px 80px 1fr;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-color);
}

.skeleton-header-cell {
  height: 10px;
  border-radius: 4px;
}

.skeleton-row {
  display: grid;
  grid-template-columns: 48px 2fr 1fr 100px 80px 1fr;
  gap: 12px;
  padding: 16px 20px;
  align-items: center;
  border-bottom: 1px solid var(--border-subtle);
}

.skeleton-row--even {
  background: var(--hover-bg-subtle);
}

/* Cell types */
.skeleton-cell { display: flex; flex-direction: column; gap: 6px; }
.skeleton-cell--avatar { justify-content: center; align-items: center; }
.skeleton-cell--name { gap: 5px; }
.skeleton-cell--number { align-items: flex-end; }

.skeleton-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-line {
  height: 10px;
}

.skeleton-line--primary { width: 80%; height: 12px; }
.skeleton-line--secondary { width: 55%; height: 9px; opacity: 0.6; }
.skeleton-line--short { width: 32px; }
.skeleton-line--medium { width: 72px; }
.skeleton-line--long { width: 85%; }

.skeleton-badge {
  height: 24px;
  width: 68px;
  border-radius: 100px;
}

/* ── Card skeleton (mobile) ─────────────────────────────────────────────── */
.skeleton-cards { display: none; }

@media (max-width: 768px) {
  .skeleton-table-container { display: none; }
  .skeleton-cards {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
}

.skeleton-card {
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--bg-panel);
}

.skeleton-card-top {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.skeleton-card-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.skeleton-card-bottom {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
