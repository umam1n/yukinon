import { app, shell, BrowserWindow, BrowserView, ipcMain, globalShortcut, session, protocol, net } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerLibraryHandlers } from './ipc/library'
import { registerEQHandlers } from './ipc/eq'
import { registerDeviceHandlers } from './ipc/devices'
import { registerThemeHandlers } from './ipc/theme'
import { registerYTMHandlers, ytmView } from './ytm'
import { initDatabase, getSetting, setSetting } from './db'
import crypto from 'crypto'

let mainWindow: BrowserWindow

// Hardware Acceleration is critical for CSS performance (blur, gradients, transform)
// app.disableHardwareAcceleration()

// Optimize GPU rendering and memory
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('ignore-gpu-blocklist') // Force GPU on Linux even if driver is unrecognized
app.commandLine.appendSwitch('log-level', '3') // Suppress internal Chromium/VSync errors/warnings
app.commandLine.appendSwitch('disable-features', 'UserAgentClientHint') // Bypass Google Sign-In blocking

async function createWindow(): Promise<void> {
  await initDatabase()

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
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
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false // allow file:// access for local tracks
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  mainWindow.on('resize', () => {
    const [w, h] = mainWindow.getContentSize()
    // If YTM is active, update its bounds to fill content area (minus sidebar)
    if (ytmView && mainWindow.getBrowserViews().includes(ytmView)) {
      ytmView.setBounds({ x: 72, y: 0, width: w - 72, height: h - 110 })
    }
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

function setupGlobalShortcuts(): void {
  globalShortcut.register('MediaPlayPause', () => {
    mainWindow.webContents.send('media:playPause')
  })
  globalShortcut.register('MediaNextTrack', () => {
    mainWindow.webContents.send('media:next')
  })
  globalShortcut.register('MediaPreviousTrack', () => {
    mainWindow.webContents.send('media:prev')
  })
}

app.whenReady().then(async () => {
  protocol.handle('yukinon', async (request) => {
    try {
      const url = new URL(request.url)
      const filePath = url.searchParams.get('path')
      if (!filePath) {
        return new Response('Missing path parameter', { status: 400 })
      }

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

      const response = await net.fetch(pathToFileURL(filePath).toString(), {
        method: request.method,
        headers: request.headers
      })

      const responseHeaders = new Headers(response.headers)
      responseHeaders.set('Access-Control-Allow-Origin', '*')

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      })
    } catch (err) {
      console.error('[Protocol] Error handling yukinon protocol request:', err)
      return new Response('Internal error or invalid URL', { status: 500 })
    }
  })
  electronApp.setAppUserModelId('com.umam1n.yukinon')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  await createWindow()
  setupGlobalShortcuts()

  // Register IPC handlers
  registerLibraryHandlers(ipcMain)
  registerEQHandlers(ipcMain, mainWindow)
  registerDeviceHandlers(ipcMain)
  registerThemeHandlers(ipcMain, mainWindow)
  registerYTMHandlers(ipcMain, mainWindow)

  // Utilities
  ipcMain.handle('utils:md5', (_, text: string) => {
    return crypto.createHash('md5').update(text).digest('hex')
  })

  // Settings
  ipcMain.handle('settings:get', (_, key: string) => getSetting(key))
  ipcMain.handle('settings:set', (_, key: string, value: any) => setSetting(key, value))

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

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
