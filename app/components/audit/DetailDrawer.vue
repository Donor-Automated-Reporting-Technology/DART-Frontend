<!--
  DetailDrawer — a panel that slides in from the right (a sheet from the
  bottom on a phone) to show one entry of a log. Closes with Esc, the close
  button or a click outside.
-->
<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="dd-backdrop" @mousedown.self="emit('close')">
        <aside ref="panel" class="dd-panel" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1" @keydown.esc="emit('close')">
          <header class="dd-head">
            <div class="dd-heading">
              <p v-if="eyebrow" class="dd-eyebrow">{{ eyebrow }}</p>
              <h2 :id="titleId" class="dd-title">{{ title }}</h2>
            </div>
            <button type="button" class="dd-close" aria-label="Close" @click="emit('close')">
              <AppIcon name="x" :size="18" />
            </button>
          </header>
          <div class="dd-body">
            <slot />
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, ref, useId, watch } from 'vue'

const props = defineProps<{ open: boolean; title: string; eyebrow?: string }>()
const emit = defineEmits<{ close: [] }>()
const titleId = useId()
const panel = ref<HTMLElement | null>(null)
let returnFocus: HTMLElement | null = null

watch(() => props.open, async (open) => {
  if (open) {
    returnFocus = document.activeElement as HTMLElement | null
    await nextTick()
    panel.value?.focus()
  } else {
    returnFocus?.focus?.()
  }
})
</script>

<style scoped>
.dd-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(15, 23, 42, 0.38); display: flex; justify-content: flex-end; }
.dd-panel {
  width: min(480px, 100%); height: 100%; overflow-y: auto; outline: none;
  background: var(--bg-panel); border-left: 1px solid var(--border-color);
  box-shadow: -24px 0 48px rgba(0, 0, 0, 0.16);
  display: flex; flex-direction: column;
}
.dd-head {
  position: sticky; top: 0; z-index: 2;
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  padding: 20px 24px 16px; background: var(--bg-panel); border-bottom: 1px solid var(--border-color);
}
.dd-heading { min-width: 0; }
.dd-eyebrow { margin: 0 0 4px; font-size: 0.75rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-secondary); }
.dd-title { margin: 0; font-size: 1.125rem; font-weight: 600; line-height: 1.35; color: var(--text-primary); }
.dd-close {
  flex: none; width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--border-color);
  background: transparent; color: var(--text-secondary); display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
}
.dd-close:hover { background: var(--hover-bg); color: var(--text-primary); }
.dd-close:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.dd-body { padding: 20px 24px 32px; display: flex; flex-direction: column; gap: 24px; }

.drawer-enter-active, .drawer-leave-active { transition: background-color 0.2s ease; }
.drawer-enter-active .dd-panel, .drawer-leave-active .dd-panel { transition: transform 0.22s ease; }
.drawer-enter-from, .drawer-leave-to { background-color: transparent; }
.drawer-enter-from .dd-panel, .drawer-leave-to .dd-panel { transform: translateX(100%); }

@media (max-width: 640px) {
  .dd-backdrop { align-items: flex-end; }
  .dd-panel { width: 100%; height: auto; max-height: 92vh; border-left: 0; border-top: 1px solid var(--border-color); border-radius: 16px 16px 0 0; }
  .dd-head { padding: 16px; border-radius: 16px 16px 0 0; }
  .dd-body { padding: 16px 16px 24px; }
  .drawer-enter-from .dd-panel, .drawer-leave-to .dd-panel { transform: translateY(100%); }
}
@media (prefers-reduced-motion: reduce) {
  .drawer-enter-active .dd-panel, .drawer-leave-active .dd-panel { transition: none; }
}
</style>
