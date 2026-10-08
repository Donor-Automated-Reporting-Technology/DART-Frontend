<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Settings', href: '/settings' },
      { title: 'Roles & permissions', href: '/settings/roles', current: true },
    ]"
  >
    <div class="roles-page">
      <header class="head">
        <div>
          <h1 class="title">Roles & permissions</h1>
          <p class="subtitle">Name the roles in your organisation and decide what each can see and do. Higher levels can manage people in lower ones.</p>
        </div>
        <button v-if="!editing && !loading" type="button" class="ui-btn ui-btn--primary" @click="startCreate">New role</button>
      </header>

      <p v-if="loadError" class="ui-alert" role="alert"><AppIcon name="alert-circle" :size="16" /><span>{{ loadError }}</span></p>
      <p v-if="notice" class="notice" role="status">
        <AppIcon name="check-circle" :size="16" /><span>{{ notice }}</span>
      </p>

      <!-- ── Editor ─────────────────────────────────────────────────── -->
      <form v-if="editing" ref="editorEl" class="card ui-form" novalidate :aria-labelledby="'ed-h'" @submit.prevent="save">
        <div class="ui-section-head">
          <h2 id="ed-h" tabindex="-1">{{ editing.id ? `Edit ${editing.originalName}` : 'New role' }}</h2>
          <p v-if="isAdminRole">This is your Admin role. It always keeps full access, including roles and permissions, so only its name and description can change.</p>
          <p v-else>People in this role can only manage people in lower levels.</p>
        </div>

        <div v-if="!editing.id" class="ui-field">
          <label class="ui-label" for="rl-base">Start from</label>
          <select id="rl-base" v-model="form.based_on" class="ui-select" name="based_on"
            :aria-invalid="errs.based_on ? 'true' : undefined" aria-describedby="rl-base-help" @change="applyTemplate">
            <option value="" disabled>Choose a default role</option>
            <option v-for="r in templateRoles" :key="r.template_key!" :value="r.template_key">{{ r.name }}</option>
          </select>
          <p id="rl-base-help" class="ui-help">Copies that role's level, data and permissions; change anything below.</p>
          <FieldError id="rl-base-error" :message="errs.based_on" />
        </div>

        <div class="ui-field">
          <label class="ui-label" for="rl-name">Role name</label>
          <input id="rl-name" v-model="form.name" class="ui-input" name="name" maxlength="80" placeholder="e.g. Senior facilitator"
            :aria-invalid="errs.name ? 'true' : undefined" :aria-describedby="errs.name ? 'rl-name-error' : undefined">
          <FieldError id="rl-name-error" :message="errs.name" />
        </div>

        <div class="ui-field">
          <label class="ui-label" for="rl-desc">Description <span class="ui-optional">(optional)</span></label>
          <input id="rl-desc" v-model="form.description" class="ui-input" name="description" maxlength="500" placeholder="What people in this role do">
        </div>

        <template v-if="!isAdminRole">
          <div class="ui-field level-field">
            <label class="ui-label" for="rl-level">Level</label>
            <input id="rl-level" v-model.number="form.level" class="ui-input" type="number" inputmode="numeric" min="1" :max="maxLevel" name="level"
              :aria-invalid="errs.level ? 'true' : undefined" :aria-describedby="errs.level ? 'rl-level-error rl-level-help' : 'rl-level-help'">
            <p id="rl-level-help" class="ui-help">1 to {{ maxLevel }}. For reference: {{ levelGuide }}.</p>
            <FieldError id="rl-level-error" :message="errs.level" />
          </div>

          <fieldset class="ui-field group">
            <legend class="ui-label">Data this role sees</legend>
            <label v-for="o in SCOPE_OPTIONS" :key="o.value" class="choice">
              <input v-model="form.scope" type="radio" name="scope" :value="o.value">
              <span><span class="choice-label">{{ o.label }}</span><span class="ui-help">{{ o.help }}</span></span>
            </label>
            <FieldError id="rl-scope-error" :message="errs.scope" />
          </fieldset>

          <fieldset v-for="cat in catalogue" :key="cat.key" class="ui-field group perms">
            <legend class="ui-label">{{ cat.label }}</legend>
            <label v-for="p in cat.permissions" :key="p.key" class="choice" :class="{ locked: p.key === 'account.profile' || p.admin_only }">
              <input
                type="checkbox"
                :value="p.key"
                :checked="p.key === 'account.profile' || form.permissions.includes(p.key)"
                :disabled="p.key === 'account.profile' || p.admin_only"
                @change="togglePerm(p.key, ($event.target as HTMLInputElement).checked)"
              >
              <span>
                <span class="choice-label">{{ p.label }}</span>
                <span class="ui-help">{{ p.admin_only ? 'Admin role only.' : p.key === 'account.profile' ? 'Everyone can edit their own account.' : p.description }}</span>
              </span>
            </label>
          </fieldset>
          <FieldError id="rl-perm-error" :message="errs.permissions" />
        </template>

        <p v-if="formAlert" class="ui-alert" role="alert"><AppIcon name="alert-circle" :size="16" /><span>{{ formAlert }}</span></p>

        <div class="actions">
          <template v-if="editing.id && !isAdminRole">
            <button v-if="!confirmDelete" type="button" class="ui-btn ui-btn--text danger" :disabled="editing.userCount > 0"
              :title="editing.userCount > 0 ? 'Move its people to another role first' : undefined" @click="confirmDelete = true">
              Delete role
            </button>
            <span v-else class="confirm">
              Delete “{{ editing.originalName }}”?
              <button type="button" class="ui-btn ui-btn--outline danger-outline" :disabled="saving" @click="remove">Delete</button>
              <button type="button" class="ui-btn ui-btn--text" @click="confirmDelete = false">Keep</button>
            </span>
          </template>
          <span class="spacer" />
          <button type="button" class="ui-btn ui-btn--outline" :disabled="saving" @click="cancel">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving" :aria-busy="saving ? 'true' : undefined">
            <span v-if="saving" class="ui-spinner" aria-hidden="true" />{{ saving ? 'Saving…' : editing.id ? 'Save role' : 'Create role' }}
          </button>
        </div>
        <p v-if="editing.id && editing.userCount > 0 && !isAdminRole" class="ui-help">
          {{ editing.userCount }} {{ editing.userCount === 1 ? 'person has' : 'people have' }} this role. Changes apply the next time they sign in.
        </p>
      </form>

      <!-- ── List ───────────────────────────────────────────────────── -->
      <div v-else-if="loading" class="card skeleton" aria-busy="true" aria-label="Loading roles" />
      <ul v-else class="role-list">
        <li v-for="r in roles" :key="r.id" class="role-row">
          <span class="level" :aria-label="`Level ${r.level}`">{{ r.level }}</span>
          <span class="role-main">
            <span class="role-name">{{ r.name }} <span v-if="r.template_key === 'org_admin'" class="tag">Full access</span></span>
            <span class="role-meta">{{ scopeLabel(r.scope) }} · {{ r.permissions.length - 1 }} permission{{ r.permissions.length - 1 === 1 ? '' : 's' }} · {{ r.user_count }} {{ r.user_count === 1 ? 'person' : 'people' }}</span>
          </span>
          <button type="button" class="ui-btn ui-btn--outline edit" :aria-label="`Edit ${r.name}`" @click="startEdit(r)">Edit</button>
        </li>
      </ul>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { accessApi, SCOPE_OPTIONS, type OrgRole, type PermissionCategory, type Scope } from '../../services/accessApi'
import { ApiError } from '../../services/api'
import FieldError from '../../components/interfaces/FieldError.vue'

definePageMeta({ layout: false, middleware: ['auth', 'role-guard'], allowedRoles: ['org_admin'], permission: 'roles.manage' })
useHead({ title: 'Roles & permissions · WellReach' })

const roles = ref<OrgRole[]>([])
const catalogue = ref<PermissionCategory[]>([])
const loading = ref(true)
const loadError = ref('')
const notice = ref('')

const editing = ref<{ id: string | null; originalName: string; templateKey: string | null; userCount: number } | null>(null)
const form = reactive({ name: '', description: '', level: 10, scope: 'own_location' as Scope, permissions: [] as string[], based_on: '' })
const errs = reactive<Record<string, string>>({})
const formAlert = ref('')
const saving = ref(false)
const confirmDelete = ref(false)
const editorEl = ref<HTMLFormElement | null>(null)

const maxLevel = 99
const isAdminRole = computed(() => editing.value?.templateKey === 'org_admin')
const templateRoles = computed(() => roles.value.filter(r => r.template_key && r.template_key !== 'org_admin'))
const levelGuide = computed(() =>
  roles.value.filter(r => r.template_key && r.template_key !== 'org_admin').map(r => `${r.name} ${r.level}`).join(', '),
)
const scopeLabel = (s: Scope) => SCOPE_OPTIONS.find(o => o.value === s)?.label ?? s

function clearErrs() { Object.keys(errs).forEach(k => delete errs[k]); formAlert.value = '' }

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const data = await accessApi.roles()
    roles.value = data.roles
    catalogue.value = data.catalogue
  } catch (e) {
    loadError.value = e instanceof ApiError && e.status === 403 ? 'Your role cannot manage roles.' : 'Could not load roles. Check your connection and try again.'
  } finally {
    loading.value = false
  }
}

async function openEditor() {
  confirmDelete.value = false
  clearErrs()
  notice.value = ''
  await nextTick()
  editorEl.value?.querySelector<HTMLElement>('#ed-h')?.focus()
}

function startCreate() {
  editing.value = { id: null, originalName: '', templateKey: null, userCount: 0 }
  Object.assign(form, { name: '', description: '', level: 10, scope: 'own_location', permissions: [], based_on: '' })
  openEditor()
}

function startEdit(r: OrgRole) {
  editing.value = { id: r.id, originalName: r.name, templateKey: r.template_key, userCount: r.user_count }
  Object.assign(form, {
    name: r.name, description: r.description ?? '', level: r.level, scope: r.scope,
    permissions: r.permissions.filter(p => p !== 'account.profile'), based_on: '',
  })
  openEditor()
}

function applyTemplate() {
  const t = roles.value.find(r => r.template_key === form.based_on)
  if (!t) return
  form.level = t.level
  form.scope = t.scope
  form.permissions = t.permissions.filter(p => p !== 'account.profile')
}

function togglePerm(key: string, on: boolean) {
  form.permissions = on ? [...new Set([...form.permissions, key])] : form.permissions.filter(p => p !== key)
}

function cancel() {
  editing.value = null
  clearErrs()
}

function validate(): boolean {
  clearErrs()
  const name = form.name.trim()
  if (name.length < 2 || name.length > 80) errs.name = 'Name must be between 2 and 80 characters'
  if (!editing.value?.id && !form.based_on) errs.based_on = 'Choose which default role this one starts from'
  if (!isAdminRole.value && (!Number.isInteger(form.level) || form.level < 1 || form.level > maxLevel)) errs.level = `Level must be between 1 and ${maxLevel}`
  const first = ['based_on', 'name', 'level'].find(k => errs[k])
  if (first) {
    nextTick(() => document.getElementById({ based_on: 'rl-base', name: 'rl-name', level: 'rl-level' }[first]!)?.focus())
    return false
  }
  return true
}

async function save() {
  if (!editing.value || !validate()) return
  saving.value = true
  const body = {
    name: form.name.trim(), description: form.description.trim(), level: form.level, scope: form.scope,
    permissions: form.permissions, ...(editing.value.id ? {} : { based_on: form.based_on }),
  }
  try {
    const saved = editing.value.id ? await accessApi.updateRole(editing.value.id, body) : await accessApi.createRole(body)
    notice.value = editing.value.id ? `“${saved.name}” saved.` : `“${saved.name}” created. Give it to people in Settings → People.`
    editing.value = null
    await load()
  } catch (e) {
    if (e instanceof ApiError && e.data?.errors) Object.assign(errs, e.data.errors)
    else formAlert.value = e instanceof ApiError ? e.message : 'Connection failed — check your internet connection and try again.'
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!editing.value?.id) return
  saving.value = true
  try {
    await accessApi.deleteRole(editing.value.id)
    notice.value = `“${editing.value.originalName}” deleted.`
    editing.value = null
    await load()
  } catch (e) {
    formAlert.value = e instanceof ApiError ? e.message : 'Connection failed — try again.'
    confirmDelete.value = false
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.roles-page { max-width: 760px; display: flex; flex-direction: column; gap: 24px; padding-bottom: 48px; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.title { margin: 0; font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; color: var(--text-primary); }
.subtitle { margin: 4px 0 0; max-width: 60ch; font-size: 0.9375rem; line-height: 1.5; color: var(--text-quiet); }

.card { padding: 32px; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 16px; }
.skeleton { height: 320px; opacity: 0.6; }
.ui-section-head h2:focus { outline: none; }

.notice { display: flex; gap: 8px; align-items: center; margin: 0; padding: 16px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-panel); color: var(--text-primary); font-size: 0.875rem; }
.notice :deep(svg) { color: var(--link); }

.level-field { max-width: 360px; }
.group { border: 0; padding: 0; margin: 0; min-width: 0; }
.group legend { margin-bottom: 8px; padding: 0; }
.perms { padding-top: 16px; border-top: 1px solid var(--border-color); }
.choice { display: flex; align-items: flex-start; gap: 12px; padding: 8px 0; cursor: pointer; }
.choice input { margin-top: 2px; }
.choice > span { display: flex; flex-direction: column; gap: 2px; }
.choice-label { font-size: 0.9375rem; color: var(--text-primary); }
.choice.locked { cursor: default; }

.actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding-top: 24px; border-top: 1px solid var(--border-color); }
.spacer { flex: 1; }
.danger { color: var(--error-text); }
.danger-outline { color: var(--error-text); border-color: color-mix(in srgb, var(--error-text) 45%, transparent); }
.danger-outline:hover:not(:disabled) { color: var(--error-text); border-color: var(--error-text); }
.confirm { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 0.875rem; color: var(--text-primary); }

.role-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.role-row { display: flex; align-items: center; gap: 16px; padding: 16px 20px; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 12px; }
.level { width: 44px; height: 44px; flex: none; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--primary) 10%, transparent); color: var(--link); font-size: 0.9375rem; font-variant-numeric: tabular-nums; }
.role-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.role-name { font-size: 0.9375rem; color: var(--text-primary); }
.role-meta { font-size: 0.8125rem; color: var(--text-secondary); }
.tag { margin-left: 8px; padding: 2px 8px; border-radius: 999px; font-size: 0.75rem; border: 1px solid var(--border-color); color: var(--text-secondary); }
.edit { min-height: 40px; padding: 0 16px; }

@media (max-width: 640px) {
  .card { padding: 24px 16px; }
  .actions .ui-btn--primary { width: 100%; }
}
</style>
