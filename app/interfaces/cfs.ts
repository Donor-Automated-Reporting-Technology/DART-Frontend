export interface CfsLocation {
  id: string;
  name: string;
}

export interface StaffAssignment {
  assignment_id?: string;
  user_id: string;
  full_name?: string;
  role?: string;
  cfs_location_id?: string;
  location_name?: string;
  start_date?: string;
  end_date?: string | null;
  is_active?: boolean;
}

export interface StaffAssignmentsResponse {
  assignments: StaffAssignment[];
}

export interface AssignStaffPayload {
  user_id: string;
  cfs_location_id: string;
  start_date: string;
}

export interface AssignStaffResponse {
  message: string;
  assignment: {
    id: string;
    organisation_id: string;
    user_id: string;
    cfs_location_id: string;
    start_date: string;
    end_date: string | null;
    created_at: string;
    updated_at: string;
  };
}

export type StaffRole = 'facilitator' | 'case_worker';

export interface CreateStaffPayload {
  full_name: string;
  email: string;
  password: string;
  role: StaffRole;
}

export interface CreateStaffResponse {
  message: string;
  data: {
    id: string;
    organisation_id: string;
    full_name: string;
    email: string;
    role: string;
  };
}

export interface UnassignStaffPayload {
  user_id: string;
}

export interface GrantTargetsPayload {
  period_start: string;
  period_end: string;
  target_values: {
    total_children: number;
    girls: number;
    children_with_disability: number;
    sessions: number;
  };
}

export interface SessionTypeToggle {
  type: 'general_group_activity' | 'teamup' | 'children_sessions';
  is_active: boolean;
}

export interface LocationSessionTypesPayload {
  cfs_location_id: string;
  session_types: SessionTypeToggle[];
}

export interface RegisterBeneficiaryPayload {
  personal_name: string;
  father_name: string;
  grandfather_name?: string;
  family_name?: string;
  age_at_registration: number;
  sex: string;
  language: string;
  disability_status: string;
  guardian_name: string;
  guardian_phone?: string;
  known_medical_issues?: string;
  known_learning_difficulties?: string;
  additional_notes?: string;
  primero_case_id?: string;
}

export interface BeneficiaryResponse {
  message: string;
  beneficiary: {
    id: string;
    organisation_id: string;
    personal_name: string;
    father_name: string;
    grandfather_name?: string;
    family_name?: string;
    age_at_registration: number;
    sex: string;
    language: string;
    disability_status: string;
    guardian_name: string;
    guardian_phone?: string;
    created_at: string;
    updated_at: string;
  };
}

export interface CreateCFSRegistrationPayload {
  beneficiary_id: string;
}

export interface CFSRegistrationResponse {
  message: string;
  registration: {
    id: string;
    organisation_id: string;
    beneficiary_id: string;
    cfs_location_id: string;
    registered_by: string;
    registration_date?: string;
    created_at: string;
    updated_at: string;
  };
}

export type SessionType = 'general_group_activity' | 'teamup' | 'children_sessions';
export type AttendanceStatus = 'present' | 'absent';

export interface CreateSessionPayload {
  session_date: string;
  session_type: SessionType;
}

export interface CreateSessionResponse {
  message: string;
  session: {
    id: string;
    organisation_id: string;
    cfs_location_id: string;
    session_date: string;
    session_type: SessionType;
    facilitator_id: string;
    created_at: string;
    updated_at: string;
  };
}

export interface AttendanceRecord {
  beneficiary_id: string;
  status: AttendanceStatus;
}

export interface RecordAttendancePayload {
  session_id: string;
  records: AttendanceRecord[];
}

export interface RecordAttendanceResponse {
  message: string;
  records_count: number;
  present_count: number;
  absent_count: number;
}

// ── My-Location Dashboard (facilitator / case_worker) ───────────────────────

export interface MyLocationRecentSession {
  id: string;
  session_date: string;
  session_type: string;
  present_count: number;
  absent_count: number;
  total_count: number;
}

export interface MyLocationDashboardResponse {
  location: {
    id: string;
    name: string;
    sector: string;
    geographic_area: string;
  };
  demographics: {
    total_children: number;
    total_male: number;
    total_female: number;
    total_with_disability: number;
  };
  attendance: {
    total_sessions: number;
    total_attendance_records: number;
    total_present: number;
    total_absent: number;
  };
  recent_sessions: MyLocationRecentSession[];
}

// ── Beneficiaries List ───────────────────────────────────────────────────────

export interface BeneficiaryListItem {
  id: string;
  personal_name: string;
  father_name: string;
  grandfather_name?: string | null;
  family_name?: string | null;
  age_at_registration: number;
  sex: string;
  language: string;
  disability_status: string;
  guardian_name: string;
  guardian_phone?: string | null;
  registration_date: string;
  cfs_location: {
    id: string;
    name: string;
  };
}

export interface BeneficiaryListPagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface BeneficiaryListResponse {
  beneficiaries: BeneficiaryListItem[];
  pagination: BeneficiaryListPagination;
}

export interface BeneficiaryListParams {
  page?: number;
  page_size?: number;
  search?: string;
  sex?: string;
  disability_status?: string;
  cfs_location_id?: string;
  sort_by?: 'personal_name' | 'age_at_registration' | 'registration_date';
  sort_order?: 'asc' | 'desc';
}

// ── Dashboard Stats ─────────────────────────────────────────────────────────

export interface DashboardLocationStat {
  location_id: string;
  location_name: string;
  total_children: number;
  male: number;
  female: number;
  with_disability: number;
}

export interface DashboardProgressItem {
  actual: number;
  target: number;
  percentage: number;
}

export interface DashboardStatsResponse {
  demographics: {
    total_children: number;
    total_male: number;
    total_female: number;
    total_with_disability: number;
  };
  locations: DashboardLocationStat[];
  attendance: {
    total_sessions: number;
    total_attendance_records: number;
    total_present: number;
    total_absent: number;
  };
  grant_targets: {
    period_start: string;
    period_end: string;
    target_total_children: number;
    target_girls: number;
    target_children_with_disability: number;
    target_sessions: number;
  };
  progress: {
    total_children: DashboardProgressItem;
    girls: DashboardProgressItem;
    with_disability: DashboardProgressItem;
    sessions: DashboardProgressItem;
  };
}

// ── Offline / IndexedDB Types ───────────────────────────────────────────────

export type SyncStatus = 'pending' | 'synced' | 'conflict';

interface OfflineBase {
  id: string;            // client-generated UUID v4
  syncStatus: SyncStatus;
  clientTimestamp: string; // ISO-8601
  serverId?: string;       // populated after sync
}

export interface OfflineBeneficiary extends OfflineBase {
  personalName: string;
  fatherName: string;
  grandfatherName: string;
  familyName: string;
  ageAtRegistration: number;
  sex: string;
  language: string;
  disabilityStatus: string;
  guardianName: string;
  guardianPhone: string;
  knownMedicalIssues: string;
  knownLearningDifficulties: string;
  additionalNotes: string;
  primeroCaseId: string;
}

export interface OfflineCfsRegistration extends OfflineBase {
  beneficiaryId: string;  // local UUID (maps to OfflineBeneficiary.id)
}

export interface OfflineCfsSession extends OfflineBase {
  sessionDate: string;
  sessionType: SessionType;
}

export interface OfflineAttendanceRecord extends OfflineBase {
  sessionId: string;      // local UUID (maps to OfflineCfsSession.id)
  beneficiaryId: string;  // local UUID (maps to OfflineBeneficiary.id)
  status: AttendanceStatus;
}

export interface OfflineCaseFlag extends OfflineBase {
  beneficiaryId: string;
  flagType: string;
  notes: string;
}

export type SyncItemType = 'beneficiary' | 'cfs_registration' | 'cfs_session' | 'attendance' | 'case_flag';

export interface SyncQueueItem {
  id: string;
  type: SyncItemType;
  localRecordId: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  createdAt: string;
  errorMessage?: string;
}
