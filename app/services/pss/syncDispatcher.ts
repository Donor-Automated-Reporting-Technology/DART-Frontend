/**
 * Single sync-worker dispatcher for the PSS module.
 *
 * Jira: DART-30 (introduced — wires the first concrete sender) /
 *       DART-68 (sync worker).
 *
 * The worker accepts ONE `PssSyncSender`. This module is that sender,
 * routing each queue item to the per-resource implementation. Adding
 * a new resource = one entry in `RESOURCE_SENDERS`.
 *
 * Why a dispatcher instead of letting each resource register
 * independently:
 *   • The worker is intentionally singleton with a single sender slot
 *     (see `usePssSyncQueue.registerSender`) so we get one drain loop
 *     and one place to observe progress.
 *   • Resources still get their own files for testability.
 */

import type {
  PssSyncSender,
  PssSyncSendOutcome,
} from '~/composables/usePssSyncQueue';
import type { PssSyncQueueItem, PssSyncResource } from '~/interfaces/pssDb';
import { PSS_ACTIVITIES_SYNC_SENDER } from './syncSenders';
import {
  PSS_SESSIONS_SYNC_SENDER,
  PSS_SESSION_ACTIVITIES_SYNC_SENDER,
} from './sessionSyncSenders';

const RESOURCE_SENDERS: Partial<
  Record<PssSyncResource, (item: PssSyncQueueItem) => Promise<PssSyncSendOutcome>>
> = {
  pss_activities: PSS_ACTIVITIES_SYNC_SENDER,
  pss_sessions: PSS_SESSIONS_SYNC_SENDER,
  pss_session_activities: PSS_SESSION_ACTIVITIES_SYNC_SENDER,
};

export const pssSyncDispatcher: PssSyncSender = async (item) => {
  const handler = RESOURCE_SENDERS[item.resource];
  if (!handler) {
    return {
      kind: 'fatal',
      error: `No sender registered for resource: ${item.resource}`,
    };
  }
  return handler(item);
};
