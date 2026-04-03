{
  "data": {
    "demographics": {
      "total_children": 6,
      "total_male": 5,
      "total_female": 1,
      "total_with_disability": 6
    },
    "locations": [
      {
        "location_id": "b934241e-982c-4e30-8ced-cb4ac3e6bd94",
        "location_name": "Kodok",
        "total_children": 2,
        "male": 1,
        "female": 1,
        "with_disability": 2
      },
      {
        "location_id": "d259306b-a978-41ba-b211-773608958db7",
        "location_name": "Malakal",
        "total_children": 4,
        "male": 4,
        "female": 0,
        "with_disability": 4
      }
    ],
    "attendance": {
      "total_sessions": 14,
      "total_attendance_records": 17,
      "total_present": 15,
      "total_absent": 2
    },
    "grant_targets": {
      "period_start": "2026-03-29",
      "period_end": "2027-04-30",
      "target_total_children": 500,
      "target_girls": 100,
      "target_children_with_disability": 100,
      "target_sessions": 100
    },
    "progress": {
      "total_children": {
        "actual": 6,
        "target": 500,
        "percentage": 1
      },
      "girls": {
        "actual": 1,
        "target": 100,
        "percentage": 1
      },
      "with_disability": {
        "actual": 6,
        "target": 100,
        "percentage": 6
      },
      "sessions": {
        "actual": 14,
        "target": 100,
        "percentage": 14
      }
    }
  }
}

# CFS Dashboard — Frontend API Reference

Admin-only endpoint. Requires `Authorization: Bearer <token>` with `org_admin` role.  
Base URL: `http://localhost:8080/api/v1`

---

## GET /cfs/dashboard

Returns all CFS metrics in a single call.

### Success `200 OK`

```json
{
  "data": {
    "demographics": {
      "total_children": 120,
      "total_male": 65,
      "total_female": 55,
      "total_with_disability": 12
    },
    "locations": [
      {
        "location_id": "uuid",
        "location_name": "Sector 1",
        "total_children": 35,
        "male": 18,
        "female": 17,
        "with_disability": 3
      },
      {
        "location_id": "uuid",
        "location_name": "Sector 2",
        "total_children": 30,
        "male": 15,
        "female": 15,
        "with_disability": 4
      }
    ],
    "attendance": {
      "total_sessions": 42,
      "total_attendance_records": 756,
      "total_present": 680,
      "total_absent": 76
    },
    "grant_targets": {
      "period_start": "2026-01-01",
      "period_end": "2026-12-31",
      "target_total_children": 500,
      "target_girls": 250,
      "target_children_with_disability": 50,
      "target_sessions": 100
    },
    "progress": {
      "total_children": { "actual": 120, "target": 500, "percentage": 24 },
      "girls":          { "actual": 55,  "target": 250, "percentage": 22 },
      "with_disability": { "actual": 12, "target": 50,  "percentage": 24 },
      "sessions":       { "actual": 42,  "target": 100, "percentage": 42 }
    }
  }
}
```

> **Note:** `grant_targets` and `progress` are `null` if no grant targets have been configured yet.

---

## TypeScript Types

```typescript
interface ProgressMetric {
  actual: number
  target: number
  percentage: number  // 0–100, capped at 100
}

interface DashboardDemographics {
  total_children: number
  total_male: number
  total_female: number
  total_with_disability: number
}

interface DashboardLocationBreakdown {
  location_id: string
  location_name: string
  total_children: number
  male: number
  female: number
  with_disability: number
}

interface DashboardAttendance {
  total_sessions: number
  total_attendance_records: number
  total_present: number
  total_absent: number
}

interface DashboardGrantTargets {
  period_start: string
  period_end: string
  target_total_children: number
  target_girls: number
  target_children_with_disability: number
  target_sessions: number
}

interface DashboardProgress {
  total_children: ProgressMetric
  girls: ProgressMetric
  with_disability: ProgressMetric
  sessions: ProgressMetric
}

interface DashboardData {
  demographics: DashboardDemographics
  locations: DashboardLocationBreakdown[]
  attendance: DashboardAttendance
  grant_targets: DashboardGrantTargets | null
  progress: DashboardProgress | null
}

interface DashboardResponse {
  data: DashboardData
}
```

## Frontend Usage Notes

- **Progress bars**: Use `progress.*.percentage` directly (0–100 range, capped at 100)
- **Null checks**: `grant_targets` and `progress` are `null` when no targets configured — show "Configure targets" CTA
- **Location chart**: Map `locations[]` to a bar/pie chart grouped by sector
- **Attendance rate**: Calculate `(total_present / total_attendance_records) * 100` for overall attendance %
