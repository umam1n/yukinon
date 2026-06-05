import { ipcRenderer } from 'electron'

// Preload script for the YouTube Music BrowserView
// Runs in YTM's context with isolated world.

let lockedVolume = 0.8
let lastState = {}

// NOTE: playbackLock is now stored as window.__auraLocalLock,
// set directly by executeJavaScript from the main process for zero latency.

function sendStateUpdate() {
  const title = document.querySelector('.title.ytmusic-player-bar')?.textContent?.trim() || ''
  const artist = document.querySelector('.byline.ytmusic-player-bar')?.textContent?.trim() || ''
  const artwork = document.querySelector('#thumbnail img, .thumbnail img')?.getAttribute('src') || ''
  const video = document.querySelector('video')
  
  const duration = video?.duration || 0
  const position = video?.currentTime || 0
  const isPlaying = video ? !video.paused && !video.muted : false

  const state = { title, artist, artwork, duration, position, isPlaying }
  
  // Only send if it actually changed meaningfully (prevent spamming IPC)
  if (JSON.stringify(state) !== JSON.stringify(lastState)) {
    lastState = state
    ipcRenderer.send('ytm:state-changed', state)
  }
}

// 1. Instant Ad Skipper — observes the whole body so it catches all dynamic elements
// 1. Instant Ad Skipper — observes and polls to catch all dynamic elements
function skipAds() {
  // Skip button variants
  const skipButton = document.querySelector(
    '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, [id*="skip"], [class*="skip-button"]'
  ) as HTMLElement
  if (skipButton && skipButton.offsetParent !== null) {
    skipButton.click()
    console.log('[Aura YTM] Ad-skip clicked')
    return
  }

  // For unskippable in-stream video ads: detect by class on html or body, then fast-forward
  const isVideoAd = !!(
    document.querySelector('.ad-showing') ||
    document.querySelector('.ytp-ad-player-overlay') ||
    document.querySelector('.ytp-ad-progress') ||
    document.querySelector('.ytp-ad-module') ||
    document.querySelector('.video-ads.ytp-ad-module') ||
    document.querySelector('ytmusic-player-bar[is-ad_]')
  )
  const video = document.querySelector('video')
  if (isVideoAd && video && isFinite(video.duration) && video.duration > 0 && video.currentTime < video.duration) {
    video.muted = true
    video.playbackRate = 16.0
    video.currentTime = video.duration
    console.log('[Aura YTM] Fast-forwarded unskippable ad')
  }
}

const adObserver = new MutationObserver(skipAds)
setInterval(skipAds, 500) // Fallback polling every 500ms just in case observer misses it

// 2. Video Element Event Listeners — attach when the video element is created
function attachVideoListeners() {
  const video = document.querySelector('video')
  if (!video || video.hasAttribute('data-aura-attached')) return
  video.setAttribute('data-aura-attached', 'true')

  video.addEventListener('timeupdate', () => {
    // Enforce Volume Lock
    if (Math.abs(video.volume - lockedVolume) > 0.05) {
      video.volume = lockedVolume
    }
    sendStateUpdate()
  })

  video.addEventListener('play', () => {
    // Check the global lock flag set by the main process via executeJavaScript
    if ((window as any).__auraLocalLock) {
      video.pause()
      video.muted = true
      console.log('[Aura YTM] Blocked YTM playback — local lock active')
      return
    }
    sendStateUpdate()
  })

  video.addEventListener('pause', sendStateUpdate)
  video.addEventListener('loadeddata', () => {
    // Reset data-aura-attached if YTM swapped the video element
    sendStateUpdate()
  })
}

// 3. Boot: start the observer and attach listeners once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  // Observe the FULL body — YTM doesn't have #movie_player, only ytmusic-player.
  // MutationObserver is efficient and only fires when DOM actually changes.
  adObserver.observe(document.body, { childList: true, subtree: true })
  console.log('[Aura YTM] Ad-skip observer attached to body')

  setInterval(() => {
    // Re-attach to video if YTM creates a new one (track change)
    const video = document.querySelector('video')
    if (video && !video.hasAttribute('data-aura-attached')) {
      attachVideoListeners()
    }
  }, 1000)
  attachVideoListeners()

  // Watch title for track changes
  const checkTitle = () => {
    const titleNode = document.querySelector('.title.ytmusic-player-bar')
    if (titleNode && !titleNode.hasAttribute('data-aura-title')) {
      titleNode.setAttribute('data-aura-title', 'true')
      new MutationObserver(sendStateUpdate).observe(titleNode, { childList: true, characterData: true, subtree: true })
    }
  }
  setInterval(checkTitle, 2000)
  checkTitle()
})

// 4. IPC: Volume control from main process
ipcRenderer.on('ytm:set-volume', (_, vol: number) => {
  lockedVolume = vol
  const video = document.querySelector('video')
  if (video) video.volume = vol
})
