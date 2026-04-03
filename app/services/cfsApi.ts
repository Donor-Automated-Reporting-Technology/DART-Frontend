import { getActivePinia } from 'pinia';
import { ApiError } from './api';
import type {
  StaffAssignmentsResponse,
  AssignStaffPayload,
  AssignStaffResponse,
  CreateStaffPayload,
  CreateStaffResponse,
  UnassignStaffPayload,
  GrantTargetsPayload,
  LocationSessionTypesPayload,
  SessionTypeToggle,
  RegisterBeneficiaryPayload,
  BeneficiaryResponse,
  CreateCFSRegistrationPayload,
  CFSRegistrationResponse,
  CreateSessionPayload,
  CreateSessionResponse,
  RecordAttendancePayload,
  RecordAttendanceResponse,
  DashboardStatsResponse,
  MyLocationDashboardResponse,
  BeneficiaryListResponse,
  BeneficiaryListParams,
} from '../interfaces/cfs';

const BASE = '/api/v1';

function resolveToken(explicit?: string): string | undefined {
  if (explicit) return explicit;
  try {
    const pinia = getActivePinia();
    const authState = pinia?.state.value?.['auth'] as { accessToken?: string | null } | undefined;
    return authState?.accessToken ?? undefined;
  } catch {
    return undefined;
  }
}

async function request<T>(url: string, options: RequestInit = {}, token?: string): Promise<T> {
  const resolved = resolveToken(token);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(resolved ? { Authorization: `Bearer ${resolved}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(response.status, data?.message ?? 'Request failed', data);
  }

  return (data?.data !== undefined ? data.data : data) as T;
}

export const cfsApi = {
  /**
   * 1. Get Staff Assignments
   * Returns a list of all active assignable staff (facilitator, case_worker)
   * mapped together with their current CFS location assignment explicitly if active.
   */
  async getStaffAssignments(token?: string): Promise<StaffAssignmentsResponse> {
    return request<StaffAssignmentsResponse>(`${BASE}/cfs/staff-assignments`, {
      method: 'GET',
    }, token);
  },

  /**
   * 2. Assign Staff (Start Assignment)
   * Creates a new Location Assignment for a given User.
   */
  async assignStaff(payload: AssignStaffPayload, token?: string): Promise<AssignStaffResponse> {
    return request<AssignStaffResponse>(`${BASE}/cfs/staff-assignments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
  },

  /**
   * 3. Create Staff Member
   * Creates a new staff user (facilitator/case_worker) with a temporary password.
   */
  async createStaff(payload: CreateStaffPayload, token?: string): Promise<CreateStaffResponse> {
    return request<CreateStaffResponse>(`${BASE}/cfs/staff`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
  },

  /**
   * 4. Unassign Staff from CFS Location
   * Closes the active assignment (sets end_date to today).
   */
  async unassignStaff(payload: UnassignStaffPayload, token?: string): Promise<{ message: string }> {
    return request<{ message: string }>(`${BASE}/cfs/staff-assignments/unassign`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
  },

  /**
   * 3. Upsert Grant Targets
   * Inserts or Overrides the unified targets for the child-friendly spaces activity (cfs).
   */
  async upsertGrantTargets(payload: GrantTargetsPayload, token?: string): Promise<{ message: string }> {
    return request<{ message: string }>(`${BASE}/cfs/grant-targets`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
  },

  /**
   * 4. Upsert Location Session Types
   * Allows you to bulk-override or configure which session formats are available for a given unique CFS Location.
   */
  async upsertLocationSessionTypes(payload: LocationSessionTypesPayload, token?: string): Promise<{ message: string }> {
    return request<{ message: string }>(`${BASE}/cfs/location-session-types`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
  },

  /**
   * 5. Get Grant Targets
   * Retrieves the grant targets for the CFS activity.
   */
  async getGrantTargets(token?: string): Promise<GrantTargetsPayload | null> {
    return request<GrantTargetsPayload | null>(`${BASE}/cfs/grant-targets`, {
      method: 'GET',
    }, token);
  },

  /**
   * 6. Get Location Session Types
   * Retrieves the session types for a specific CFS location.
   */
  async getLocationSessionTypes(locationId: string, token?: string): Promise<{ session_types: SessionTypeToggle[] }> {
    return request<{ session_types: SessionTypeToggle[] }>(`${BASE}/cfs/location-session-types?location_id=${locationId}`, {
      method: 'GET',
    }, token);
  },

  /**
   * 7. Register Beneficiary
   * Creates the core demographic record for a child.
   */
  async registerBeneficiary(payload: RegisterBeneficiaryPayload, token?: string): Promise<BeneficiaryResponse> {
    return request<BeneficiaryResponse>(`${BASE}/cfs/beneficiaries`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
  },

  /**
   * 8. Create CFS Registration
   * Links an existing beneficiary to the active CFS location of the logged-in user.
   */
  async createCfsRegistration(payload: CreateCFSRegistrationPayload, token?: string): Promise<CFSRegistrationResponse> {
    return request<CFSRegistrationResponse>(`${BASE}/cfs/registrations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
  },

  /**
   * 9. Create CFS Session
   * Creates a new session for attendance tracking.
   */
  async createSession(payload: CreateSessionPayload, token?: string): Promise<CreateSessionResponse> {
    return request<CreateSessionResponse>(`${BASE}/cfs/sessions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
  },

  /**
   * 10. Record Attendance
   * Records attendance for a session with multiple beneficiary records.
   */
  async recordAttendance(payload: RecordAttendancePayload, token?: string): Promise<RecordAttendanceResponse> {
    return request<RecordAttendanceResponse>(`${BASE}/cfs/attendance`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
  },

  /**
   * 11. Get Beneficiaries
   * Retrieves all beneficiaries registered at the user's active CFS location.
   */
  async getBeneficiaries(token?: string): Promise<{ beneficiaries: BeneficiaryResponse['beneficiary'][] }> {
    return request<{ beneficiaries: BeneficiaryResponse['beneficiary'][] }>(`${BASE}/cfs/beneficiaries`, {
      method: 'GET',
    }, token);
  },

  /**
   * 12. Get Dashboard Stats
   * Retrieves aggregated CFS dashboard statistics including demographics, locations, attendance, and progress.
   */
  async getDashboardStats(token?: string): Promise<DashboardStatsResponse> {
    return request<DashboardStatsResponse>(`${BASE}/cfs/dashboard`, {
      method: 'GET',
    }, token);
  },

  /**
   * 13. Get My-Location Dashboard (facilitator / case_worker)
   * Returns a location-scoped dashboard for the logged-in staff member
   * based on their active CFS location assignment.
   */
  async getMyLocationDashboard(token?: string): Promise<MyLocationDashboardResponse> {
    return request<MyLocationDashboardResponse>(`${BASE}/cfs/dashboard/my-location`, {
      method: 'GET',
    }, token);
  },

  /**
   * 14. Get Beneficiaries List (paginated + filterable)
   * org_admin → all locations; facilitator/case_worker → scoped to their active assignment.
   */
  async getBeneficiariesList(params: BeneficiaryListParams = {}, token?: string): Promise<BeneficiaryListResponse> {
    const q = new URLSearchParams();
    if (params.page)              q.set('page',              String(params.page));
    if (params.page_size)         q.set('page_size',         String(params.page_size));
    if (params.search)            q.set('search',            params.search);
    if (params.sex)               q.set('sex',               params.sex);
    if (params.disability_status) q.set('disability_status', params.disability_status);
    if (params.cfs_location_id)   q.set('cfs_location_id',   params.cfs_location_id);
    if (params.sort_by)           q.set('sort_by',           params.sort_by);
    if (params.sort_order)        q.set('sort_order',        params.sort_order);
    const qs = q.toString();
    return request<BeneficiaryListResponse>(`${BASE}/cfs/beneficiaries/list${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    }, token);
  },

  /**
   * 15. Export Beneficiaries (Excel download)
   * Downloads the beneficiaries database as an Excel file.
   * Admin only.
   */
  async exportBeneficiaries(token?: string): Promise<void> {
    const resolved = resolveToken(token);
    const headers: Record<string, string> = {
      ...(resolved ? { Authorization: `Bearer ${resolved}` } : {}),
    };

    const response = await fetch(`${BASE}/cfs/beneficiaries/export`, { method: 'GET', headers });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new ApiError(response.status, data?.message ?? 'Export failed', data);
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition');
    let filename = 'beneficiaries.xlsx';
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=\s*"?([^";\n]+)"?/);
      if (match?.[1]) filename = match[1];
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
