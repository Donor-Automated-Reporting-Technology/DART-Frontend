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
    user?: {
      role?: string
    }
    tokens?: {
      access_token?: string
    }
  }
}

export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()

  // 1. Force-restore localStorage fields (including token) before route
  //    middleware runs — prevents Pinia's SSR hydration from wiping state.
  authStore.restoreFromStorage()

  // If the restored token is still valid (not expired), skip the refresh
  // call entirely. This keeps the user logged in offline and on hard refresh.
  if (authStore.hasValidToken()) return

  // Token missing or expired — try a silent refresh via httpOnly cookie.
  // This will fail when offline, which is fine: if the token was valid above
  // we already returned, and if it's expired there's nothing to do offline.
  try {
    const rawData = await $fetch<RefreshResponse>('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })

    if (rawData?.data?.tokens?.access_token) {
      authStore.setToken(rawData.data.tokens.access_token)
    }

    if (rawData?.data?.user?.role) {
      authStore.setUserRole(rawData.data.user.role)
    }
  } catch {
    // Refresh failed — offline or cookie expired.
    // If we still have a non-expired token from localStorage the user
    // stays logged in. Otherwise middleware will redirect to /login.
  }
})
