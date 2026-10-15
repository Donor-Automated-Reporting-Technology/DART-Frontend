import { reactive } from 'vue'
import { getActivePinia } from 'pinia'
import { ApiError } from './api'

/**
 * Excel downloads under the data-sharing rules.
 *
 * A named export (a file that lists people) is only produced after the user
 * states the purpose, the recipient and the agreement. The API logs it and
 * returns a password-protected file; the password is shown once on screen.
 * A counts-only export holds no names and downloads directly.
 */
export interface ExportReason {
  purpose: string
  recipient: string
  agreement: string
}

interface NamedExportState {
  request: { url: string; fallbackName: string } | null
  busy: boolean
  error: string
  result: { filename: string; password: string } | null
}

/** Drives <NamedExportDialog>, mounted once in app.vue. */
export const namedExportState = reactive<NamedExportState>({ request: null, busy: false, error: '', result: null })

let settle: (() => void) | null = null

function resolveToken(): string | undefined {
  try {
    const authState = getActivePinia()?.state.value?.['auth'] as { accessToken?: string | null } | undefined
    return authState?.accessToken ?? undefined
  } catch {
    return undefined
  }
}

async function fetchWorkbook(url: string, init: RequestInit, fallbackName: string) {
  const token = resolveToken()
  const response = await fetch(url, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new ApiError(response.status, data?.message ?? 'Download failed', data)
  }
  const blob = await response.blob()
  const filename = response.headers.get('Content-Disposition')?.match(/filename[^;=\n]*=\s*"?([^";\n]+)"?/)?.[1] ?? fallbackName
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(a.href)
  return { filename, password: response.headers.get('X-Export-Password') ?? '' }
}

/**
 * Ask for the reason, then download a named export. Resolves when the dialog
 * closes, whether the file was downloaded or the user cancelled.
 */
export function requestNamedExport(url: string, fallbackName: string): Promise<void> {
  settle?.()
  namedExportState.request = { url, fallbackName }
  namedExportState.busy = false
  namedExportState.error = ''
  namedExportState.result = null
  return new Promise(resolve => { settle = resolve })
}

/** Called by the dialog once the reason is filled in. */
export async function confirmNamedExport(reason: ExportReason): Promise<void> {
  const req = namedExportState.request
  if (!req || namedExportState.busy) return
  namedExportState.busy = true
  namedExportState.error = ''
  try {
    namedExportState.result = await fetchWorkbook(
      req.url,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reason) },
      req.fallbackName,
    )
  } catch (e: any) {
    namedExportState.error = e?.message ?? 'Download failed'
  } finally {
    namedExportState.busy = false
  }
}

/** Close the dialog; the password is not kept anywhere after this. */
export function closeNamedExport(): void {
  namedExportState.request = null
  namedExportState.result = null
  namedExportState.error = ''
  settle?.()
  settle = null
}

/** Download a counts-only export (no names, no password). */
export async function downloadCounts(url: string, fallbackName: string): Promise<void> {
  await fetchWorkbook(url, { method: 'GET' }, fallbackName)
}
