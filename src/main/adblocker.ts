import type { Session } from 'electron'
import { ElectronBlocker } from '@cliqz/adblocker-electron'
import fetch from 'cross-fetch'

export async function setupAdblocker(targetSession: Session): Promise<void> {
  try {
    // Use the pre-bundled ad-blocking list. This prevents ETIMEDOUT errors
    // and doesn't load the tracking list, keeping Google SSO working perfectly!
    const blocker = await ElectronBlocker.fromPrebuiltAdsOnly(fetch)
    
    blocker.enableBlockingInSession(targetSession)
    console.log('[Aura] Brave-style Ad blocker (EasyList) active for YTM session')
  } catch (err) {
    console.error('[Aura] Failed to initialize adblocker:', err)
  }
}
