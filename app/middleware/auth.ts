/**
 * middleware/auth.ts
 *
 * Route guard for authenticated pages.
 *
 * Two-condition check instead of accessToken alone:
 *
 * 1. process.server guard — accessToken is client-memory only.
 *    On the server it is always null, which would redirect every SSR
 *    page render to /login.  We skip the guard on the server entirely.
 *
 * 2. userRole fallback — after a page refresh the token is briefly null
 *    while auth.client.ts calls /api/v1/auth/refresh to restore the session.
 *    userRole IS persisted to localStorage, so if it is present the user
 *    has an authenticated session.  Both fields are wiped by clearSession()
 *    so this is still safe after an explicit logout.
 *
 *    This also covers the post-registration case: useRegistration always
 *    sets userRole to 'org_admin' so the middleware immediately allows the
 *    router.push('/dashboard') call right after signup.
 */
import { useAuthStore } from '../stores/auth';

export default defineNuxtRouteMiddleware(() => {
  // Skip during SSR — token is client-only memory.
  if (process.server) return;

  const authStore = useAuthStore();

  // Authenticated = live token in memory OR a persisted role (session exists).
  const authenticated = !!authStore.accessToken || !!authStore.userRole;

  if (!authenticated) {
    return navigateTo('/login');
  }
});