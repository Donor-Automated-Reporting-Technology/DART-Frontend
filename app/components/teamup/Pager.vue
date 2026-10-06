<template>
  <nav v-if="pageCount > 1" class="tu-pager" :aria-label="label">
    <button type="button" class="tu-btn tu-btn--ghost" :disabled="page <= 1" aria-label="Previous page" @click="$emit('update:page', page - 1)">
      <AppIcon name="chevron-left" :size="16" />
    </button>
    <span class="tu-muted">
      Page <strong>{{ page }}</strong> of {{ pageCount }}
      <template v-if="total != null"> · {{ total }} {{ noun }}</template>
    </span>
    <button type="button" class="tu-btn tu-btn--ghost" :disabled="page >= pageCount" aria-label="Next page" @click="$emit('update:page', page + 1)">
      <AppIcon name="chevron-right" :size="16" />
    </button>
  </nav>
</template>

<script setup lang="ts">
import AppIcon from '../interfaces/AppIcon.vue'
withDefaults(defineProps<{
  page: number
  pageCount: number
  total?: number
  noun?: string
  label?: string
}>(), { noun: 'children', label: 'Pages' })

defineEmits<{ 'update:page': [value: number] }>()
</script>
