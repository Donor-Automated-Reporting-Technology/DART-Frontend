# CFS Dashboard — New Endpoints

Two new endpoints are available for the CFS dashboard module.

---

## 1. `GET /api/v1/cfs/dashboard/my-location`

**Purpose:** Returns a location-scoped dashboard for a facilitator or case worker based on their **active CFS location assignment**.

> **Who calls this?**  
> Facilitators and case workers — the backend automatically resolves which location to show based on the logged-in user's active assignment. No query parameters needed.

### Auth
`Authorization: Bearer <access_token>`  
Any authenticated CFS user (facilitator, case_worker, or org_admin who has an assignment).

### Prerequisites
The user **must** have an active location assignment (created via `POST /api/v1/cfs/staff-assignments`). If they don't, the endpoint returns `404`.

---

### Success Response — `200 OK`

```json
{
  "data": {
    "location": {
      "id": "uuid-of-location",
      "name": "Al Zaatari CFS",
      "sector": "Protection",
      "geographic_area": "Zone 2"
    },
    "demographics": {
      "total_children": 124,
      "total_male": 60,
      "total_female": 64,
      "total_with_disability": 8
    },
    "attendance": {
      "total_sessions": 18,
      "total_attendance_records": 312,
      "total_present": 290,
      "total_absent": 22
    },
    "recent_sessions": [
      {
        "id": "uuid-of-session",
        "session_date": "2025-03-28",
        "session_type": "general_group_activity",
        "present_count": 20,
        "absent_count": 3,
        "total_count": 23
      }
    ]
  }
}
```

> `recent_sessions` returns the **last 5 sessions** ordered by date descending.  
> `sector` and `geographic_area` may be empty strings if not configured.

---

### Error Responses

| Status | Code | Meaning |
|--------|------|---------|
| `401` | `UNAUTHORIZED` | Missing or invalid token |
| `404` | `NO_ASSIGNMENT` | The user has no active CFS location assignment — prompt them to contact their admin |
| `500` | `INTERNAL_ERROR` | Server error |

---

### Frontend Notes
- Show a friendly message when `404 / NO_ASSIGNMENT` is returned, e.g. *"You haven't been assigned to a location yet. Please contact your administrator."*
- `recent_sessions` can be an **empty array** `[]` if no sessions have been recorded yet — handle this gracefully.
- Poll or refresh this endpoint after recording attendance so stats stay up to date.

---

---

## 2. `GET /api/v1/cfs/beneficiaries/list`

**Purpose:** Returns a paginated, filterable list of beneficiaries with their CFS location.

> **Role-based scoping (automatic — no extra work needed on the frontend):**
> - `org_admin` → sees beneficiaries across **all** locations (can optionally filter by `cfs_location_id`)
> - `facilitator` / `case_worker` → **automatically scoped** to their active assignment location (the `cfs_location_id` param is ignored for them)

### Auth
`Authorization: Bearer <access_token>`

---

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | `int` | No | `1` | Page number (1-indexed) |
| `page_size` | `int` | No | `20` | Items per page (max `100`) |
| `search` | `string` | No | — | Searches `personal_name`, `father_name`, `family_name` (case-insensitive) |
| `sex` | `string` | No | — | Filter by sex: `male` or `female` |
| `disability_status` | `string` | No | — | Filter by disability status value (e.g. `none`, `physical`, etc.) |
| `cfs_location_id` | `uuid` | No | — | **org_admin only** — filter by a specific location UUID |
| `sort_by` | `string` | No | `personal_name` | Sort field: `personal_name`, `age_at_registration`, or `registration_date` |
| `sort_order` | `string` | No | `asc` | Sort direction: `asc` or `desc` |

---

### Success Response — `200 OK`

```json
{
  "data": {
    "beneficiaries": [
      {
        "id": "uuid-of-beneficiary",
        "personal_name": "Fatima",
        "father_name": "Ahmad",
        "grandfather_name": "Hassan",
        "family_name": "Al-Rashid",
        "age_at_registration": 9,
        "sex": "female",
        "language": "Arabic",
        "disability_status": "none",
        "guardian_name": "Ahmad Al-Rashid",
        "guardian_phone": "+962791234567",
        "registration_date": "2025-01-15",
        "cfs_location": {
          "id": "uuid-of-location",
          "name": "Al Zaatari CFS"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 124,
      "total_pages": 7,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

> `grandfather_name`, `family_name`, and `guardian_phone` can be `null` — handle with optional chaining.

---

### Error Responses

| Status | Code | Meaning |
|--------|------|---------|
| `401` | `UNAUTHORIZED` | Missing or invalid token |
| `403` | `NO_ASSIGNMENT` | Non-admin caller has no active location assignment |
| `400` | `VALIDATION_ERROR` | Invalid query parameter values |
| `500` | `INTERNAL_ERROR` | Server error |

---

### Frontend Notes

- **Pagination:** Use `pagination.has_next` and `pagination.has_prev` to show/hide next/previous buttons. Use `pagination.total_pages` for a page-number strip.
- **Search:** Debounce the search input (~300ms) before firing the request to avoid hammering the API.
- **Loading state:** Reset `page` to `1` whenever `search`, `sex`, `disability_status`, or any filter changes.
- **Empty state:** `beneficiaries` will be `[]` when no results match — render an empty-state illustration.

---

## Example Requests (fetch)

```js
// Location dashboard (facilitator)
const res = await fetch('/api/v1/cfs/dashboard/my-location', {
  headers: { Authorization: `Bearer ${accessToken}` }
})
const { data } = await res.json()

// Beneficiaries list  
const params = new URLSearchParams({ page: 1, page_size: 20, search: 'fatima' })
const res = await fetch(`/api/v1/cfs/beneficiaries/list?${params}`, {
  headers: { Authorization: `Bearer ${accessToken}` }
})
const { data } = await res.json()
// data.beneficiaries, data.pagination
```
