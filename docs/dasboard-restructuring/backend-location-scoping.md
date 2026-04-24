# Backend: Role-Based Location Scoping for Dashboard Endpoints

## Overview

The 3 dashboard drill-down endpoints currently return **org-wide data**. They need to automatically scope data to the user's assigned location when the user is a non-admin role (`field_officer`, `case_worker`).

## How It Should Work

- Extract the user's **role** and assigned **`location_id`** from the JWT/session (the user's location assignment already exists from staff onboarding)
- If role is `org_admin` or `program_manager` → **return all data** (no change, current behaviour)
- If role is `field_officer` or `case_worker` → **filter all data to only their assigned location**

---

## Endpoints to Modify

### 1. `GET /api/v1/dashboard`

Response shape stays the same:

```json
{
  "data": {
    "org_summary": {
      "total_projects": 0,
      "total_active_locations": 0,
      "total_unique_beneficiaries": 0,
      "overall_target": 0,
      "target_breakdown": {}
    },
    "projects": [
      {
        "id": "",
        "project_name": "",
        "total_beneficiaries": 0,
        "overall_actual": 0,
        "overall_progress": 0
      }
    ]
  }
}
```

**For scoped users:**

- `org_summary` counts reflect only their location
- Each project in `projects[]` has counts only from that location
- `total_active_locations` should be `1`

---

### 2. `GET /api/v1/dashboard/summary-stats`

Response shape stays the same:

```json
{
  "data": {
    "beneficiary_reach": {
      "total": { "actual": 0, "target": 0, "percentage": 0 },
      "girls_women": { "actual": 0, "target": 0, "percentage": 0 },
      "boys_men": { "actual": 0, "target": 0, "percentage": 0 },
      "with_disability": { "actual": 0, "target": 0, "percentage": 0 }
    }
  }
}
```

**For scoped users:**

- Reach metrics reflect only beneficiaries at their location

---

### 3. `GET /api/v1/dashboard/projects/:frameworkId`

Response shape stays the same:

```json
{
  "data": {
    "project": {
      "id": "",
      "project_name": "",
      "framework_type": "",
      "partner_name": "",
      "reporting_to": "",
      "period_start": "",
      "period_end": ""
    },
    "summary": {
      "unique_beneficiaries": 0,
      "girls": 0,
      "boys": 0,
      "with_disability": 0,
      "active_locations": 0,
      "total_locations": 0
    },
    "activities": [
      {
        "id": "",
        "name": "",
        "code": "",
        "actual_count": 0,
        "target_count": 0,
        "percentage": 0
      }
    ]
  }
}
```

**For scoped users:**

- `summary` counts reflect only their location
- `activities[]` has actual counts and percentages only from that location
- `active_locations` / `total_locations` should be `1` / `1`

---

### 4. `GET /api/v1/dashboard/activities/:frameworkActivityId`

Response shape stays the same:

```json
{
  "data": {
    "pattern_type": "daily_attendance",
    "activity": {
      "id": "",
      "name": "",
      "code": "",
      "target_count": 0,
      "target_unit": ""
    },
    "summary": {
      "unique_children": 0,
      "target": 0,
      "percentage": 0,
      "girls": 0,
      "boys": 0,
      "with_disability": 0,
      "new_this_period": 0
    },
    "attendance": {
      "total_sessions": 0,
      "total_present": 0,
      "total_absent": 0,
      "attendance_rate": 0
    },
    "daily_trend": [{ "date": "", "present": 0, "absent": 0 }],
    "by_location": [
      {
        "location_id": "",
        "location_name": "",
        "unique": 0,
        "girls": 0,
        "boys": 0,
        "disability": 0,
        "sessions_held": 0,
        "avg_daily_present": 0
      }
    ],
    "recent_sessions": [
      {
        "id": "",
        "date": "",
        "location_name": "",
        "present": 0,
        "absent": 0,
        "total": 0
      }
    ]
  }
}
```

**For scoped users:**

- `summary` and `attendance` reflect only their location
- `daily_trend` shows only their location's daily numbers
- `by_location` array has **only 1 entry** (their location)
- `recent_sessions` returns only sessions from their location

---

## Important Constraints

1. **Do NOT change the response structure** — the frontend renders whatever shape it receives. Same keys, same nesting, just smaller numbers for scoped users.

2. **Scoping must happen server-side based on the JWT** — the frontend does NOT send a `location_id` parameter. This is a security measure so staff cannot request other locations' data.

3. **`activity.target_count`** — decide whether to show the org-wide target or a location-level target. If location-level targets don't exist yet, keep the org-wide target (the percentage will just be lower, which is accurate).

4. **No frontend changes required** — the frontend is purely data-driven and renders whatever the API returns.
