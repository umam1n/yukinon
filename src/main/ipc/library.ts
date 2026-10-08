import { ipcMain as IpcMain, dialog, BrowserWindow, app } from 'electron'
import { readdir, mkdir, writeFile, readFile } from 'fs/promises'
import { join, extname } from 'path'
import { parseFile } from 'music-metadata'
import { randomUUID } from 'crypto'
import NodeID3 from 'node-id3'
import { readFlacTags, writeFlacTags } from 'flac-tagger'
import { getDb, getSetting, setSetting } from '../db'
import type { Track, TagUpdatePayload } from '../../../shared/types'
import { existsSync } from 'fs'
import { classifyTrack } from '../lib/classifier'
import { clusterDuplicateTracks } from '../lib/duplicates'
import { updateWatchedFolders } from '../watcher'

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

export async function indexTrack(filePath: string): Promise<Track | null> {
  try {
    const renderArtSetting = getSetting('render_album_art')
    const skipCovers = renderArtSetting === 0 || renderArtSetting === false || renderArtSetting === '0'
    const metadata = await parseFile(filePath, { duration: true, skipCovers })
    const common = metadata.common
    const format = metadata.format

    const id = randomUUID()

    // Extract artwork and save to disk
    let artworkPath: string | undefined
    if (!skipCovers && common.picture && common.picture.length > 0) {
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

    const duration = format.duration || 0
    const bitrate = format.bitrate ? Math.round(format.bitrate / 1000) : undefined

    // Classify track content type, instrumental, live, and suggested mood
    const classification = classifyTrack({
      title: common.title,
      artist: common.artist,
      album: common.album,
      genre: common.genre?.[0],
      path: filePath,
      duration,
      bitrate
    })

    const replaygainTrackGain = (common as any).replaygain_track_gain?.dB ?? null
    const replaygainTrackPeak =
      (common as any).replaygain_track_peak?.ratio ??
      (format as any).replaygain_track_peak_ratio ??
      null

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
      duration,
      artwork: artworkPath,
      format: extname(filePath).slice(1).toLowerCase(),
      bitDepth: format.bitsPerSample,
      sampleRate: format.sampleRate,
      bitrate,
      contentType: classification.contentType,
      isInstrumental: classification.isInstrumental,
      isLive: classification.isLive,
      mood: classification.suggestedMood,
      aiTags: [],
      replaygainTrackGain,
      replaygainTrackPeak
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
    const checkExisting = db.prepare('SELECT id FROM tracks WHERE path = ?')
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO tracks
        (id, path, title, artist, album, album_artist, year, genre, duration, artwork, format, bit_depth, sample_rate, bitrate, content_type, is_instrumental, is_live, mood, ai_tags, replaygain_track_gain, replaygain_track_peak)
      VALUES
        (@id, @path, @title, @artist, @album, @albumArtist, @year, @genre, @duration, @artwork, @format, @bitDepth, @sampleRate, @bitrate, @contentType, @isInstrumental, @isLive, @mood, @aiTags, @replaygainTrackGain, @replaygainTrackPeak)
    `)

    const insertMany = db.transaction((tracksToIndex: Track[]) => {
      for (const track of tracksToIndex) {
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
      }
    })

    const newTracks: Track[] = []
    for (const filePath of files) {
      const existing = checkExisting.get(filePath)
      if (existing) continue

      const track = await indexTrack(filePath)
      if (track) {
        newTracks.push(track)
      }
    }

    if (newTracks.length > 0) {
      insertMany(newTracks)
      added.push(...newTracks)
    }

    // Save folder path to settings
    const savedFolders: string[] = (getSetting('music_folders') as string[]) || []
    if (!savedFolders.includes(folderPath)) {
      savedFolders.push(folderPath)
      setSetting('music_folders', savedFolders)
      updateWatchedFolders(savedFolders)
    }

    return { added: added.length, total: files.length }
  })

  // Get all tracks (excluding artwork to prevent IPC/memory freeze)
  ipc.handle('library:getTracks', () => {
    const rows = db.prepare(`
      SELECT id, 'local' as source, path, title, artist, album, album_artist as albumArtist, year, genre,
             duration, format, bit_depth as bitDepth, sample_rate as sampleRate, bitrate,
             play_count as playCount, is_favorite as isFavorite,
             content_type as contentType, is_instrumental as isInstrumental, is_live as isLive,
             mood, ai_tags as aiTags,
             replaygain_track_gain as replaygainTrackGain, replaygain_track_peak as replaygainTrackPeak
      FROM tracks
      ORDER BY artist, album, title
    `).all() as any[]

    return rows.map((r) => ({
      ...r,
      isInstrumental: Boolean(r.isInstrumental),
      isLive: Boolean(r.isLive),
      aiTags: r.aiTags ? JSON.parse(r.aiTags) : []
    })) as Track[]
  })

  // Get single track (excluding artwork)
  ipc.handle('library:getTrack', (_, id: string) => {
    const row = db.prepare(`
      SELECT id, 'local' as source, path, title, artist, album, album_artist as albumArtist, year, genre,
             duration, format, bit_depth as bitDepth, sample_rate as sampleRate, bitrate,
             play_count as playCount, is_favorite as isFavorite,
             content_type as contentType, is_instrumental as isInstrumental, is_live as isLive,
             mood, ai_tags as aiTags,
             replaygain_track_gain as replaygainTrackGain, replaygain_track_peak as replaygainTrackPeak
      FROM tracks WHERE id = ?
    `).get(id) as any

    if (!row) return undefined
    return {
      ...row,
      isInstrumental: Boolean(row.isInstrumental),
      isLive: Boolean(row.isLive),
      aiTags: row.aiTags ? JSON.parse(row.aiTags) : []
    } as Track
  })

  // Get single track artwork (on-demand to save RAM)
  ipc.handle('library:getTrackArtwork', (_, id: string) => {
    const row = db.prepare('SELECT artwork FROM tracks WHERE id = ?').get(id) as { artwork: string | null } | undefined
    return row?.artwork ?? null
  })

  // Delete track from library
  ipc.handle('library:removeTrack', (_, id: string) => {
    db.prepare('DELETE FROM tracks WHERE id = ?').run(id)
  })

  // Update track tags on audio file and SQLite database
  ipc.handle('library:updateTags', async (_, { id, tags }: { id: string; tags: TagUpdatePayload }) => {
    const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(id) as any
    if (!track) {
      throw new Error(`Track with id ${id} not found`)
    }

    const filePath = track.path
    if (filePath && existsSync(filePath)) {
      const ext = extname(filePath).toLowerCase()
      try {
        if (ext === '.mp3') {
          const id3Tags: NodeID3.Tags = {}
          if (tags.title !== undefined) id3Tags.title = tags.title
          if (tags.artist !== undefined) id3Tags.artist = tags.artist
          if (tags.album !== undefined) id3Tags.album = tags.album
          if (tags.albumArtist !== undefined) id3Tags.performerInfo = tags.albumArtist
          if (tags.year !== undefined) id3Tags.year = String(tags.year)
          if (tags.genre !== undefined) id3Tags.genre = tags.genre
          if (tags.trackNumber !== undefined) id3Tags.trackNumber = String(tags.trackNumber)

          NodeID3.update(id3Tags, filePath)
        } else if (ext === '.flac') {
          const existingFlac = await readFlacTags(filePath)
          const tagMap: Record<string, string | string[]> = { ...existingFlac.tagMap }
          if (tags.title !== undefined) tagMap.TITLE = tags.title
          if (tags.artist !== undefined) tagMap.ARTIST = tags.artist
          if (tags.album !== undefined) tagMap.ALBUM = tags.album
          if (tags.albumArtist !== undefined) tagMap.ALBUMARTIST = tags.albumArtist
          if (tags.year !== undefined) tagMap.DATE = String(tags.year)
          if (tags.genre !== undefined) tagMap.GENRE = tags.genre
          if (tags.trackNumber !== undefined) tagMap.TRACKNUMBER = String(tags.trackNumber)

          await writeFlacTags({ tagMap, picture: existingFlac.picture }, filePath)
        }
      } catch (tagErr) {
        console.error('[Library] Failed to write tags to file:', filePath, tagErr)
      }
    }

    const updatedTitle = tags.title !== undefined ? tags.title : track.title
    const updatedArtist = tags.artist !== undefined ? tags.artist : track.artist
    const updatedAlbum = tags.album !== undefined ? tags.album : track.album
    const updatedAlbumArtist = tags.albumArtist !== undefined ? tags.albumArtist : track.album_artist
    const updatedYear = tags.year !== undefined ? tags.year : track.year
    const updatedGenre = tags.genre !== undefined ? tags.genre : track.genre

    db.prepare(`
      UPDATE tracks
      SET title = ?, artist = ?, album = ?, album_artist = ?, year = ?, genre = ?
      WHERE id = ?
    `).run(updatedTitle, updatedArtist, updatedAlbum, updatedAlbumArtist, updatedYear, updatedGenre, id)

    const row = db.prepare(`
      SELECT id, 'local' as source, path, title, artist, album, album_artist as albumArtist, year, genre,
             duration, format, bit_depth as bitDepth, sample_rate as sampleRate, bitrate,
             play_count as playCount, is_favorite as isFavorite,
             content_type as contentType, is_instrumental as isInstrumental, is_live as isLive,
             mood, ai_tags as aiTags,
             replaygain_track_gain as replaygainTrackGain, replaygain_track_peak as replaygainTrackPeak
      FROM tracks WHERE id = ?
    `).get(id) as any

    return {
      ...row,
      isInstrumental: Boolean(row.isInstrumental),
      isLive: Boolean(row.isLive),
      aiTags: row.aiTags ? JSON.parse(row.aiTags) : []
    } as Track
  })

  // Get lyrics: sidecar .lrc or embedded tags
  ipc.handle('library:getLyrics', async (_, id: string) => {
    const row = db.prepare('SELECT path FROM tracks WHERE id = ?').get(id) as { path: string } | undefined
    if (!row || !row.path) return null

    // 1. Check for sidecar .lrc file beside track.path
    const lrcPath = row.path.replace(/\.[^.]+$/, '.lrc')
    if (existsSync(lrcPath)) {
      try {
        const content = await readFile(lrcPath, 'utf-8')
        if (content && content.trim().length > 0) {
          return content
        }
      } catch (err) {
        console.error('[Library] Failed to read sidecar lyrics:', err)
      }
    }

    // 2. Parse embedded lyrics via music-metadata
    try {
      const metadata = await parseFile(row.path, { duration: false, skipCovers: true })
      const lyrics = metadata.common.lyrics
      if (lyrics && lyrics.length > 0) {
        const item = lyrics[0]
        if (item.syncText && item.syncText.length > 0) {
          const lines = item.syncText.map((s) => {
            const totalSecs = (s.timestamp || 0) / 1000
            const m = Math.floor(totalSecs / 60).toString().padStart(2, '0')
            const sec = Math.floor(totalSecs % 60).toString().padStart(2, '0')
            const ms = Math.floor((totalSecs % 1) * 100).toString().padStart(2, '0')
            return `[${m}:${sec}.${ms}] ${s.text || ''}`
          })
          return lines.join('\n')
        }
        if (item.text && item.text.trim().length > 0) {
          return item.text
        }
      }

      if (metadata.native) {
        for (const tagGroup of Object.values(metadata.native)) {
          for (const tag of tagGroup) {
            const idUpper = tag.id?.toUpperCase()
            if (idUpper === 'USLT' || idUpper === 'LYRICS' || idUpper === 'UNSYNCEDLYRICS') {
              const val = typeof tag.value === 'string' ? tag.value : (tag.value as any)?.text
              if (val && val.trim().length > 0) return val
            }
          }
        }
      }
    } catch (err) {
      console.error('[Library] Failed to extract embedded lyrics:', err)
    }

    return null
  })

  // Get saved music folders
  ipc.handle('library:getFolders', () => {
    return (getSetting('music_folders') as string[]) || []
  })

  // Remove a music folder and its tracks
  ipc.handle('library:removeFolder', (_, folderPath: string) => {
    db.prepare('DELETE FROM tracks WHERE path LIKE ?').run(`${folderPath}%`)
    const folders = (getSetting('music_folders') as string[]) || []
    const updated = folders.filter((f) => f !== folderPath)
    setSetting('music_folders', updated)
    updateWatchedFolders(updated)
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

  // Robust Cross-Album Duplicate Scanner: Remove duplicates keeping best quality
  ipc.handle('library:removeDuplicates', () => {
    const rows = db.prepare(`
      SELECT id, path, title, artist, duration, bit_depth as bitDepth, sample_rate as sampleRate, bitrate, format
      FROM tracks ORDER BY title COLLATE NOCASE, artist COLLATE NOCASE
    `).all() as any[]

    const clusters = clusterDuplicateTracks(rows)
    let removed = 0
    const deleteStmt = db.prepare('DELETE FROM tracks WHERE id = ?')

    for (const cluster of clusters) {
      for (const dup of cluster.duplicates) {
        deleteStmt.run(dup.id)
        removed++
      }
    }

    return { removed, total: rows.length }
  })

  // Robust Cross-Album Duplicate Scanner: Preview duplicate count
  ipc.handle('library:findDuplicates', () => {
    const rows = db.prepare(`
      SELECT id, path, title, artist, duration, bit_depth as bitDepth, sample_rate as sampleRate, bitrate, format
      FROM tracks ORDER BY title COLLATE NOCASE, artist COLLATE NOCASE
    `).all() as any[]

    const clusters = clusterDuplicateTracks(rows)
    let count = 0
    for (const cluster of clusters) {
      count += cluster.duplicates.length
    }
    return { duplicateCount: count }
  })
}
