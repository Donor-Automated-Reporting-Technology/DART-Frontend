# DART Frontend — Composables & UX Patterns

This README documents the **shared UX patterns** every PSS page is expected to use, so error / loading / toast behaviour stays consistent across the app.

> Tickets: DART-60 (foundation epic), DART-62 (error / toast / loading), DART-66 (`usePssApi`).

---

## 1. API client — `usePssApi()`

Low-level HTTP client for `/api/v1/pss/**`. Injects the bearer token from the Pinia auth store, retries idempotent GETs on transient failures, and normalises every error into a `PssApiError` envelope.

```ts
import { usePssApi } from '~/composables/usePssApi';
import type { PssApiError } from '~/interfaces/pss';

const api = usePssApi();
const activities = await api.get<PssActivity[]>('/pss/activities');
```

Errors are **always** thrown as `PssApiError` (`{ status, code, message, fields?, raw? }`). Never inspect the raw `Response` — use the envelope.

---

## 2. Toasts — `useToast()`

Single global queue. Mount [`PssToastContainer`](../components/pss/PssToastContainer.vue) **once** in the root layout, then call `useToast()` from anywhere.

```ts
import { useToast } from '~/composables/useToast';
const toast = useToast();

toast.success('Schedule activated');
toast.warning('You are offline — changes will sync later');
toast.error('Could not save activity', { detail: 'Please try again' });

const stickyId = toast.info('Syncing…', { duration: 0 });
toast.dismiss(stickyId);
```

Defaults: 4 s for `info` / `success`, 6 s for `warning`, 8 s for `error`. Pass `duration: 0` to make it sticky.

---

## 3. API errors → toast — `pssErrorToToast()`

Map a `PssApiError` to display copy. Backend wording wins when present; otherwise a friendly fallback keyed by canonical code is used.

```ts
import { pssErrorToToast } from '~/utils/pssErrorMessages';

try {
  await api.post('/pss/schedules', payload);
} catch (err) {
  const { message, detail } = pssErrorToToast(err as PssApiError);
  toast.error(message, { detail });
}
```

Recognised codes:

| Code | When | Default copy |
|---|---|---|
| `network_error` | `fetch` failed (status 0) | "Can't reach the server — your changes will sync when you're back online." |
| `unauthorized` | 401 | "Your session expired. Please sign in again." |
| `forbidden` | 403 | "You don't have permission to do that." |
| `not_found` | 404 | "That record doesn't exist or has been removed." |
| `conflict` | 409 | "Someone else updated this record. Reload to see the latest version." |
| `validation_failed` | 422 | "Some fields need attention before this can be saved." First field error appears as `detail`. |
| `rate_limited` | 429 | "Too many requests — please wait a moment and try again." |
| `server_error` | 5xx | "Something went wrong on our side. Please try again shortly." |

---

## 4. Loading — `<PssLoadingSkeleton>`

Use this everywhere a list, card, or paragraph block is waiting on async data. Variants: `card` (default), `list`, `text`. The shimmer respects `prefers-reduced-motion`.

```vue
<PssLoadingSkeleton v-if="loading" variant="list" :rows="5" label="Loading activities" />
<ActivityList v-else :activities="data" />
```

---

## 5. Render-time errors — `<PssErrorBoundary>`

Wrap a page body or an optional widget so a single broken component doesn't blank the screen.

```vue
<PssErrorBoundary title="Could not load schedule" @error="reportToSentry">
  <ScheduleEditor />
</PssErrorBoundary>
```

The boundary only catches **synchronous Vue-render / setup errors**. For async API failures, handle them at the call site with `pssErrorToToast()` + `toast.error()`.

A custom `fallback` slot receives `{ error, retry }`:

```vue
<PssErrorBoundary>
  <Widget />
  <template #fallback="{ error, retry }">
    <MyOwnEmptyState :error="error" @retry="retry" />
  </template>
</PssErrorBoundary>
```

---

## 6. State pattern checklist

Every screen that fetches data must visibly handle **all five** states:

1. **Loading** — `<PssLoadingSkeleton>` of the appropriate variant
2. **Empty** — friendly empty state with a CTA when applicable
3. **Offline** — `useOfflineStatus()` indicator + read-only mode where writes would be lost
4. **Sync-pending** — badge or row state when `useSyncQueue()` has unsynced records for this view
5. **Error** — `pssErrorToToast()` toast for async, `<PssErrorBoundary>` for render

If a page handles fewer than five, document why in the page-level comment.
