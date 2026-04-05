/**
 * interfaces/beneficiary.ts
 *
 * Types for the beneficiary registry.
 */

export type BeneficiaryType = 'child' | 'adult'

export interface Beneficiary {
  id: string
  organisation_id: string
  full_name: string
  age: number
  sex: string
  language: string
  disability_status: string
  beneficiary_type: BeneficiaryType
  guardian_name: string | null
  guardian_phone: string | null
  address: string | null
  known_medical_issues: string | null
  children_at_home: number | null
  created_at: string
  updated_at: string
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
  beneficiary_type: BeneficiaryType
  guardian_name?: string
  guardian_phone?: string
  known_medical_issues?: string
  additional_notes?: string
}

export interface BeneficiaryFilter {
  centre_id?: string
  search?: string
  beneficiary_type?: BeneficiaryType | ''
  page?: number
  page_size?: number
}

export interface BeneficiaryListResponse {
  beneficiaries: Beneficiary[]
  total: number
  page: number
  page_size: number
}

export interface BeneficiaryWithLocation {
  id: string
  full_name: string
  age: number
  sex: string
  language: string
  disability_status: string
  beneficiary_type: BeneficiaryType
  location_name: string
  registration_date: string
}
