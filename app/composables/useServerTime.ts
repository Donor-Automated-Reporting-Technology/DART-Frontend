/**
 * useServerTime — clock-skew correction composable.
 *
 * Fetches GET /api/v1/time once on first call, computes the offset
 * between server UTC and device UTC, then exposes a `serverNow()`
 * helper that returns a corrected Date regardless of the device clock.
 *
 * The offset is cached in a module-level singleton so repeated calls
 * from different components (today.vue, week.vue) don't trigger extra
 * network requests.
 *
 * Falls back to device time silently if the request fails (offline /
 * network error) — the existing behaviour is preserved, but a
 * `clockWarning` flag is set so the UI can show an advisory.
 */

import { ref, readonly } from 'vue';

interface ServerTimeResponse {
  server_time: string;
  unix: number;
}

// ── Module-level singleton ────────────────────────────────────────────
// Shared across all component instances so the network call happens once.

let fetchPromise: Promise<void> | null = null;
let offsetMs = 0;           // server - device, in milliseconds
let synced = false;

const clockWarning = ref(false);  // true when falling back to device time
const serverDateStr = ref('');     // human-readable server date for display

async function syncClock(): Promise<void> {
  if (synced) return;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const deviceBefore = Date.now();
      const res = await fetch('/api/v1/time');
      const deviceAfter = Date.now();

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ServerTimeResponse = await res.json();

      const serverMs = new Date(data.server_time).getTime();
      // Compensate for half the round-trip latency
      const latency = (deviceAfter - deviceBefore) / 2;
      offsetMs = serverMs - deviceAfter + latency;
      synced = true;

      // Format server date for display (device-locale, but server date)
      serverDateStr.value = new Date(serverMs).toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      // Warn if skew is more than 5 minutes
      clockWarning.value = Math.abs(offsetMs) > 5 * 60 * 1000;
    } catch {
      // Offline or endpoint not available — fall back to device time
      clockWarning.value = false; // don't warn, we just don't know
      synced = true; // don't retry on every call
      serverDateStr.value = new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  })();

  return fetchPromise;
}

// ── Public API ────────────────────────────────────────────────────────

export function useServerTime() {
  /** Ensure the clock is synced before using serverNow(). Call await init() in onMounted. */
  async function init(): Promise<void> {
    await syncClock();
  }

  /** Returns the current time corrected for server clock skew. */
  function serverNow(): Date {
    return new Date(Date.now() + offsetMs);
  }

  /**
   * Returns today's date as YYYY-MM-DD according to the server clock.
   * This is what should be used for session date fields.
   */
  function serverTodayDate(): string {
    const d = serverNow();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * Returns today's day-of-week key ('mon', 'tue', etc.)
   * according to the server clock.
   */
  const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
  function serverTodayKey(): typeof DAY_KEYS[number] {
    return DAY_KEYS[serverNow().getDay()] ?? 'mon';
  }

  return {
    init,
    serverNow,
    serverTodayDate,
    serverTodayKey,
    /** Reactive human-readable server date string for display in UI. */
    serverDateStr: readonly(serverDateStr),
    /** True when device clock differs from server by more than 5 minutes. */
    clockWarning: readonly(clockWarning),
  };
}
