import { app, shell, BrowserWindow, ipcMain, globalShortcut, protocol, net, session } from 'electron'
import { join, extname, sep } from 'path'
import { statSync, createReadStream, existsSync } from 'fs'
import { Readable } from 'stream'
import { fileURLToPath } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerLibraryHandlers } from './ipc/library'
import { registerPlaylistsHandlers } from './ipc/playlists'
import { registerEQHandlers } from './ipc/eq'
import { registerDeviceHandlers } from './ipc/devices'
import { registerThemeHandlers } from './ipc/theme'
import { registerAiHandlers } from './ipc/ai'
import { registerYTMHandlers, layoutYTMView } from './ytm'
import { initDatabase, getDb, getSetting, setSetting, getArtworksDir } from './db'
import { isPathInsideFolders, isUrlAllowed, getConfiguredOrigin } from './lib/protocolGuard'
import { initLibraryWatcher } from './watcher'
import crypto from 'crypto'

const AUDIO_MIME_TYPES: Record<string, string> = {
  '.flac': 'audio/flac',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.opus': 'audio/opus',
  '.aiff': 'audio/aiff',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png'
}

let mainWindow: BrowserWindow
let isMiniPlayer = false
let isQuitting = false
let normalBounds = { x: 0, y: 0, width: 1400, height: 900 }

// Hardware Acceleration is critical for CSS performance (blur, gradients, transform)
// app.disableHardwareAcceleration()

// Optimize GPU rendering and memory
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('ignore-gpu-blocklist') // Force GPU on Linux even if driver is unrecognized
app.commandLine.appendSwitch('log-level', '3') // Suppress internal Chromium/VSync errors/warnings
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled')
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto')
}

const baseUA = app.userAgentFallback || 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
app.userAgentFallback = baseUA.replace(/Electron\/[0-9\.]+\s?/, '').replace(/Yukinon\/[0-9\.]+\s?/, '').trim()

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 360,
    minHeight: 260,
    frame: process.platform === 'darwin' ? false : true,
    ...(process.platform === 'darwin' ? {
      titleBarStyle: 'hidden',
      titleBarOverlay: false
    } : {}),
    backgroundColor: '#0f0f0f',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      // Off so Jellyfin/Subsonic/LRCLIB calls work without server CORS headers;
      // file:// access is restricted separately in restrictFileAccess()
      webSecurity: false
    },
    alwaysOnTop: !!getSetting('always_on_top')
  })

  initLibraryWatcher(mainWindow)

  // On macOS keep the window alive when closed: IPC handlers hold a reference to it,
  // so re-creating it on 'activate' would leave them talking to a destroyed window
  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin' && !isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  mainWindow.on('resize', () => {
    if (isMiniPlayer) return
    layoutYTMView(mainWindow)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Register custom protocol before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'yukinon', privileges: { secure: true, standard: true, supportFetchAPI: true, bypassCSP: true, corsEnabled: true, stream: true } }
])

function isLocalPathAllowed(filePath: string): boolean {
  const known = getDb().prepare('SELECT 1 FROM tracks WHERE path = ?').get(filePath)
  if (known) return true
  return isPathInsideFolders(filePath, [getArtworksDir(), ...((getSetting('music_folders') as string[]) || [])])
}

// webSecurity is off (remote API calls rely on it), which would let the renderer fetch any
// file:// URL. Only the bundled renderer files may be loaded over file://; media and artwork
// go through yukinon://, which has its own path checks.
function restrictFileAccess(): void {
  const rendererDir = join(__dirname, '../renderer') + sep
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['file://*/*'] }, (details, callback) => {
    let allowed = false
    try {
      allowed = fileURLToPath(details.url).startsWith(rendererDir)
    } catch {
      allowed = false
    }
    if (!allowed) console.warn('[Security] Blocked file:// request:', details.url)
    callback({ cancel: !allowed })
  })
}

function isRemoteUrlAllowed(targetUrl: string): boolean {
  return isUrlAllowed(targetUrl, [
    getConfiguredOrigin(getSetting('jellyfin_config')),
    getConfiguredOrigin(getSetting('subsonic_config'))
  ])
}

// Keys the renderer may read/write through the generic settings:* IPC channels
const RENDERER_SETTINGS_KEYS = new Set([
  'active_modules',
  'jellyfin_config',
  'subsonic_config',
  'reduce_blur',
  'render_album_art',
  'replaygain_enabled',
  'replaygain_preamp'
])

type CustomHotkeys = { playPause?: string; nextTrack?: string; prevTrack?: string }

const DEFAULT_HOTKEYS: CustomHotkeys = {
  playPause: 'MediaPlayPause',
  nextTrack: 'MediaNextTrack',
  prevTrack: 'MediaPreviousTrack'
}

function getCustomHotkeys(): CustomHotkeys {
  return (getSetting('custom_hotkeys') as CustomHotkeys | null) || DEFAULT_HOTKEYS
}

function setupGlobalShortcuts(): void {
  globalShortcut.unregisterAll()
  
  // Default to enabled (1) if not explicitly disabled (0)
  const setting = getSetting('global_hotkeys')
  const hotkeysEnabled = setting !== 0
  
  const customHotkeys = getCustomHotkeys()

  try {
    if (customHotkeys.playPause) globalShortcut.register(customHotkeys.playPause, () => mainWindow.webContents.send('media:playPause'))
    if (customHotkeys.nextTrack) globalShortcut.register(customHotkeys.nextTrack, () => mainWindow.webContents.send('media:next'))
    if (customHotkeys.prevTrack) globalShortcut.register(customHotkeys.prevTrack, () => mainWindow.webContents.send('media:prev'))
  } catch (err) {
    console.error('Failed to register global shortcuts:', err)
  }
}

app.whenReady().then(async () => {
  protocol.handle('yukinon', async (request) => {
    try {
      const url = new URL(request.url)
      const filePath = url.searchParams.get('path')
      const targetUrl = url.searchParams.get('url')

      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': '*'
          }
        })
      }

      if (filePath) {
        if (!isLocalPathAllowed(filePath)) {
          return new Response('Forbidden', { status: 403 })
        }
        if (!existsSync(filePath)) {
          return new Response('File not found', { status: 404 })
        }

        const stat = statSync(filePath)
        const fileSize = stat.size
        const ext = extname(filePath).toLowerCase()
        const contentType = AUDIO_MIME_TYPES[ext] || 'application/octet-stream'
        const rangeHeader = request.headers.get('range')

        if (rangeHeader) {
          const parts = rangeHeader.replace(/bytes=/, '').split('-')
          const start = parseInt(parts[0], 10)
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1

          if (isNaN(start) || start >= fileSize || (parts[1] && end < start)) {
            return new Response('Requested Range Not Satisfiable', {
              status: 416,
              headers: {
                'Content-Range': `bytes */${fileSize}`,
                'Access-Control-Allow-Origin': '*'
              }
            })
          }

          const chunkSize = end - start + 1
          const fileStream = createReadStream(filePath, { start, end })
          const webStream = Readable.toWeb(fileStream)

          return new Response(webStream as any, {
            status: 206,
            statusText: 'Partial Content',
            headers: {
              'Content-Range': `bytes ${start}-${end}/${fileSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': String(chunkSize),
              'Content-Type': contentType,
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type'
            }
          })
        } else {
          const fileStream = createReadStream(filePath)
          const webStream = Readable.toWeb(fileStream)
          return new Response(webStream as any, {
            status: 200,
            headers: {
              'Accept-Ranges': 'bytes',
              'Content-Length': String(fileSize),
              'Content-Type': contentType,
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type'
            }
          })
        }
      }

      if (targetUrl) {
        if (!isRemoteUrlAllowed(targetUrl)) {
          return new Response('Forbidden', { status: 403 })
        }
        const response = await net.fetch(targetUrl, {
          method: request.method,
          headers: request.headers,
          bypassCustomProtocolHandlers: true // Prevent infinite loops
        })

        const responseHeaders = new Headers(response.headers)
        responseHeaders.set('Access-Control-Allow-Origin', '*')
        responseHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type')

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders
        })
      }

      return new Response('Missing path or url parameter', { status: 400 })
    } catch (err) {
      console.error('[Protocol] Error handling yukinon protocol request:', err)
      return new Response('Internal error or invalid URL', { status: 500 })
    }
  })
  electronApp.setAppUserModelId('com.umam1n.yukinon')
  initDatabase()
  restrictFileAccess()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  await createWindow()
  setupGlobalShortcuts()

  // Register IPC handlers
  registerLibraryHandlers(ipcMain)
  registerPlaylistsHandlers(ipcMain)
  registerEQHandlers(ipcMain, mainWindow)
  registerDeviceHandlers(ipcMain)
  registerThemeHandlers(ipcMain, mainWindow)
  registerYTMHandlers(ipcMain, mainWindow)
  registerAiHandlers(ipcMain)

  // Utilities
  ipcMain.handle('utils:md5', (_, text: string) => {
    return crypto.createHash('md5').update(text).digest('hex')
  })

  // Settings
  ipcMain.handle('settings:get', (_, key: string) => {
    if (!RENDERER_SETTINGS_KEYS.has(key)) throw new Error(`Setting not accessible: ${key}`)
    return getSetting(key)
  })
  ipcMain.handle('settings:set', (_, key: string, value: unknown) => {
    if (!RENDERER_SETTINGS_KEYS.has(key)) throw new Error(`Setting not accessible: ${key}`)
    setSetting(key, value)
  })

  // Window controls
  ipcMain.handle('window:minimize', () => mainWindow.minimize())
  ipcMain.handle('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })
  ipcMain.handle('window:close', () => mainWindow.close())
  ipcMain.handle('window:isMiniPlayer', () => isMiniPlayer)
  ipcMain.handle('window:enterMiniPlayer', () => {
    if (isMiniPlayer) return true
    normalBounds = mainWindow.getBounds()
    isMiniPlayer = true
    mainWindow.setMinimumSize(320, 140)
    mainWindow.setBounds({
      x: normalBounds.x,
      y: normalBounds.y,
      width: 340,
      height: 140
    })
    mainWindow.setAlwaysOnTop(true, 'floating')
    return true
  })
  ipcMain.handle('window:exitMiniPlayer', () => {
    if (!isMiniPlayer) return false
    isMiniPlayer = false
    mainWindow.setMinimumSize(360, 260)
    mainWindow.setBounds(normalBounds)
    const alwaysOnTopSetting = !!getSetting('always_on_top')
    mainWindow.setAlwaysOnTop(alwaysOnTopSetting)
    return false
  })
  ipcMain.handle('window:setAlwaysOnTop', (_, isAlwaysOnTop: boolean) => {
    mainWindow.setAlwaysOnTop(isAlwaysOnTop)
    setSetting('always_on_top', isAlwaysOnTop ? 1 : 0)
  })
  ipcMain.handle('window:getAlwaysOnTop', () => !!getSetting('always_on_top'))
  ipcMain.handle('window:setGlobalHotkeys', (_, enabled: boolean) => {
    setSetting('global_hotkeys', enabled ? 1 : 0)
    setupGlobalShortcuts()
  })
  ipcMain.handle('window:getGlobalHotkeys', () => {
    const setting = getSetting('global_hotkeys')
    return setting !== 0
  })
  ipcMain.handle('window:setCustomHotkeys', (_, hotkeys: CustomHotkeys) => {
    setSetting('custom_hotkeys', hotkeys)
    setupGlobalShortcuts()
  })
  ipcMain.handle('window:getCustomHotkeys', () => {
    return getCustomHotkeys()
  })

  app.on('activate', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show()
  })
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
