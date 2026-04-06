<template>
  <div class="filter-bar-container">
    <!-- Search + Chips row -->
    <div class="filter-bar-row">
      <!-- Search input with autocomplete -->
      <div class="search-wrapper">
        <AppIcon name="search" :size="15" class="search-icon" />
        <input
          ref="searchRef"
          v-model="searchValue"
          type="search"
          class="search-input"
          placeholder="Search beneficiaries…"
          @input="$emit('search', searchValue)"
          @focus="showSuggestions = true"
          @blur="hideSuggestions"
          autocomplete="off"
        />
        <button
          v-if="searchValue"
          class="search-clear"
          @click="searchValue = ''; $emit('search', '')"
          aria-label="Clear search"
        >
          <AppIcon name="x" :size="13" />
        </button>

        <!-- Autocomplete dropdown -->
        <div v-if="showSuggestions && suggestions.length" class="search-suggestions">
          <button
            v-for="s in suggestions"
            :key="s"
            class="suggestion-item"
            @mousedown.prevent="selectSuggestion(s)"
          >
            <AppIcon name="search" :size="12" class="suggestion-icon" />
            {{ s }}
          </button>
        </div>
      </div>

      <!-- Filter Chips -->
      <div class="filter-chips">
        <button
          v-for="chip in chips"
          :key="chip.value"
          :class="['filter-chip', { 'filter-chip--active': chip.active }]"
          @click="$emit('chip-toggle', chip.value)"
        >
          {{ chip.label }}
          <span v-if="chip.count !== undefined" class="chip-count">{{ chip.count }}</span>
        </button>
      </div>

      <!-- Advanced filter trigger -->
      <button class="filter-drawer-trigger" @click="$emit('open-drawer')" title="Advanced Filters">
        <AppIcon name="sliders-horizontal" :size="15" />
        <span class="trigger-label">Filters</span>
        <span v-if="activeFilterCount > 0" class="trigger-badge">{{ activeFilterCount }}</span>
      </button>
    </div>

    <!-- Active filter tags (progressive disclosure) -->
    <div v-if="activeTags.length > 0" class="active-tags">
      <TransitionGroup name="tag-fade">
        <span
          v-for="tag in activeTags"
          :key="tag.key"
          class="filter-tag"
        >
          {{ tag.label }}
          <button class="tag-remove" @click="$emit('remove-tag', tag.key)" aria-label="Remove filter">
            <AppIcon name="x" :size="10" />
          </button>
        </span>
      </TransitionGroup>
      <button class="clear-all-btn" @click="$emit('clear-all')">Clear all</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  modelValue: string
  chips: Array<{ label: string; value: string; active: boolean; count?: number }>
  activeTags: Array<{ key: string; label: string }>
  activeFilterCount: number
  recentSearches?: string[]
}>()

const emit = defineEmits<{
  search: [value: string]
  'chip-toggle': [value: string]
  'open-drawer': []
  'remove-tag': [key: string]
  'clear-all': []
  'update:modelValue': [value: string]
}>()

const searchRef = ref<HTMLInputElement | null>(null)
const searchValue = ref(props.modelValue)
const showSuggestions = ref(false)

watch(() => props.modelValue, (v) => { searchValue.value = v })
watch(searchValue, (v) => { emit('update:modelValue', v) })

const suggestions = computed(() => {
  if (!searchValue.value || searchValue.value.length < 2) return props.recentSearches?.slice(0, 5) || []
  return (props.recentSearches || [])
    .filter(s => s.toLowerCase().includes(searchValue.value.toLowerCase()))
    .slice(0, 5)
})

function selectSuggestion(s: string) {
  searchValue.value = s
  showSuggestions.value = false
  emit('search', s)
}

function hideSuggestions() {
  setTimeout(() => { showSuggestions.value = false }, 200)
}
</script>

<style scoped>
.filter-bar-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.filter-bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* ── Search ─────────────────────────────────────────────────────────── */
.search-wrapper {
  position: relative;
  flex: 1;
  min-width: 220px;
  max-width: 380px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 40px;
  padding: 0 36px 0 38px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 0.84rem;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.search-input::placeholder { color: var(--text-placeholder); }

.search-input::-webkit-search-cancel-button { display: none; }

.search-clear {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  background: var(--hover-bg);
  border: none;
  border-radius: 50%;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.search-clear:hover {
  background: var(--hover-bg-subtle);
  color: var(--text-primary);
}

/* ── Autocomplete suggestions ─────────────────────────────────────── */
.search-suggestions {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: var(--shadow-elevated);
  z-index: 50;
  overflow: hidden;
  max-height: 220px;
  overflow-y: auto;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  background: none;
  border: none;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-size: 0.82rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
  min-height: 44px;
}

.suggestion-item:last-child { border-bottom: none; }
.suggestion-item:hover { background: var(--hover-bg); }

.suggestion-icon { color: var(--text-muted); flex-shrink: 0; }

/* ── Filter Chips ─────────────────────────────────────────────────── */
.filter-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 36px;
  padding: 0 14px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 100px;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  min-height: 44px;
  min-width: 44px;
  justify-content: center;
  font-family: inherit;
}

.filter-chip:hover {
  border-color: var(--text-muted);
  color: var(--text-primary);
}

.filter-chip--active {
  background: var(--primary-dim);
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 600;
}

.chip-count {
  font-size: 0.7rem;
  font-weight: 700;
  background: var(--hover-bg);
  padding: 1px 6px;
  border-radius: 100px;
  min-width: 18px;
  text-align: center;
}

.filter-chip--active .chip-count {
  background: rgba(0, 122, 255, 0.15);
}

/* ── Drawer trigger ───────────────────────────────────────────────── */
.filter-drawer-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 14px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  font-family: inherit;
  min-height: 44px;
}

.filter-drawer-trigger:hover {
  border-color: var(--text-muted);
  color: var(--text-primary);
}

.trigger-label { display: inline; }

.trigger-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: var(--primary);
  color: #fff;
  font-size: 0.66rem;
  font-weight: 700;
  border-radius: 100px;
}

/* ── Active tags ──────────────────────────────────────────────────── */
.active-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px 4px 10px;
  background: var(--primary-dim);
  border: 1px solid rgba(0, 122, 255, 0.12);
  border-radius: 100px;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--primary);
  white-space: nowrap;
}

.tag-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  background: none;
  border: none;
  border-radius: 50%;
  color: var(--primary);
  cursor: pointer;
  transition: background 0.1s;
  min-height: 44px;
  min-width: 44px;
  margin: -14px -4px -14px 0;
}

.tag-remove:hover { background: rgba(0, 122, 255, 0.1); }

.clear-all-btn {
  background: none;
  border: none;
  padding: 4px 8px;
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  transition: color 0.12s;
  font-family: inherit;
  min-height: 44px;
}

.clear-all-btn:hover { color: var(--error); }

/* Tag transition */
.tag-fade-enter-active, .tag-fade-leave-active { transition: all 0.2s ease; }
.tag-fade-enter-from, .tag-fade-leave-to { opacity: 0; transform: scale(0.9); }

@media (max-width: 768px) {
  .trigger-label { display: none; }
  .search-wrapper { max-width: none; }
}
</style>
