import { BrowserView, BrowserWindow, ipcMain as IpcMain, session } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { setupAdblocker } from './adblocker'
import { getSetting } from './db'

export let ytmView: BrowserView | null = null

export function getOrCreateYTMView(): BrowserView {
  if (ytmView) return ytmView

  ytmView = new BrowserView({
    webPreferences: {
      partition: 'persist:ytm',
      preload: join(__dirname, '../preload/ytm.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: []
    }
  })

  ytmView.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[YTM Preload/Console] ${message} (line ${line} in ${sourceId})`)
  })

  ytmView.webContents.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  )

  ytmView.webContents.loadURL('https://music.youtube.com')

  // Setup ad blocker for this session
  setupAdblocker(session.fromPartition('persist:ytm')).catch((err) => {
    console.error('[Yukinon] Ad blocker failed:', err)
  })

  // Forward YTM-originated events to main window
  ytmView.webContents.on('did-navigate', (_, url) => {
    console.log('[YTM] Navigated to:', url)
  })

  ytmView.webContents.on('did-finish-load', () => {
    const accent = (getSetting('accent_color') as string) || '#c084fc'
    const themeMode = (getSetting('theme_mode') as string) || 'dark'
    const isDark = themeMode === 'dark'

    ytmView?.webContents.insertCSS(buildYTMCSS(accent, themeMode))

    // Wait for YTM's own React/Polymer to initialize before setting dark attribute
    setTimeout(() => {
      ytmView?.webContents.executeJavaScript(`
        (function() {
          const html = document.querySelector('html');
          if (html) {
            if (${isDark}) {
              html.setAttribute('dark', '');
            } else {
              html.removeAttribute('dark');
            }
          }
        })()
      `).catch(() => {})
    }, 2500)
  })

  return ytmView
}

function buildYTMCSS(accent: string, themeMode: string): string {
  const isDark = themeMode === 'dark'
  // Force background regardless of html[dark] attribute state
  const bg = isDark ? '#0f0f0f' : '#ffffff'
  const bgCard = isDark ? '#1a1a1a' : '#f0f0f0'
  const textColor = isDark ? '#ffffff' : '#0f0f0f'

  return `
    /* ---- Player bar hidden (we have our own) ---- */
    ytmusic-player-bar,
    #player-bar-background { display: none !important; }
    ytmusic-app-layout { --ytmusic-player-bar-height: 0px !important; }

    /* ---- Force theme colors unconditionally ---- */
    html, body, ytmusic-app,
    ytmusic-app-layout,
    ytmusic-browse-response,
    ytmusic-nav-bar,
    ytmusic-player-page,
    .ytmusic-player-page,
    ytmusic-data-bound-tab-header-renderer,
    #main-panel {
      background: ${bg} !important;
      background-color: ${bg} !important;
      color: ${textColor} !important;
    }
    .ytmusic-app {
      --ytmusic-color-background1: ${bg} !important;
      --ytmusic-color-background2: ${bgCard} !important;
      --ytmusic-color-black1: ${bg} !important;
      --ytmusic-color-black4: ${bgCard} !important;
      --yt-spec-base-background: ${bg} !important;
      --yt-spec-raised-background: ${bgCard} !important;
      --yt-spec-menu-background: ${bgCard} !important;
      --ytmusic-color-white1: ${textColor} !important;
      --ytmusic-color-grey1: ${textColor} !important;
      --ytmusic-text-primary: ${textColor} !important;
    }

    /* ---- Accent color sync ---- */
    html {
      --ytmusic-color-brand: ${accent} !important;
      --ytmusic-color-brand-background-solid: ${accent} !important;
      --ytmusic-color-brand-background-solid-active: ${accent} !important;
      --yt-spec-call-to-action: ${accent} !important;
    }

    /* ---- Ad element hiding (CSS level, before JS even runs) ---- */
    ytmusic-mealbar-promo-renderer,
    ytmusic-statement-banner-renderer,
    ytmusic-item-section-renderer[section-identifier="premium-upsell"],
    .ytmusic-mealbar-promo-renderer,
    [class*="ad-showing"] .ytp-ad-player-overlay,
    .ytp-ad-text-overlay,
    .ytp-ad-image-overlay,
    .video-ads,
    .ytp-ad-module { display: none !important; }
  `
}

export function registerYTMHandlers(
  ipc: typeof IpcMain,
  mainWindow: BrowserWindow
): void {
  // Show YTM panel
  ipc.handle('ytm:show', () => {
    const view = getOrCreateYTMView()
    const [w, h] = mainWindow.getContentSize()
    if (!mainWindow.getBrowserViews().includes(view)) {
      mainWindow.addBrowserView(view)
    }
    view.setBounds({ x: 72, y: 0, width: w - 72, height: h - 110 })
    mainWindow.setTopBrowserView(view)
  })

  // Hide YTM panel
  ipc.handle('ytm:hide', () => {
    if (ytmView && mainWindow.getBrowserViews().includes(ytmView)) {
      mainWindow.removeBrowserView(ytmView)
    }
  })

  // Execute JS in YTM context (play/pause/skip)
  ipc.handle('ytm:playPause', async () => {
    if (!ytmView) return
    await ytmView.webContents.executeJavaScript(`
      (function() {
        const btn = document.querySelector('.play-pause-button, tp-yt-paper-icon-button[aria-label*="Play"], tp-yt-paper-icon-button[aria-label*="Pause"]');
        if (btn) btn.click();
      })()
    `).catch(() => {})
  })

  ipc.handle('ytm:next', async () => {
    if (!ytmView) return
    await ytmView.webContents.executeJavaScript(`
      (function() {
        const btn = document.querySelector('.next-button, [aria-label="Next"]');
        if (btn) btn.click();
      })()
    `).catch(() => {})
  })

  ipc.handle('ytm:prev', async () => {
    if (!ytmView) return
    await ytmView.webContents.executeJavaScript(`
      (function() {
        const btn = document.querySelector('.previous-button, [aria-label="Previous"]');
        if (btn) btn.click();
      })()
    `).catch(() => {})
  })

  ipc.handle('ytm:pause', async () => {
    if (!ytmView) return
    await ytmView.webContents.executeJavaScript(`
      (function() {
        const video = document.querySelector('video.html5-main-video') || document.querySelector('video');
        if (video && !video.paused) {
          video.pause();
        }
        const btn = document.querySelector('.play-pause-button, tp-yt-paper-icon-button#play-pause-button');
        if (btn && btn.getAttribute('aria-label')?.includes('Pause')) {
          btn.click(); // Tell YTM's UI it's paused
        }
      })()
    `).catch(() => {})
  })

  ipc.handle('ytm:setVolume', async (_, volume: number) => {
    if (!ytmView) return
    ytmView.webContents.send('ytm:set-volume', volume)
  })

  ipc.handle('ytm:setLock', async () => {
    // Deprecated: We now use pure event-driven pausing rather than process-level locks
    // to allow users to switch freely between Local and YTM.
  })

  ipc.handle('ytm:shuffle', async () => {
    if (!ytmView) return
    await ytmView.webContents.executeJavaScript(`
      (function() {
        const btn = document.querySelector('ytmusic-player-bar tp-yt-paper-icon-button[aria-label*="Shuffle"], .shuffle-button');
        if (btn) btn.click();
      })()
    `).catch(() => {})
  })

  ipc.handle('ytm:repeat', async () => {
    if (!ytmView) return
    await ytmView.webContents.executeJavaScript(`
      (function() {
        const btn = document.querySelector('ytmusic-player-bar tp-yt-paper-icon-button[aria-label*="Repeat"], .repeat-button');
        if (btn) btn.click();
      })()
    `).catch(() => {})
  })

  ipc.handle('ytm:seek', async (_, position: number) => {
    if (!ytmView) return
    await ytmView.webContents.executeJavaScript(`
      (function() {
        const video = document.querySelector('video.html5-main-video') || document.querySelector('video');
        if (video) video.currentTime = ${position};
      })()
    `).catch(() => {})
  })

  // Listen for real-time state updates from the YTM preload script and forward them to the frontend
  ipc.on('ytm:state-changed', (event, state) => {
    console.log('[Main] Received ytm:state-changed from YTM, forwarding to frontend...', state)
    if (mainWindow) {
      mainWindow.webContents.send('ytm:state-update', state)
    }
  })

  // Theme sync: re-inject CSS when app theme changes
  ipc.handle('ytm:setTheme', async (_, accent: string, themeMode: string) => {
    if (!ytmView) return
    ytmView.webContents.insertCSS(buildYTMCSS(accent, themeMode)).catch(() => {})
    // Also tell YTM's own dark mode toggle to match
    const setDark = themeMode === 'dark'
    await ytmView.webContents.executeJavaScript(`
      (function() {
        const html = document.querySelector('html');
        if (html) {
          if (${setDark}) {
            html.setAttribute('dark', '');
          } else {
            html.removeAttribute('dark');
          }
        }
      })()
    `).catch(() => {})
  })

  // Dev tools for YTM debugging
  if (is.dev) {
    ipc.handle('ytm:devtools', () => {
      if (ytmView) ytmView.webContents.openDevTools()
    })
  }
}
