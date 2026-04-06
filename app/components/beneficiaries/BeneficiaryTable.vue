<template>
  <div class="ben-table-wrap">
    <!-- ═══ Desktop Table ═══ -->
    <div class="table-container">
      <table class="ben-table" role="table">
        <thead>
          <tr>
            <th class="th-avatar" aria-hidden="true"></th>
            <th class="th-left">Name</th>
            <th class="th-right">Age</th>
            <th class="th-left">Gender</th>
            <th class="th-left">Location</th>
            <th class="th-left">Disability</th>
            <th class="th-left">Registered</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="beneficiaries.length === 0">
            <td colspan="7" class="empty-cell">
              <div class="empty-state">
                <AppIcon name="users" :size="32" class="empty-icon" />
                <p class="empty-title">No beneficiaries found</p>
                <p class="empty-sub">Try adjusting your search or filters</p>
              </div>
            </td>
          </tr>
          <tr
            v-for="(b, idx) in beneficiaries"
            :key="b.id"
            class="ben-row"
            :class="{ 'ben-row--even': idx % 2 === 1 }"
          >
            <!-- Avatar -->
            <td class="cell-avatar">
              <div class="avatar" :style="{ background: avatarColor(b) }">
                {{ avatarInitials(b) }}
              </div>
            </td>

            <!-- Name -->
            <td class="cell-name">
              <span class="name-primary">{{ formatName(b) }}</span>
              <span class="name-secondary">{{ b.guardian_name ? `Guardian: ${b.guardian_name}` : `ID: ${b.id.slice(0, 8)}` }}</span>
            </td>

            <!-- Age -->
            <td class="cell-number">{{ b.age_at_registration }}</td>

            <!-- Gender -->
            <td class="cell-text">{{ formatGender(b.sex) }}</td>

            <!-- Location -->
            <td class="cell-text cell-location">{{ b.cfs_location?.name ?? '—' }}</td>

            <!-- Disability -->
            <td class="cell-text cell-disability">
              <span v-if="b.disability_status && b.disability_status !== 'none'" class="disability-tag" :title="b.disability_status">
                {{ b.disability_status }}
              </span>
              <span v-else class="text-muted">—</span>
            </td>

            <!-- Registered date -->
            <td class="cell-text cell-date">{{ formatDate(b.registration_date) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ═══ Mobile Cards (attendance-style) ═══ -->
    <div class="ben-cards">
      <div v-if="beneficiaries.length === 0" class="empty-state empty-state--card">
        <AppIcon name="users" :size="32" class="empty-icon" />
        <p class="empty-title">No beneficiaries found</p>
        <p class="empty-sub">Try adjusting your search or filters</p>
      </div>

      <div v-for="b in beneficiaries" :key="'m'+b.id" class="ben-card">
        <div class="card-content">
          <div class="card-left">
            <div class="avatar avatar--card" :style="{ background: avatarColor(b) }">
              {{ avatarInitials(b) }}
            </div>
          </div>
          <div class="card-primary">
            <span class="card-name">{{ formatName(b) }}</span>
            <div class="card-meta">
              <span class="meta-tag">Age {{ b.age_at_registration }}</span>
              <span class="meta-tag meta-tag--gender">{{ formatGender(b.sex) }}</span>
              <span v-if="b.disability_status && b.disability_status !== 'none'" class="meta-tag meta-tag--disability">{{ b.disability_status }}</span>
            </div>
            <div class="card-sub-row">
              <span v-if="b.cfs_location?.name" class="card-location">{{ b.cfs_location.name }}</span>
              <span v-if="b.guardian_name" class="card-guardian">{{ b.guardian_name }}</span>
            </div>
          </div>
          <div class="card-right">
            <span class="card-date">{{ formatDateShort(b.registration_date) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Beneficiary } from '../../interfaces/beneficiary'

defineProps<{
  beneficiaries: Beneficiary[]
}>()

function formatName(b: Beneficiary): string {
  return [b.personal_name, b.father_name, b.grandfather_name, b.family_name]
    .filter(Boolean)
    .join(' ')
}

function formatGender(sex: string): string {
  if (sex === 'male' || sex === 'M') return 'Male'
  if (sex === 'female' || sex === 'F') return 'Female'
  return sex
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateShort(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function avatarInitials(b: Beneficiary): string {
  const first = b.personal_name?.[0] ?? ''
  const second = b.father_name?.[0] ?? ''
  return (first + second).toUpperCase()
}

const AVATAR_COLORS = [
  'rgba(0,122,255,0.12)', 'rgba(52,199,89,0.12)', 'rgba(255,149,0,0.12)',
  'rgba(175,82,222,0.12)', 'rgba(255,59,48,0.12)', 'rgba(90,200,250,0.12)',
  'rgba(255,204,0,0.12)', 'rgba(88,86,214,0.12)',
]

function avatarColor(b: Beneficiary): string {
  let hash = 0
  const s = b.id || b.personal_name
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
</script>

<style scoped>
/* ═══ Table Container ═══ */
.table-container {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: var(--bg-panel);
  box-shadow: var(--shadow-card);
}

.ben-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.ben-cards { display: none; }

@media (max-width: 768px) {
  .table-container { display: none; }
  .ben-cards { display: flex; flex-direction: column; gap: 8px; }
}

/* ═══ Header ═══ */
.ben-table thead { background: var(--bg-surface); }

.ben-table th {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-color);
  white-space: nowrap;
  user-select: none;
}

.th-left { text-align: left; }
.th-right { text-align: right; }
.th-avatar { width: 52px; }

/* ═══ Rows ═══ */
.ben-row { transition: background 0.12s ease; }
.ben-row--even { background: var(--hover-bg-subtle); }
.ben-row:hover { background: var(--primary-dim); }

.ben-table td {
  padding: 12px 16px;
  font-size: 0.86rem;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-subtle);
  vertical-align: middle;
}

/* ═══ Cell: Avatar ═══ */
.cell-avatar { width: 52px; padding-right: 0; }

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--primary);
  flex-shrink: 0;
  letter-spacing: 0.3px;
}

.avatar--card {
  width: 40px;
  height: 40px;
  font-size: 0.76rem;
}

/* ═══ Cell: Name ═══ */
.cell-name {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 160px;
}

.name-primary {
  font-size: 0.86rem;
  font-weight: 600;
  color: #1D1D1F;
  line-height: 1.35;
}

[data-theme="dark"] .name-primary,
:root:not([data-theme="light"]) .name-primary {
  color: var(--text-primary);
}

.name-secondary {
  font-size: 0.74rem;
  color: #86868B;
  line-height: 1.35;
}

/* ═══ Cell: Numbers ═══ */
.cell-number {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: #1D1D1F;
}

[data-theme="dark"] .cell-number,
:root:not([data-theme="light"]) .cell-number {
  color: var(--text-primary);
}

/* ═══ Cell: Text ═══ */
.cell-text {
  color: var(--text-secondary);
  font-size: 0.86rem;
}

.cell-location {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-date {
  font-size: 0.8rem;
  color: #86868B;
  white-space: nowrap;
}

.text-muted { color: var(--text-muted); }

/* ═══ Disability ═══ */
.cell-disability {
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.disability-tag {
  display: inline-block;
  max-width: 100%;
  padding: 2px 10px;
  font-size: 0.72rem;
  font-weight: 600;
  background: rgba(255, 149, 0, 0.10);
  color: #b25000;
  border-radius: 6px;
  text-transform: capitalize;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

[data-theme="dark"] .disability-tag,
:root:not([data-theme="light"]) .disability-tag {
  background: rgba(255, 149, 0, 0.12);
  color: #ff9f0a;
}

/* ═══ Empty State ═══ */
.empty-cell { border-bottom: none; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 48px 24px;
}

.empty-state--card { padding: 40px 20px; }
.empty-icon { color: var(--text-muted); opacity: 0.4; }

.empty-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.empty-sub {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0;
}

/* ═══ Mobile Cards — attendance-style ═══ */
.ben-card {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.15s;
}

.card-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
}

.card-left { flex-shrink: 0; padding-top: 2px; }

.card-primary {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.meta-tag {
  display: inline-block;
  padding: 2px 8px;
  font-size: 0.7rem;
  font-weight: 600;
  border-radius: 6px;
  background: var(--bg-surface);
  color: var(--text-secondary);
  white-space: nowrap;
}

.meta-tag--gender {
  background: color-mix(in srgb, var(--data-teal) 12%, transparent);
  color: var(--data-teal);
}

.meta-tag--disability {
  background: rgba(255, 149, 0, 0.10);
  color: #b25000;
  text-transform: capitalize;
}

[data-theme="dark"] .meta-tag--disability,
:root:not([data-theme="light"]) .meta-tag--disability {
  background: rgba(255, 149, 0, 0.12);
  color: #ff9f0a;
}

.card-sub-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
}

.card-location,
.card-guardian {
  font-size: 0.72rem;
  color: #86868B;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-location::before {
  content: '📍';
  margin-right: 3px;
}

.card-guardian::before {
  content: '👤';
  margin-right: 3px;
}

.card-right {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.card-date {
  font-size: 0.7rem;
  color: #86868B;
  white-space: nowrap;
}
</style>
