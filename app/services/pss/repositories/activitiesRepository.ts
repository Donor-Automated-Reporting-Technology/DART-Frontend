/**
 * `pss_activities` repository.
 *
 * Jira: DART-63 (sub-task of DART-60).
 *
 * Holds two record families in one store:
 *   • Built-in activities (62 from the UNICEF manual, source = 'built-in')
 *     seeded at app boot from `pss_activities.seed.json` (DART-27).
 *   • Custom activities (source = 'custom') created locally and synced
 *     via the outbox (DART-29 / 30).
 *
 * The compound `[category+ageGroup]` index supports the schedule wizard's
 * primary lookup pattern.
 */

import { pssDb } from '../db';
import type {
  PssActivityRecord,
  PssActivityCategory,
  PssActivityAgeGroup,
  PssActivitySource,
} from '../../../interfaces/pssDb';
import { BaseRepository } from './baseRepository';

class ActivitiesRepository extends BaseRepository<PssActivityRecord> {
  constructor() {
    super(pssDb.pss_activities);
  }

  /**
   * Filter by category and/or age group, matching the activity picker UI.
   * `'all'` and `'parents'` activities surface for every age filter to
   * mirror the contract semantics (see DART-61 §sub-activities).
   */
  async filter(opts: {
    category?: PssActivityCategory;
    ageGroup?: PssActivityAgeGroup;
    source?: PssActivitySource;
  }): Promise<PssActivityRecord[]> {
    let coll = this.table.toCollection();

    if (opts.category && opts.ageGroup) {
      coll = this.table
        .where('[category+ageGroup]')
        .equals([opts.category, opts.ageGroup]);
    } else if (opts.category) {
      coll = this.table.where('category').equals(opts.category);
    } else if (opts.ageGroup) {
      coll = this.table.where('ageGroup').equals(opts.ageGroup);
    }

    const rows = await coll.toArray();
    return opts.source ? rows.filter((r) => r.source === opts.source) : rows;
  }

  listBuiltIn(): Promise<PssActivityRecord[]> {
    return this.table.where('source').equals('built-in').toArray();
  }

  listCustom(): Promise<PssActivityRecord[]> {
    return this.table.where('source').equals('custom').toArray();
  }
}

export const activitiesRepository = new ActivitiesRepository();
