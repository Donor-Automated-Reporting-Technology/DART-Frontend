/**
 * PSS — built-in activity seed loader.
 *
 * Jira: DART-27 (sub-task of DART-36).
 *
 * Ships the UNICEF Facilitator-Manual activities inside the app bundle
 * so the activity picker (DART-38) works on first launch with zero
 * network. The seed JSON is statically imported so Vite emits it as
 * part of the JS chunk → the service worker (DART-67/PWA) precaches it
 * automatically; no extra runtime fetch.
 *
 * Idempotency
 * -----------
 * `applyPssActivitySeed()` is safe to call any number of times:
 *   • Records are upserted by `clientId` (same UUID each run → no
 *     duplicates in `pss_activities`).
 *   • The applied `SEED_VERSION` is recorded in localStorage; a no-op
 *     fast path returns immediately when the same version is already
 *     applied. This avoids the (cheap but non-zero) bulk-put on every
 *     boot once the user is past their first launch.
 *
 * Bumping the seed
 * ----------------
 * 1. Drop a new `pss_activities.seed.json` in `app/assets/pss/`.
 * 2. Increment `SEED_VERSION` below.
 * 3. Ship — every existing install will re-apply the seed on next boot
 *    and overwrite stale built-in rows. Custom activities (created via
 *    DART-29) are never touched because they have a different `source`.
 *
 * The on-wire seed contract uses `snake_case` (matches the SQL seed and
 * backend DTOs); we normalise to the local camelCase `PssActivityRecord`
 * shape and fill in `PssLocalMeta` so seeded rows are indistinguishable
 * from any other locally-cached record.
 */

import seedJson from '../../../assets/pss/pss_activities.seed.json';
import { pssDb } from '../db';
import { activitiesRepository } from '../repositories';
import type {
  PssActivityRecord,
  PssActivityCategory,
  PssActivityAgeGroup,
} from '../../../interfaces/pssDb';

// ─── Public constants ───────────────────────────────────────────────────────

/**
 * Increment whenever the contents of `pss_activities.seed.json` change.
 * The plugin compares this against the value last persisted in
 * localStorage to decide whether the bulk-upsert needs to run.
 */
export const SEED_VERSION = 1;

/** localStorage key — namespaced to avoid collisions with other DART keys. */
export const SEED_VERSION_STORAGE_KEY = 'dart_pss_seed_version';

// ─── On-wire JSON shape ────────────────────────────────────────────────────

/**
 * Shape of a single record in the seed JSON. Only the fields we actually
 * map are listed — additional keys (e.g. `manual_reference`,
 * `organisation_id`) are ignored on purpose so future seed extensions
 * don't break the loader.
 */
interface SeedRow {
  id: string;
  name: string;
  description: string | null;
  category: PssActivityCategory;
  age_group: PssActivityAgeGroup;
  /** SQL/JSON convention. Mapped to the TS `'built-in'` literal. */
  source: 'built_in' | 'custom';
  steps: string[] | null;
  materials: string | null;
  conclusion: string | null;
  attention_note: string | null;
  cfs_location_id: string | null;
  created_by: string | null;
}

const seed: readonly SeedRow[] = seedJson as readonly SeedRow[];

// ─── Normalisation ──────────────────────────────────────────────────────────

/**
 * Convert a snake_case seed row into the camelCase local record shape.
 * The seed represents canonical, server-blessed data, so we mark these
 * rows as `synced` and reuse the seed UUID as both `id` and `clientId`
 * — the picker (DART-38) and stepper (DART-43) join on `clientId`.
 *
 * `clientTimestamp` is stamped with the seed version baked into the
 * boot run, NOT `Date.now()`. That keeps repeated `applySeed()` calls
 * fully deterministic, which matters for the conflict resolver
 * (DART-64) — every install with the same SEED_VERSION ends up with
 * byte-identical built-in records.
 */
function normaliseSeedRow(row: SeedRow): PssActivityRecord {
  return {
    id: row.id,
    clientId: row.id,
    serverId: row.id,
    syncStatus: 'synced',
    // Stable per seed version — see fn-doc above.
    clientTimestamp: `seed-v${SEED_VERSION}`,
    name: row.name,
    description: row.description ?? '',
    category: row.category,
    ageGroup: row.age_group,
    source: row.source === 'built_in' ? 'built-in' : 'custom',
    steps: row.steps ?? [],
    materials: row.materials ?? '',
    conclusion: row.conclusion ?? '',
    attentionNote: row.attention_note ?? '',
    cfsId: row.cfs_location_id,
    createdBy: row.created_by,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Total seed records compiled into the bundle — exposed for diagnostics. */
export const SEED_RECORD_COUNT = seed.length;

export interface ApplyPssActivitySeedResult {
  /** True when the bulk-put actually ran this call. */
  applied: boolean;
  /** Number of records written (0 when fast-pathed). */
  written: number;
  /** Version that is now persisted in localStorage. */
  version: number;
  /** Reason a fast path was taken — useful in console diagnostics. */
  reason?: 'already-current' | 'no-storage' | 'no-records';
}

/**
 * Apply the bundled seed into IndexedDB.
 *
 * @param force  Skip the version check and re-upsert every record.
 *               Useful for tests or a "reset PSS data" admin action.
 */
export async function applyPssActivitySeed(
  force = false,
): Promise<ApplyPssActivitySeedResult> {
  if (seed.length === 0) {
    return { applied: false, written: 0, version: SEED_VERSION, reason: 'no-records' };
  }

  // Fast path — same version already on disk AND the table actually
  // contains rows. The row-count guard self-heals the case where a user
  // (or DevTools) clears IndexedDB but leaves localStorage intact: the
  // version key alone would otherwise wedge the picker into an empty
  // state forever.
  if (!force) {
    const stored = readStoredVersion();
    if (stored === SEED_VERSION) {
      let existing = 0;
      try {
        existing = await pssDb.pss_activities.count();
      } catch {
        // If the count itself fails, fall through and re-seed — the
        // bulkUpsert below will surface any real Dexie error.
      }
      if (existing > 0) {
        return {
          applied: false,
          written: 0,
          version: SEED_VERSION,
          reason: 'already-current',
        };
      }
    }
  }

  const records = seed.map(normaliseSeedRow);
  await activitiesRepository.bulkUpsert(records);
  writeStoredVersion(SEED_VERSION);

  return {
    applied: true,
    written: records.length,
    version: SEED_VERSION,
  };
}

/**
 * Return the seed version currently persisted in localStorage, or `null`
 * when storage is unavailable / the key has never been written.
 */
function readStoredVersion(): number | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SEED_VERSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredVersion(version: number): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SEED_VERSION_STORAGE_KEY, String(version));
  } catch {
    // localStorage may throw in private mode or when the quota is full —
    // the seed bulk-put already succeeded, so we just live with the
    // (cheap) re-apply on the next boot.
  }
}
