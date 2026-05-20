/**
 * PSS days — HTTP wrapper for end-of-day operations.
 *
 * Endpoint:
 *   POST /api/v1/pss/days/:dayId/smiley
 *
 * `dayId` is the composite `${scheduleId}:${date}` (URL-encoded). The
 * server upserts on this composite so retries with the same payload are
 * idempotent.
 *
 * On 2xx success the active day is considered done + locked. The frontend
 * persists a `pss_day_smiley` row locally and ceases to allow edits to
 * sessions belonging to that (scheduleId, date).
 */

import { usePssApi } from '~/composables/usePssApi';

export interface PssDaySmileyPayload {
  schedule_id: string;
  date: string;
  very_happy: number;
  happy: number;
  ok: number;
  unhappy: number;
  very_unhappy: number;
  blank: number;
  total_children: number;
  facilitator_id: string;
  client_uuid?: string;
  device_id?: string;
  client_timestamp?: string;
}

export interface PssDaySmileyDto {
  id: string;
  day_id: string;
  schedule_id: string;
  date: string;
  very_happy: number;
  happy: number;
  ok: number;
  unhappy: number;
  very_unhappy: number;
  blank: number;
  total_children: number;
  facilitator_id: string;
  locked_at: string;
  client_uuid?: string | null;
  device_id?: string | null;
  client_timestamp?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PssDaysApi {
  /**
   * Submit the end-of-day smiley evaluation for `dayId` and lock the day.
   */
  submitSmiley(
    dayId: string,
    payload: PssDaySmileyPayload,
    opts?: { idempotencyKey?: string; signal?: AbortSignal },
  ): Promise<PssDaySmileyDto>;

  /**
   * Fetch the existing day-smiley row, if any. Returns null on 404 so
   * callers can treat "not yet evaluated" as a non-error state. Used by
   * Today's Sessions to hydrate cross-device lock state.
   */
  getSmiley(
    dayId: string,
    opts?: { signal?: AbortSignal },
  ): Promise<PssDaySmileyDto | null>;
}

export function usePssDaysApi(): PssDaysApi {
  const api = usePssApi();
  return {
    submitSmiley(dayId, payload, opts) {
      return api.post<PssDaySmileyDto>(
        `/pss/days/${encodeURIComponent(dayId)}/smiley`,
        payload,
        { idempotencyKey: opts?.idempotencyKey, signal: opts?.signal },
      );
    },
    async getSmiley(dayId, opts) {
      try {
        return await api.get<PssDaySmileyDto>(
          `/pss/days/${encodeURIComponent(dayId)}/smiley`,
          { signal: opts?.signal },
        );
      } catch (err) {
        const e = err as { status?: number };
        if (e?.status === 404) return null;
        throw err;
      }
    },
  };
}
