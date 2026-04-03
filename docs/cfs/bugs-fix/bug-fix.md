# Bug Fixes Implementation - Backend

## Issues Fixed

### 1. ✅ Session Persistence Issue (Logout on Page Refresh)

**Problem:** Users were being logged out after refreshing the page because the refresh token cookie wasn't available to the frontend.

**Root Cause:** The refresh token cookie was configured with `path: "/api/v1/auth"`, which meant the browser only sent the cookie when making requests to that specific path. When the frontend tried to refresh tokens from other pages/routes, the cookie wasn't included in the request.

**Solution:** Changed the cookie path from `/api/v1/auth` to `/` in both login and refresh endpoints.

**Files Changed:**
- `internal/handler/auth_handler.go`
    - Login handler: Line 118 - Changed cookie path to `/`
    - RefreshTokens handler: Line 162 - Changed cookie path to `/`

**Impact:** The refresh token cookie is now sent with all requests to the API, allowing the frontend to refresh the access token from any page.

---

### 2. ✅ Role Information in Responses

**Problem:** Frontend needed to know the user's role to implement role-based UI visibility (showing/hiding dashboard and CFS sections based on role).

**Solution:** Added role information to both login and refresh token responses.

**Files Changed:**
- `internal/dto/auth_dto.go`
    - Added `RefreshUserResponse` struct with `Role` field
    - Updated `RefreshDataResponse` to include `User` field with role information

- `internal/service/auth_service.go`
    - Modified `RefreshTokens` method to include role in the response (Line 392-394)

**API Response Changes:**

**Login Response** (already had role, no changes needed):
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "full_name": "John Doe",
      "email": "john@example.com",
      "role": "org_admin",
      "organisation": { ... }
    },
    "tokens": {
      "access_token": "...",
      "token_type": "Bearer",
      "expires_in": 28800
    }
  }
}
```

**Refresh Token Response** (NEW - now includes role):
```json
{
  "data": {
    "user": {
      "role": "org_admin"
    },
    "tokens": {
      "access_token": "...",
      "token_type": "Bearer",
      "expires_in": 28800
    }
  }
}
```

---

## Frontend Implementation Guide

### Role-Based UI Visibility

The backend supports three user roles:
1. **`org_admin`** - Organisation Administrator
2. **`facilitator`** - CFS Facilitator (field staff)
3. **`case_worker`** - Case Worker (field staff)

### UI Visibility Rules

#### For `org_admin`:
- ✅ Show Dashboard
- ✅ Show CFS Section
- ✅ Show all onboarding steps
- ✅ Show organization management
- ✅ Show staff assignment

#### For `facilitator`:
- ❌ Hide Dashboard
- ✅ Show CFS Section only:
    - Register Beneficiary
    - Create CFS Registration
    - Record Attendance
    - Create Session
- ❌ Hide organization management
- ❌ Hide staff assignment

#### For `case_worker`:
- ❌ Hide Dashboard
- ✅ Show CFS Section only:
    - View Beneficiaries
    - View Case Identification Flags
    - Manage Cases
- ❌ Hide organization management
- ❌ Hide staff assignment

### Implementation Example (Frontend)

```typescript
// Get user role from login or refresh response
const userRole = response.data.user.role;

// Store in your state management (Redux, Context, etc.)
setUserRole(userRole);

// Use role to control UI visibility
const showDashboard = userRole === 'org_admin';
const showCFS = true; // All roles can see CFS
const showAdminFeatures = userRole === 'org_admin';

// In your sidebar/navigation component
{showDashboard && <DashboardLink />}
{showCFS && <CFSLink />}
{showAdminFeatures && <AdminPanel />}
```

### Refresh Token Flow

The frontend should implement automatic token refresh:

1. Store the access token in memory or secure storage
2. The refresh token is stored as an httpOnly cookie (automatic)
3. When the access token expires (8 hours), call `POST /api/v1/auth/refresh`
4. The browser automatically sends the refresh token cookie
5. Update the access token and user role from the response
6. Continue making authenticated requests

```typescript
// Example refresh implementation
async function refreshAccessToken() {
  const response = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    credentials: 'include' // Important: sends cookies
  });

  if (response.ok) {
    const data = await response.json();
    setAccessToken(data.data.tokens.access_token);
    setUserRole(data.data.user.role);
    return true;
  }

  // If refresh fails, redirect to login
  redirectToLogin();
  return false;
}
```

---

## Testing the Fixes

### Test Case 1: Session Persistence
1. Login to the application
2. Refresh the browser page
3. ✅ Expected: User remains logged in
4. ✅ Expected: Access token is refreshed automatically

### Test Case 2: Role-Based UI
1. Login as `org_admin`
2. ✅ Expected: See both Dashboard and CFS sections
3. Logout and login as `facilitator` or `case_worker`
4. ✅ Expected: See only CFS section (no dashboard)

### Test Case 3: Role in Refresh Response
1. Login to the application
2. Wait for access token to expire or manually call refresh endpoint
3. Call `POST /api/v1/auth/refresh`
4. ✅ Expected: Response includes `data.user.role`

---

## Additional Notes

- The refresh token cookie is httpOnly and Secure, preventing XSS attacks
- The refresh token is valid for 30 days
- The access token is valid for 8 hours (28800 seconds)
- When a user logs out, the session is revoked and the cookie is cleared
- Cookie `SameSite` policy should be configured based on your deployment (not set in this implementation, defaults to browser settings)
