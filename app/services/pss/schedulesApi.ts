/**
 * PSS schedules — HTTP wrapper.
 *
 * Jira: DART-41 (sub-task of DART-36).
 * Contract: DART-73 (PSS schedules + sessions endpoints, shipped to
 *           develop 2026-04-26 via PR #6).
 *
 * Translates between the local `PssScheduleRecord` (camelCase, carries
 * sync metadata + activity FKs) and the wire DTO (snake_case,
 * denormalised activity strings — server stores activity_name /
 * activity_aim / activity_steps / materials directly on the slot row).
 *
 * Wire shape (per `internal/dto/pss_dto.go` on develop):
 *   {
 *     cfs_location_id: UUID,
 *     name: string,
 *     slots: [{
 *       day_of_week: 0..6  // 0=Sun, 1=Mon, ..., 6=Sat
 *       time_period: "morning" | "afternoon",
 *       age_group:   "6-10" | "11-14" | "15-17" | "parents",
 *       activity_name:  string,    // required
 *       activity_aim:   string?,
 *       activity_steps: string?,
 *       materials:      string?,
 *       order_index:    int
 *     }]
 *   }
 *
 * Endpoints (BE on develop after PR #6):
 *   POST /api/v1/pss/schedules
 *   GET  /api/v1/pss/schedules
 *   GET  /api/v1/pss/schedules/:id
 *   POST /api/v1/pss/schedules/:id/activate
 *
 * NOTE: BE does NOT yet expose `PATCH /pss/schedules/:id` or
 * `POST /pss/schedules/:id/archive`. The wrapper still exposes
 * `update()` / `archive()` to keep the call sites compiling, but they
 * throw a tagged error so the offline-first fallback in
 * `usePssScheduleSave` kicks in and the user's work is not lost. When
 * the endpoints land, only this file needs to change.
 */

import type {
  PssActivityRecord,
  PssDayOfWeek,
  PssScheduleAgeGroup,
  PssScheduleRecord,
  PssScheduleStatus,
  PssTemplateSlot,
} from '~/interfaces/pssDb';
import { usePssApi } from '~/composables/usePssApi';

// ── Wire DTOs ──────────────────────────────────────────────────────────

export interface PssScheduleSlotDto {
  /** Server slot UUID (only present on responses). */
  id?: string;
  schedule_id?: string;
  day_of_week: number;
  time_period: 'morning' | 'afternoon';
  age_group: PssScheduleAgeGroup | 'parents';
  activity_name: string;
  activity_aim?: string;
  activity_steps?: string;
  materials?: string;
  order_index: number;
  created_at?: string;
}

export interface PssScheduleDto {
  id: string;
  organisation_id: string;
  cfs_location_id: string;
  name: string;
  status: PssScheduleStatus;
  created_by: string;
  activated_at?: string;
  archived_at?: string;
  created_at: string;
  updated_at: string;
  slots?: PssScheduleSlotDto[];
}

/** Body shape for `POST /pss/schedules`. */
export interface PssSchedulePayload {
  cfs_location_id: string;
  name: string;
  slots: PssScheduleSlotDto[];
}

// ── Day mapping ────────────────────────────────────────────────────────

const DAY_TO_INT: Record<PssDayOfWeek, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const INT_TO_DAY: Record<number, PssDayOfWeek> = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
};

// ── Activity lookup ────────────────────────────────────────────────────

/**
 * Caller-supplied lookup that resolves a slot's `activityId` to the full
 * activity record. The composable usually walks the local activities
 * repository (`activitiesRepository.getByEitherId`) once and passes a
 * pre-built map so the mapper stays sync.
 */
export type PssActivityLookup = (
  activityId: string,
) => PssActivityRecord | undefined;

function denormaliseSlot(
  slot: PssTemplateSlot,
  lookup: PssActivityLookup,
): PssScheduleSlotDto {
  const activity = lookup(slot.activityId);
  if (!activity) {
    throw new Error(
      `Cannot serialise schedule slot — activity ${slot.activityId} ` +
        `is not in the local catalogue.`,
    );
  }
  const steps = activity.steps?.length
    ? activity.steps.map((s, i) => `${i + 1}) ${s}`).join('\n')
    : undefined;
  return {
    day_of_week: DAY_TO_INT[slot.day],
    time_period: slot.timePeriod,
    age_group: slot.ageGroup,
    activity_name: activity.name,
    activity_aim: activity.description || undefined,
    activity_steps: steps,
    materials: activity.materials || undefined,
    order_index: slot.order,
  };
}

// ── Mappers ────────────────────────────────────────────────────────────

/**
 * Build the server payload for `POST /pss/schedules`.
 *
 * Activities are denormalised into their text fields because the
 * server stores them as immutable schedule-time snapshots (so a later
 * edit to a custom activity's steps does not silently rewrite history).
 * Callers must pre-fetch the activity catalogue.
 */
export function toSchedulePayload(
  record: PssScheduleRecord,
  lookup: PssActivityLookup,
): PssSchedulePayload {
  return {
    cfs_location_id: record.cfsLocationId,
    name: record.name || defaultScheduleName(record),
    slots: record.templateSlots.map((s) => denormaliseSlot(s, lookup)),
  };
}

function defaultScheduleName(record: PssScheduleRecord): string {
  const date = (record.createdAt || record.clientTimestamp).slice(0, 10);
  return `Schedule ${date}`;
}

/**
 * Merge a server DTO back over a local record. The server-authoritative
 * fields are id/status/name/timestamps — local fields like
 * `templateSlots` (with their `activityId` FKs) are preserved because
 * the server only echoes the denormalised slot text and we'd lose the
 * link otherwise.
 */
export function applyScheduleDto(
  local: PssScheduleRecord,
  dto: PssScheduleDto,
): PssScheduleRecord {
  // If the server returns slots, derive the active-day / age-group /
  // time-period summaries from them so the UI lists are consistent
  // with the persisted truth. The activityId FK on each local slot is
  // preserved by zipping back through `(day, time_period, age_group,
  // order_index)` which is unique within a schedule.
  const merged: PssScheduleRecord = {
    ...local,
    id: dto.id,
    serverId: dto.id,
    name: dto.name,
    cfsLocationId: dto.cfs_location_id,
    status: dto.status,
    createdBy: dto.created_by,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
  if (dto.slots && dto.slots.length > 0) {
    merged.activeDays = uniq(
      dto.slots
        .map((s) => INT_TO_DAY[s.day_of_week])
        .filter((d): d is PssDayOfWeek => Boolean(d)),
    );
    merged.ageGroups = uniq(
      dto.slots
        .map((s) => s.age_group)
        .filter((g): g is PssScheduleAgeGroup =>
          g === '6-10' || g === '11-14' || g === '15-17',
        ),
    );
  }
  return merged;
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

// ── HTTP wrapper ───────────────────────────────────────────────────────

export class PssEndpointNotShippedError extends Error {
  readonly code = 'PSS_ENDPOINT_NOT_SHIPPED';
  constructor(endpoint: string) {
    super(`PSS endpoint ${endpoint} is not yet exposed by the backend.`);
    this.name = 'PssEndpointNotShippedError';
  }
}

export interface PssSchedulesApi {
  create(
    record: PssScheduleRecord,
    lookup: PssActivityLookup,
    opts?: { idempotencyKey?: string; signal?: AbortSignal },
  ): Promise<PssScheduleDto>;

  /** Not yet implemented on BE — throws PssEndpointNotShippedError. */
  update(
    id: string,
    record: PssScheduleRecord,
    lookup: PssActivityLookup,
    opts?: { idempotencyKey?: string; signal?: AbortSignal },
  ): Promise<PssScheduleDto>;

  activate(
    id: string,
    opts?: { idempotencyKey?: string; signal?: AbortSignal },
  ): Promise<PssScheduleDto>;

  /** Not yet implemented on BE — throws PssEndpointNotShippedError. */
  archive(
    id: string,
    opts?: { idempotencyKey?: string; signal?: AbortSignal },
  ): Promise<PssScheduleDto>;
}

export function usePssSchedulesApi(): PssSchedulesApi {
  const api = usePssApi();
  return {
    create(record, lookup, opts) {
      return api.post<PssScheduleDto>(
        '/pss/schedules',
        toSchedulePayload(record, lookup),
        { idempotencyKey: opts?.idempotencyKey, signal: opts?.signal },
      );
    },
    update(_id, _record, _lookup, _opts) {
      return Promise.reject(
        new PssEndpointNotShippedError('PATCH /pss/schedules/:id'),
      );
    },
    activate(id, opts) {
      return api.post<PssScheduleDto>(
        `/pss/schedules/${encodeURIComponent(id)}/activate`,
        undefined,
        { idempotencyKey: opts?.idempotencyKey, signal: opts?.signal },
      );
    },
    archive(_id, _opts) {
      return Promise.reject(
        new PssEndpointNotShippedError('POST /pss/schedules/:id/archive'),
      );
    },
  };
}
