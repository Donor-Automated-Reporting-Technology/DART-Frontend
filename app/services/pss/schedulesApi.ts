/**
 * PSS schedules — HTTP wrapper.
 *
 * Jira: DART-41 (sub-task of DART-36).
 * Contract: DART-61 PSS API Contract v1.
 *
 * Translates between the local `PssScheduleRecord` (camelCase, carries
 * sync metadata) and the wire DTO (snake_case, what the server stores
 * and returns). Mappers live alongside the wrapper so the rest of the
 * app — composables, components, repositories — never sees snake_case.
 *
 * Wire shape (per DART/PSS_SCHEDULE_TRD.md §5):
 *   {
 *     id, cfs_location_id, status,
 *     active_days: ["mon", ...],
 *     age_groups:  ["6-10", ...],
 *     time_periods: [{ label, start_time, end_time }, ...],
 *     template_slots: [{ day, time_period, age_group, order, activity_id }],
 *     created_by, created_at, updated_at
 *   }
 *
 * Endpoints used by DART-41 (all already shipped per DART-61):
 *   POST   /api/v1/pss/schedules
 *   PATCH  /api/v1/pss/schedules/:id
 *   POST   /api/v1/pss/schedules/:id/activate
 *   POST   /api/v1/pss/schedules/:id/archive
 */

import type {
  PssDayOfWeek,
  PssScheduleAgeGroup,
  PssScheduleRecord,
  PssScheduleStatus,
  PssTemplateSlot,
  PssTimePeriod,
  PssTimePeriodLabel,
} from '~/interfaces/pssDb';
import { usePssApi } from '~/composables/usePssApi';

// ── Wire DTOs ──────────────────────────────────────────────────────────

interface PssTimePeriodDto {
  label: PssTimePeriodLabel;
  start_time: string;
  end_time: string;
}

interface PssTemplateSlotDto {
  day: PssDayOfWeek;
  time_period: PssTimePeriodLabel;
  age_group: PssScheduleAgeGroup;
  order: number;
  activity_id: string;
}

export interface PssScheduleDto {
  id: string;
  cfs_location_id: string;
  status: PssScheduleStatus;
  active_days: PssDayOfWeek[];
  age_groups: PssScheduleAgeGroup[];
  time_periods: PssTimePeriodDto[];
  template_slots: PssTemplateSlotDto[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** Body shape for `POST /pss/schedules` and `PATCH /pss/schedules/:id`. */
export interface PssSchedulePayload {
  cfs_location_id: string;
  active_days: PssDayOfWeek[];
  age_groups: PssScheduleAgeGroup[];
  time_periods: PssTimePeriodDto[];
  template_slots: PssTemplateSlotDto[];
}

// ── Mappers ────────────────────────────────────────────────────────────

function toTimePeriodDto(tp: PssTimePeriod): PssTimePeriodDto {
  return { label: tp.label, start_time: tp.startTime, end_time: tp.endTime };
}

function toTimePeriod(dto: PssTimePeriodDto): PssTimePeriod {
  return { label: dto.label, startTime: dto.start_time, endTime: dto.end_time };
}

function toSlotDto(slot: PssTemplateSlot): PssTemplateSlotDto {
  return {
    day: slot.day,
    time_period: slot.timePeriod,
    age_group: slot.ageGroup,
    order: slot.order,
    activity_id: slot.activityId,
  };
}

function toSlot(dto: PssTemplateSlotDto): PssTemplateSlot {
  return {
    day: dto.day,
    timePeriod: dto.time_period,
    ageGroup: dto.age_group,
    order: dto.order,
    activityId: dto.activity_id,
  };
}

/** Convert a local record into the create/update payload. */
export function toSchedulePayload(
  record: PssScheduleRecord,
): PssSchedulePayload {
  return {
    cfs_location_id: record.cfsLocationId,
    active_days: record.activeDays,
    age_groups: record.ageGroups,
    time_periods: record.timePeriods.map(toTimePeriodDto),
    template_slots: record.templateSlots.map(toSlotDto),
  };
}

/** Merge a server DTO back over a local record (preserves sync metadata
 *  except `id` / `serverId` which the server is authoritative for). */
export function applyScheduleDto(
  local: PssScheduleRecord,
  dto: PssScheduleDto,
): PssScheduleRecord {
  return {
    ...local,
    id: dto.id,
    serverId: dto.id,
    cfsLocationId: dto.cfs_location_id,
    status: dto.status,
    activeDays: dto.active_days,
    ageGroups: dto.age_groups,
    timePeriods: dto.time_periods.map(toTimePeriod),
    templateSlots: dto.template_slots.map(toSlot),
    createdBy: dto.created_by,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

// ── HTTP wrapper ───────────────────────────────────────────────────────

export interface PssSchedulesApi {
  create(
    record: PssScheduleRecord,
    opts?: { idempotencyKey?: string; signal?: AbortSignal },
  ): Promise<PssScheduleDto>;

  update(
    id: string,
    record: PssScheduleRecord,
    opts?: { idempotencyKey?: string; signal?: AbortSignal },
  ): Promise<PssScheduleDto>;

  activate(
    id: string,
    opts?: { idempotencyKey?: string; signal?: AbortSignal },
  ): Promise<PssScheduleDto>;

  archive(
    id: string,
    opts?: { idempotencyKey?: string; signal?: AbortSignal },
  ): Promise<PssScheduleDto>;
}

export function usePssSchedulesApi(): PssSchedulesApi {
  const api = usePssApi();
  return {
    create(record, opts) {
      return api.post<PssScheduleDto>(
        '/pss/schedules',
        toSchedulePayload(record),
        { idempotencyKey: opts?.idempotencyKey, signal: opts?.signal },
      );
    },
    update(id, record, opts) {
      return api.patch<PssScheduleDto>(
        `/pss/schedules/${encodeURIComponent(id)}`,
        toSchedulePayload(record),
        { idempotencyKey: opts?.idempotencyKey, signal: opts?.signal },
      );
    },
    activate(id, opts) {
      return api.post<PssScheduleDto>(
        `/pss/schedules/${encodeURIComponent(id)}/activate`,
        undefined,
        { idempotencyKey: opts?.idempotencyKey, signal: opts?.signal },
      );
    },
    archive(id, opts) {
      return api.post<PssScheduleDto>(
        `/pss/schedules/${encodeURIComponent(id)}/archive`,
        undefined,
        { idempotencyKey: opts?.idempotencyKey, signal: opts?.signal },
      );
    },
  };
}
