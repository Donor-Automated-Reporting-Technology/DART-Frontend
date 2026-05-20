/**
 * PSS module — local IndexedDB record types.
 *
 * Jira: DART-63 (sub-task of DART-60).
 * Contract: DART-61 PSS API Contract v1 (OpenAPI 3.1).
 *
 * These types describe the shape of records as they are PERSISTED IN
 * IndexedDB (Dexie). They are intentionally distinct from the API DTOs
 * (owned by DART-69, generated from the OpenAPI spec) because:
 *
 *   1. Local records carry sync metadata (`syncStatus`, `serverId`,
 *      `clientTimestamp`, `clientId`) that the wire format does not.
 *   2. We use camelCase locally, snake_case on the wire — keeping the two
 *      type families separate avoids leaking transport concerns into
 *      stores / components.
 *
 * Mappers between API DTO ⇄ local record live alongside the per-resource
 * service in `app/services/pss/`.
 *
 * Data model source: DART/PSS_MODULE_PRD.md §9.
 */

// ── Shared primitives ─────────────────────────────────────────────────────

export type PssLocalSyncStatus =
  | 'synced'
  | 'pending'
  | 'syncing'
  | 'failed'
  | 'conflict';

export type PssActivityCategory = 'play' | 'wellbeing' | 'learn';

export type PssActivityAgeGroup =
  | '6-10'
  | '11-14'
  | '15-17'
  | 'all'
  | 'parents';

export type PssScheduleAgeGroup = '6-10' | '11-14' | '15-17';

export type PssDayOfWeek =
  | 'mon'
  | 'tue'
  | 'wed'
  | 'thu'
  | 'fri'
  | 'sat'
  | 'sun';

export type PssTimePeriodLabel = 'morning' | 'afternoon';

export type PssScheduleStatus = 'draft' | 'active' | 'archived';

export type PssSessionStatus = 'in-progress' | 'completed';

export type PssSessionActivityStatus = 'pending' | 'completed';

export type PssActivitySource = 'built-in' | 'custom';

/**
 * Fields every locally-mutable PSS record carries. Read-only caches still
 * set these so downstream code can treat all records uniformly.
 */
export interface PssLocalMeta {
  /** Server UUID once synced; equals `clientId` until the first sync. */
  id: string;
  /** Client-generated UUID v4 — stable across the local lifecycle. */
  clientId: string;
  /** Server UUID once acknowledged; null until first sync. */
  serverId: string | null;
  /** ISO-8601 timestamp set when the record was last written locally. */
  clientTimestamp: string;
  syncStatus: PssLocalSyncStatus;
  /** Last sync error message, if any. */
  syncError?: string;
}

// ── pss_activities (read cache + custom) ──────────────────────────────────

export interface PssActivityRecord extends PssLocalMeta {
  name: string;
  description: string;
  category: PssActivityCategory;
  ageGroup: PssActivityAgeGroup;
  source: PssActivitySource;
  steps: string[];
  materials: string;
  conclusion: string;
  attentionNote: string;
  /** Null for built-in activities. */
  cfsId: string | null;
  /** Null for built-in activities. */
  createdBy: string | null;
}

// ── pss_schedules ─────────────────────────────────────────────────────────

export interface PssTimePeriod {
  label: PssTimePeriodLabel;
  /** HH:MM 24-hour. */
  startTime: string;
  /** HH:MM 24-hour, must be > startTime. */
  endTime: string;
}

export interface PssTemplateSlot {
  day: PssDayOfWeek;
  timePeriod: PssTimePeriodLabel;
  ageGroup: PssScheduleAgeGroup;
  /** 1–4. */
  order: number;
  /** Activity FK (clientId or serverId). */
  activityId: string;
}

export interface PssScheduleRecord extends PssLocalMeta {
  cfsLocationId: string;
  status: PssScheduleStatus;
  activeDays: PssDayOfWeek[];
  timePeriods: PssTimePeriod[];
  ageGroups: PssScheduleAgeGroup[];
  templateSlots: PssTemplateSlot[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── pss_sessions ──────────────────────────────────────────────────────────

export interface PssSessionRecord extends PssLocalMeta {
  scheduleId: string;
  /**
   * CFS the session was created under. Stored locally so attendance
   * (which lists CFS-registered children) targets the session's CFS,
   * not whatever the facilitator's auth-store CFS happens to be — they
   * can drift if the user is reassigned or the schedule was moved.
   */
  cfsLocationId?: string;
  /** YYYY-MM-DD. */
  date: string;
  timePeriod: PssTimePeriodLabel;
  ageGroup: PssScheduleAgeGroup;
  status: PssSessionStatus;
  facilitatorId: string;
  remarks: string;
  startedAt: string | null;
  completedAt: string | null;
  /** Session objectives set at the start. */
  objectives: string[];
  /** Facilitator's key observations from the session. */
  keyObservations: string;
  /** Protection/safeguarding notes for the supervisor. */
  protectionNotes: string;
  /** Challenges encountered during the session. */
  challenges: string;
  /** Follow-up actions for next session(s). */
  followUpActions: string[];
  /** Facilitator's reflection on what worked and what to change. */
  reflection: string;
}

// ── pss_session_activities ────────────────────────────────────────────────

export interface PssFlaggedChild {
  childId: string;
  concern: string;
}

export interface PssSessionActivityRecord extends PssLocalMeta {
  sessionId: string;
  activityId: string;
  /** 1–4. */
  order: number;
  status: PssSessionActivityStatus;
  notes: string;
  completedAt: string | null;
  flaggedChildren: PssFlaggedChild[];
}

// ── pss_session_attendance ────────────────────────────────────────────────

export type PssAttendanceStatus = 'present' | 'absent';

export interface PssSessionAttendanceRecord extends PssLocalMeta {
  sessionId: string;
  beneficiaryId: string;
  status: PssAttendanceStatus;
  markedBy: string;
  markedAt: string;
  /** Display-only — pulled from the beneficiary list at mark time. */
  beneficiaryName?: string;
}

// ── pss_smiley ────────────────────────────────────────────────────────────

export interface PssSmileyRecord extends PssLocalMeta {
  sessionId: string;
  /** YYYY-MM-DD. */
  date: string;
  veryHappy: number;
  happy: number;
  ok: number;
  unhappy: number;
  veryUnhappy: number;
  totalChildren: number;
}

// ── pss_day_smiley ────────────────────────────────────────────────────────
//
// End-of-day UNICEF 5-face wellbeing evaluation. One record per
// (scheduleId, date). Existence of the record means the active day is
// "done + locked". The local primary key (`clientId`) is the composite
// `${scheduleId}:${date}` so re-entry is idempotent.

export interface PssDaySmileyRecord extends PssLocalMeta {
  scheduleId: string;
  /** YYYY-MM-DD. */
  date: string;
  veryHappy: number;
  happy: number;
  ok: number;
  unhappy: number;
  veryUnhappy: number;
  /** Children who did not place a stone (paper "Blank" column). */
  blank: number;
  /** Sum of the five faces + blank. */
  totalChildren: number;
  facilitatorId: string;
  /** ISO-8601 — day moves to locked state at this instant. */
  lockedAt: string;
}

// ── pss_sync_queue ────────────────────────────────────────────────────────

export type PssSyncResource =
  | 'pss_activities'
  | 'pss_schedules'
  | 'pss_sessions'
  | 'pss_session_activities'
  | 'pss_session_attendance'
  | 'pss_smiley'
  | 'pss_day_smiley';

export type PssSyncOperation = 'create' | 'update' | 'delete';

export type PssSyncQueueStatus =
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'failed'
  | 'dead';

/**
 * One outbox entry. The queue worker (DART-68) dequeues these in
 * `createdAt` order and replays them against the server.
 *
 * `idempotencyKey` is forwarded as the `Idempotency-Key` HTTP header so
 * that retries never create duplicates.
 */
export interface PssSyncQueueItem {
  /** UUID v4 — primary key. */
  id: string;
  resource: PssSyncResource;
  operation: PssSyncOperation;
  /** Local clientId of the affected record. */
  recordClientId: string;
  /** Pre-rendered JSON payload ready to send (snake_case). */
  payload: unknown;
  status: PssSyncQueueStatus;
  attempts: number;
  /** Earliest UTC ISO-8601 the worker should retry at; supports backoff. */
  nextAttemptAt: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
}
