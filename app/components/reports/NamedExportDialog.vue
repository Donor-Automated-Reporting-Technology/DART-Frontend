<!--
  NamedExportDialog — shown before any Excel file that lists people is
  downloaded. Asks for the purpose, recipient and agreement, then shows the
  file's one-time password. Mounted once in app.vue; opened through
  requestNamedExport() in services/namedExport.ts.
-->
<template>
  <Teleport to="body">
    <div v-if="state.request" class="nx-backdrop" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <div class="nx-card">
        <template v-if="!state.result">
          <h2 :id="titleId" class="nx-title">Download a list with names</h2>
          <p class="tu-muted">
            This file contains children's and caregivers' names. It is strictly confidential.
            Your answers are saved in the activity log with your name and the time.
          </p>

          <form class="nx-form" @submit.prevent="submit">
            <div class="tu-field">
              <label for="nx-purpose">Why do you need this file?</label>
              <input id="nx-purpose" ref="purposeRef" v-model.trim="purpose" class="tu-input" maxlength="300" required placeholder="e.g. Monthly report to the donor">
            </div>
            <div class="tu-field">
              <label for="nx-recipient">Who will receive it?</label>
              <input id="nx-recipient" v-model.trim="recipient" class="tu-input" maxlength="300" required placeholder="Name and organisation, or “Only me”">
            </div>
            <div class="tu-field">
              <label for="nx-agreement">Under which agreement is it shared?</label>
              <input id="nx-agreement" v-model.trim="agreement" class="tu-input" maxlength="300" required placeholder="e.g. SSJR partnership agreement, or “Internal use”">
            </div>

            <div v-if="state.error" class="tu-alert tu-alert--error">
              <AppIcon name="alert-circle" :size="14" />
              {{ state.error }}
            </div>

            <div class="nx-actions">
              <button type="button" class="tu-btn tu-btn--ghost" :disabled="state.busy" @click="close">Cancel</button>
              <button type="submit" class="tu-btn" :disabled="state.busy || !complete">
                <AppIcon name="download" :size="14" />
                {{ state.busy ? 'Preparing…' : 'Download' }}
              </button>
            </div>
          </form>
        </template>

        <template v-else>
          <h2 :id="titleId" class="nx-title">File downloaded</h2>
          <p class="tu-muted">
            <strong>{{ state.result.filename }}</strong> is protected with this password. It is shown only once.
          </p>
          <div class="nx-password" aria-label="File password">{{ state.result.password }}</div>
          <p class="tu-muted">
            Give the password to the recipient separately from the file — never in the same email or message.
          </p>
          <div class="nx-actions">
            <button type="button" class="tu-btn tu-btn--ghost" @click="copy">{{ copied ? 'Copied' : 'Copy password' }}</button>
            <button type="button" class="tu-btn" @click="close">Done</button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import { closeNamedExport, confirmNamedExport, namedExportState as state } from '../../services/namedExport'

const titleId = useId()
const purposeRef = ref<HTMLInputElement | null>(null)
const purpose = ref('')
const recipient = ref('')
const agreement = ref('')
const copied = ref(false)

const complete = computed(() => !!purpose.value && !!recipient.value && !!agreement.value)

// A fresh form for every export: a reason is never carried over.
watch(() => state.request, async (req) => {
  if (!req) return
  purpose.value = ''
  recipient.value = ''
  agreement.value = ''
  copied.value = false
  await nextTick()
  purposeRef.value?.focus()
})

function submit() {
  if (!complete.value) return
  confirmNamedExport({ purpose: purpose.value, recipient: recipient.value, agreement: agreement.value })
}

async function copy() {
  if (!state.result) return
  try {
    await navigator.clipboard.writeText(state.result.password)
    copied.value = true
  } catch {
    copied.value = false
  }
}

function close() {
  if (state.busy) return
  closeNamedExport()
}
</script>

<style scoped>
.nx-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 15, 26, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1000;
}
.nx-card {
  width: 100%;
  max-width: 460px;
  background: var(--bg-card, #fff);
  color: var(--text-primary);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.nx-title { font-size: 1.125rem; font-weight: 600; margin: 0; }
.nx-form { display: flex; flex-direction: column; gap: 0.875rem; }
.nx-actions { display: flex; justify-content: flex-end; gap: 0.5rem; flex-wrap: wrap; }
.nx-password {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 1.375rem;
  letter-spacing: 0.08em;
  text-align: center;
  padding: 0.875rem;
  border: 1px dashed var(--border-color, #c9ced6);
  border-radius: 8px;
  user-select: all;
}
</style>
