import type { Track, Playlist, AppTheme, DeviceProfile, EQPreset, EQBands } from './shared/types'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Capacitor, registerPlugin } from '@capacitor/core'

interface MediaStoreScannerPlugin {
  scanAudioFiles(options: { folderPath: string }): Promise<{ tracks: Track[]; totalInStore?: number; keptAfterFilter?: number }>
  checkPermissions(): Promise<{ mediaAudio?: string; storage?: string }>
  requestPermissions(options?: { permissions: string[] }): Promise<{ mediaAudio?: string; storage?: string }>
  checkManageStorage(): Promise<{ isManager: boolean }>
  requestManageStorage(): Promise<void>
}

const MediaStoreScanner = registerPlugin<MediaStoreScannerPlugin>('MediaStoreScanner')

let pendingFiles: File[] = []

// IndexedDB Helper to store large audio Blobs (FLAC, MP3, etc.) persistently on Android
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('yukinon_local_storage', 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

const saveBlob = async (key: string, blob: Blob): Promise<void> => {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('files', 'readwrite')
    const store = transaction.objectStore('files')
    const request = store.put(blob, key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

const getBlob = async (key: string): Promise<Blob | null> => {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('files', 'readonly')
    const store = transaction.objectStore('files')
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

const clearDB = async (): Promise<void> => {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('files', 'readwrite')
    const store = transaction.objectStore('files')
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

const getAudioDuration = (file: File | Blob): Promise<number> => {
  return new Promise((resolve) => {
    const audio = new Audio()
    audio.src = URL.createObjectURL(file)
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src)
      resolve(audio.duration || 0)
    }
    audio.onerror = () => {
      resolve(0)
    }
  })
}

// Recursive scanner to find audio files on the device filesystem
const scanDirectoryRecursive = async (dir: Directory, path: string): Promise<Track[]> => {
  const tracks: Track[] = []
  
  // Skip system/hidden folders at the root or within subfolders
  const lastSegment = path.split('/').pop()
  if (lastSegment === 'Android' || lastSegment?.startsWith('.')) {
    return []
  }

  try {
    const result = await Filesystem.readdir({
      directory: dir,
      path: path
    })
    
    for (const file of result.files) {
      const fullPath = path ? `${path}/${file.name}` : file.name
      
      // Skip system/hidden entries immediately
      if (file.name === 'Android' || file.name.startsWith('.')) {
        continue
      }

      if (file.type === 'directory') {
        try {
          const subTracks = await scanDirectoryRecursive(dir, fullPath)
          tracks.push(...subTracks)
        } catch (e) {
          console.warn(`Skipping unreadable folder ${fullPath}:`, e)
        }
      } else {
        const ext = file.name.split('.').pop()?.toLowerCase()
        const AUDIO_EXTENSIONS = ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'opus', 'wv', 'ape', 'mka', 'mp4', 'alac'];
        if (ext && AUDIO_EXTENSIONS.includes(ext)) {
          tracks.push({
            id: `native_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: file.name.replace(/\.[^/.]+$/, ""), // strip extension
            artist: 'Local Artist',
            album: 'Local Album',
            genre: 'Local',
            duration: 0, // dynamic on load/play
            path: file.uri, // native file:// path (provided directly by readdir)
            source: 'local',
            isFavorite: false,
            playCount: 0
          })
        }
      }
    }
  } catch (e) {
    console.warn(`Failed to read directory ${path}:`, e)
    throw e
  }
  return tracks
}

const ensurePermissions = async (): Promise<boolean> => {
  try {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const match = ua.match(/Android\s+([0-9]+)/)
    const androidVersion = match ? parseInt(match[1], 10) : 0
    console.log('[Permission] Detected Android version:', androidVersion)

    // Request full storage access on Android 11+ to bypass Scoped Storage constraints
    if (androidVersion >= 11) {
      try {
        const manageStatus = await MediaStoreScanner.checkManageStorage()
        if (!manageStatus.isManager) {
          console.log('[Permission] App does not have All Files Access. Requesting permission...')
          await MediaStoreScanner.requestManageStorage()
          return false // Exit, user will need to re-trigger after granting permission in system UI
        }
      } catch (err) {
        console.warn('MANAGE_EXTERNAL_STORAGE request failed, falling back to standard permissions:', err)
      }
    }

    const perms = await MediaStoreScanner.checkPermissions()
    
    if (androidVersion >= 13) {
      if (perms.mediaAudio !== 'granted') {
        console.log('[Permission] Requesting mediaAudio permission for Android 13+')
        const req = await MediaStoreScanner.requestPermissions({ permissions: ['mediaAudio'] })
        if (req.mediaAudio !== 'granted') return false
      }
    } else {
      if (perms.storage !== 'granted') {
        console.log('[Permission] Requesting storage permission for Android 12-')
        const req = await MediaStoreScanner.requestPermissions({ permissions: ['storage'] })
        if (req.storage !== 'granted') return false
      }
    }

    // Verify after request
    const updatedPerms = await MediaStoreScanner.checkPermissions()
    const isGranted = androidVersion >= 13 ? updatedPerms.mediaAudio === 'granted' : updatedPerms.storage === 'granted'
    if (!isGranted) {
      console.warn('[Permission] Storage/media permission remains denied. Please grant it in Android system settings.')
      return false
    }
    return true
  } catch (err) {
    console.warn('Permission request failed:', err)
    return false
  }
}

// Custom Premium Folder Explorer Modal for Android (Bypasses WebView folder picker limitation)
const openCustomFolderExplorer = (): Promise<string | null> => {
  return new Promise(async (resolve) => {
    try {
      try {
        await Filesystem.requestPermissions()
      } catch (e) {
        console.warn('Filesystem permissions request failed:', e)
      }
      await ensurePermissions()
    } catch (e) {
      console.error('Permission check failed', e)
    }

    const modal = document.createElement('div')
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(10,10,15,0.95);z-index:100000;
      display:flex;align-items:center;justify-content:center;
      padding:16px;
      font-family:system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `

    const container = document.createElement('div')
    container.style.cssText = `
      background:#141424;border:1px solid rgba(255,255,255,0.08);
      width:100%;max-width:440px;height:80vh;border-radius:24px;
      display:flex;flex-direction:column;overflow:hidden;
      box-shadow:0 24px 64px rgba(0,0,0,0.6);
    `

    container.innerHTML = `
      <div style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:space-between;background:#18182c;">
        <span style="font-weight:700;font-size:16px;color:#fff;">Browse Storage</span>
        <button id="explorer-close" style="background:transparent;border:none;color:#ff5f56;cursor:pointer;font-size:14px;font-weight:600;">Close</button>
      </div>
      <div id="explorer-path" style="padding:8px 20px;background:#0f0f1b;font-size:11px;color:#888;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-bottom:1px solid rgba(255,255,255,0.03);">
        Loading path...
      </div>
      <div id="explorer-list" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:6px;">
        <!-- dynamic folder rows -->
      </div>
      <div style="padding:16px 20px;border-top:1px solid rgba(255,255,255,0.05);background:#18182c;">
        <button id="explorer-select" style="background:#3b82f6;border:none;color:#fff;padding:14px;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;width:100%;box-shadow:0 4px 12px rgba(59,130,246,0.3);">
          Select Current Folder
        </button>
      </div>
    `

    modal.appendChild(container)
    document.body.appendChild(modal)

    let currentPath = ''

    const cleanup = () => {
      document.body.removeChild(modal)
    }

    const renderList = async () => {
      const listEl = container.querySelector('#explorer-list')!
      const pathEl = container.querySelector('#explorer-path')!
      pathEl.textContent = 'Storage: /' + currentPath

      listEl.innerHTML = '<div style="padding:40px 0;text-align:center;color:#666;font-size:14px;">Loading folders...</div>'

      try {
        const result = await Filesystem.readdir({
          directory: Directory.ExternalStorage,
          path: currentPath
        })

        listEl.innerHTML = ''

        if (currentPath !== '') {
          const backRow = document.createElement('div')
          backRow.style.cssText = 'display:flex;align-items:center;padding:12px 16px;border-radius:12px;cursor:pointer;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.03);'
          backRow.innerHTML = '<span style="margin-right:12px;font-size:18px;">⬆️</span> <span style="font-weight:600;font-size:14px;color:#aaa;">.. (Go Back)</span>'
          backRow.onclick = () => {
            const parts = currentPath.split('/')
            parts.pop()
            currentPath = parts.join('/')
            renderList()
          }
          listEl.appendChild(backRow)
        }

        const dirs = result.files.filter(f => f.type === 'directory')
        
        if (dirs.length === 0) {
          const empty = document.createElement('div')
          empty.style.cssText = 'padding:40px 0;text-align:center;color:#555;font-size:13px;'
          empty.textContent = 'No folders inside this folder.'
          listEl.appendChild(empty)
        }

        dirs.forEach(f => {
          const row = document.createElement('div')
          row.style.cssText = 'display:flex;align-items:center;padding:12px 16px;border-radius:12px;cursor:pointer;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.03);transition:all 0.15s;'
          row.innerHTML = `<span style="margin-right:12px;font-size:18px;">📁</span> <span style="font-weight:500;font-size:14px;color:#eee;word-break:break-all;">${f.name}</span>`
          
          row.onclick = () => {
            currentPath = currentPath ? `${currentPath}/${f.name}` : f.name
            renderList()
          }
          listEl.appendChild(row)
        })
      } catch (err) {
        listEl.innerHTML = `
          <div style="padding:40px 16px;text-align:center;color:#f87171;font-size:13px;line-height:1.6;">
            Failed to read directory.<br/>
            This folder might be restricted by Scoped Storage or permissions.
          </div>
        `
        console.error(err)
      }
    }

    container.querySelector('#explorer-close')!.addEventListener('click', () => {
      cleanup()
      resolve(null)
    })

    container.querySelector('#explorer-select')!.addEventListener('click', () => {
      cleanup()
      resolve(currentPath || 'ROOT')
    })

    renderList()
  })
}

// Mock implementation of the Electron window.yukinon API for Android
const mockApi = {
  platform: 'android',
  library: {
    selectFolder: async (): Promise<string | null> => {
      return new Promise((resolve) => {
        // Overlay dialog
        const overlay = document.createElement('div')
        overlay.style.cssText = `
          position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99999;
          display:flex;align-items:flex-end;justify-content:center;
          font-family:system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `

        const sheet = document.createElement('div')
        sheet.style.cssText = `
          background:#141424;border-radius:24px 24px 0 0;
          padding:24px 24px 40px;width:100%;max-width:500px;
          display:flex;flex-direction:column;gap:16px;
          border-top:1px solid rgba(255,255,255,0.1);
          box-shadow: 0 -8px 32px rgba(0,0,0,0.5);
        `

        sheet.innerHTML = `
          <div style="width:40px;height:4px;background:rgba(255,255,255,0.2);border-radius:2px;margin:0 auto 8px;"></div>
          <p style="margin:0;font-size:18px;font-weight:700;color:#fff;text-align:center;">Add Music Library</p>
          <p style="margin:0 0 8px;font-size:13px;color:#888;text-align:center;">Scan a folder on your device or pick files manually</p>
          
          <button id="btn-scan-folder" style="padding:16px;border-radius:14px;border:none;background:#3b82f6;color:#fff;font-size:15px;font-weight:600;cursor:pointer;width:100%;display:flex;align-items:center;justify-content:center;gap:8px;">
            📁 Browse & Scan a Folder
          </button>
          
          <button id="btn-pick-files" style="padding:16px;border-radius:14px;border:1px solid #333;background:transparent;color:#eee;font-size:15px;font-weight:600;cursor:pointer;width:100%;display:flex;align-items:center;justify-content:center;gap:8px;">
            🎵 Pick Individual Files
          </button>
          
          <button id="btn-cancel-sheet" style="padding:12px;border-radius:12px;border:none;background:transparent;color:#666;font-size:14px;cursor:pointer;width:100%;">
            Cancel
          </button>
        `

        overlay.appendChild(sheet)
        document.body.appendChild(overlay)

        const closeSheet = () => document.body.removeChild(overlay)

        sheet.querySelector('#btn-scan-folder')!.addEventListener('click', async () => {
          closeSheet()
          const chosenFolder = await openCustomFolderExplorer()
          resolve(chosenFolder)
        })

        sheet.querySelector('#btn-pick-files')!.addEventListener('click', () => {
          closeSheet()
          const input = document.createElement('input')
          input.type = 'file'
          input.multiple = true
          input.accept = 'audio/*'
          input.onchange = (e: any) => {
            const files = Array.from(e.target.files || []) as File[]
            if (files.length > 0) {
              pendingFiles = files
              resolve('Local Storage')
            } else {
              resolve(null)
            }
          }
          input.oncancel = () => resolve(null)
          input.click()
        })

        sheet.querySelector('#btn-cancel-sheet')!.addEventListener('click', () => {
          closeSheet()
          resolve(null)
        })
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            closeSheet()
            resolve(null)
          }
        })
      })
    },
    scan: async (folderPath: string) => {
      if (folderPath && folderPath !== 'Local Storage') {
        let added = 0
        let total = 0
        let diagnostics: any = {}
        try {
          // Verify and request Android Media Store / Storage permissions
          const hasPerms = await ensurePermissions()
          if (!hasPerms) {
            console.warn('[Scan] Permissions not fully granted. Scan may be incomplete.')
          }

          const existing = localStorage.getItem('yukinon_local_tracks')
          const tracks: Track[] = existing ? JSON.parse(existing) : []
          const existingPaths = new Set(tracks.map(t => t.path))

          // folderPath is relative from ExternalStorage root (e.g. "Music")
          // ROOT means scan all audio on device
          const path = folderPath === 'ROOT' ? '' : folderPath
          console.log('[Scan] Starting dual scan (MediaStore + Filesystem) for folder:', path || '(all)')
          
          // 1. Scan via native MediaStore Scanner (walks filesystem first to force indexing, then queries MediaStore)
          let mediaStoreTracks: Track[] = []
          try {
            const result = await MediaStoreScanner.scanAudioFiles({ folderPath: path })
            mediaStoreTracks = result.tracks || []
            diagnostics = {
              resolvedPath: (result as any).resolvedPath,
              exists: (result as any).exists,
              isDirectory: (result as any).isDirectory,
              isManager: (result as any).isManager,
              fsMergedCount: (result as any).fsMergedCount,
              musicDirContents: (result as any).musicDirContents,
              resolvedPathContents: (result as any).resolvedPathContents
            }
            console.log('[Scan] MediaStore total:', mediaStoreTracks.length, 'resolvedPath:', diagnostics.resolvedPath)
          } catch (msErr: any) {
            console.warn('[Scan] MediaStore query failed:', msErr)
            diagnostics = {
              pluginError: msErr.message || String(msErr)
            }
          }

          // 2. Scan via Filesystem direct directory reader (robust fallback, reads unindexed FLAC files directly)
          let fsTracks: Track[] = []
          let fsScanError: any = null
          try {
            fsTracks = await scanDirectoryRecursive(Directory.ExternalStorage, path)
            console.log('[Scan] Filesystem scan returned', fsTracks.length, 'tracks')
          } catch (fsErr) {
            console.warn('[Scan] Filesystem direct scan failed:', fsErr)
            fsScanError = fsErr
          }

          // 3. De-duplicate files (matching by raw file paths)
          const allTracks = [...mediaStoreTracks]
          const getRawPath = (p: string | undefined) => (p || '').replace('file://', '')
          const rawPathsInScan = new Set(allTracks.map(t => getRawPath(t.path)))

          for (const t of fsTracks) {
            const rp = getRawPath(t.path)
            if (!rawPathsInScan.has(rp)) {
              allTracks.push(t)
              rawPathsInScan.add(rp)
            }
          }

          total = allTracks.length
          for (const t of allTracks) {
            // Convert native file:// path to Capacitor-friendly URL
            if (t.path && t.path.startsWith('file://')) {
              t.path = Capacitor.convertFileSrc(t.path)
            }
            if (!existingPaths.has(t.path)) {
              tracks.push(t)
              added++
            }
          }

          if (total === 0 && fsScanError) {
            throw fsScanError
          }

          localStorage.setItem('yukinon_local_tracks', JSON.stringify(tracks))
          console.log('[Scan] Done. Added', added, 'new tracks. Total in library:', tracks.length)
        } catch (err) {
          console.error("Native folder scan error:", err)
          throw err
        }
        return { added, total, ...diagnostics }
      }

      if (folderPath !== 'Local Storage' || pendingFiles.length === 0) {
        return { added: 0, total: 0 }
      }
      
      let added = 0
      const existing = localStorage.getItem('yukinon_local_tracks')
      const tracks: Track[] = existing ? JSON.parse(existing) : []
      const existingPaths = new Set(tracks.map(t => t.path))
      
      for (const file of pendingFiles) {
        try {
          const trackId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          
          // Save Blob to IndexedDB
          await saveBlob(trackId, file)
          const duration = await getAudioDuration(file)
          
          const track: Track = {
            id: trackId,
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: 'Local Artist',
            album: 'Local Album',
            genre: 'Local',
            duration: duration,
            path: `indexeddb://${trackId}`,
            source: 'local',
            isFavorite: false,
            playCount: 0
          }
          
          if (!existingPaths.has(track.path)) {
            tracks.push(track)
            added++
          }
        } catch (e) {
          console.error('Failed to import file:', file.name, e)
        }
      }
      
      localStorage.setItem('yukinon_local_tracks', JSON.stringify(tracks))
      pendingFiles = []
      return { added, total: added }
    },
    getTracks: async (): Promise<Track[]> => {
      const existing = localStorage.getItem('yukinon_local_tracks')
      const tracks: Track[] = existing ? JSON.parse(existing) : []
      
      // Resolve paths to webview URLs dynamically
      for (const track of tracks) {
        if (track.path && !track.path.startsWith('http')) {
          try {
            if (track.path.startsWith('file://')) {
              track.path = Capacitor.convertFileSrc(track.path)
            } else if (track.path.startsWith('indexeddb://')) {
              // Resolved dynamically inside player, no conversion here
            } else {
              const uriResult = await Filesystem.getUri({
                path: track.path,
                directory: Directory.Documents
              })
              track.path = Capacitor.convertFileSrc(uriResult.uri)
            }
          } catch (e) {
            console.error('Failed to resolve track path:', track.path, e)
          }
        }
      }
      return tracks
    },
    getTrack: async (id: string): Promise<Track | null> => {
      const tracks = await mockApi.library.getTracks()
      return tracks.find(t => t.id === id) || null
    },
    getTrackBlob: async (id: string): Promise<Blob | null> => {
      return getBlob(id)
    },
    getTrackArtwork: async (id: string): Promise<string | null> => null,
    getLyrics: async (id: string): Promise<string | null> => null,
    getFolders: async () => {
      const tracks = localStorage.getItem('yukinon_local_tracks')
      if (tracks && JSON.parse(tracks).length > 0) {
        return ['Local Storage']
      }
      return []
    },
    removeFolder: async (folder: string) => {
      if (folder === 'Local Storage') {
        localStorage.removeItem('yukinon_local_tracks')
        await clearDB()
      }
    },
    findDuplicates: async () => ({ duplicateCount: 0 }),
    removeDuplicates: async () => ({ removed: 0, total: 0 }),
    onChange: (cb: any) => () => {}
  },
  playlists: {
    getAll: async (): Promise<Playlist[]> => [],
    create: async (name: string): Promise<Playlist> => ({ id: 'mock', name, trackIds: [], createdAt: new Date().toISOString() }),
    getTracks: async (id: string): Promise<Track[]> => [],
    addTrack: async (playlistId: string, trackId: string) => {},
    removeTrack: async (playlistId: string, trackId: string) => {},
    delete: async (playlistId: string) => {},
    onChange: (cb: any) => () => {}
  },
  eq: {
    getBands: async (): Promise<EQBands> => ({
      32: 0, 64: 0, 125: 0, 250: 0, 500: 0, 1000: 0, 2000: 0, 4000: 0, 8000: 0, 16000: 0
    }),
    setBand: (freq: number, value: number) => {},
    applyPreset: (presetId: string | null) => {},
    getPresets: async (): Promise<EQPreset[]> => [],
    getActivePresetId: async (): Promise<string> => 'flat',
    savePreset: async (name: string, bands: EQBands) => {},
    deletePreset: async (id: string) => {},
    onBandsChanged: (cb: any) => () => {},
  },
  devices: {
    list: async () => [],
    listProfiles: async () => [],
    getProfile: async (deviceLabel: string): Promise<DeviceProfile | null> => null,
    saveProfile: async (deviceLabel: string, deviceId: string | null, groupId: string | null, bands: EQBands) => {},
    deleteProfile: async (label: string) => {},
    onChange: (cb: any) => () => {},
  },
  theme: {
    get: async (): Promise<AppTheme> => {
      const stored = localStorage.getItem('yukinon_theme')
      if (stored) return JSON.parse(stored)
      return { mode: 'dark', accentColor: '#3b82f6', accent2Color: '#8b5cf6' }
    },
    set: (theme: AppTheme) => {
      localStorage.setItem('yukinon_theme', JSON.stringify(theme))
      window.dispatchEvent(new CustomEvent('yukinon:theme-updated', { detail: theme }))
    },
    onChange: (callback: (theme: AppTheme) => void) => {
      const listener = (e: Event) => callback((e as CustomEvent).detail)
      window.addEventListener('yukinon:theme-updated', listener)
      return () => window.removeEventListener('yukinon:theme-updated', listener)
    }
  },
  player: {
    onStateUpdate: (callback: (state: any) => void) => () => {},
    onYTMInfo: (callback: (info: any) => void) => () => {},
  },
  ytm: {
    show: () => {},
    hide: () => {},
    goBack: () => {},
    setTheme: () => {},
    setLock: () => {}
  },
  window: {
    getAlwaysOnTop: async () => false,
    setAlwaysOnTop: async () => {},
    getGlobalHotkeys: async () => false,
    setGlobalHotkeys: async () => {},
    getCustomHotkeys: async () => ({ playPause: '', nextTrack: '', prevTrack: '' }),
    setCustomHotkeys: async () => {}
  },
  media: {
    onPlayPause: () => () => {},
    onNext: () => () => {},
    onPrev: () => () => {}
  },
  settings: {
    get: async (key: string) => {
      if (key === 'active_modules') {
        const stored = localStorage.getItem('yukinon_modules')
        return stored ? JSON.parse(stored) : { ytm: false, radio: false, subsonic: false, jellyfin: false }
      }
      const stored = localStorage.getItem(`yukinon_settings_${key}`)
      return stored ? JSON.parse(stored) : null
    },
    set: async (key: string, value: any) => {
      if (key === 'active_modules') {
        localStorage.setItem('yukinon_modules', JSON.stringify(value))
      } else {
        localStorage.setItem(`yukinon_settings_${key}`, JSON.stringify(value))
      }
    },
    getPreampGain: async (): Promise<number> => {
      return Number(localStorage.getItem('yukinon_preamp') || '0')
    },
    setPreampGain: (val: number) => {
      localStorage.setItem('yukinon_preamp', val.toString())
      window.dispatchEvent(new CustomEvent('yukinon:preamp-updated', { detail: val }))
    },
    onPreampUpdated: (callback: (val: number) => void) => {
      const listener = (e: Event) => callback((e as CustomEvent).detail)
      window.addEventListener('yukinon:preamp-updated', listener)
      return () => window.removeEventListener('yukinon:preamp-updated', listener)
    }
  },
  utils: {
    md5: async (str: string) => {
      return str
    }
  }
}

// Attach to window
if (typeof window !== 'undefined') {
  ;(window as any).yukinon = mockApi
}

export default mockApi
