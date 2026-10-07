import { ipcMain as IpcMain } from 'electron'
import { randomUUID } from 'crypto'
import { getDb } from '../db'
import type { Track, Playlist } from '../../../shared/types'
import { sanitizeSqlFilter } from '../lib/sqlSanitizer'

export function registerPlaylistsHandlers(ipc: typeof IpcMain): void {
  const db = getDb()

  // Create a new static playlist
  ipc.handle('playlists:create', (_, name: string) => {
    const id = randomUUID()
    db.prepare("INSERT INTO playlists (id, name, type) VALUES (?, ?, 'static')").run(id, name)
    return id
  })

  // Create a new smart dynamic playlist
  ipc.handle(
    'playlists:createSmart',
    (
      _,
      params: { name: string; ruleJson?: string; sqlFilter: string; icon?: string }
    ) => {
      const id = randomUUID()
      const safeFilter = sanitizeSqlFilter(params.sqlFilter)
      db.prepare(`
        INSERT INTO playlists (id, name, type, rule_json, sql_filter, icon)
        VALUES (?, ?, 'smart', ?, ?, ?)
      `).run(id, params.name, params.ruleJson || null, safeFilter, params.icon || 'Sparkles')
      return id
    }
  )

  // Delete a playlist
  ipc.handle('playlists:delete', (_, id: string) => {
    db.prepare('DELETE FROM playlists WHERE id = ?').run(id)
  })

  // Get all playlists (with dynamic counts for smart playlists)
  ipc.handle('playlists:getAll', () => {
    const rows = db.prepare(`
      SELECT p.id, p.name, p.type, p.rule_json as ruleJson, p.sql_filter as sqlFilter, p.icon,
             p.created_at as createdAt, COUNT(pt.id) as trackCount
      FROM playlists p
      LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).all() as (Playlist & { type?: string; sqlFilter?: string })[]

    return rows.map((p) => {
      if (p.type === 'smart' && p.sqlFilter) {
        try {
          const safeFilter = sanitizeSqlFilter(p.sqlFilter)
          const countRow = db
            .prepare(`SELECT COUNT(*) as count FROM tracks WHERE ${safeFilter}`)
            .get() as { count: number }
          return { ...p, trackCount: countRow?.count ?? 0 }
        } catch (err) {
          console.error('[Playlists] Error counting smart playlist tracks:', err)
          return { ...p, trackCount: 0 }
        }
      }
      return p
    })
  })

  // Get tracks for a playlist (dynamically queried if smart)
  ipc.handle('playlists:getTracks', (_, playlistId: string) => {
    const playlist = db
      .prepare('SELECT id, type, sql_filter as sqlFilter FROM playlists WHERE id = ?')
      .get(playlistId) as { id: string; type: string; sqlFilter?: string } | undefined

    if (playlist && playlist.type === 'smart' && playlist.sqlFilter) {
      const safeFilter = sanitizeSqlFilter(playlist.sqlFilter)
      try {
        const rows = db.prepare(`
          SELECT id, 'local' as source, path, title, artist, album, album_artist as albumArtist, year, genre,
                 duration, format, bit_depth as bitDepth, sample_rate as sampleRate, bitrate, play_count as playCount,
                 is_favorite as isFavorite, content_type as contentType, is_instrumental as isInstrumental,
                 is_live as isLive, mood, ai_tags as aiTags
          FROM tracks
          WHERE ${safeFilter}
          ORDER BY artist, album, title
        `).all() as any[]

        return rows.map((r) => ({
          ...r,
          isInstrumental: Boolean(r.isInstrumental),
          isLive: Boolean(r.isLive),
          aiTags: r.aiTags ? JSON.parse(r.aiTags) : []
        })) as Track[]
      } catch (err) {
        console.error('[Playlists] Error evaluating smart playlist filter:', err)
        return []
      }
    }

    // Static playlist tracks
    const rows = db.prepare(`
      SELECT id as playlistTrackId, track_json
      FROM playlist_tracks
      WHERE playlist_id = ?
      ORDER BY position ASC
    `).all() as { playlistTrackId: string; track_json: string }[]

    return rows
      .map((r) => {
        try {
          const track = JSON.parse(r.track_json) as Track
          return { ...track, playlistTrackId: r.playlistTrackId }
        } catch (e) {
          return null
        }
      })
      .filter(Boolean)
  })

  // Add a track to a playlist
  ipc.handle('playlists:addTrack', (_, playlistId: string, track: Track) => {
    const id = randomUUID()

    const maxPosRow = db
      .prepare('SELECT MAX(position) as maxPos FROM playlist_tracks WHERE playlist_id = ?')
      .get(playlistId) as { maxPos: number | null }
    const position = (maxPosRow.maxPos ?? 0) + 1

    db.prepare(`
      INSERT INTO playlist_tracks (id, playlist_id, track_id, track_json, position)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, playlistId, track.id, JSON.stringify(track), position)

    return id
  })

  // Remove a track from a playlist
  ipc.handle('playlists:removeTrack', (_, playlistTrackId: string) => {
    db.prepare('DELETE FROM playlist_tracks WHERE id = ?').run(playlistTrackId)
  })
}
