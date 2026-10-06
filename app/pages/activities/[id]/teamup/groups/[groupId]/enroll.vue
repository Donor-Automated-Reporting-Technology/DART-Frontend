<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="tu-page">
      <div>
        <span class="tu-step">Set up · 2 of 3</span>
        <h1 class="tu-title">Enroll children{{ group ? ` · ${group.name}` : '' }}</h1>
        <p class="tu-subtitle">
          Children registered at {{ group?.service_point_name ?? 'this CFS' }} who are not in another TeamUp group.
        </p>
      </div>

      <div v-if="error" class="tu-alert tu-alert--error">
        <AppIcon name="alert-circle" :size="14" />
        {{ error }}
      </div>
      <div v-if="skippedNote" class="tu-alert tu-alert--warn">{{ skippedNote }}</div>

      <div class="tu-field">
        <label for="tu-q">Search by name</label>
        <input id="tu-q" v-model="search" class="tu-input" placeholder="Type a name…">
      </div>

      <div class="tu-row">
        <strong>{{ selected.size }} selected</strong>
        <button type="button" class="tu-btn tu-btn--ghost" :disabled="filtered.length === 0" @click="selectAllInBand">
          Select all aged {{ group?.age_band ?? '' }} (all pages)
        </button>
      </div>

      <div v-if="loading" class="tu-stack"><div class="tu-skeleton" /><div class="tu-skeleton" /></div>
      <div v-else-if="eligible.length === 0" class="tu-card">
        <strong>No children available</strong>
        <span class="tu-muted">Register children at this CFS first, or they may already be in a TeamUp group.</span>
      </div>
      <TeamupPager v-if="eligible.length" v-model:page="page" :page-count="pageCount" :total="filtered.length" label="Children pages" />
      <div v-if="!loading && eligible.length" class="tu-list">
        <button
          v-for="b in pageItems"
          :key="b.id"
          type="button"
          class="tu-list-item"
          :aria-pressed="selected.has(b.id)"
          @click="toggle(b.id)"
        >
          <span class="tu-check" :class="{ 'tu-check--on': selected.has(b.id) }">
            <AppIcon v-if="selected.has(b.id)" name="check" :size="14" :stroke-width="3" />
          </span>
          <span style="flex: 1; display: flex; flex-direction: column">
            <span class="tu-name">{{ fullName(b) }}</span>
            <span class="tu-muted">{{ sexLabel(b.sex) }} · {{ b.age_at_registration }} · {{ b.language }}</span>
          </span>
          <span v-if="!inBand(b.age_at_registration)" class="tu-pill tu-pill--warn">Outside {{ group?.age_band }}</span>
        </button>
      </div>

      <TeamupPager v-if="eligible.length" v-model:page="page" :page-count="pageCount" :total="filtered.length" label="Children pages" />

      <div class="tu-actions">
        <NuxtLink :to="groupUrl" class="tu-btn tu-btn--ghost">Skip for now</NuxtLink>
        <button type="button" class="tu-btn" :disabled="saving || selected.size === 0" @click="enroll">
          {{ saving ? 'Enrolling…' : `Enroll ${selected.size} children` }}
        </button>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import AppIcon from '../../../../../../components/interfaces/AppIcon.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { teamupApi } from '../../../../../../services/teamupApi'
import { usePagination } from '../../../../../../composables/useTeamUpHelpers'
import type { EligibleBeneficiary, TeamUpGroup } from '../../../../../../interfaces/teamup'

definePageMeta({ layout: false, middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const frameworkId = route.params.id as string
const groupId = route.params.groupId as string
const groupUrl = `/activities/${frameworkId}/teamup/groups/${groupId}`

const breadcrumbs = computed(() => [
  { title: 'TeamUp', href: `/activities/${frameworkId}/teamup${group.value?.framework_activity_id ? `?fa=${group.value?.framework_activity_id}` : ''}` },
  { title: group.value?.name ?? 'Group', href: groupUrl },
  { title: 'Enroll', href: route.fullPath, current: true },
])

const group = ref<TeamUpGroup | null>(null)
const eligible = ref<EligibleBeneficiary[]>([])
const selected = ref(new Set<string>())
const search = ref('')
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const skippedNote = ref<string | null>(null)

const fullName = (b: EligibleBeneficiary) =>
  [b.personal_name, b.father_name, b.grandfather_name].filter(Boolean).join(' ')
const sexLabel = (s: string) => (s?.toLowerCase().startsWith('f') ? 'F' : 'M')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q ? eligible.value.filter(b => fullName(b).toLowerCase().includes(q)) : eligible.value
})

const { page, pageCount, pageItems } = usePagination(filtered)
watch(search, () => { page.value = 1 })

function inBand(age: number) {
  const band = group.value?.age_band
  if (!band) return true
  const [lo, hi] = band.split('-').map(Number)
  return age >= lo! && age <= hi!
}

function toggle(id: string) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}

function selectAllInBand() {
  const next = new Set(selected.value)
  filtered.value.filter(b => inBand(b.age_at_registration)).forEach(b => next.add(b.id))
  selected.value = next
}

async function enroll() {
  saving.value = true
  error.value = null
  try {
    const res = await teamupApi.enroll(groupId, [...selected.value])
    const skipped = Object.keys(res.skipped ?? {}).length
    if (skipped > 0) {
      skippedNote.value = `${res.enrolled.length} enrolled, ${skipped} skipped (not at this CFS or already in another group).`
      selected.value = new Set()
      eligible.value = await teamupApi.listEligible(groupId)
      return
    }
    await router.push(groupUrl)
  } catch (e: any) {
    error.value = e?.message ?? 'Enrollment failed'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const [detail, list] = await Promise.all([teamupApi.getGroup(groupId), teamupApi.listEligible(groupId)])
    group.value = detail.group
    eligible.value = list ?? []
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load children'
  } finally {
    loading.value = false
  }
})
</script>
