/**
 * Children's data in the web browser (South Sudan Information Sharing
 * Protocol: store personal data securely).
 *
 * The website works online. Offline work happens on the CFS tablet, whose
 * database is encrypted. So the browser keeps no copy of children's names:
 * nothing is downloaded for offline use, and whatever an older version left
 * behind is removed at sign-out.
 */
import Dexie from 'dexie'
import { db } from '../services/offlineDb'
import { PSS_DB_NAME } from '../services/pss/db'

/** Browser databases that may hold children's records. */
const LOCAL_DATABASES = ['dart-offline', PSS_DB_NAME]

/**
 * Remove every local copy of children's data: both browser databases and any
 * API responses an older version cached. Runs at sign-out. Never throws.
 */
export async function clearLocalChildData(): Promise<void> {
  try { db.close() } catch { /* not open */ }
  await Promise.all(LOCAL_DATABASES.map(name => Dexie.delete(name).catch(() => undefined)))
  try {
    if (typeof caches !== 'undefined') {
      const names = await caches.keys()
      await Promise.all(names.filter(n => n.startsWith('api-')).map(n => caches.delete(n)))
    }
  } catch { /* Cache Storage unavailable */ }
}

/**
 * Blank the personal details of children already uploaded. The records stay
 * (they link to the server ID for anything still waiting to upload) but hold
 * no name, guardian or notes. Never throws.
 */
export async function redactUploadedChildren(): Promise<void> {
  try {
    await db.beneficiaries.where('syncStatus').equals('synced').modify(b => {
      b.personalName = ''
      b.fatherName = ''
      b.grandfatherName = ''
      b.familyName = ''
      b.guardianName = ''
      b.guardianPhone = ''
      b.knownMedicalIssues = ''
      b.knownLearningDifficulties = ''
      b.additionalNotes = ''
      b.primeroCaseId = ''
      b.mailingAddress = ''
      b.adultsAtHome = ''
    })
  } catch { /* database unavailable */ }
  try {
    if (typeof caches !== 'undefined') {
      const names = await caches.keys()
      await Promise.all(names.filter(n => n.startsWith('api-')).map(n => caches.delete(n)))
    }
  } catch { /* Cache Storage unavailable */ }
}
