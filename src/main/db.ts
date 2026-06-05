import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import type { EQBands } from '../../shared/types'

let db: Database.Database

export function initDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'aura.db')
  db = new Database(dbPath, { timeout: 5000 })
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL UNIQUE,
      title TEXT,
      artist TEXT,
      album TEXT,
      album_artist TEXT,
      year INTEGER,
      genre TEXT,
      duration REAL,
      artwork TEXT,
      format TEXT,
      bit_depth INTEGER,
      sample_rate INTEGER,
      bitrate INTEGER,
      play_count INTEGER DEFAULT 0,
      is_favorite BOOLEAN DEFAULT 0,
      added_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS playlist_tracks (
      playlist_id TEXT REFERENCES playlists(id) ON DELETE CASCADE,
      track_id TEXT REFERENCES tracks(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      PRIMARY KEY (playlist_id, track_id)
    );

    CREATE TABLE IF NOT EXISTS eq_presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      bands TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS device_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_label TEXT NOT NULL UNIQUE,
      preset_id TEXT,
      preset_name TEXT,
      bands TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Insert default flat EQ preset if not exists
    INSERT OR IGNORE INTO eq_presets (id, name, bands) VALUES (
      'flat',
      'Flat (Default)',
      '{"32":0,"64":0,"125":0,"250":0,"500":0,"1000":0,"2000":0,"4000":0,"8000":0,"16000":0}'
    );

    -- Insert default theme settings
    INSERT OR IGNORE INTO app_settings (key, value) VALUES ('theme_mode', '"dark"');
    INSERT OR IGNORE INTO app_settings (key, value) VALUES ('accent_color', '"#c084fc"');
    INSERT OR IGNORE INTO app_settings (key, value) VALUES ('accent2_color', '"#67e8f9"');
    INSERT OR IGNORE INTO app_settings (key, value) VALUES ('volume', '0.8');
    INSERT OR IGNORE INTO app_settings (key, value) VALUES ('active_eq_preset_id', '"flat"');
    INSERT OR IGNORE INTO app_settings (key, value) VALUES ('music_folders', '[]');
  `)

  // Migrations for existing DB
  try {
    db.exec('ALTER TABLE tracks ADD COLUMN play_count INTEGER DEFAULT 0;')
  } catch (e) { /* ignore */ }
  try {
    db.exec('ALTER TABLE tracks ADD COLUMN is_favorite BOOLEAN DEFAULT 0;')
  } catch (e) { /* ignore */ }

  // Clear base64 artworks to fix 2GB freeze
  const hasArtworks = db.prepare('SELECT 1 FROM tracks WHERE artwork IS NOT NULL LIMIT 1').get()
  if (hasArtworks) {
    console.log('[DB] Clearing base64 artworks to reclaim memory/disk space...')
    db.exec('UPDATE tracks SET artwork = NULL;')
    db.exec('VACUUM;')
    console.log('[DB] Migration complete.')
  }
}

export function getDb(): Database.Database {
  return db
}

export function getSetting(key: string): unknown | null {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  if (!row || !row.value) return null
  try {
    return JSON.parse(row.value)
  } catch (e) {
    return null
  }
}

export function setSetting(key: string, value: unknown): void {
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)').run(
    key,
    JSON.stringify(value)
  )
}

export function getEQBandsFromPreset(presetId: string): EQBands {
  const row = db.prepare('SELECT bands FROM eq_presets WHERE id = ?').get(presetId) as
    | { bands: string }
    | undefined
  if (row) {
    return JSON.parse(row.bands) as EQBands
  }
  return { 32: 0, 64: 0, 125: 0, 250: 0, 500: 0, 1000: 0, 2000: 0, 4000: 0, 8000: 0, 16000: 0 }
}
