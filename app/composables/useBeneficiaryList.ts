import { ref, computed } from 'vue'
import { beneficiaryApi } from '../services/beneficiaryApi'
import type { Beneficiary, BeneficiaryFilter, BeneficiaryType } from '../interfaces/beneficiary'

export function useBeneficiaryList() {
  const beneficiaries = ref<Beneficiary[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const search = ref('')
  const centreId = ref('')
  const beneficiaryType = ref<BeneficiaryType | ''>('')
  const loading = ref(false)
  const error = ref<string | null>(null)

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  async function fetchBeneficiaries() {
    loading.value = true
    error.value = null
    try {
      const params: BeneficiaryFilter = {
        page: page.value,
        page_size: pageSize.value,
      }
      if (search.value.trim()) params.search = search.value.trim()
      if (centreId.value) params.centre_id = centreId.value
      if (beneficiaryType.value) params.beneficiary_type = beneficiaryType.value
      const res = await beneficiaryApi.list(params)
      beneficiaries.value = res.beneficiaries ?? []
      total.value = res.total ?? 0
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load beneficiaries'
    } finally {
      loading.value = false
    }
  }

  function applyFilter() {
    page.value = 1
    fetchBeneficiaries()
  }

  function nextPage() {
    if (page.value < totalPages.value) {
      page.value++
      fetchBeneficiaries()
    }
  }

  function prevPage() {
    if (page.value > 1) {
      page.value--
      fetchBeneficiaries()
    }
  }

  function goToPage(p: number) {
    page.value = Math.max(1, Math.min(p, totalPages.value))
    fetchBeneficiaries()
  }

  async function exportExcel() {
    try {
      const params: BeneficiaryFilter = {}
      if (search.value.trim()) params.search = search.value.trim()
      if (centreId.value) params.centre_id = centreId.value
      const blob = await beneficiaryApi.exportExcel(params)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `beneficiaries_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      error.value = e?.message ?? 'Export failed'
    }
  }

  return {
    beneficiaries,
    total,
    page,
    pageSize,
    search,
    centreId,
    beneficiaryType,
    loading,
    error,
    totalPages,
    fetchBeneficiaries,
    applyFilter,
    nextPage,
    prevPage,
    goToPage,
    exportExcel,
  }
}
