# CFS Staff Management — Frontend API Reference

All endpoints require `Authorization: Bearer <token>` and `org_admin` role.  
Base URL: `http://localhost:8080/api/v1`

---

## 1. Create Staff Member

Creates a new staff user with a temporary password.

- **Method:** `POST`
- **Route:** `/cfs/staff`

### Request
```json
{
  "full_name": "Peter Deng",
  "email": "peter.deng@example.com",
  "password": "TempPass123",
  "role": "facilitator"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `full_name` | string | ✅ | Min 2 chars |
| `email` | string | ✅ | Must be unique, valid format |
| `password` | string | ✅ | Min 8 chars, must contain a number |
| `role` | string | ✅ | `"facilitator"` or `"case_worker"` |

### Success `201 Created`
```json
{
  "message": "Staff member created successfully",
  "data": {
    "id": "uuid-of-new-user",
    "organisation_id": "org-uuid",
    "full_name": "Peter Deng",
    "email": "peter.deng@example.com",
    "role": "facilitator"
  }
}
```

### Errors
| Status | Code | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Missing/invalid fields |
| `400` | `EMAIL_EXISTS` | Email already registered |
| `403` | `FORBIDDEN` | Caller is not `org_admin` |

---

## 2. Get Staff Assignments

Returns all staff (facilitators & case workers) with their current CFS location assignment.

- **Method:** `GET`
- **Route:** `/cfs/staff-assignments`

### Success `200 OK`
```json
{
  "data": {
    "assignments": [
      {
        "assignment_id": "assignment-uuid",
        "user_id": "user-uuid",
        "full_name": "Peter Deng",
        "role": "facilitator",
        "cfs_location_id": "location-uuid",
        "location_name": "Sector 1",
        "start_date": "2026-03-24",
        "is_active": true
      },
      {
        "user_id": "user-uuid-2",
        "full_name": "Regina Lado",
        "role": "case_worker",
        "is_active": false
      }
    ]
  }
}
```

> **Note:** Staff with `is_active: false` have no current assignment. Fields `assignment_id`, `cfs_location_id`, `location_name`, `start_date` are omitted when unassigned.

---

## 3. Assign Staff to CFS Location

Assigns a staff member to a CFS location. If they already have an active assignment, it is auto-closed (end_date set to day before new start_date).

- **Method:** `POST`
- **Route:** `/cfs/staff-assignments`

### Request
```json
{
  "user_id": "uuid-of-staff-member",
  "cfs_location_id": "uuid-of-cfs-location",
  "start_date": "2026-03-24"
}
```

### Success `201 Created`
```json
{
  "message": "Staff assignment created successfully",
  "assignment": {
    "id": "new-assignment-uuid",
    "organisation_id": "org-uuid",
    "user_id": "staff-uuid",
    "cfs_location_id": "location-uuid",
    "start_date": "2026-03-24T00:00:00Z",
    "end_date": null,
    "created_at": "2026-03-24T10:00:00Z"
  }
}
```

---

## 4. Unassign Staff from CFS Location

Removes a staff member from their current CFS location by closing the active assignment (sets `end_date` to today).

- **Method:** `POST`
- **Route:** `/cfs/staff-assignments/unassign`

### Request
```json
{
  "user_id": "uuid-of-staff-member"
}
```

### Success `200 OK`
```json
{
  "message": "Staff unassigned successfully"
}
```

### Errors
| Status | Code | When |
|---|---|---|
| `400` | `NO_ASSIGNMENT` | User has no active assignment |
| `403` | `FORBIDDEN` | User not in your org |

---

## 5. Get CFS Locations

Returns all CFS locations for the organisation. Use this to populate the location dropdown when assigning staff.

- **Method:** `GET`
- **Route:** `/cfs/locations`

### Success `200 OK`
```json
{
  "data": [
    {
      "id": "location-uuid-1",
      "name": "Sector 1",
      "sector": "Sector 1",
      "geographic_area": "Malakal PoC"
    },
    {
      "id": "location-uuid-2",
      "name": "Sector 2",
      "sector": "Sector 2",
      "geographic_area": "Malakal PoC"
    }
  ]
}
```

---

## Frontend Workflow

```
1. GET /cfs/locations          → populate location dropdown
2. GET /cfs/staff-assignments  → render staff table with assignment status
3. POST /cfs/staff             → "Add Staff" form (name, email, temp password, role)
4. POST /cfs/staff-assignments → assign staff to location (select from dropdown)
5. POST /cfs/staff-assignments/unassign → remove staff from location
```

### Suggested TypeScript Types

```typescript
interface CreateStaffPayload {
  full_name: string
  email: string
  password: string
  role: 'facilitator' | 'case_worker'
}

interface AssignStaffPayload {
  user_id: string
  cfs_location_id: string
  start_date: string // YYYY-MM-DD
}

interface UnassignStaffPayload {
  user_id: string
}

interface StaffAssignment {
  assignment_id?: string
  user_id: string
  full_name: string
  role: string
  cfs_location_id?: string
  location_name?: string
  start_date?: string
  is_active: boolean
}

interface CFSLocation {
  id: string
  name: string
  sector?: string
  geographic_area?: string
}
```
