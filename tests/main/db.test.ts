import { describe, it, expect } from 'vitest'
import { DB_SCHEMA_SQL } from '@main/db'

describe('Database Schema & Optimization Specifications', () => {
  it('defines the core audio library tables', () => {
    expect(DB_SCHEMA_SQL).toContain('CREATE TABLE IF NOT EXISTS tracks')
    expect(DB_SCHEMA_SQL).toContain('CREATE TABLE IF NOT EXISTS playlists')
    expect(DB_SCHEMA_SQL).toContain('CREATE TABLE IF NOT EXISTS playlist_tracks')
    expect(DB_SCHEMA_SQL).toContain('CREATE TABLE IF NOT EXISTS eq_presets')
    expect(DB_SCHEMA_SQL).toContain('CREATE TABLE IF NOT EXISTS device_profiles')
    expect(DB_SCHEMA_SQL).toContain('CREATE TABLE IF NOT EXISTS app_settings')
  })

  it('defines high-performance foreign keys and indexes', () => {
    // Playlist tracks index to optimize playlist loading
    expect(DB_SCHEMA_SQL).toContain('CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id)')
    // Composite index on library sorting
    expect(DB_SCHEMA_SQL).toContain('CREATE INDEX IF NOT EXISTS idx_tracks_library ON tracks(artist, album, title)')
  })

  it('enforces required columns and types in tracks table', () => {
    const requiredColumns = [
      'id TEXT PRIMARY KEY',
      'path TEXT NOT NULL UNIQUE',
      'title TEXT',
      'artist TEXT',
      'album TEXT',
      'duration REAL',
      'format TEXT',
      'bit_depth INTEGER',
      'sample_rate INTEGER',
      'play_count INTEGER DEFAULT 0',
      'is_favorite BOOLEAN DEFAULT 0'
    ]

    for (const col of requiredColumns) {
      expect(DB_SCHEMA_SQL).toContain(col)
    }
  })

  it('configures cascade deletion for playlist track relations', () => {
    expect(DB_SCHEMA_SQL).toContain('REFERENCES playlists(id) ON DELETE CASCADE')
  })
})
