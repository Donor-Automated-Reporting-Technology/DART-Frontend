/**
 * middleware/roleGuard.ts
 *
 * Named route middleware that enforces role-based access control.
 *
 * Pages opt-in by specifying `allowedRoles` in definePageMeta:
 *
 *   definePageMeta({
 *     middleware: ['auth', 'roleGuard'],
 *     allowedRoles: ['org_admin'],
 *   });
 *
 * If the current user's role is not in the allowedRoles list,
 * they are redirected to the appropriate landing page:
 *   - org_admin → /dashboard
 *   - staff    → /cfs
 */
import { useAuthStore } from '../stores/auth';

export default defineNuxtRouteMiddleware((to) => {
  // Skip during SSR — role is client-only state.
  if (import.meta.server) return;

  const authStore = useAuthStore();
  const userRole = authStore.userRole;

  // If no allowedRoles defined on the route, allow access
  const allowedRoles = to.meta.allowedRoles as string[] | undefined;
  if (!allowedRoles || allowedRoles.length === 0) return;

  // Check if user's role is in the allowed list
  if (userRole && allowedRoles.includes(userRole)) return;

  // Redirect based on role
  if (userRole === 'org_admin') {
    return navigateTo('/dashboard');
  }
  return navigateTo('/cfs');
});
