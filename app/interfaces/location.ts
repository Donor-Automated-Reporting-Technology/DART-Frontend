/**
 * interfaces/location.ts
 *
 * Types for the hierarchical location system.
 */

export interface Location {
  id: string
  organisation_id: string
  name: string
  created_at: string
  updated_at: string
  service_points?: ServicePoint[]
}

export interface ServicePoint {
  id: string
  organisation_id: string
  name: string
  sector: string | null
  geographic_area: string | null
  location_id: string | null
  language: string | null
  created_at: string
  updated_at: string
}

export interface CreateLocationRequest {
  name: string
}

export interface UpdateLocationRequest {
  name: string
}

export interface AddServicePointRequest {
  name: string
  sector?: string
  language?: string
}

export interface UpdateServicePointRequest {
  name?: string
  sector?: string
  language?: string
}

export interface LocationWithServicePoints {
  location: Location
  service_points: ServicePoint[]
}

export interface LocationListResponse {
  locations: LocationWithServicePoints[]
}
