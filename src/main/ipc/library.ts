import { ipcMain as IpcMain, dialog, BrowserWindow, app } from 'electron'
import { readdir, stat, mkdir, writeFile, readFile } from 'fs/promises'
import { join, extname } from 'path'
import { parseFile } from 'music-metadata'
import { randomUUID } from 'crypto'
import { getDb, getSetting, setSetting } from '../db'
import type { Track } from '../../../shared/types'
import { existsSync } from 'fs'

const SUPPORTED_FORMATS = new Set(['.flac', '.mp3', '.wav', '.aiff', '.aac', '.ogg', '.m4a', '.opus'])

async function scanDirectory(dirPath: string): Promise<string[]> {
  const files: string[] = []
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)
      if (entry.isDirectory()) {
        const subFiles = await scanDirectory(fullPath)
        files.push(...subFiles)
      } else if (entry.isFile() && SUPPORTED_FORMATS.has(extname(entry.name).toLowerCase())) {
        files.push(fullPath)
      }
    }
  } catch (err) {
    console.error('[Library] Error scanning directory:', dirPath, err)
  }
  return files
}

async function indexTrack(filePath: string): Promise<Track | null> {
  try {
    const metadata = await parseFile(filePath, { duration: true, skipCovers: false })
    const common = metadata.common
    const format = metadata.format

    const id = randomUUID()

    // Extract artwork and save to disk
    let artworkPath: string | undefined
    if (common.picture && common.picture.length > 0) {
      try {
        const artworksDir = join(app.getPath('userData'), 'artworks')
        if (!existsSync(artworksDir)) {
          await mkdir(artworksDir, { recursive: true })
        }
        const pic = common.picture[0]
        const ext = pic.format.includes('png') ? 'png' : 'jpg'
        const fileName = `${id}.${ext}`
        const fullPath = join(artworksDir, fileName)
        await writeFile(fullPath, pic.data)
        artworkPath = `file://${fullPath}`
      } catch (err) {
        console.error('[Library] Failed to save artwork for', filePath, err)
      }
    }

    const track: Track = {
      id,
      source: 'local',
      path: filePath,
      title: common.title || filePath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Unknown',
      artist: common.artist || 'Unknown Artist',
      album: common.album || 'Unknown Album',
      albumArtist: common.albumartist,
      year: common.year,
      genre: common.genre?.[0],
      duration: format.duration || 0,
      artwork: artworkPath,
      format: (extname(filePath).slice(1).toLowerCase()),
      bitDepth: format.bitsPerSample,
      sampleRate: format.sampleRate,
      bitrate: format.bitrate ? Math.round(format.bitrate / 1000) : undefined
    }
    return track
  } catch {
    return null
  }
}

export function registerLibraryHandlers(ipc: typeof IpcMain): void {
  const db = getDb()

  // Scan a music folder and add all tracks to library
  ipc.handle('library:scan', async (_, folderPath: string) => {
    const files = await scanDirectory(folderPath)
    const added: Track[] = []
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO tracks
        (id, path, title, artist, album, album_artist, year, genre, duration, artwork, format, bit_depth, sample_rate, bitrate)
      VALUES
        (@id, @path, @title, @artist, @album, @albumArtist, @year, @genre, @duration, @artwork, @format, @bitDepth, @sampleRate, @bitrate)
    `)

    for (const filePath of files) {
      const existing = db.prepare('SELECT id FROM tracks WHERE path = ?').get(filePath)
      if (existing) continue

      const track = await indexTrack(filePath)
      if (track) {
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
          bitrate: track.bitrate ?? null
        })
        added.push(track)
      }
    }

    // Save folder path to settings
    const savedFolders: string[] = (getSetting('music_folders') as string[]) || []
    if (!savedFolders.includes(folderPath)) {
      savedFolders.push(folderPath)
      setSetting('music_folders', savedFolders)
    }

    return { added: added.length, total: files.length }
  })

  // Get all tracks (excluding artwork to prevent IPC/memory freeze)
  ipc.handle('library:getTracks', () => {
    const rows = db.prepare(`
      SELECT id, 'local' as source, path, title, artist, album, album_artist as albumArtist, year, genre,
             duration, format, bit_depth as bitDepth, sample_rate as sampleRate, bitrate, play_count as playCount, is_favorite as isFavorite
      FROM tracks
      ORDER BY artist, album, title
    `).all()
    return rows as Track[]
  })

  // Get single track (excluding artwork)
  ipc.handle('library:getTrack', (_, id: string) => {
    const row = db.prepare(`
      SELECT id, 'local' as source, path, title, artist, album, album_artist as albumArtist, year, genre,
             duration, format, bit_depth as bitDepth, sample_rate as sampleRate, bitrate, play_count as playCount, is_favorite as isFavorite
      FROM tracks WHERE id = ?
    `).get(id)
    return row as Track | undefined
  })

  // Get local lyrics if available (from .lrc file or embedded tags)
  ipc.handle('library:getLyrics', async (_, id: string) => {
    const track = db.prepare('SELECT path FROM tracks WHERE id = ?').get(id) as { path: string } | undefined
    if (!track) return null

    // 1. Check for .lrc sidecar file
    const lrcPath = track.path.replace(/\.[^.]+$/, '.lrc')
    try {
      if (existsSync(lrcPath)) {
        return await readFile(lrcPath, 'utf8')
      }
    } catch {}

    // 2. Check for embedded lyrics
    try {
      const metadata = await parseFile(track.path, { duration: false, skipCovers: true })
      if (metadata.common.lyrics && metadata.common.lyrics.length > 0) {
        // music-metadata can return array of strings or objects. We handle both.
        const lyric = metadata.common.lyrics[0]
        return typeof lyric === 'string' ? lyric : (lyric as any).text || null
      }
    } catch {}

    return null
  })

  // Get track artwork
  ipc.handle('library:getTrackArtwork', (_, id: string) => {
    const row = db.prepare('SELECT artwork FROM tracks WHERE id = ?').get(id) as { artwork: string | null } | undefined
    return row?.artwork || null
  })

  // Remove track from library
  ipc.handle('library:removeTrack', (_, id: string) => {
    db.prepare('DELETE FROM tracks WHERE id = ?').run(id)
  })

  // Get saved music folders
  ipc.handle('library:getFolders', () => {
    return (getSetting('music_folders') as string[]) || []
  })

  // Remove a music folder and its tracks
  ipc.handle('library:removeFolder', (_, folderPath: string) => {
    db.prepare("DELETE FROM tracks WHERE path LIKE ?").run(`${folderPath}%`)
    const folders = (getSetting('music_folders') as string[]) || []
    setSetting('music_folders', folders.filter(f => f !== folderPath))
  })

  // Open native directory selection dialog
  ipc.handle('library:selectFolder', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  // Find and remove duplicate tracks (same title+artist, keep highest quality)
  ipc.handle('library:removeDuplicates', () => {
    const rows = db.prepare(`
      SELECT id, path, title, artist, bit_depth as bitDepth, sample_rate as sampleRate, bitrate
      FROM tracks ORDER BY title COLLATE NOCASE, artist COLLATE NOCASE
    `).all() as { id: string; path: string; title: string; artist: string; bitDepth: number; sampleRate: number; bitrate: number }[]

    // Group by normalized title+artist key
    const groups = new Map<string, typeof rows>()
    for (const row of rows) {
      const key = `${(row.title || '').toLowerCase().trim()}||${(row.artist || '').toLowerCase().trim()}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(row)
    }

    // For each group with duplicates, keep the best quality track, delete the rest
    let removed = 0
    const deleteStmt = db.prepare('DELETE FROM tracks WHERE id = ?')

    for (const [, group] of groups) {
      if (group.length <= 1) continue
      // Score each track: prioritize bit depth, then sample rate, then bitrate
      const scored = group.map(t => ({
        ...t,
        score: (t.bitDepth || 0) * 1_000_000 + (t.sampleRate || 0) * 10 + (t.bitrate || 0)
      })).sort((a, b) => b.score - a.score)

      // Keep the first (best quality), delete the rest
      for (const dup of scored.slice(1)) {
        deleteStmt.run(dup.id)
        removed++
      }
    }

    return { removed, total: rows.length }
  })

  // Find duplicate tracks (preview only, no deletion)
  ipc.handle('library:findDuplicates', () => {
    const rows = db.prepare(`
      SELECT id, path, title, artist, bit_depth as bitDepth, sample_rate as sampleRate, bitrate, format
      FROM tracks ORDER BY title COLLATE NOCASE, artist COLLATE NOCASE
    `).all() as { id: string; path: string; title: string; artist: string; bitDepth: number; sampleRate: number; bitrate: number; format: string }[]

    const groups = new Map<string, typeof rows>()
    for (const row of rows) {
      const key = `${(row.title || '').toLowerCase().trim()}||${(row.artist || '').toLowerCase().trim()}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(row)
    }

    let count = 0
    for (const [, group] of groups) {
      if (group.length > 1) count += group.length - 1
    }
    return { duplicateCount: count }
  })
}
