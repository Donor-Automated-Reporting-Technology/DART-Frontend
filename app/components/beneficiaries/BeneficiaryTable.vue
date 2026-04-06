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
            <th class="th-left">Status</th>
            <th class="th-left">Location</th>
            <th class="th-left">Disability</th>
            <th class="th-left">Registered</th>
            <th class="th-actions" aria-label="Actions"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="beneficiaries.length === 0">
            <td colspan="9" class="empty-cell">
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
            @mouseenter="hoveredId = b.id"
            @mouseleave="hoveredId = null"
          >
            <!-- Avatar -->
            <td class="cell-avatar">
              <div class="avatar" :style="{ background: avatarColor(b) }">
                {{ avatarInitials(b) }}
              </div>
            </td>

            <!-- Name (left-aligned, bold primary + muted secondary) -->
            <td class="cell-name">
              <span class="name-primary">{{ formatName(b) }}</span>
              <span class="name-secondary">ID: {{ b.id.slice(0, 8) }}</span>
              <span v-if="b.guardian_phone" class="name-tertiary">{{ b.guardian_phone }}</span>
            </td>

            <!-- Age (right-aligned, numeric) -->
            <td class="cell-number">{{ b.age_at_registration }}</td>

            <!-- Gender -->
            <td class="cell-text">{{ formatGender(b.sex) }}</td>

            <!-- Status badge -->
            <td class="cell-status">
              <StatusBadge :status="deriveStatus(b)" />
            </td>

            <!-- Location (left-aligned) -->
            <td class="cell-text cell-location">{{ b.cfs_location?.name ?? '—' }}</td>

            <!-- Disability -->
            <td class="cell-text">
              <span v-if="b.disability_status && b.disability_status !== 'none'" class="disability-tag">
                {{ b.disability_status }}
              </span>
              <span v-else class="text-muted">—</span>
            </td>

            <!-- Registered date -->
            <td class="cell-text cell-date">{{ formatDate(b.registration_date) }}</td>

            <!-- Quick Actions (revealed on hover) -->
            <td class="cell-actions">
              <Transition name="actions-fade">
                <div v-if="hoveredId === b.id" class="quick-actions">
                  <button
                    class="action-btn"
                    title="Edit beneficiary"
                    @click.stop="$emit('edit', b)"
                  >
                    <AppIcon name="pencil" :size="14" />
                  </button>
                  <button
                    class="action-btn"
                    title="Print report"
                    @click.stop="$emit('print', b)"
                  >
                    <AppIcon name="printer" :size="14" />
                  </button>
                </div>
              </Transition>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ═══ Mobile Cards ═══ -->
    <div class="ben-cards">
      <div v-if="beneficiaries.length === 0" class="empty-state empty-state--card">
        <AppIcon name="users" :size="32" class="empty-icon" />
        <p class="empty-title">No beneficiaries found</p>
        <p class="empty-sub">Try adjusting your search or filters</p>
      </div>

      <div v-for="b in beneficiaries" :key="'m'+b.id" class="ben-card">
        <div class="card-header">
          <div class="avatar avatar--card" :style="{ background: avatarColor(b) }">
            {{ avatarInitials(b) }}
          </div>
          <div class="card-name-block">
            <span class="name-primary">{{ formatName(b) }}</span>
            <span class="name-secondary">ID: {{ b.id.slice(0, 8) }}</span>
          </div>
          <StatusBadge :status="deriveStatus(b)" />
        </div>

        <div class="card-details">
          <div class="detail-row">
            <span class="detail-label">Age</span>
            <span class="detail-value detail-value--num">{{ b.age_at_registration }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Gender</span>
            <span class="detail-value">{{ formatGender(b.sex) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Location</span>
            <span class="detail-value">{{ b.cfs_location?.name ?? '—' }}</span>
          </div>
          <div class="detail-row" v-if="b.disability_status && b.disability_status !== 'none'">
            <span class="detail-label">Disability</span>
            <span class="detail-value">
              <span class="disability-tag">{{ b.disability_status }}</span>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Registered</span>
            <span class="detail-value">{{ formatDate(b.registration_date) }}</span>
          </div>
        </div>

        <div class="card-actions">
          <button class="card-action-btn" @click="$emit('edit', b)">
            <AppIcon name="pencil" :size="13" />
            Edit
          </button>
          <button class="card-action-btn" @click="$emit('print', b)">
            <AppIcon name="printer" :size="13" />
            Print
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Beneficiary } from '../../interfaces/beneficiary'
import StatusBadge from './StatusBadge.vue'

defineProps<{
  beneficiaries: Beneficiary[]
}>()

defineEmits<{
  edit: [b: Beneficiary]
  print: [b: Beneficiary]
}>()

const hoveredId = ref<string | null>(null)

function formatName(b: Beneficiary): string {
  return [b.personal_name, b.father_name, b.grandfather_name, b.family_name]
    .filter(Boolean)
    .join(' ')
}

function formatGender(sex: string): string {
  if (sex === 'M') return 'Male'
  if (sex === 'F') return 'Female'
  return sex
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
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

function deriveStatus(b: Beneficiary): string {
  // Use existing status field or derive from data
  if ((b as any).status) return (b as any).status
  if (b.registration_date) return 'verified'
  return 'pending'
}
</script>

<style scoped>
/* ═══ Table Container — 20px rounded corners, Apple polish ═══ */
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

/* ═══ Mobile: show cards, hide table ═══ */
.ben-cards { display: none; }

@media (max-width: 768px) {
  .table-container { display: none; }
  .ben-cards { display: flex; flex-direction: column; gap: 10px; }
}

/* ═══ Header ═══ */
.ben-table thead {
  background: var(--bg-surface);
}

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
.th-actions { width: 80px; }

/* ═══ Rows — zebra striping + hover ═══ */
.ben-row {
  transition: background 0.12s ease;
  position: relative;
}

/* 2% grey tint on even rows */
.ben-row--even {
  background: var(--hover-bg-subtle);
}

/* Hover: highlight row */
.ben-row:hover {
  background: var(--primary-dim);
}

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

/* ═══ Cell: Name — strict hierarchy ═══ */
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

.name-tertiary {
  font-size: 0.7rem;
  color: #AEAEB2;
  line-height: 1.3;
}

/* ═══ Cell: Numbers — right aligned ═══ */
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

.cell-status { white-space: nowrap; }

.text-muted { color: var(--text-muted); }

/* ═══ Disability tag ═══ */
.disability-tag {
  display: inline-block;
  padding: 2px 10px;
  font-size: 0.72rem;
  font-weight: 600;
  background: rgba(255, 149, 0, 0.10);
  color: #b25000;
  border-radius: 6px;
  text-transform: capitalize;
}

[data-theme="dark"] .disability-tag,
:root:not([data-theme="light"]) .disability-tag {
  background: rgba(255, 149, 0, 0.12);
  color: #ff9f0a;
}

/* ═══ Quick Actions — revealed on hover ═══ */
.cell-actions {
  width: 80px;
  text-align: right;
  padding-right: 16px;
}

.quick-actions {
  display: inline-flex;
  gap: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.12s;
  min-width: 44px;
  min-height: 44px;
  margin: -6px 0;
}

.action-btn:hover {
  background: var(--primary-dim);
  border-color: var(--primary);
  color: var(--primary);
}

.actions-fade-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.actions-fade-leave-active { transition: opacity 0.1s ease; }
.actions-fade-enter-from { opacity: 0; transform: translateX(4px); }
.actions-fade-leave-to { opacity: 0; }

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

/* ═══ Mobile Cards ═══ */
.ben-card {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 16px 12px;
}

.card-name-block {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.card-details {
  padding: 0 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-label {
  font-size: 0.74rem;
  color: #86868B;
  font-weight: 500;
}

.detail-value {
  font-size: 0.82rem;
  color: var(--text-primary);
  font-weight: 500;
}

.detail-value--num {
  font-variant-numeric: tabular-nums;
  font-weight: 650;
}

.card-actions {
  display: flex;
  border-top: 1px solid var(--border-subtle);
}

.card-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0;
  min-height: 48px;
  background: none;
  border: none;
  border-right: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  font-family: inherit;
}

.card-action-btn:last-child { border-right: none; }

.card-action-btn:hover {
  background: var(--hover-bg);
  color: var(--primary);
}
</style>
