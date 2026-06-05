import { ipcRenderer } from 'electron'

// Preload script for the YouTube Music BrowserView
// Runs in YTM's context with isolated world.

let lockedVolume = 0.8
let lastState = {}

// NOTE: playbackLock is now stored as window.__yukinonLocalLock,
// set directly by executeJavaScript from the main process for zero latency.

function sendStateUpdate() {
  const title = document.querySelector('.title.ytmusic-player-bar')?.textContent?.trim() || ''
  const artist = document.querySelector('.byline.ytmusic-player-bar')?.textContent?.trim() || ''
  const artwork = document.querySelector('.image.ytmusic-player-bar, #thumbnail img, .thumbnail img')?.getAttribute('src') || ''
  
  // YouTube Music uses .html5-main-video for the active player. Grabbing just 'video' might grab hidden ad videos.
  const video = document.querySelector('video.html5-main-video') || document.querySelector('video')
  
  const duration = video?.duration || 0
  const position = video?.currentTime || 0
  const isPlaying = video ? !video.paused && !video.muted : false

  const state = { title, artist, artwork, duration, position, isPlaying }
  
  // Only send if it actually changed meaningfully (prevent spamming IPC)
  if (JSON.stringify(state) !== JSON.stringify(lastState)) {
    lastState = state
    console.log('[Yukinon YTM] Sending state update:', state)
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
    console.log('[Yukinon YTM] Ad-skip clicked')
    return
  }

  // For unskippable in-stream video ads: detect by class on html or body, then fast-forward
  // Many ad elements exist in the DOM permanently but are hidden, so we must check for visibility or specific active classes.
  const adOverlay = document.querySelector('.ytp-ad-player-overlay') as HTMLElement
  const adModule = document.querySelector('.ytp-ad-module') as HTMLElement
  const isVideoAd = !!(
    document.querySelector('.html5-video-player.ad-showing') ||
    document.querySelector('ytmusic-player-bar[is-ad_]') ||
    (adOverlay && adOverlay.offsetParent !== null) ||
    (adModule && adModule.offsetParent !== null && adModule.children.length > 0)
  )

  const video = document.querySelector('video.html5-main-video') || document.querySelector('video')
  if (isVideoAd && video && isFinite(video.duration) && video.duration > 0 && video.currentTime < video.duration) {
    video.muted = true
    video.playbackRate = 16.0
    video.currentTime = video.duration
    console.log('[Yukinon YTM] Fast-forwarded unskippable ad')
  }
}

const adObserver = new MutationObserver(skipAds)
setInterval(skipAds, 500) // Fallback polling every 500ms just in case observer misses it

// 2. Video Element Event Listeners — attach when the video element is created
function attachVideoListeners() {
  const videos = document.querySelectorAll('video')
  videos.forEach((video) => {
    if (!video || video.hasAttribute('data-yukinon-attached')) return
    video.setAttribute('data-yukinon-attached', 'true')

    video.addEventListener('timeupdate', () => {
      // Enforce Volume Lock
      if (Math.abs(video.volume - lockedVolume) > 0.05) {
        video.volume = lockedVolume
      }
      // Only send state update if this video is actually playing the main content
      if (video.duration > 0) {
        sendStateUpdate()
      }
    })

    video.addEventListener('play', () => {
      sendStateUpdate()
    })

    video.addEventListener('pause', sendStateUpdate)
    video.addEventListener('loadeddata', sendStateUpdate)
  })
}

// 3. Boot: start the observer and attach listeners once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  // Observe the FULL body — YTM doesn't have #movie_player, only ytmusic-player.
  // MutationObserver is efficient and only fires when DOM actually changes.
  adObserver.observe(document.body, { childList: true, subtree: true })
  console.log('[Yukinon YTM] Ad-skip observer attached to body')

  setInterval(() => {
    // Re-attach to video if YTM creates a new one (track change)
    const video = document.querySelector('video.html5-main-video') || document.querySelector('video')
    if (video && !video.hasAttribute('data-yukinon-attached')) {
      attachVideoListeners()
    }
  }, 1000)
  attachVideoListeners()

  // Watch title for track changes
  const checkTitle = () => {
    const titleNode = document.querySelector('.title.ytmusic-player-bar')
    if (titleNode && !titleNode.hasAttribute('data-yukinon-title')) {
      titleNode.setAttribute('data-yukinon-title', 'true')
      new MutationObserver(sendStateUpdate).observe(titleNode, { childList: true, characterData: true, subtree: true })
    }
  }
  setInterval(checkTitle, 2000)
  checkTitle()
})

// 4. IPC: Volume control from main process
ipcRenderer.on('ytm:set-volume', (_, vol: number) => {
  lockedVolume = vol
  const video = document.querySelector('video.html5-main-video') || document.querySelector('video')
  if (video) video.volume = vol
})
