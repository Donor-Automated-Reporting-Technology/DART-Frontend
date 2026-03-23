/**
 * plugins/auth.client.ts
 *
 * Silently restores the authenticated session on every client-side page load.
 *
 * Flow:
 *  1. If the access token is already in Pinia memory (e.g. fresh registration
 *     or in-session navigation) → skip, nothing to do.
 *  2. Otherwise call POST /api/v1/auth/refresh which validates the httpOnly
 *     refresh-token cookie and returns a fresh access token + user payload.
 *  3. Hydrate the auth store so that route middleware and API calls have a
 *     valid token before the first page renders.
 *
 * This plugin runs before any route middleware, so by the time the auth
 * middleware checks `accessToken` it is already populated — no redirect loop.
 */

import { useAuthStore } from '../stores/auth'

interface RefreshResponse {
  data?: {
    tokens?: {
      access_token?: string
    }
  }
}

export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()

  // 1. Force-restore localStorage fields before route middleware runs
  // to prevent Pinia's SSR hydration from wiping them with `null`.
  authStore.restoreFromStorage()

  // Already authenticated in this session — nothing to restore
  if (authStore.accessToken) return

  try {
    const rawData = await $fetch<RefreshResponse>('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })

    // Hydrate access token (memory only — never persisted)
    if (rawData?.data?.tokens?.access_token) {
      authStore.setToken(rawData.data.tokens.access_token)
    }

    // Refresh endpoint only returns tokens. User/org display fields survive the refresh
    // transparently via localStorage, loaded on authStore initialization.
  } catch {
    // Refresh failed — the httpOnly cookie is absent or expired.
    // Route middleware will redirect unauthenticated users to /login.
    // We intentionally swallow the error here to avoid unhandled
    // promise rejections on public pages (login, register).
  }
})
