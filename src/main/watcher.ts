import chokidar, { FSWatcher } from 'chokidar'
import { extname } from 'path'
import { BrowserWindow } from 'electron'
import { getDb, getSetting } from './db'
import { indexTrack } from './ipc/library'

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

      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO tracks
          (id, path, title, artist, album, album_artist, year, genre, duration, artwork, format, bit_depth, sample_rate, bitrate, content_type, is_instrumental, is_live, mood, ai_tags, replaygain_track_gain, replaygain_track_peak)
        VALUES
          (@id, @path, @title, @artist, @album, @albumArtist, @year, @genre, @duration, @artwork, @format, @bitDepth, @sampleRate, @bitrate, @contentType, @isInstrumental, @isLive, @mood, @aiTags, @replaygainTrackGain, @replaygainTrackPeak)
      `)

      insertStmt.run({
        id: track.id,
        path: track.path,
        title: track.title,
        artist: track.artist,
        album: track.album,
        albumArtist: track.albumArtist ?? null,
        year: track.year ?? null,
        genre: track.genre ?? null,
        duration: track.duration,
        artwork: track.artwork ?? null,
        format: track.format,
        bitDepth: track.bitDepth ?? null,
        sampleRate: track.sampleRate ?? null,
        bitrate: track.bitrate ?? null,
        contentType: track.contentType || 'music',
        isInstrumental: track.isInstrumental ? 1 : 0,
        isLive: track.isLive ? 1 : 0,
        mood: track.mood ?? null,
        aiTags: JSON.stringify(track.aiTags || []),
        replaygainTrackGain: track.replaygainTrackGain ?? null,
        replaygainTrackPeak: track.replaygainTrackPeak ?? null
      })

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
