import chokidar, { FSWatcher } from 'chokidar'
import { extname } from 'path'
import { BrowserWindow } from 'electron'
import { getDb, getSetting } from './db'
import { indexTrack, insertTrack } from './ipc/library'

const AUDIO_EXTENSIONS = new Set(['.flac', '.mp3', '.wav', '.aiff', '.aac', '.ogg', '.m4a', '.opus'])

let watcher: FSWatcher | null = null
let targetWindow: BrowserWindow | null = null
let debounceTimer: NodeJS.Timeout | null = null

function notifyLibraryChanged(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    if (targetWindow && !targetWindow.isDestroyed()) {
      targetWindow.webContents.send('library:changed')
    }
  }, 400)
}

export function updateWatchedFolders(folders: string[]): void {
  if (!watcher) return

  // Filter valid string folder paths
  const validFolders = folders.filter((f) => typeof f === 'string' && f.trim().length > 0)
  const currentWatched = watcher.getWatched()
  const currentFolders = Object.keys(currentWatched)

  // Unwatch removed folders
  for (const cf of currentFolders) {
    if (!validFolders.includes(cf)) {
      watcher.unwatch(cf)
    }
  }

  // Watch newly added folders
  for (const vf of validFolders) {
    watcher.add(vf)
  }
}

export function initLibraryWatcher(win: BrowserWindow): void {
  targetWindow = win

  if (watcher) {
    watcher.close()
    watcher = null
  }

  const initialFolders = ((getSetting('music_folders') as string[]) || []).filter(
    (f) => typeof f === 'string' && f.trim().length > 0
  )

  watcher = chokidar.watch(initialFolders, {
    ignoreInitial: true,
    persistent: true,
    depth: 99,
    awaitWriteFinish: {
      stabilityThreshold: 1000,
      pollInterval: 200
    }
  })

  watcher.on('add', async (filePath: string) => {
    const ext = extname(filePath).toLowerCase()
    if (!AUDIO_EXTENSIONS.has(ext)) return

    try {
      const db = getDb()
      const existing = db.prepare('SELECT id FROM tracks WHERE path = ?').get(filePath)
      if (existing) return

      const track = await indexTrack(filePath)
      if (!track) return

      insertTrack(db, track)

      if (targetWindow && !targetWindow.isDestroyed()) {
        targetWindow.webContents.send('library:trackAdded', track)
      }
      notifyLibraryChanged()
    } catch (err) {
      console.error('[Watcher] Failed to process added track:', filePath, err)
    }
  })

  watcher.on('unlink', (filePath: string) => {
    const ext = extname(filePath).toLowerCase()
    if (!AUDIO_EXTENSIONS.has(ext)) return

    try {
      const db = getDb()
      const result = db.prepare('DELETE FROM tracks WHERE path = ?').run(filePath)
      if (result.changes > 0) {
        if (targetWindow && !targetWindow.isDestroyed()) {
          targetWindow.webContents.send('library:trackRemoved', filePath)
        }
        notifyLibraryChanged()
      }
    } catch (err) {
      console.error('[Watcher] Failed to process unlinked track:', filePath, err)
    }
  })
}
