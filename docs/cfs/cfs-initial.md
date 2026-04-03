
As the SSWOCO administrator, I want to configure the CFS module before field staff use it — assigning staff to locations, setting grant targets, and activating session types per sector — so that Peter's and Regina's screens show the right data for their location.




Acceptance criteria

Nyawelo can open a CFS Configuration screen from the admin panel.

Step 1 — Staff assignment: Nyawelo sees a list of all active staff with roles facilitator and case_worker. For each, he can select a CFS location from a dropdown and enter a start date. Saving creates a user_location_assignments record.

If a staff member already has an active assignment and Nyawelo assigns them to a new location, the system sets end_date on the existing assignment to the day before the new start date and creates a new assignment record.

The system enforces that no user has more than one active assignment at a time (end_date IS NULL constraint logic).

Step 2 — Grant targets: Nyawelo can enter one combined CFS grant period (start date, end date), total children target, girls sub-target, children with disability sub-target, and sessions target. Saving creates or updates a grant_period_targets record for the CFS activity.

Step 3 — Session types: Nyawelo sees the four CFS locations. For each location he can toggle three session types on or off: general_group_activity, teamup, children_sessions. Only active session types appear on the facilitator attendance screen for that location.

All three steps show a progress indicator. Each step can be saved independently without completing the others.

Completed steps are marked with a visual indicator so Nyawelo can see what remains.








# CFS Configuration - API Documentation

This document explicitly outlines the 4 main endpoints integrated into the CFS (Child Friendly Spaces) backend module for Staff Assignment, Target Configurations, and Location Session toggling. All endpoints exist under the `cfs/` namespace and are strictly protected, requiring the `Bearer <token>` in the Authorization header.

**Environment variables:**
- `baseUrl`: usually `http://localhost:8080/api/v1`

**Authentication:** 
- Only users with the role `org_admin` can execute these endpoints. 
- The `organisation_id` is smartly inferred from the `org_admin` making the call. 

---

## 1. Get Staff Assignmentsa
Returns a list of all active assignable staff (`facilitator`, `case_worker`) for the admin's organisation, mapped together with their current CFS location assignment explicitly if active.

- **Method:** `GET`
- **Route:** `/cfs/staff-assignments`
- **Headers:** `Authorization: Bearer <token>`
- **Body:** None

### Success Response `200 OK`
```json
{
  "data": {
    "assignments": [
      {
        "assignment_id": "90e21cda-1c01-4588-b135-...",
        "user_id": "uuid-of-user",
        "full_name": "Regina Phalange",
        "role": "facilitator",
        "cfs_location_id": "uuid-of-location",
        "location_name": "Sector 1",
        "start_date": "2026-03-24",
        "end_date": null,
        "is_active": true
      },
      {
        "user_id": "uuid-of-user-2",
        "full_name": "Peter Pan",
        "role": "case_worker",
        "is_active": false
      }
    ]
  }
}
```

---

## 2. Assign Staff (Start Assignment)
Creates a new Location Assignment for a given User. Existing active assignments are automatically rolled back to their respective end dates (1 day prior to the new `start_date`).

- **Method:** `POST`
- **Route:** `/cfs/staff-assignments`
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`

### Payload
```json
{
  "user_id": "uuid-of-staff-member",
  "cfs_location_id": "uuid-of-cfs-location",
  "start_date": "2026-03-24"
}
```

### Success Response `201 Created`
```json
{
  "message": "Staff assignment created successfully",
  "assignment": {
    "id": "new-uuid",
    "organisation_id": "org-uuid",
    "user_id": "staff-uuid",
    "cfs_location_id": "loc-uuid",
    "start_date": "2026-03-24",
    "end_date": null,
    "created_at": "2026-03-23T21:58:17Z",
    "updated_at": "2026-03-23T21:58:17Z"
  }
}
```

---

## 3. Upsert Grant Targets
Inserts or Overrides the unified targets for the child-friendly spaces activity (`cfs`). Time periods govern the entire grant timeline.

- **Method:** `POST`
- **Route:** `/cfs/grant-targets`
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`

### Payload
```json
{
  "period_start": "2026-01-01",
  "period_end": "2026-12-31",
  "target_values": {
    "total_children": 500,
    "girls": 250,
    "children_with_disability": 50,
    "sessions": 100
  }
}
```

### Success Response `200 OK`
```json
{
  "message": "Grant targets configured successfully"
}
```

---

## 4. Upsert Location Session Types
Allows you to bulk-override or configure which session formats are available for a given unique CFS Location. An array payload is securely looped and merged via standard PostgreSQL conflict detection.

- **Method:** `POST`
- **Route:** `/cfs/location-session-types`
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`

### Payload
Supported types include `"general_group_activity"`, `"teamup"`, and `"children_sessions"`. Unassigned defaults to false until provided. Wait, here is the body:

```json
{
  "cfs_location_id": "uuid-of-cfs-location",
  "session_types": [
    {
      "type": "general_group_activity", 
      "is_active": true
    },
    {
      "type": "teamup",
      "is_active": false
    },
    {
      "type": "children_sessions",
      "is_active": true
    }
  ]
}
```

### Success Response `200 OK`
```json
{
  "message": "Session types updated successfully"
}
```

---

### Global Error Standard
All namespace modules obey identical structured HTTP error bounds defined throughout the DART framework. Typical responses:

- `400 Bad Request` — JSON syntaxes errors or payload validators triggering (`VALIDATION_ERROR`). Will return `"errors": { "field": "constraint reason" }` maps.
- `401 Unauthorized` — `Bearer` token invalid or rejected formatting (`UNAUTHORIZED`).
- `403 Forbidden` — Triggered randomly inside valid JWT footprints executing logic outside role expectations (i.e., staff missing `org_admin` role) or operating cross-container footprints (`FORBIDDEN`).
- `500 Internal Server Error` — Database timeouts, memory spikes, or standard Go pointer handling exceptions (`INTERNAL_ERROR`).
