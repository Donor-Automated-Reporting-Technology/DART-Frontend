/**
 * Boot-time PSS activity seed.
 *
 * Jira: DART-27 (sub-task of DART-36).
 *
 * Runs once per app load, only on the client (Nuxt SSR is disabled —
 * `ssr: false` in nuxt.config — but the `.client.ts` suffix is still the
 * idiomatic way to declare intent and prevent any accidental SSR call).
 *
 * Why a plugin (and not a composable on a specific page)?
 *   • The activity picker (DART-38) on the schedule wizard is the FIRST
 *     thing a brand-new user touches in the PSS module; running the seed
 *     lazily from there would slow down the first picker open by a few
 *     hundred ms while Dexie writes 69 rows.
 *   • The seed module is fast-pathed on subsequent boots via the version
 *     check in localStorage, so this plugin pays the bulk-put cost
 *     exactly once per install (or per `SEED_VERSION` bump).
 *
 * Failure handling
 *   IndexedDB can be denied (private window, blocked storage, etc.). In
 *   that case the seed call rejects, the picker simply finds no cached
 *   built-in rows, and the online `GET /api/v1/pss/activities` path will
 *   fill in. We log to the console for diagnostics but do NOT surface a
 *   toast — the user has nothing actionable to do about it.
 */

import { defineNuxtPlugin } from '#app';
import { applyPssActivitySeed } from '../services/pss/seed/pssActivitiesSeed';

export default defineNuxtPlugin(() => {
  // Fire-and-forget — boot must not block on the seed.
  void applyPssActivitySeed().catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.warn('[pss] activity seed failed; will retry on next boot', err);
  });
});
