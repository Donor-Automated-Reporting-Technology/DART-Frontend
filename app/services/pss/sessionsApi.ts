/**
 * PSS sessions — HTTP wrapper for in-progress session writes.
 *
 * Jira: DART-44 (complete activity sheet + child flag) / DART-37
 *       (complete session with overall remarks).
 * Contract: DART-61 PSS API Contract v1.
 *
 * Endpoints:
 *   PATCH /api/v1/pss/sessions/:id/activities/:activityId/complete
 *   POST  /api/v1/pss/sessions/:id/flags
 *   PATCH /api/v1/pss/sessions/:id/complete
 *
 * The route ids are server UUIDs (`pss_sessions.id`,
 * `pss_session_activities.id`). The local records carry both a
 * `clientId` (Dexie primary key) and a `serverId`; callers must resolve
 * the serverIds before invoking these helpers — offline-only records
 * have no serverId yet and the BE call would 404.
 */

import { usePssApi } from '~/composables/usePssApi';
import type {
  PssScheduleAgeGroup,
  PssTimePeriodLabel,
} from '~/interfaces/pssDb';

export interface PssCreateSessionPayload {
  schedule_id: string;
  session_date: string;
  time_period: PssTimePeriodLabel;
  age_group: PssScheduleAgeGroup;
  /** Facilitator's session objectives — non-empty list. */
  objectives: string[];
  client_uuid?: string;
  device_id?: string;
  client_timestamp?: string;
}

export interface PssCompleteActivityPayload {
  notes?: string;
  completed_at?: string;
  client_timestamp?: string;
}

export interface PssFlagChildPayload {
  session_activity_id?: string;
  beneficiary_id: string;
  concern: string;
  flagged_at?: string;
  device_id?: string;
  client_uuid?: string;
}

export interface PssCompleteSessionPayload {
  /** Required facilitator-report fields. */
  key_observations: string;
  protection_notes: string;
  challenges: string;
  follow_up_actions: string[];
  reflection: string;
  /** Optional, kept for backward compatibility. */
  remarks?: string;
  completed_at?: string;
}

export interface PssAttendanceEntryPayload {
  beneficiary_id: string;
  status: 'present' | 'absent';
}

export interface PssMarkAttendancePayload {
  entries: PssAttendanceEntryPayload[];
  device_id?: string;
  client_timestamp?: string;
}

export interface PssAttendanceDto {
  id: string;
  session_id: string;
  beneficiary_id: string;
  status: 'present' | 'absent';
  marked_by: string;
  marked_at: string;
  client_uuid?: string | null;
  device_id?: string | null;
  client_timestamp?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PssSessionActivityDto {
  id: string;
  session_id: string;
  schedule_slot_id?: string | null;
  activity_name: string;
  activity_aim?: string | null;
  activity_steps?: string | null;
  materials?: string | null;
  order_index: number;
  status: 'pending' | 'completed';
  notes?: string | null;
  completed_at?: string | null;
  client_timestamp?: string | null;
}

export interface PssFlagDto {
  id: string;
  session_id: string;
  session_activity_id?: string | null;
  beneficiary_id: string;
  concern: string;
  flagged_at: string;
}

export interface PssSessionDto {
  id: string;
  organisation_id?: string;
  cfs_location_id: string;
  schedule_id: string;
  facilitator_id: string;
  session_date: string;
  time_period: PssTimePeriodLabel;
  age_group: PssScheduleAgeGroup;
  status: 'in-progress' | 'completed';
  remarks?: string | null;
  objectives?: string[] | null;
  key_observations?: string | null;
  protection_notes?: string | null;
  challenges?: string | null;
  follow_up_actions?: string[] | null;
  reflection?: string | null;
  started_at: string;
  completed_at?: string | null;
  client_uuid?: string | null;
  device_id?: string | null;
  client_timestamp?: string | null;
  created_at?: string;
  updated_at?: string;
  activities?: PssSessionActivityDto[];
  flags?: unknown[];
}

export interface PssSessionListQuery {
  date?: string;
  status?: 'in-progress' | 'completed';
  cfsLocationId?: string;
  onlyMine?: boolean;
}

export interface PssSessionsApi {
  /**
   * Start a session for a (schedule, date, time_period, age_group)
   * slot. The BE seeds `pss_session_activities` from the schedule's
   * slots automatically, so no `activities[]` payload is required.
   * The BE enforces UNIQUE on the 4-tuple — duplicate creates return
   * the existing session via `client_uuid` idempotency.
   */
  create(
    payload: PssCreateSessionPayload,
    opts?: { idempotencyKey?: string; signal?: AbortSignal },
  ): Promise<PssSessionDto>;

  /**
   * Pull sessions from the server. Backend filters by the caller's
   * organisation; pass `cfsLocationId` / `date` to narrow further.
   * Used to reconcile in-progress sessions across devices for the same
   * facilitator account.
   */
  list(
    query?: PssSessionListQuery,
    opts?: { signal?: AbortSignal },
  ): Promise<PssSessionDto[]>;

  /** Fetch a single session including its activities + flags. */
  get(
    id: string,
    opts?: { signal?: AbortSignal },
  ): Promise<PssSessionDto>;

  /**
   * Beneficiaries registered at this session's CFS — uses a session-
   * scoped endpoint so facilitators whose personal assignment differs
   * from the session's CFS still get the right roster (the org-wide
   * `/cfs/beneficiaries/list` hard-scopes to the caller's assignment).
   */
  listEligibleBeneficiaries(
    sessionId: string,
    opts?: { signal?: AbortSignal },
  ): Promise<unknown[]>;

  /**
   * Bulk upsert per-session attendance. Re-marking the same beneficiary
   * flips the status server-side (UNIQUE on session_id + beneficiary_id).
   */
  markAttendance(
    sessionId: string,
    payload: PssMarkAttendancePayload,
    opts?: { idempotencyKey?: string; signal?: AbortSignal },
  ): Promise<PssAttendanceDto[]>;

  listAttendance(
    sessionId: string,
    opts?: { signal?: AbortSignal },
  ): Promise<PssAttendanceDto[]>;

  completeActivity(
    sessionId: string,
    sessionActivityId: string,
    payload: PssCompleteActivityPayload,
    opts?: { idempotencyKey?: string; signal?: AbortSignal },
  ): Promise<PssSessionActivityDto>;

  flagChild(
    sessionId: string,
    payload: PssFlagChildPayload,
    opts?: { idempotencyKey?: string; signal?: AbortSignal },
  ): Promise<PssFlagDto>;

  completeSession(
    sessionId: string,
    payload: PssCompleteSessionPayload,
    opts?: { idempotencyKey?: string; signal?: AbortSignal },
  ): Promise<PssSessionDto>;
}

export function usePssSessionsApi(): PssSessionsApi {
  const api = usePssApi();
  return {
    create(payload, opts) {
      return api.post<PssSessionDto>('/pss/sessions', payload, {
        idempotencyKey: opts?.idempotencyKey,
        signal: opts?.signal,
      });
    },
    list(query, opts) {
      return api.get<PssSessionDto[]>('/pss/sessions', {
        query: {
          date: query?.date,
          status: query?.status,
          cfs_location_id: query?.cfsLocationId,
          only_mine: query?.onlyMine ? 'true' : undefined,
        },
        signal: opts?.signal,
      });
    },
    get(id, opts) {
      return api.get<PssSessionDto>(
        `/pss/sessions/${encodeURIComponent(id)}`,
        { signal: opts?.signal },
      );
    },
    listEligibleBeneficiaries(sessionId, opts) {
      return api.get<unknown[]>(
        `/pss/sessions/${encodeURIComponent(sessionId)}/eligible-beneficiaries`,
        { signal: opts?.signal },
      );
    },
    markAttendance(sessionId, payload, opts) {
      return api.post<PssAttendanceDto[]>(
        `/pss/sessions/${encodeURIComponent(sessionId)}/attendance`,
        payload,
        { idempotencyKey: opts?.idempotencyKey, signal: opts?.signal },
      );
    },
    listAttendance(sessionId, opts) {
      return api.get<PssAttendanceDto[]>(
        `/pss/sessions/${encodeURIComponent(sessionId)}/attendance`,
        { signal: opts?.signal },
      );
    },
    completeActivity(sessionId, sessionActivityId, payload, opts) {
      return api.patch<PssSessionActivityDto>(
        `/pss/sessions/${encodeURIComponent(sessionId)}/activities/${encodeURIComponent(sessionActivityId)}/complete`,
        payload,
        { idempotencyKey: opts?.idempotencyKey, signal: opts?.signal },
      );
    },
    flagChild(sessionId, payload, opts) {
      return api.post<PssFlagDto>(
        `/pss/sessions/${encodeURIComponent(sessionId)}/flags`,
        payload,
        { idempotencyKey: opts?.idempotencyKey, signal: opts?.signal },
      );
    },
    completeSession(sessionId, payload, opts) {
      return api.patch<PssSessionDto>(
        `/pss/sessions/${encodeURIComponent(sessionId)}/complete`,
        payload,
        { idempotencyKey: opts?.idempotencyKey, signal: opts?.signal },
      );
    },
  };
}
