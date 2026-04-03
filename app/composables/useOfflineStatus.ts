import { ref, onMounted, onUnmounted } from 'vue';
import { getPendingCount, getConflictCount } from '../services/offlineDb';

/**
 * useOfflineStatus
 * ─────────────────────────────────────────────────────────────────────────────
 * Reactive online/offline state + pending sync counts.
 * Listens to browser online/offline events.
 */
export const useOfflineStatus = () => {
  const isOnline = ref(true);
  const pendingCount = ref(0);
  const conflictCount = ref(0);

  function onOnline() { isOnline.value = true; }
  function onOffline() { isOnline.value = false; }

  async function refreshCounts() {
    pendingCount.value = await getPendingCount();
    conflictCount.value = await getConflictCount();
  }

  let interval: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    isOnline.value = navigator.onLine;
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    refreshCounts();
    // Poll counts every 5 seconds to stay fresh
    interval = setInterval(refreshCounts, 5000);
  });

  onUnmounted(() => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    if (interval) clearInterval(interval);
  });

  return {
    isOnline,
    pendingCount,
    conflictCount,
    refreshCounts,
  };
};
