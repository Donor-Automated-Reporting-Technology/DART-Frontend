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
      const raw = (res as any).activities ?? []
      // Backend returns flat FrameworkActivityDetail objects with activity_name/activity_code.
      // Map to FrameworkActivity shape with nested template the UI expects.
      frameworkActivities.value = raw.map((item: any) => ({
        id: item.id,
        framework_id: currentFramework.value!.id,
        activity_template_id: item.activity_template_id ?? '',
        is_active: item.is_active ?? false,
        target_count: item.target_count ?? 0,
        target_unit: item.target_unit ?? 'children',
        custom_config: item.custom_config ?? item.default_config ?? null,
        created_at: item.created_at ?? '',
        updated_at: item.updated_at ?? '',
        template: item.template ?? {
          id: item.activity_template_id ?? '',
          framework_type: currentFramework.value!.framework_type,
          name: item.activity_name ?? item.name ?? 'Activity',
          code: item.activity_code ?? item.code ?? '',
          description: item.description ?? '',
          pattern_type: item.pattern_type ?? 'daily_attendance',
          default_config: item.default_config ?? null,
          created_at: item.created_at ?? '',
        },
      }))
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
