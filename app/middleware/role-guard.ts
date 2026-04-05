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
 * Activity pages can also specify `requiredActivity` to check
 * if the activity is enabled in the framework:
 *
 *   definePageMeta({
 *     middleware: ['auth', 'roleGuard'],
 *     requiredActivity: 'CFS_ATTENDANCE',
 *   });
 *
 * If the current user's role is not in the allowedRoles list,
 * they are redirected to the appropriate landing page:
 *   - org_admin/program_manager → /dashboard
 *   - staff → /dashboard
 */
import { useAuthStore } from '../stores/auth';

export default defineNuxtRouteMiddleware((to) => {
  // Skip during SSR — role is client-only state.
  if (import.meta.server) return;

  const authStore = useAuthStore();
  const userRole = authStore.userRole;

  // If no allowedRoles defined on the route, allow access
  const allowedRoles = to.meta.allowedRoles as string[] | undefined;
  if (allowedRoles && allowedRoles.length > 0) {
    if (!userRole || !allowedRoles.includes(userRole)) {
      // Redirect based on role
      if (userRole === 'org_admin' || userRole === 'program_manager') {
        return navigateTo('/dashboard');
      }
      return navigateTo('/dashboard');
    }
  }

  // Check activity-based access for /activities/* routes
  const requiredActivity = to.meta.requiredActivity as string | undefined;
  if (requiredActivity && !authStore.hasActivity(requiredActivity)) {
    return navigateTo('/dashboard');
  }
});
