import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * Auth store
 *
 * Holds the in-memory authentication state for the current session.
 * The access token is NEVER written to localStorage — it lives here only.
 * On page refresh the Nuxt plugin calls /api/v1/auth/refresh (httpOnly cookie)
 * to silently restore the session.
 *
 * Non-sensitive display fields (userName, orgName, userEmail, orgId, userId,
 * userRole) ARE persisted to localStorage so they survive the refresh-token
 * restore flow without requiring a separate /me round-trip.
 */

const STORAGE_KEYS = {
  userName: "dart_user_name",
  orgName: "dart_org_name",
  userEmail: "dart_user_email",
  orgId: "dart_org_id",
  userId: "dart_user_id",
  userRole: "dart_user_role",
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

export const useAuthStore = defineStore("auth", () => {
  // ── State ────────────────────────────────────────────────────────────────

  /** JWT access token — memory-only, never persisted */
  const accessToken = ref<string | null>(null);

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

  // ── Session management ───────────────────────────────────────────────────

  /** Clear all session state and remove every persisted key */
  function clearSession(): void {
    accessToken.value = null;
    userName.value = null;
    orgName.value = null;
    userEmail.value = null;
    orgId.value = null;
    userId.value = null;
    userRole.value = null;

    Object.values(STORAGE_KEYS).forEach(removeStored);
  }

  /**
   * restoreFromStorage
   * Overrides Pinia's SSR hydration (which zeroes out client-only state)
   * with the actual values persisted in localStorage.
   */
  function restoreFromStorage(): void {
    if (import.meta.client) {
      userName.value  = getStored(STORAGE_KEYS.userName) || userName.value;
      orgName.value   = getStored(STORAGE_KEYS.orgName) || orgName.value;
      userEmail.value = getStored(STORAGE_KEYS.userEmail) || userEmail.value;
      orgId.value     = getStored(STORAGE_KEYS.orgId) || orgId.value;
      userId.value    = getStored(STORAGE_KEYS.userId) || userId.value;
      userRole.value  = getStored(STORAGE_KEYS.userRole) || userRole.value;
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
    // helpers
    getInitials,
    // setters
    setToken,
    setUserName,
    setOrgName,
    setUserEmail,
    setOrgId,
    setUserId,
    setUserRole,
    // session
    clearSession,
    restoreFromStorage,
  };
});
