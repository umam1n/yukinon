import { ipcMain as IpcMain } from 'electron'
import { getDb } from '../db'
import type { DeviceProfile, EQBands } from '../../../shared/types'

const FLAT_BANDS: EQBands = { 32: 0, 64: 0, 125: 0, 250: 0, 500: 0, 1000: 0, 2000: 0, 4000: 0, 8000: 0, 16000: 0 }

export function registerDeviceHandlers(ipc: typeof IpcMain): void {
  const db = getDb()

  // Get EQ profile for a specific device
  ipc.handle('devices:getProfile', (_, deviceLabel: string): DeviceProfile | null => {
    const row = db
      .prepare('SELECT * FROM device_profiles WHERE device_label = ?')
      .get(deviceLabel) as
      | { id: number; device_label: string; preset_id: string | null; preset_name: string | null; bands: string }
      | undefined

    if (!row) return null

    return {
      id: row.id,
      deviceLabel: row.device_label,
      presetId: row.preset_id,
      presetName: row.preset_name,
      bands: JSON.parse(row.bands) as EQBands
    }
  })

  // Save/update EQ profile for a device
  ipc.handle(
    'devices:saveProfile',
    (_, deviceLabel: string, presetId: string | null, presetName: string | null, bands: EQBands) => {
      db.prepare(`
        INSERT INTO device_profiles (device_label, preset_id, preset_name, bands)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(device_label) DO UPDATE SET
          preset_id = excluded.preset_id,
          preset_name = excluded.preset_name,
          bands = excluded.bands
      `).run(deviceLabel, presetId, presetName, JSON.stringify(bands))
    }
  )

  // List all saved device profiles
  ipc.handle('devices:listProfiles', (): DeviceProfile[] => {
    const rows = db.prepare('SELECT * FROM device_profiles').all() as {
      id: number
      device_label: string
      preset_id: string | null
      preset_name: string | null
      bands: string
    }[]
    return rows.map((r) => ({
      id: r.id,
      deviceLabel: r.device_label,
      presetId: r.preset_id,
      presetName: r.preset_name,
      bands: JSON.parse(r.bands) as EQBands
    }))
  })

  // Delete a device profile
  ipc.handle('devices:deleteProfile', (_, deviceLabel: string) => {
    db.prepare('DELETE FROM device_profiles WHERE device_label = ?').run(deviceLabel)
  })
}
