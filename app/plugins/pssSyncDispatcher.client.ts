/**
 * Wire the PSS sync dispatcher into the global sync worker on app boot.
 *
 * Jira: DART-30 (introduced; foundational to all PSS offline sync).
 *
 * Client-only: the worker observes `navigator.onLine` and the
 * `visibilitychange` event, neither of which exist on the server.
 * Runs after `auth.client.ts` so the dispatcher's API calls have a
 * bearer token ready.
 */

import { defineNuxtPlugin } from '#app';
import { usePssSyncQueue } from '~/composables/usePssSyncQueue';
import { pssSyncDispatcher } from '~/services/pss/syncDispatcher';

export default defineNuxtPlugin({
  name: 'pss-sync-dispatcher',
  enforce: 'post',
  async setup() {
    const { registerSender } = usePssSyncQueue();
    registerSender(pssSyncDispatcher);
  },
});
