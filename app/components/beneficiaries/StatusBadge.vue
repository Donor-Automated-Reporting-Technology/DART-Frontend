<template>
  <span :class="['status-badge', statusClass]">
    <span class="status-dot" aria-hidden="true" />
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: string
}>()

const statusClass = computed(() => {
  switch (props.status) {
    case 'verified': return 'status-verified'
    case 'active': return 'status-active'
    case 'in_review': return 'status-review'
    case 'pending': return 'status-pending'
    case 'inactive': return 'status-inactive'
    default: return 'status-default'
  }
})

const label = computed(() => {
  switch (props.status) {
    case 'verified': return 'Verified'
    case 'active': return 'Active'
    case 'in_review': return 'In Review'
    case 'pending': return 'Pending'
    case 'inactive': return 'Inactive'
    default: return props.status
  }
})
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 550;
  letter-spacing: 0.01em;
  line-height: 1.4;
  white-space: nowrap;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Verified — soft green (Apple HIG) */
.status-verified {
  background: rgba(52, 199, 89, 0.10);
  color: #248a3d;
}
.status-verified .status-dot { background: #34c759; }

[data-theme="dark"] .status-verified,
:root .status-verified {
  color: #30d158;
}

/* Active — soft blue */
.status-active {
  background: rgba(0, 122, 255, 0.10);
  color: #0060df;
}
.status-active .status-dot { background: #007aff; }

[data-theme="dark"] .status-active,
:root .status-active {
  color: #64d2ff;
}

/* In Review — soft amber */
.status-review {
  background: rgba(255, 149, 0, 0.10);
  color: #9a6700;
}
.status-review .status-dot { background: #ff9500; }

[data-theme="dark"] .status-review,
:root .status-review {
  color: #ffd60a;
}

/* Pending — soft orange */
.status-pending {
  background: rgba(255, 179, 64, 0.10);
  color: #b25000;
}
.status-pending .status-dot { background: #ffb340; }

[data-theme="dark"] .status-pending,
:root .status-pending {
  color: #ff9f0a;
}

/* Inactive — soft grey */
.status-inactive {
  background: rgba(142, 142, 147, 0.10);
  color: #6e6e73;
}
.status-inactive .status-dot { background: #8e8e93; }

/* Default */
.status-default {
  background: rgba(142, 142, 147, 0.06);
  color: #86868b;
}
.status-default .status-dot { background: #aeaeb2; }
</style>
