import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * Auth store
 *
 * Holds the authentication state for the current session.
 * The access token is persisted to localStorage so the user stays logged in
 * across page refreshes and while offline, as long as the JWT hasn't expired.
 * On page refresh the Nuxt plugin first checks the stored token's `exp` claim;
 * if valid, it skips the network refresh call entirely (offline-safe).
 * If expired, it attempts POST /api/v1/auth/refresh (httpOnly cookie).
 *
 * Non-sensitive display fields (userName, orgName, userEmail, orgId, userId,
 * userRole) ARE persisted to localStorage so they survive the refresh-token
 * restore flow without requiring a separate /me round-trip.
 */

const STORAGE_KEYS = {
  accessToken: "dart_access_token",
  userName: "dart_user_name",
  orgName: "dart_org_name",
  userEmail: "dart_user_email",
  orgId: "dart_org_id",
  userId: "dart_user_id",
  userRole: "dart_user_role",
  activities: "dart_activities",
  cfsLocationName: "dart_cfs_location_name",
} as const;

/** Read a key from localStorage safely (no-op on the server). */
function getStored(key: string): string | null {
  if (import.meta.client) {
    return localStorage.getItem(key);
  }
  return null;
}

/** Write a key to localStorage safely (no-op on the server). */
function setStored(key: string, value: string): void {
  if (import.meta.client) {
    localStorage.setItem(key, value);
  }
}

/** Remove a key from localStorage safely (no-op on the server). */
function removeStored(key: string): void {
  if (import.meta.client) {
    localStorage.removeItem(key);
  }
}

/**
 * Decode a base64url string (JWT segments use base64url, not standard base64).
 */
function base64UrlDecode(str: string): string {
  // Replace URL-safe chars and pad to multiple of 4
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  return atob(padded);
}

/**
 * Decode the `exp` claim from a JWT without a library.
 * Returns the expiry as a Unix timestamp (seconds), or null if the token
 * is not a JWT or has no `exp` claim.
 */
function getTokenExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null; // not a JWT
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/**
 * Returns true when the token exists and is not expired.
 * If the token has no decodable `exp` claim (opaque token), it is
 * considered valid — the server will reject it if it's actually expired.
 */
export function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  const exp = getTokenExp(token);
  if (exp === null) return true; // can't determine expiry — trust it
  return exp > Date.now() / 1000 + 30;
}

export const useAuthStore = defineStore("auth", () => {
  // ── State ────────────────────────────────────────────────────────────────

  /** JWT access token — persisted to localStorage for offline survival */
  const accessToken = ref<string | null>(getStored(STORAGE_KEYS.accessToken));

  /** User's full display name — persisted to localStorage */
  const userName = ref<string | null>(getStored(STORAGE_KEYS.userName));

  /** Organisation name — persisted to localStorage */
  const orgName = ref<string | null>(getStored(STORAGE_KEYS.orgName));

  /** User's email address — persisted to localStorage */
  const userEmail = ref<string | null>(getStored(STORAGE_KEYS.userEmail));

  /** Organisation UUID — persisted to localStorage, used by onboarding API calls */
  const orgId = ref<string | null>(getStored(STORAGE_KEYS.orgId));

  /** Authenticated user's UUID — persisted to localStorage */
  const userId = ref<string | null>(getStored(STORAGE_KEYS.userId));

  /**
   * Authenticated user's role — persisted to localStorage.
   * Controls onboarding banner visibility (org_admin only).
   * Possible values: 'org_admin' | 'program_manager' | 'field_officer' |
   *                  'case_worker' | 'finance_officer'
   */
  const userRole = ref<string | null>(getStored(STORAGE_KEYS.userRole));

  /** Active activities selected for the organisation — persisted to localStorage */
  const activities = ref<string[]>(JSON.parse(getStored(STORAGE_KEYS.activities) || '[]'));

  /** CFS location name for staff users — persisted to localStorage */
  const cfsLocationName = ref<string | null>(getStored(STORAGE_KEYS.cfsLocationName));

  // ── Computed helpers (kept as plain functions for simplicity) ────────────

  /** Two-letter initials derived from the stored display name. */
  function getInitials(): string {
    const name = userName.value ?? "U";
    return name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase();
  }

  // ── Setters ──────────────────────────────────────────────────────────────

  /** Store the JWT access token returned after login / register */
  function setToken(token: string): void {
    accessToken.value = token;
    setStored(STORAGE_KEYS.accessToken, token);
  }

  /** Store the authenticated user's display name and persist it */
  function setUserName(name: string): void {
    userName.value = name;
    setStored(STORAGE_KEYS.userName, name);
  }

  /** Store the authenticated user's organisation name and persist it */
  function setOrgName(name: string): void {
    orgName.value = name;
    setStored(STORAGE_KEYS.orgName, name);
  }

  /** Store the authenticated user's email address and persist it */
  function setUserEmail(email: string): void {
    userEmail.value = email;
    setStored(STORAGE_KEYS.userEmail, email);
  }

  /** Store the organisation UUID and persist it */
  function setOrgId(id: string): void {
    orgId.value = id;
    setStored(STORAGE_KEYS.orgId, id);
  }

  /** Store the authenticated user's UUID and persist it */
  function setUserId(id: string): void {
    userId.value = id;
    setStored(STORAGE_KEYS.userId, id);
  }

  /**
   * Store the authenticated user's role and persist it.
   * Used by the onboarding store to gate the banner to org_admin only.
   */
  function setUserRole(role: string): void {
    userRole.value = role;
    setStored(STORAGE_KEYS.userRole, role);
  }

  /**
   * Store the organisation's active activities and persist them.
   */
  function setActivities(acts: string[]): void {
    activities.value = acts;
    setStored(STORAGE_KEYS.activities, JSON.stringify(acts));
  }

  /**
   * Store the staff user's CFS location name and persist it.
   */
  function setCfsLocationName(name: string): void {
    cfsLocationName.value = name;
    setStored(STORAGE_KEYS.cfsLocationName, name);
  }

  // ── Session management ───────────────────────────────────────────────────

  /** Returns true when the stored access token hasn't expired yet. */
  function hasValidToken(): boolean {
    return isTokenValid(accessToken.value);
  }

  /** Clear all session state and remove every persisted key */
  function clearSession(): void {
    accessToken.value = null;
    userName.value = null;
    orgName.value = null;
    userEmail.value = null;
    orgId.value = null;
    userId.value = null;
    userRole.value = null;
    activities.value = [];
    cfsLocationName.value = null;

    Object.values(STORAGE_KEYS).forEach(removeStored);
  }

  /**
   * restoreFromStorage
   * Overrides Pinia's SSR hydration (which zeroes out client-only state)
   * with the actual values persisted in localStorage.
   */
  function restoreFromStorage(): void {
    if (import.meta.client) {
      // Restore token — keep it unless we can confirm it's expired
      const storedToken = getStored(STORAGE_KEYS.accessToken);
      if (storedToken) {
        if (isTokenValid(storedToken)) {
          accessToken.value = storedToken;
        } else {
          // Token is expired — clean up
          removeStored(STORAGE_KEYS.accessToken);
          accessToken.value = null;
        }
      }

      userName.value  = getStored(STORAGE_KEYS.userName) || userName.value;
      orgName.value   = getStored(STORAGE_KEYS.orgName) || orgName.value;
      userEmail.value = getStored(STORAGE_KEYS.userEmail) || userEmail.value;
      orgId.value     = getStored(STORAGE_KEYS.orgId) || orgId.value;
      userId.value    = getStored(STORAGE_KEYS.userId) || userId.value;
      userRole.value  = getStored(STORAGE_KEYS.userRole) || userRole.value;
      cfsLocationName.value = getStored(STORAGE_KEYS.cfsLocationName) || cfsLocationName.value;
      
      const storedActs = getStored(STORAGE_KEYS.activities);
      if (storedActs) {
        try {
          activities.value = JSON.parse(storedActs);
        } catch {
          activities.value = [];
        }
      }
    }
  }

  return {
    // state
    accessToken,
    userName,
    orgName,
    userEmail,
    orgId,
    userId,
    userRole,
    activities,
    cfsLocationName,
    // helpers
    getInitials,
    // helpers
    hasValidToken,
    // setters
    setToken,
    setUserName,
    setOrgName,
    setUserEmail,
    setOrgId,
    setUserId,
    setUserRole,
    setActivities,
    setCfsLocationName,
    // session
    clearSession,
    restoreFromStorage,
  };
});
