/**
 * PSS sessions — HTTP wrapper.
 *
 * Jira: DART-51 (sub-task of DART-35).
 * Contract: DART-61 PSS API Contract v1 (snake_case wire shape).
 * Schema source: DART/PSS_SCHEDULE_TRD.md §Tables (pss_sessions,
 * pss_session_activities).
 *
 * Translates between the local `PssSessionRecord` /
 * `PssSessionActivityRecord` (camelCase, sync metadata) and the wire
 * DTOs (snake_case). Mappers stay in this module so callers never see
 * snake_case or have to remember the exact field renames.
 *
 * Endpoints touched by DART-51:
 *   POST /api/v1/pss/sessions        — start a session for a
 *                                       (schedule, date, time_period,
 *                                       age_group) slot. Server enforces
 *                                       the UNIQUE constraint on that
 *                                       4-tuple.
 *
 * Other session endpoints (PATCH `/sessions/:id/activities/:activityId/complete`,
 * POST `/sessions/:id/flags`, PATCH `/sessions/:id/complete`) are
 * intentionally left for DART-44 / DART-37.
 */

import type {
  PssScheduleAgeGroup,
  PssSessionActivityRecord,
  PssSessionRecord,
  PssSessionStatus,
  PssTimePeriodLabel,
} from '~/interfaces/pssDb';
import { usePssApi } from '~/composables/usePssApi';

// ── Wire DTOs ─────────────────────────────────────────────────────────

/**
 * Slot row returned/sent inside a session payload.
 * `slot_order` is 1-based (per DB `CHECK (slot_order >= 1 AND <= 4)`).
 */
export interface PssSessionActivityDto {
  id: string;
  session_id: string;
  activity_id: string;
  slot_order: number;
  status: 'pending' | 'completed';
  notes?: string | null;
  completed_at?: string | null;
}

export interface PssSessionDto {
  id: string;
  schedule_id: string;
  cfs_location_id: string;
  session_date: string;
  time_period: PssTimePeriodLabel;
  age_group: PssScheduleAgeGroup;
  status: PssSessionStatus;
  facilitator_id: string;
  remarks?: string | null;
  started_at: string;
  completed_at?: string | null;
  client_timestamp?: string | null;
  /** Activity slots seeded by the client at session-start. */
  activities?: PssSessionActivityDto[];
}

/** Body of `POST /pss/sessions`. */
export interface PssSessionCreatePayload {
  schedule_id: string;
  cfs_location_id: string;
  session_date: string;
  time_period: PssTimePeriodLabel;
  age_group: PssScheduleAgeGroup;
  facilitator_id: string;
  started_at: string;
  client_timestamp: string;
  /** Pre-seeded slot list (1-based `slot_order`). */
  activities: Array<{
    activity_id: string;
    slot_order: number;
  }>;
}

// ── Mappers ───────────────────────────────────────────────────────────

/**
 * Build the create payload from a freshly-built local session record
 * plus its slot rows. The caller composes both records together so the
 * server seeds `pss_session_activities` atomically with the session.
 */
export function toSessionCreatePayload(
  session: PssSessionRecord,
  cfsLocationId: string,
  slots: PssSessionActivityRecord[],
): PssSessionCreatePayload {
  return {
    schedule_id: session.scheduleId,
    cfs_location_id: cfsLocationId,
    session_date: session.date,
    time_period: session.timePeriod,
    age_group: session.ageGroup,
    facilitator_id: session.facilitatorId,
    started_at: session.startedAt ?? session.clientTimestamp,
    client_timestamp: session.clientTimestamp,
    activities: slots
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((s) => ({ activity_id: s.activityId, slot_order: s.order })),
  };
}

/** Merge a server DTO back over a local session record. */
export function applySessionDto(
  local: PssSessionRecord,
  dto: PssSessionDto,
): PssSessionRecord {
  return {
    ...local,
    id: dto.id,
    serverId: dto.id,
    scheduleId: dto.schedule_id,
    date: dto.session_date,
    timePeriod: dto.time_period,
    ageGroup: dto.age_group,
    status: dto.status,
    facilitatorId: dto.facilitator_id,
    remarks: dto.remarks ?? local.remarks ?? '',
    startedAt: dto.started_at,
    completedAt: dto.completed_at ?? null,
  };
}

/** Merge a single slot DTO back over a local slot record. */
export function applySessionActivityDto(
  local: PssSessionActivityRecord,
  dto: PssSessionActivityDto,
): PssSessionActivityRecord {
  return {
    ...local,
    id: dto.id,
    serverId: dto.id,
    sessionId: dto.session_id,
    activityId: dto.activity_id,
    order: dto.slot_order,
    status: dto.status,
    notes: dto.notes ?? local.notes ?? '',
    completedAt: dto.completed_at ?? null,
  };
}

// ── HTTP wrapper ──────────────────────────────────────────────────────

export interface PssSessionsApi {
  /**
   * Create a session for the (schedule, date, time_period, age_group)
   * slot. Idempotency key is required so retries from the sync queue
   * cannot create duplicate sessions on the server side.
   */
  create(
    payload: PssSessionCreatePayload,
    opts: { idempotencyKey: string; signal?: AbortSignal },
  ): Promise<PssSessionDto>;
}

export function usePssSessionsApi(): PssSessionsApi {
  const api = usePssApi();
  return {
    create(payload, opts) {
      return api.post<PssSessionDto>('/pss/sessions', payload, {
        idempotencyKey: opts.idempotencyKey,
        signal: opts.signal,
      });
    },
  };
}
