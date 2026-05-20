/**
 * `pss_day_smiley` repository — end-of-day UNICEF 5-face evaluation.
 *
 * One row per (scheduleId, date). The local primary key is the composite
 * string `${scheduleId}:${date}` so that:
 *   • Re-entry of the screen is idempotent (upsert by composite).
 *   • Existence of a row is the source of truth for "day done + locked".
 *
 * The server endpoint is `POST /api/v1/pss/days/:dayId/smiley` where
 * `dayId` matches this composite (see `daysApi.ts`).
 */

import { pssDb } from '../db';
import type { PssDaySmileyRecord } from '../../../interfaces/pssDb';
import { BaseRepository } from './baseRepository';

/** Build the composite local id used as `clientId` and the API `dayId`. */
export function buildDayId(scheduleId: string, date: string): string {
  return `${scheduleId}:${date}`;
}

class DaySmileyRepository extends BaseRepository<PssDaySmileyRecord> {
  constructor() {
    super(pssDb.pss_day_smiley);
  }

  getByDay(
    scheduleId: string,
    date: string,
  ): Promise<PssDaySmileyRecord | undefined> {
    return this.table.get(buildDayId(scheduleId, date));
  }

  listByDate(date: string): Promise<PssDaySmileyRecord[]> {
    return this.table.where('date').equals(date).toArray();
  }
}

export const daySmileyRepository = new DaySmileyRepository();
