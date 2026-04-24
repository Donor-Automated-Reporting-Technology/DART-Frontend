# Dashboard Drill-Down — Frontend Sprint Plan

> **Principle:** The current UI design does not change. We are adding drill-down navigation
> using breadcrumbs so the user can move between Organisation → Project → Activity detail views.

---

## API Endpoints (All Implemented — Backend Ready)

| Level               | Method | Route                                               | Returns                                                                                   |
| ------------------- | ------ | --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1 — Org Overview    | GET    | `/api/v1/dashboard`                                 | `org_summary` + `projects[]`                                                              |
| 1 — Summary Stats   | GET    | `/api/v1/dashboard/summary-stats`                   | `beneficiary_reach` (gender/disability breakdown)                                         |
| 2 — Project Detail  | GET    | `/api/v1/dashboard/projects/:frameworkId`           | `project` + `summary` + `activities[]`                                                    |
| 3 — Activity Detail | GET    | `/api/v1/dashboard/activities/:frameworkActivityId` | `activity` + `summary` + `attendance` + `daily_trend` + `by_location` + `recent_sessions` |
| Admin Action        | PUT    | `/api/v1/frameworks/:id/targets`                    | Sets project-level enrolment targets                                                      |

---

## Sprint 1 — Dashboard Shell & Org Overview (Level 1)

### US-1.1: Dashboard Layout with Breadcrumb Navigation

**As an** org admin,
**I want** a persistent breadcrumb bar at the top of the dashboard,
**So that** I always know where I am in the drill-down and can navigate back.

**Acceptance Criteria:**

- Breadcrumb renders at the top of the dashboard content area
- At Level 1: `Organisation` (non-clickable, current)
- At Level 2: `Organisation > Project Name` (Organisation is clickable)
- At Level 3: `Organisation > Project Name > Activity Name` (first two are clickable)
- Clicking a breadcrumb segment navigates to that level
- Browser back button works correctly

**Implementation Notes:**

- Create `DashboardBreadcrumb.vue` component
- Use Vue Router with nested routes:
  ```
  /dashboard                                    → Level 1
  /dashboard/projects/:frameworkId              → Level 2
  /dashboard/activities/:frameworkActivityId    → Level 3
  ```
- Store breadcrumb state in a composable `useBreadcrumb()` that updates on route change

---

### US-1.2: Organisation Overview Cards

**As an** org admin,
**I want** to see summary cards showing total projects, active locations, unique beneficiaries, and overall target progress,
**So that** I have an at-a-glance view of my organisation.

**Acceptance Criteria:**

- Displays 4 summary cards from `org_summary`:
  - Total Projects
  - Total Active Locations
  - Total Unique Beneficiaries
  - Overall Target (with breakdown: girls, boys, disability)
- Cards use existing design/styling
- Loading skeleton shown while fetching

**API:** `GET /api/v1/dashboard`

**Response fields used:**

```
data.org_summary.total_projects
data.org_summary.total_active_locations
data.org_summary.total_unique_beneficiaries
data.org_summary.overall_target
data.org_summary.target_breakdown.girls
data.org_summary.target_breakdown.boys
data.org_summary.target_breakdown.girls_with_disability
data.org_summary.target_breakdown.boys_with_disability
```

---

### US-1.3: Beneficiary Reach Summary

**As an** org admin,
**I want** to see a beneficiary reach breakdown with progress bars for total, girls, boys, and disability,
**So that** I can track progress against targets.

**Acceptance Criteria:**

- Displays 4 progress metrics from `summary-stats`:
  - Total: actual / target (percentage)
  - Girls/Women: actual / target (percentage)
  - Boys/Men: actual / target (percentage)
  - With Disability: actual / target (percentage)
- Each metric shows a progress bar capped at 100%
- Uses existing progress bar styling

**API:** `GET /api/v1/dashboard/summary-stats`

**Response fields used:**

```
data.beneficiary_reach.total.actual / .target / .percentage
data.beneficiary_reach.girls_women.actual / .target / .percentage
data.beneficiary_reach.boys_men.actual / .target / .percentage
data.beneficiary_reach.with_disability.actual / .target / .percentage
```

---

### US-1.4: Projects Table with Drill-Down

**As an** org admin,
**I want** to see a table of all projects with key metrics,
**So that** I can compare projects and click into one for details.

**Acceptance Criteria:**

- Table columns: Project Name, Type, Partner, Period, Status, Beneficiaries, Target, Progress
- Each row is clickable — navigates to Level 2 (`/dashboard/projects/:id`)
- Active projects sorted first
- `overall_progress` shown as a progress bar (0–100%)
- Breadcrumb updates to show `Organisation` as clickable

**API:** `GET /api/v1/dashboard` → `data.projects[]`

**Response fields used per row:**

```
id, project_name, framework_type, partner_name,
period_start, period_end, is_active,
total_beneficiaries, overall_target, overall_actual, overall_progress
```

---

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

## Sprint 3 — Activity Detail (Level 3)

### US-3.1: Activity Detail Header & Summary

**As an** org admin or facilitator,
**I want** to see the activity name, code, target, and a summary of reach when I drill into an activity,
**So that** I can assess this specific activity's performance.

**Acceptance Criteria:**

- Displays activity info: name, code, target count, target unit
- Summary cards: Unique Children, Target, Progress %, Girls, Boys, With Disability, New This Period
- Breadcrumb: `Organisation > Project > {activity_name}`
- Progress percentage capped at 100%

**API:** `GET /api/v1/dashboard/activities/:frameworkActivityId`

**Response fields used:**

```
data.activity.name / .code / .target_count / .target_unit
data.summary.unique_children / .target / .percentage
data.summary.girls / .boys / .with_disability / .new_this_period
```

---

### US-3.2: Attendance Stats

**As an** org admin,
**I want** to see overall attendance statistics for this activity,
**So that** I know how sessions are performing.

**Acceptance Criteria:**

- Displays: Total Sessions, Total Present, Total Absent, Attendance Rate
- Attendance rate shown as percentage

**Response fields used:**

```
data.attendance.total_sessions
data.attendance.total_present
data.attendance.total_absent
data.attendance.attendance_rate
```

---

### US-3.3: Daily Attendance Trend Chart

**As an** org admin,
**I want** to see a line or bar chart showing daily attendance trends,
**So that** I can spot patterns or issues.

**Acceptance Criteria:**

- Chart shows last 30 days of data
- X-axis: date, Y-axis: count
- Two series: Present (green), Absent (red)
- Tooltip on hover shows exact numbers
- Responsive on mobile

**Response fields used:**

```
data.daily_trend[].date
data.daily_trend[].present
data.daily_trend[].absent
```

**Recommended:** Use Chart.js or ApexCharts (lightweight, Vue-compatible).

---

### US-3.4: Location Breakdown Table

**As an** org admin,
**I want** to see a per-location breakdown of beneficiaries and sessions,
**So that** I can compare performance across CFS locations.

**Acceptance Criteria:**

- Table columns: Location, Unique, Girls, Boys, Disability, Sessions Held, Avg Daily Present
- Sortable by any column
- No drill-down from here (locations are the leaf level)

**Response fields used:**

```
data.by_location[].location_name
data.by_location[].unique
data.by_location[].girls / .boys / .disability
data.by_location[].sessions_held
data.by_location[].avg_daily_present
```

---

### US-3.5: Recent Sessions List

**As an** org admin,
**I want** to see the 10 most recent sessions for this activity,
**So that** I can review current activity.

**Acceptance Criteria:**

- List/table: Date, Location, Present, Absent, Total
- Sorted by date descending (most recent first)
- No pagination needed (max 10 items)

**Response fields used:**

```
data.recent_sessions[].date
data.recent_sessions[].location_name
data.recent_sessions[].present / .absent / .total
```

---

## Sprint Summary

| Sprint       | Stories                                | Focus                                                     |
| ------------ | -------------------------------------- | --------------------------------------------------------- |
| **Sprint 1** | US-1.1, US-1.2, US-1.3, US-1.4         | Dashboard shell, breadcrumbs, org overview, project table |
| **Sprint 2** | US-2.1, US-2.2, US-2.3, US-2.4         | Project detail drill-down, activities table, set targets  |
| **Sprint 3** | US-3.1, US-3.2, US-3.3, US-3.4, US-3.5 | Activity detail drill-down, charts, location breakdown    |

## Vue Router Structure

```
/dashboard                                    → DashboardOrgOverview.vue    (Level 1)
/dashboard/projects/:frameworkId              → DashboardProjectDetail.vue  (Level 2)
/dashboard/activities/:frameworkActivityId    → DashboardActivityDetail.vue (Level 3)
```

## Breadcrumb Behaviour

| Route                       | Breadcrumb                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `/dashboard`                | **Organisation**                                                                          |
| `/dashboard/projects/:id`   | [Organisation](/dashboard) **> Project Name**                                             |
| `/dashboard/activities/:id` | [Organisation](/dashboard) > [Project Name](/dashboard/projects/:pid) **> Activity Name** |

## Composables Needed

| Composable                       | Purpose                                        |
| -------------------------------- | ---------------------------------------------- |
| `useDashboard()`                 | Fetches org dashboard + summary stats          |
| `useProjectDetail(frameworkId)`  | Fetches project detail                         |
| `useActivityDetail(activityId)`  | Fetches activity detail                        |
| `useBreadcrumb()`                | Manages breadcrumb state from route + API data |
| `useProjectTargets(frameworkId)` | Handles PUT target form state + validation     |
