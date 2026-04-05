import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { locationApi } from '../services/locationApi'
import type {
  Location,
  ServicePoint,
  LocationWithServicePoints,
  CreateLocationRequest,
  AddServicePointRequest,
  UpdateServicePointRequest,
} from '../interfaces/location'

export const useLocationStore = defineStore('location', () => {
  const locations = ref<LocationWithServicePoints[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const allServicePoints = computed<ServicePoint[]>(() =>
    locations.value.flatMap((l) => l.service_points ?? []),
  )

  function locationById(id: string): LocationWithServicePoints | undefined {
    return locations.value.find((l) => l.location.id === id)
  }

  function servicePointById(id: string): ServicePoint | undefined {
    return allServicePoints.value.find((sp) => sp.id === id)
  }

  async function fetchLocations() {
    loading.value = true
    error.value = null
    try {
      const res = await locationApi.listLocations()
      locations.value = res.locations ?? []
    } catch (e: any) {
      error.value = e.message ?? 'Failed to load locations'
    } finally {
      loading.value = false
    }
  }

  async function createLocation(payload: CreateLocationRequest) {
    loading.value = true
    error.value = null
    try {
      await locationApi.createLocation(payload)
      await fetchLocations()
    } catch (e: any) {
      error.value = e.message ?? 'Failed to create location'
    } finally {
      loading.value = false
    }
  }

  async function addServicePoint(locationId: string, payload: AddServicePointRequest) {
    error.value = null
    try {
      await locationApi.addServicePoint(locationId, payload)
      await fetchLocations()
    } catch (e: any) {
      error.value = e.message ?? 'Failed to add service point'
    }
  }

  async function updateServicePoint(id: string, payload: UpdateServicePointRequest) {
    error.value = null
    try {
      await locationApi.updateServicePoint(id, payload)
      await fetchLocations()
    } catch (e: any) {
      error.value = e.message ?? 'Failed to update service point'
    }
  }

  async function deleteServicePoint(id: string) {
    error.value = null
    try {
      await locationApi.deleteServicePoint(id)
      await fetchLocations()
    } catch (e: any) {
      error.value = e.message ?? 'Failed to delete service point'
    }
  }

  return {
    locations,
    loading,
    error,
    allServicePoints,
    locationById,
    servicePointById,
    fetchLocations,
    createLocation,
    addServicePoint,
    updateServicePoint,
    deleteServicePoint,
  }
})
