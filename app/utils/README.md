# `app/utils/` — PSS shared helpers

> Scope: small, side-effect-free helpers used across the PSS module. Anything that touches Pinia, Dexie, or the network belongs in `composables/` or `services/`.

## Conflict resolution & idempotency (DART-64)

Two policies, codified so every page applies them the same way.

### 1. Server-wins for read GETs — `applyServerWins`

When a list / detail GET returns, **overwrite the local IndexedDB cache with the server payload**. The server is authoritative for shared state.

```ts
import { applyServerWins } from '~/utils/conflictResolver';

const fresh = applyServerWins(localActivity, await api.get(`/pss/activities/${id}`));
await db.pss_activities.put(fresh);
```

The helper always returns `remote` — it exists to document the policy at every call site, not to add behaviour.

### 2. Last-write-wins for facilitator session edits — `applyLastWriteWins`

When a queued offline write is replayed and the server already has a newer version of the same record, the **server wins**. Show the standard yellow warning toast so the facilitator knows their unsaved edit was discarded.

```ts
import { applyLastWriteWins, REMOTE_OVERWRITE_TOAST } from '~/utils/conflictResolver';
import { useToast } from '~/composables/useToast'; // shipped in DART-62

const toast = useToast();

const { value, remoteWasNewer } = applyLastWriteWins(localSession, remoteSession, {
  onRemoteOverwrite: () =>
    toast.warning(REMOTE_OVERWRITE_TOAST.message, {
      detail: REMOTE_OVERWRITE_TOAST.detail,
    }),
});

await db.pss_sessions.put(value);
```

Comparison uses `client_timestamp` (ISO-8601 string or epoch ms). Ties go to the server.

### 3. Idempotency keys on writes — `newIdempotencyKey` / `ensureIdempotencyKey`

`usePssApi` (DART-66) automatically attaches an `Idempotency-Key` (UUID v4) header to every `POST` / `PATCH` / `DELETE`. Pass an explicit key when the same mutation may be retried from the sync queue so every replay uses the same value:

```ts
import { ensureIdempotencyKey } from '~/utils/idempotency';

// Mints + writes back onto the record if missing — call once when queueing.
const key = ensureIdempotencyKey(queuedRecord);

await api.post('/pss/sessions', queuedRecord.payload, { idempotencyKey: key });
```

Pass `idempotencyKey: null` to opt out (e.g. fire-and-forget analytics that are safe to process more than once).

> **Backend coordination:** the FE always sends the header. If the backend has not yet implemented dedupe (DART-61 v1 contract is silent on it), the header is harmless. Flag any PSS write endpoint that doesn't reject duplicate keys back to the Tech Lead.

---

## Files

| File | Purpose |
|---|---|
| [`conflictResolver.ts`](./conflictResolver.ts) | `applyServerWins`, `applyLastWriteWins`, `REMOTE_OVERWRITE_TOAST` |
| [`idempotency.ts`](./idempotency.ts) | `newIdempotencyKey`, `ensureIdempotencyKey` |
| [`pssErrorMessages.ts`](./pssErrorMessages.ts) | `pssErrorToToast` (DART-62) |
