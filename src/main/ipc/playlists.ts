import { ipcMain as IpcMain } from 'electron'
import { randomUUID } from 'crypto'
import { getDb } from '../db'
import type { Track } from '../../../shared/types'

export interface Playlist {
  id: string
  name: string
  createdAt: string
  trackCount: number
}

export function registerPlaylistsHandlers(ipc: typeof IpcMain): void {
  const db = getDb()

  // Create a new playlist
  ipc.handle('playlists:create', (_, name: string) => {
    const id = randomUUID()
    db.prepare('INSERT INTO playlists (id, name) VALUES (?, ?)').run(id, name)
    return id
  })

  // Delete a playlist
  ipc.handle('playlists:delete', (_, id: string) => {
    db.prepare('DELETE FROM playlists WHERE id = ?').run(id)
  })

  // Get all playlists
  ipc.handle('playlists:getAll', () => {
    const rows = db.prepare(`
      SELECT p.id, p.name, p.created_at as createdAt, COUNT(pt.id) as trackCount
      FROM playlists p
      LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).all()
    return rows as Playlist[]
  })

  // Get tracks for a playlist
  ipc.handle('playlists:getTracks', (_, playlistId: string) => {
    const rows = db.prepare(`
      SELECT id as playlistTrackId, track_json
      FROM playlist_tracks
      WHERE playlist_id = ?
      ORDER BY position ASC
    `).all() as { playlistTrackId: string; track_json: string }[]

    // Parse JSON into Track objects, and inject the playlistTrackId
    return rows.map(r => {
      try {
        const track = JSON.parse(r.track_json) as Track
        return { ...track, playlistTrackId: r.playlistTrackId }
      } catch (e) {
        return null
      }
    }).filter(Boolean)
  })

  // Add a track to a playlist
  ipc.handle('playlists:addTrack', (_, playlistId: string, track: Track) => {
    const id = randomUUID()
    
    // Get max position to append to the end
    const maxPosRow = db.prepare('SELECT MAX(position) as maxPos FROM playlist_tracks WHERE playlist_id = ?').get(playlistId) as { maxPos: number | null }
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
