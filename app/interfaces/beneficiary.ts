/**
 * interfaces/beneficiary.ts
 *
 * Types for the beneficiary registry.
 */

export interface Beneficiary {
  id: string
  organisation_id: string
  personal_name: string
  father_name: string
  grandfather_name: string | null
  family_name: string | null
  age_at_registration: number
  sex: string
  language: string
  disability_status: string
  guardian_name: string | null
  guardian_phone: string | null
  registration_date: string
  cfs_location: {
    id: string
    name: string
  }
}

export interface RegisterBeneficiaryRequest {
  personal_name: string
  father_name: string
  grandfather_name?: string
  family_name?: string
  age_at_registration: number
  sex: string
  language: string
  disability_status: string
  guardian_name: string
  guardian_phone?: string
  known_medical_issues?: string
  additional_notes?: string
}

export interface BeneficiaryFilter {
  cfs_location_id?: string
  search?: string
  page?: number
  page_size?: number
}

export interface BeneficiaryListResponse {
  beneficiaries: Beneficiary[]
  pagination: {
    page: number
    page_size: number
    total_items: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
}

export interface BeneficiaryWithLocation {
  id: string
  personal_name: string
  father_name: string
  grandfather_name: string | null
  family_name: string | null
  age_at_registration: number
  sex: string
  language: string
  disability_status: string
  location_name: string
  registration_date: string
}
