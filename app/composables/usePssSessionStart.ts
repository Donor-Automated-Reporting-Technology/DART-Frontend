/**
 * usePssSessionStart — start a PSS session for a schedule slot.
 *
 * Jira: DART-51 (sub-task of DART-35).
 *
 * Calls `POST /api/v1/pss/sessions` for the (schedule, date, time_period,
 * age_group) tuple. The BE auto-seeds `pss_session_activities` from the
 * schedule's slots, so the FE doesn't pre-build them. On success the
 * composable upserts the session + its slots into IndexedDB so the
 * session checklist (DART-45) renders even after a refresh / offline.
 *
 * Online-first by design — without the BE call we don't get a server
 * session id, and the complete/flag endpoints later in the flow need it.
 * If the user is offline this surfaces an error; queued offline-creates
 * are a follow-up ticket.
 */

import { v4 as uuidv4 } from 'uuid';

import { sessionsRepository } from '~/services/pss/repositories/sessionsRepository';
import { sessionActivitiesRepository } from '~/services/pss/repositories/sessionActivitiesRepository';
import {
  usePssSessionsApi,
  type PssCreateSessionPayload,
  type PssSessionDto,
} from '~/services/pss/sessionsApi';
import type {
  PssScheduleAgeGroup,
  PssSessionActivityRecord,
  PssSessionRecord,
  PssTimePeriodLabel,
} from '~/interfaces/pssDb';
import { useAuthStore } from '~/stores/auth';

export interface PssStartSessionInput {
  scheduleId: string;
  /** YYYY-MM-DD; defaults to today in the browser timezone. */
  date?: string;
  timePeriod: PssTimePeriodLabel;
  ageGroup: PssScheduleAgeGroup;
  /** Facilitator objectives — non-empty list required by the BE. */
  objectives: string[];
}

export interface PssStartSessionResult {
  session: PssSessionRecord;
  slots: PssSessionActivityRecord[];
}

function todayLocalIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function dtoToSessionRecord(dto: PssSessionDto): PssSessionRecord {
  return {
    id: dto.id,
    clientId: dto.id,
    serverId: dto.id,
    clientTimestamp: dto.client_timestamp ?? new Date().toISOString(),
    syncStatus: 'synced',
    syncError: undefined,
    scheduleId: dto.schedule_id,
    cfsLocationId: dto.cfs_location_id,
    date: dto.session_date.slice(0, 10),
    timePeriod: dto.time_period,
    ageGroup: dto.age_group,
    status: dto.status,
    facilitatorId: dto.facilitator_id,
    remarks: dto.remarks ?? '',
    startedAt: dto.started_at,
    completedAt: dto.completed_at ?? null,
    objectives: dto.objectives ?? [],
    keyObservations: dto.key_observations ?? '',
    protectionNotes: dto.protection_notes ?? '',
    challenges: dto.challenges ?? '',
    followUpActions: dto.follow_up_actions ?? [],
    reflection: dto.reflection ?? '',
  };
}

function dtoToSlotRecords(dto: PssSessionDto): PssSessionActivityRecord[] {
  if (!dto.activities) return [];
  return dto.activities.map((a) => ({
    id: a.id,
    clientId: a.id,
    serverId: a.id,
    clientTimestamp: a.client_timestamp ?? new Date().toISOString(),
    syncStatus: 'synced',
    syncError: undefined,
    sessionId: dto.id,
    // The slot row carries the activity's denormalised text inline; we
    // store the slot id as the activityId so the checklist's catalogue
    // lookup can resolve via the synthetic entries seeded by
    // schedules.vue. When that page hasn't run yet the slot still
    // renders via the activity name fallback in the checklist UI.
    activityId: a.schedule_slot_id ?? a.id,
    order: a.order_index,
    status: a.status,
    notes: a.notes ?? '',
    completedAt: a.completed_at ?? null,
    flaggedChildren: [],
  }));
}

export interface UsePssSessionStartReturn {
  start: (input: PssStartSessionInput) => Promise<PssStartSessionResult>;
}

export function usePssSessionStart(): UsePssSessionStartReturn {
  const auth = useAuthStore();
  const api = usePssSessionsApi();

  async function start(
    input: PssStartSessionInput,
  ): Promise<PssStartSessionResult> {
    const date = input.date ?? todayLocalIso();
    const clientUuid = uuidv4();
    const clientTimestamp = new Date().toISOString();

    const objectives = (input.objectives ?? [])
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
    if (objectives.length === 0) {
      throw new Error('At least one session objective is required.');
    }

    const payload: PssCreateSessionPayload = {
      schedule_id: input.scheduleId,
      session_date: date,
      time_period: input.timePeriod,
      age_group: input.ageGroup,
      objectives,
      client_uuid: clientUuid,
      client_timestamp: clientTimestamp,
    };

    let dto: PssSessionDto;
    try {
      dto = await api.create(payload, { idempotencyKey: clientUuid });
    } catch (err) {
      // 409 = the BE's UNIQUE on (schedule, date, time_period, age_group)
      //       fired because another device already started this session
      //       on the same account. Resolve by fetching the in-progress
      //       session from the server list and resuming it locally.
      const status = (err as { status?: number } | null)?.status;
      if (status !== 409) throw err;
      // Match on the full uniqueness tuple and scope to this facilitator.
      const existing = await api.list({
        date,
        onlyMine: true,
      });
      const match = existing.find(
        (s) =>
          s.schedule_id === input.scheduleId &&
          s.session_date.slice(0, 10) === date &&
          s.time_period === input.timePeriod &&
          s.age_group === input.ageGroup,
      );
      if (!match) {
        throw err;
      }
      // Hydrate the full session (with activities) so the checklist has
      // data on first load — list responses may omit `activities`.
      dto = await api.get(match.id);
    }

    const sessionRecord = dtoToSessionRecord(dto);
    const slotRecords = dtoToSlotRecords(dto);

    // Persist locally so the checklist page has data immediately even
    // if the user navigates back and forward.
    sessionRecord.facilitatorId =
      sessionRecord.facilitatorId || auth.userId || '';
    await sessionsRepository.upsert(sessionRecord);
    if (slotRecords.length > 0) {
      await sessionActivitiesRepository.bulkUpsert(slotRecords);
    }

    return { session: sessionRecord, slots: slotRecords };
  }

  return { start };
}
