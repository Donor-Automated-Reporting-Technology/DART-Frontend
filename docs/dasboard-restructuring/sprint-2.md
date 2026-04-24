## Sprint 2 — Project Detail (Level 2)

### US-2.1: Project Detail Header

**As an** org admin,
**I want** to see the project name, partner, reporting entity, and grant period when I drill into a project,
**So that** I know which project I'm viewing.

**Acceptance Criteria:**

- Displays project metadata: name, framework type, partner, reporting to, period
- Breadcrumb shows: `Organisation > {project_name}`
- Back navigation via breadcrumb or browser back

**API:** `GET /api/v1/dashboard/projects/:frameworkId`

**Response fields used:**

```
data.project.project_name
data.project.framework_type
data.project.partner_name
data.project.reporting_to
data.project.period_start
data.project.period_end
```

---

### US-2.2: Project Summary Cards

**As an** org admin,
**I want** to see project-level summary cards showing beneficiaries, gender split, disability count, and active locations,
**So that** I can assess this project's reach.

**Acceptance Criteria:**

- Displays summary cards:
  - Unique Beneficiaries
  - Girls / Boys split
  - With Disability
  - Active Locations
- Target breakdown shown alongside actuals
- Uses existing card design

**Response fields used:**

```
data.summary.unique_beneficiaries
data.summary.girls
data.summary.boys
data.summary.with_disability
data.summary.active_locations
data.summary.target_breakdown.girls / .boys / .girls_with_disability / .boys_with_disability
```

---

### US-2.3: Activities Table with Drill-Down

**As an** org admin,
**I want** to see all activities within this project with their targets and progress,
**So that** I can compare activities and drill into one.

**Acceptance Criteria:**

- Table columns: Activity Name, Code, Target, Actual, Progress, Status
- Each row is clickable — navigates to Level 3 (`/dashboard/activities/:id`)
- Progress shown as bar (0–100%)
- Active activities highlighted
- Breadcrumb updates on click: `Organisation > Project > {activity_name}`

**Response fields used per row:**

```
data.activities[].id
data.activities[].name
data.activities[].code
data.activities[].pattern_type
data.activities[].target_count
data.activities[].target_unit
data.activities[].actual_count
data.activities[].percentage
data.activities[].is_active
data.activities[].target_breakdown
```

---

### US-2.4: Set Project Target (Admin Action)

**As an** org admin,
**I want** to set or update the enrolment targets for a project,
**So that** progress tracking is accurate.

**Acceptance Criteria:**

- "Set Target" button visible on project detail (org_admin only)
- Opens a modal/form with fields: Target Girls, Target Boys, Girls with Disability, Boys with Disability
- Validation:
  - All fields ≥ 0
  - Disability ≤ respective gender
  - Total (girls + boys) > 0
- On save, `target_count` auto-computes as girls + boys
- Dashboard refreshes to reflect new targets
- Error messages shown inline

**API:** `PUT /api/v1/frameworks/:id/targets`

**Request:**

```json
{
  "target_girls": 500,
  "target_boys": 500,
  "target_girls_disability": 30,
  "target_boys_disability": 30
}
```

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "project_name": "CFS South Sudan",
    "target_count": 1000,
    "target_breakdown": {
      "girls": 500,
      "boys": 500,
      "girls_with_disability": 30,
      "boys_with_disability": 30
    }
  }
}
```

---
