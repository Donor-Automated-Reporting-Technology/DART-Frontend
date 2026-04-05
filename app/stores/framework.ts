import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { frameworkApi } from '../services/frameworkApi'
import type {
  Framework,
  FrameworkActivity,
  ActivityTemplate,
} from '../interfaces/framework'

export const useFrameworkStore = defineStore('framework', () => {
  const currentFramework = ref<Framework | null>(null)
  const frameworkActivities = ref<FrameworkActivity[]>([])
  const activityTemplates = ref<ActivityTemplate[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeActivities = computed(() =>
    frameworkActivities.value.filter((fa) => fa.is_active),
  )

  function activityByCode(code: string): FrameworkActivity | undefined {
    return frameworkActivities.value.find((fa) => fa.template?.code === code)
  }

  async function fetchFramework() {
    loading.value = true
    error.value = null
    try {
      const res = await frameworkApi.listFrameworks()
      const frameworks = res.frameworks ?? []
      currentFramework.value = frameworks.find((f) => f.is_active) ?? frameworks[0] ?? null
    } catch (e: any) {
      error.value = e.message ?? 'Failed to load framework'
    } finally {
      loading.value = false
    }
  }

  async function fetchActivities() {
    if (!currentFramework.value) return
    loading.value = true
    error.value = null
    try {
      const res = await frameworkApi.getActivities(currentFramework.value.id)
      frameworkActivities.value = res.activities ?? []
    } catch (e: any) {
      error.value = e.message ?? 'Failed to load activities'
    } finally {
      loading.value = false
    }
  }

  async function toggleActivity(activityId: string, isActive: boolean) {
    if (!currentFramework.value) return
    try {
      const updated = await frameworkApi.toggleActivity(
        currentFramework.value.id,
        activityId,
        { is_active: isActive },
      )
      const idx = frameworkActivities.value.findIndex((fa) => fa.id === activityId)
      if (idx !== -1) {
        frameworkActivities.value[idx] = { ...frameworkActivities.value[idx], ...updated }
      }
    } catch (e: any) {
      error.value = e.message ?? 'Failed to toggle activity'
    }
  }

  async function setTarget(activityId: string, targetCount: number, targetUnit: string) {
    if (!currentFramework.value) return
    try {
      const updated = await frameworkApi.setTarget(
        currentFramework.value.id,
        activityId,
        { target_count: targetCount, target_unit: targetUnit },
      )
      const idx = frameworkActivities.value.findIndex((fa) => fa.id === activityId)
      if (idx !== -1) {
        frameworkActivities.value[idx] = { ...frameworkActivities.value[idx], ...updated }
      }
    } catch (e: any) {
      error.value = e.message ?? 'Failed to set target'
    }
  }

  async function fetchTemplates(frameworkType?: string) {
    try {
      const res = await frameworkApi.getTemplates(frameworkType)
      activityTemplates.value = res.templates ?? []
    } catch (e: any) {
      error.value = e.message ?? 'Failed to load templates'
    }
  }

  return {
    currentFramework,
    frameworkActivities,
    activityTemplates,
    loading,
    error,
    activeActivities,
    activityByCode,
    fetchFramework,
    fetchActivities,
    toggleActivity,
    setTarget,
    fetchTemplates,
  }
})
