import { app, shell, BrowserView, BrowserWindow, ipcMain as IpcMain, session } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { setupAdblocker } from './adblocker'
import { getSetting } from './db'

export let ytmView: BrowserView | null = null

export function getCleanChromeUA(): string {
  const base = session.defaultSession.getUserAgent() || app.userAgentFallback || 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
  return base.replace(/Electron\/[0-9\.]+\s?/, '').replace(/Yukinon\/[0-9\.]+\s?/, '').trim()
}

export function getOrCreateYTMView(): BrowserView {
  if (ytmView) return ytmView

  ytmView = new BrowserView({
    webPreferences: {
      partition: 'persist:ytm',
      preload: join(__dirname, '../preload/ytm.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: [],
      backgroundThrottling: true
    }
  })

  ytmView.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[YTM Preload/Console] ${message} (line ${line} in ${sourceId})`)
  })

  const cleanUA = getCleanChromeUA()
  ytmView.webContents.setUserAgent(cleanUA)

  ytmView.webContents.loadURL('https://music.youtube.com')

  const ytmSession = session.fromPartition('persist:ytm')

  // Bulletproof headers and client hints for Google Sign In & YouTube
  ytmSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = cleanUA
    if (details.url.includes('google.com') || details.url.includes('youtube.com')) {
      details.requestHeaders['sec-ch-ua'] = '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"'
      details.requestHeaders['sec-ch-ua-mobile'] = '?0'
      details.requestHeaders['sec-ch-ua-platform'] = process.platform === 'win32' ? '"Windows"' : process.platform === 'darwin' ? '"macOS"' : '"Linux"'
    }
    callback({ cancel: false, requestHeaders: details.requestHeaders })
  })

  ytmView.webContents.setWindowOpenHandler((details) => {
    if (details.url.includes('accounts.google.com') || details.url.includes('google.com') || details.url.includes('youtube.com')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 520,
          height: 720,
          autoHideMenuBar: true,
          webPreferences: {
            partition: 'persist:ytm',
            contextIsolation: true,
            nodeIntegration: false
          }
        }
      }
    }
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Setup ad blocker for this session
  setupAdblocker(ytmSession).catch((err) => {
    console.error('[Yukinon] Ad blocker failed:', err)
  })

  // Forward YTM-originated events to main window
  ytmView.webContents.on('did-navigate', (_, url) => {
    console.log('[YTM] Navigated to:', url)
  })

  ytmView.webContents.on('did-finish-load', () => {
    const currentUrl = ytmView?.webContents.getURL() || ''
    if (currentUrl.includes('youtube.com') && !currentUrl.includes('accounts.google.com')) {
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
    }
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
    const sidebarWidth = w < 720 ? (w < 500 ? 0 : 52) : 72
    view.setBounds({
      x: sidebarWidth,
      y: 0,
      width: Math.max(0, w - sidebarWidth),
      height: Math.max(0, h - 110)
    })
    mainWindow.setTopBrowserView(view)
  })

  // Hide YTM panel
  ipc.handle('ytm:hide', () => {
    if (ytmView && mainWindow.getBrowserViews().includes(ytmView)) {
      mainWindow.removeBrowserView(ytmView)
    }
  })

  // Go Back
  ipc.handle('ytm:goBack', () => {
    if (ytmView && ytmView.webContents.canGoBack()) {
      ytmView.webContents.goBack()
    }
  })

  // Execute JS in YTM context (play/pause/skip)
  ipc.handle('ytm:playPause', async () => {
    if (!ytmView) return
    await ytmView.webContents.executeJavaScript(`
      (function() {
        const btn = document.querySelector('.play-pause-button, tp-yt-paper-icon-button#play-pause-button');
        if (btn) btn.click();
      })()
    `).catch(() => {})
  })

  ipc.handle('ytm:next', async () => {
    if (!ytmView) return
    await ytmView.webContents.executeJavaScript(`
      (function() {
        const btn = document.querySelector('.next-button, tp-yt-paper-icon-button.next-button');
        if (btn) btn.click();
      })()
    `).catch(() => {})
  })

  ipc.handle('ytm:prev', async () => {
    if (!ytmView) return
    await ytmView.webContents.executeJavaScript(`
      (function() {
        const btn = document.querySelector('.previous-button, tp-yt-paper-icon-button.previous-button');
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

  // Dedicated Google Login Window for YTM
  ipc.handle('ytm:openLogin', async () => {
    const loginWin = new BrowserWindow({
      width: 520,
      height: 720,
      parent: mainWindow,
      modal: true,
      title: 'Sign In to YouTube Music',
      autoHideMenuBar: true,
      webPreferences: {
        partition: 'persist:ytm',
        contextIsolation: true,
        nodeIntegration: false
      }
    })
    const cleanUA = getCleanChromeUA()
    loginWin.webContents.setUserAgent(cleanUA)
    loginWin.webContents.on('did-navigate', (_, url) => {
      if (url.startsWith('https://music.youtube.com') && !url.includes('accounts.google.com') && !url.includes('signin')) {
        loginWin.close()
        if (ytmView) ytmView.webContents.loadURL('https://music.youtube.com')
      }
    })
    await loginWin.loadURL('https://accounts.google.com/ServiceLogin?ltmpl=music&service=youtube&uilel=3&passive=true&continue=https%3A%2F%2Fmusic.youtube.com%2F')
  })

  // Clear Session & Cache
  ipc.handle('ytm:clearSession', async () => {
    const ses = session.fromPartition('persist:ytm')
    await ses.clearStorageData()
    if (ytmView) ytmView.webContents.loadURL('https://music.youtube.com')
  })

  // Dev tools for YTM debugging
  if (is.dev) {
    ipc.handle('ytm:devtools', () => {
      if (ytmView) ytmView.webContents.openDevTools()
    })
  }
}
