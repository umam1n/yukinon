import type { Session } from 'electron'
import { ElectronBlocker } from '@cliqz/adblocker-electron'
import fetch from 'cross-fetch'

export async function setupAdblocker(targetSession: Session): Promise<void> {
  try {
    // Use the comprehensive pre-bundled ads & tracking list. 
    // This blocks a significantly larger range of telemetry and ad delivery domains.
    const blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch)
    
    blocker.enableBlockingInSession(targetSession)
    console.log('[Yukinon] Ad blocker (Ads + Tracking) active for YTM session')
  } catch (err) {
    console.error('[Yukinon] Failed to initialize adblocker:', err)
  }
}
