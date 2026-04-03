<template>
  <!--
    reports.vue
    ─────────────────────────────────────────────────────────────────────────────
    Admin-only reports page.
    Currently provides a beneficiaries data export (Excel download).
  -->
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="reports-page">

      <!-- ── Page Header ────────────────────────────────────────────────────── -->
      <div class="page-greeting">
        <div class="greeting-body">
          <h1 class="greeting-title">Reports</h1>
          <p class="greeting-sub">Download and export program data.</p>
        </div>
        <div class="greeting-accent" aria-hidden="true"></div>
      </div>

      <!-- ── Downloads Section (Admin only) ─────────────────────────────────── -->
      <div v-if="isAdmin" class="reports-section">
        <h3 class="section-title">Data Exports</h3>

        <div class="reports-grid">

          <!-- Beneficiaries Export Card -->
          <div class="report-card">
            <div class="report-icon">
              <AppIcon name="file-spreadsheet" :size="24" />
            </div>
            <div class="report-content">
              <h4 class="report-title">Download Beneficiaries Data</h4>
              <p class="report-description">
                Export the full beneficiaries database as an Excel spreadsheet.
                Includes demographics, registration details, and CFS location data.
              </p>
            </div>
            <button
              class="btn-download"
              :disabled="isDownloading"
              @click="handleExport"
            >
              <AppIcon v-if="!isDownloading" name="download" :size="16" />
              <span v-if="isDownloading" class="spinner" aria-hidden="true"></span>
              {{ isDownloading ? 'Downloading…' : 'Download Excel' }}
            </button>
          </div>

        </div>

        <!-- Error feedback -->
        <div v-if="errorMessage" class="report-error">
          <AppIcon name="alert-circle" :size="16" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Success feedback -->
        <div v-if="successMessage" class="report-success">
          <AppIcon name="check-circle" :size="16" />
          <span>{{ successMessage }}</span>
        </div>

      </div>

      <!-- ── Coming Soon (non-admin) ─────────────────────────────────────────── -->
      <div v-if="!isAdmin" class="reports-coming-soon">
        <AppIcon name="file-text" :size="40" />
        <h3>Reports Coming Soon</h3>
        <p>Detailed activity reports and data exports will be available here shortly.</p>
      </div>

    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { cfsApi } from '../services/cfsApi';
import AppIcon from '../components/interfaces/AppIcon.vue';
import type { Breadcrumb } from '../interfaces/dashboard';

// ── Page metadata ──────────────────────────────────────────────────────────────
definePageMeta({
  middleware: ['auth'],
  layout: false,
});

useHead({ title: 'Reports — DART' });

// ── Breadcrumbs ────────────────────────────────────────────────────────────────
const breadcrumbs: Breadcrumb[] = [
  { title: 'Home',    href: '/' },
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Reports', href: '/reports', current: true },
];

// ── Auth ────────────────────────────────────────────────────────────────────────
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.userRole === 'org_admin');

// ── State ───────────────────────────────────────────────────────────────────────
const isDownloading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

// ── Export handler ──────────────────────────────────────────────────────────────
async function handleExport() {
  isDownloading.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    await cfsApi.exportBeneficiaries(authStore.accessToken || undefined);
    successMessage.value = 'Beneficiaries data downloaded successfully.';
  } catch (e: any) {
    errorMessage.value = e?.message || 'Failed to download beneficiaries data.';
  } finally {
    isDownloading.value = false;
  }
}
</script>

<style scoped>
.reports-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 900px;
  margin: 0 auto;
  animation: fadeIn 0.35s ease-out;
}

/* ── Page Header ──────────────────────────────────────────────────────────── */
.page-greeting {
  position: relative;
  padding: 2rem 2rem 1.75rem;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.greeting-body { position: relative; z-index: 1; }

.greeting-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.greeting-sub {
  margin: 0.35rem 0 0;
  font-size: 0.88rem;
  color: var(--text-secondary);
}

.greeting-accent {
  position: absolute;
  top: -40%;
  right: -6%;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: var(--accent-gradient, linear-gradient(135deg, rgba(99,102,241,.15), rgba(168,85,247,.10)));
  filter: blur(50px);
  pointer-events: none;
}

/* ── Section ──────────────────────────────────────────────────────────────── */
.reports-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

/* ── Reports Grid ─────────────────────────────────────────────────────────── */
.reports-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.report-card {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.5rem;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.report-card:hover {
  border-color: var(--border-color);
  box-shadow: var(--shadow-card);
}

.report-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: rgba(99, 102, 241, 0.10);
  color: #818cf8;
  flex-shrink: 0;
}

.report-content {
  flex: 1;
  min-width: 0;
}

.report-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.report-description {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0.3rem 0 0;
  line-height: 1.45;
}

/* ── Download Button ──────────────────────────────────────────────────────── */
.btn-download {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.25rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary, #6366f1);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.2s ease, opacity 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-download:hover:not(:disabled) {
  background: var(--color-primary-hover, #4f46e5);
}

.btn-download:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ── Spinner ──────────────────────────────────────────────────────────────── */
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Feedback Messages ────────────────────────────────────────────────────── */
.report-error,
.report-success {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  font-size: 0.84rem;
}

.report-error {
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.15);
}

.report-success {
  background: rgba(34, 197, 94, 0.08);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.15);
}

/* ── Responsive ───────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .report-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .btn-download {
    width: 100%;
    justify-content: center;
  }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Coming Soon (non-admin) ──────────────────────────────────────────────── */
.reports-coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 4rem 2rem;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  text-align: center;
  color: var(--text-secondary);
}

.reports-coming-soon h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.reports-coming-soon p {
  font-size: 0.88rem;
  margin: 0;
  max-width: 360px;
  line-height: 1.5;
}
</style>
