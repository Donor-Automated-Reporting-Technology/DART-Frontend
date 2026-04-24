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
