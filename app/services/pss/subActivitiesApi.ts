/**
 * PSS sub-activities (custom activity) wire mapper + HTTP wrapper.
 *
 * Jira: DART-30 (offline create) / DART-29 (form).
 * Endpoint: POST /api/v1/pss/sub-activities (per DART-61 §sub-activities).
 *
 * Local `PssActivityRecord` uses camelCase + sync metadata; wire DTO
 * uses snake_case. Mappers live here so the rest of the app keeps using
 * the local shape.
 */

import { usePssApi } from '~/composables/usePssApi';
import type {
  PssActivityRecord,
  PssActivityCategory,
  PssActivityAgeGroup,
} from '~/interfaces/pssDb';

// ── Wire DTOs ────────────────────────────────────────────────────────────

/**
 * Server response for POST /pss/sub-activities (per DART-61).
 * Only the fields we round-trip into the local record are typed; the
 * server is free to return more without breaking the mapper.
 */
export interface PssSubActivityDto {
  id: string;
  name: string;
  description: string;
  category: PssActivityCategory;
  age_group: PssActivityAgeGroup;
  source: 'built-in' | 'custom';
  steps: string[];
  materials: string;
  conclusion: string;
  attention_note: string;
  cfs_id: string | null;
  created_by: string | null;
}

export interface PssSubActivityCreatePayload {
  name: string;
  description: string;
  category: PssActivityCategory;
  age_group: PssActivityAgeGroup;
  steps: string[];
  materials: string;
  conclusion: string;
  attention_note: string;
}

// ── Mappers ──────────────────────────────────────────────────────────────

export function toCreatePayload(
  record: PssActivityRecord,
): PssSubActivityCreatePayload {
  return {
    name: record.name,
    description: record.description,
    category: record.category,
    age_group: record.ageGroup,
    steps: record.steps,
    materials: record.materials,
    conclusion: record.conclusion,
    attention_note: record.attentionNote,
  };
}

/**
 * Merge a server DTO over the local record. Caller is responsible for
 * the IndexedDB write — this returns a fresh object only.
 */
export function applySubActivityDto(
  local: PssActivityRecord,
  dto: PssSubActivityDto,
): PssActivityRecord {
  return {
    ...local,
    id: dto.id,
    serverId: dto.id,
    name: dto.name,
    description: dto.description,
    category: dto.category,
    ageGroup: dto.age_group,
    source: dto.source,
    steps: [...dto.steps],
    materials: dto.materials,
    conclusion: dto.conclusion,
    attentionNote: dto.attention_note,
    cfsId: dto.cfs_id,
    createdBy: dto.created_by,
    syncStatus: 'synced',
    syncError: undefined,
    clientTimestamp: new Date().toISOString(),
  };
}

// ── Endpoint wrapper ─────────────────────────────────────────────────────

export interface UsePssSubActivitiesApiReturn {
  create: (
    payload: PssSubActivityCreatePayload,
    opts?: { idempotencyKey?: string; signal?: AbortSignal },
  ) => Promise<PssSubActivityDto>;
}

interface CreateEnvelope {
  data?: PssSubActivityDto;
}

export function usePssSubActivitiesApi(): UsePssSubActivitiesApiReturn {
  const api = usePssApi();

  return {
    async create(payload, opts = {}) {
      const res = await api.post<PssSubActivityDto | CreateEnvelope>(
        '/pss/sub-activities',
        payload,
        {
          idempotencyKey: opts.idempotencyKey,
          signal: opts.signal,
        },
      );
      // Endpoint may return the DTO directly or wrapped under `data`.
      const dto = (res as CreateEnvelope).data ?? (res as PssSubActivityDto);
      return dto;
    },
  };
}
