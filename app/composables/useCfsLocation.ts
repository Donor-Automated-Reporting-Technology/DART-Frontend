import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useOfflineStatus } from '~/composables/useOfflineStatus';
import { cfsApi } from '~/services/cfsApi';
import { ApiError } from '~/services/api';

/**
 * useCfsLocation — DART-72
 * ──────────────────────────────────────────────────────────────────────────
 * Single-responsibility composable that exposes the authenticated facilitator's
 * (or case_worker's) active CFS location and hydrates it from the backend
 * `GET /api/v1/cfs/me/location` endpoint.
 *
 * Offline-first contract (rubric §4.5–4.7):
 *   • Reads `cfsLocationId` / `cfsLocationName` from the auth store, which
 *     in turn is hydrated from localStorage on app boot.
 *   • `fetchAndHydrate()` is a no-op when the device is offline AND the
 *     store already has a value — keeping setup screens usable without
 *     a network round-trip.
 *   • On 200, both fields are written back to the auth store (and so
 *     persisted to localStorage).
 *   • On 404 (no active assignment), `error` is set to `'unassigned'`
 *     and the UI is expected to surface a clear message.
 *   • On any other failure, `error` is set to `'network'`.
 *
 * Read-only endpoint — no UUIDv4 client-gen, no sync queue.
 *
 * @returns Reactive refs and the idempotent hydrator.
 *
 * @example
 *   const { cfsLocationId, cfsLocationName, error, fetchAndHydrate } = useCfsLocation();
 *   onMounted(() => { fetchAndHydrate(); });
 */
export function useCfsLocation(): {
  cfsLocationId: ComputedRef<string | null>;
  cfsLocationName: ComputedRef<string | null>;
  loading: Ref<boolean>;
  error: Ref<'unassigned' | 'network' | null>;
  fetchAndHydrate: () => Promise<void>;
} {
  const auth = useAuthStore();
  const { isOnline } = useOfflineStatus();

  const cfsLocationId = computed<string | null>(() => auth.cfsLocationId ?? null);
  const cfsLocationName = computed<string | null>(() => auth.cfsLocationName ?? null);

  const loading = ref(false);
  const error = ref<'unassigned' | 'network' | null>(null);

  /**
   * Fetch the active CFS location and write it into the auth store.
   * Idempotent — safe to call from multiple mount hooks. Concurrent calls
   * after the first are short-circuited via `loading`.
   *
   * @returns Promise that resolves once the hydration attempt finishes
   *   (whether it succeeded, hit 404, or failed). Never throws.
   */
  async function fetchAndHydrate(): Promise<void> {
    if (loading.value) return;

    // why: rubric §4.5–4.7 — offline-first. If we're offline AND we already
    // have a hydrated value from localStorage, skip the network call rather
    // than spuriously erroring on PSS setup.
    if (!isOnline.value && auth.cfsLocationId) {
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      const res = await cfsApi.getMyLocation();
      auth.setCfsLocationId(res.id);
      auth.setCfsLocationName(res.name);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        error.value = 'unassigned';
      } else {
        error.value = 'network';
      }
    } finally {
      loading.value = false;
    }
  }

  return {
    cfsLocationId,
    cfsLocationName,
    loading,
    error,
    fetchAndHydrate,
  };
}
