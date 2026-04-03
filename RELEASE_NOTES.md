# DART Frontend — Release Notes

## v1.0.0 — Initial Release

**Release Date:** 3 April 2026  
**Platform:** DART — Donor Automated Report Technology  
**Organisation:** SSWOCO  
**Stack:** Nuxt 4 (Vue 3) · Pinia · Dexie.js (IndexedDB) · Vite PWA · Docker

---

### The Problem We Solve

Humanitarian organisations operating Child Friendly Spaces (CFS) in South Sudan and similar contexts face critical challenges:

- **No internet connectivity** — Field staff in remote locations cannot rely on stable internet to register beneficiaries or record attendance.
- **Manual, paper-based tracking** — Beneficiary registration, attendance, and donor reporting are done on paper, leading to data loss, duplication, and delays.
- **No real-time visibility** — Programme administrators have no way to monitor reach, attendance rates, or grant target progress without waiting for manual reports.
- **Donor reporting burden** — Compiling disaggregated data (by gender, disability, location) for donor reports is time-consuming and error-prone.
- **Staff coordination gaps** — Assigning facilitators to locations, tracking who is responsible for what, and managing distributed teams lacks a central system.

DART solves these problems with an **offline-first Progressive Web App** that works without internet, syncs when connectivity is available, and gives administrators real-time dashboards and one-click donor report exports.

---

### What's Included

#### Offline-First Architecture
- **Works without internet** — All core operations (beneficiary registration, attendance tracking) save to the device's IndexedDB immediately.
- **Ordered sync queue** — When connectivity returns, data syncs to the server in dependency order (Beneficiaries → Registrations → Sessions → Attendance Records) with automatic ID remapping.
- **Conflict detection** — Server-side conflicts (409 responses) are flagged for manual resolution rather than silently overwriting data.
- **Sync status tracking** — Visual sync button shows pending count, sync progress, and a detailed per-record sync log.
- **PWA installable** — Install on any device as a standalone app with precached assets and runtime API caching (NetworkFirst strategy).

#### Authentication & Role-Based Access Control
- **JWT-based authentication** with client-side token expiry checks and silent refresh via httpOnly cookies.
- **Three roles:** Organisation Admin, Facilitator, Case Worker — each with tailored navigation, dashboards, and permissions.
- **Route-level protection** — Auth middleware and role guards enforce access per page.
- **Session persistence** — Token survives page refreshes and works offline without requiring re-authentication.

#### Progressive Onboarding (Admin)
- **4-step guided wizard** embedded as a dashboard banner for new organisations:
  1. **Organisation Profile** — Set description and operating locations.
  2. **Donor Selection** — Browse and select active donors.
  3. **Activity Confirmation** — Toggle which programme activities to enable.
  4. **Team Member Creation** — Add the first staff account.
- Progress bar with step-by-step completion tracking; banner auto-dismisses when all steps are done.

#### Beneficiary Registration (Staff)
- **4-step progressive form** with per-step validation:
  1. **Identity** — Personal name, father's name, grandfather's name, family/clan name.
  2. **Demographics** — Age, sex, primary language.
  3. **Vulnerability Assessment** — Disability type (Physical, Visual, Hearing, Intellectual, Multiple, Other), medical issues, learning difficulties.
  4. **Guardian & System** — Guardian name and phone, optional Primero/CPIMS+ Case ID for child protection system integration.
- Generates a client-side UUID for immediate offline storage; syncs server ID when online.
- Success screen with reference ID and "Register Another" quick action.

#### Attendance Tracking (Staff)
- **3-step flow:** select session date and type → tap-to-toggle each child present/absent → view summary.
- **Session types:** TeamUp, General Group Activity, Children Sessions.
- Real-time present/absent counters during marking.
- Offline-first: saves session and all attendance records to IndexedDB immediately.
- Beneficiary list seeded from server when online, available from cache when offline.

#### Admin Dashboard
- **Dual-mode dashboard** rendering different views based on role:
  - **Admin view:** stat cards (Children Reached, Sessions Delivered, Attendance Records, Children with Disability), demographics breakdown, per-location child counts with assigned facilitators, grant target progress bars, tabbed beneficiaries list with filters.
  - **Staff view:** location-scoped stats (Children Reached, Presence Rate, Sessions Logged, Special Needs), registered beneficiaries table, recent activity log, gender balance visualisation.
- **Grant Target Progress** — Visual progress bars tracking actual vs. target for total children, girls, children with disability, and sessions delivered.

#### CFS Configuration (Admin)
- **3-step configuration wizard:**
  1. **Staff Assignment** — Assign facilitators and case workers to CFS locations.
  2. **Grant Targets** — Set reporting period dates and target numbers for total children, girls, children with disability, and sessions.
  3. **Session Types** — Enable/disable session formats per location.

#### Staff Management (Admin)
- Create staff accounts with name, email, temporary password, and role (Facilitator or Case Worker).
- Staff list with role badges, assignment status, and location.
- Assign and unassign staff to CFS locations with confirmation dialogs.

#### Data Export & Reports
- **One-click Excel export** of all beneficiary data via `GET /api/v1/cfs/beneficiaries/export`.
- Disaggregated by demographics, disability status, CFS location, and registration date.
- Reports page with role-aware access (admin: export available; staff: coming soon placeholder).

#### Theming
- **Dark and light themes** with 60+ CSS custom properties (colours, gradients, backgrounds, borders, shadows, glass effects).
- Respects OS `prefers-color-scheme` on first visit; persists preference to localStorage.
- Smooth 0.25s transitions on theme switch; toggle accessible from the app header.

#### Responsive Layout
- **Sidebar shell** — 220px sidebar collapses to 56px icon rail on desktop; full-width overlay on mobile.
- Role-aware navigation: admins see Configuration + Staff Management; staff see Registration + Attendance.
- CFS location badge for staff users; breadcrumb navigation; user profile chip with avatar initials.

#### Deployment
- **Multi-stage Docker build** (Node 20 Alpine) with build-time `API_BASE_URL` configuration.
- Docker Compose single-service setup on port 3000 with auto-restart.
- SPA mode (`ssr: false`) optimised for offline/PWA delivery.
- API proxy: `/api/**` routes through Nuxt to backend EC2 instance.

---

### Impact

| Metric | Before DART | With DART v1.0.0 |
|--------|-------------|-------------------|
| **Data entry** | Paper forms, manual transcription | Digital, instant, offline-capable |
| **Attendance tracking** | Paper registers, weekly summaries | Tap-to-mark, real-time sync |
| **Donor reporting** | Days of manual compilation | One-click Excel export |
| **Field connectivity** | System unusable without internet | Full offline operation with sync |
| **Programme visibility** | Delayed, incomplete reports | Real-time dashboards with progress tracking |
| **Staff coordination** | Phone calls and spreadsheets | Central assignment and role management |
| **Data integrity** | Lost forms, duplicate entries | UUID-based deduplication, conflict detection |
| **Beneficiary privacy** | Paper files, physical security risks | Encrypted device storage, JWT-protected API |

---

### Technical Summary

| Capability | Implementation |
|---|---|
| Offline-First | IndexedDB (Dexie.js) + client UUIDs + ordered sync queue |
| PWA | Workbox precaching + NetworkFirst runtime caching + web manifest |
| RBAC | Route middleware + role-aware UI rendering (3 roles) |
| Theming | Dark/light CSS variables + OS preference detection + localStorage |
| Responsive | Mobile sidebar overlay + responsive grids + touch-friendly attendance |
| Data Export | Server-side Excel generation + client-side blob download |
| Session Management | JWT with client-side expiry + silent refresh via httpOnly cookie |
| Primero Integration | Optional CPIMS+ case ID linkage on beneficiary registration |
| Deployment | Multi-stage Docker + Nuxt SPA + API proxy to EC2 |

---

### API Endpoints (15 CFS + 7 Onboarding + Auth)

**Authentication:** Register, Login, Token Refresh  
**Onboarding:** Status, Org Profile Update, Donor List/Selection, Activities List/Toggle, Team Member Creation  
**CFS Operations:** Staff Assignments (CRUD), Grant Targets, Session Types, Beneficiary Registration, CFS Registration, Session Creation, Attendance Recording, Beneficiaries List (paginated + filterable), Dashboard Stats (Admin + Staff), Beneficiary Export (Excel)

---

### Known Limitations

- Reports page is a placeholder for staff users (admin export only in v1.0.0).
- Conflict resolution for sync collisions requires manual intervention.
- No push notifications for sync status yet.
- Single-organisation context per deployment.

---

*Built for SSWOCO — protecting children, empowering communities.*
