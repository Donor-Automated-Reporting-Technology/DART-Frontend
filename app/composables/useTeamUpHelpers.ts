/**
 * Small helpers shared by the TeamUp pages: client-side pagination for long
 * child lists, and the organisation/project/activity names for Word reports.
 */
import { computed, ref, watch, type Ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { frameworkApi } from '../services/frameworkApi'
import type { ReportHeader } from '../utils/teamupWordReport'

export const TEAMUP_PAGE_SIZE = 10

export function usePagination<T>(items: Ref<T[]>, pageSize = TEAMUP_PAGE_SIZE) {
  const page = ref(1)
  const pageCount = computed(() => Math.max(1, Math.ceil(items.value.length / pageSize)))
  const pageItems = computed(() => items.value.slice((page.value - 1) * pageSize, page.value * pageSize))

  // Keep the page valid when the list shrinks (search, enrolment).
  watch(pageCount, n => { if (page.value > n) page.value = n })

  /** Jump to the page holding the first item that matches. */
  function goToFirst(match: (item: T) => boolean) {
    const i = items.value.findIndex(match)
    if (i >= 0) page.value = Math.floor(i / pageSize) + 1
  }

  return { page, pageCount, pageItems, goToFirst, pageSize }
}

export async function loadReportHeader(frameworkId: string, frameworkActivityId?: string): Promise<ReportHeader> {
  const auth = useAuthStore()
  const header: ReportHeader = { organisationName: auth.orgName ?? '' }
  try {
    const [fws, acts] = await Promise.all([
      frameworkApi.listFrameworks(),
      frameworkActivityId ? frameworkApi.getActivities(frameworkId) : Promise.resolve(null),
    ])
    const fw: any = (fws.frameworks ?? []).find((f: any) => f.id === frameworkId)
    header.projectName = fw?.project_name ?? ''
    header.partnerName = fw?.partner_name ?? ''
    const act: any = ((acts as any)?.activities ?? []).find((a: any) => a.id === frameworkActivityId)
    header.activityName = act?.activity_name ?? act?.template?.name ?? 'TeamUp'
  } catch {
    // The report still works without the project/activity names.
  }
  return header
}
