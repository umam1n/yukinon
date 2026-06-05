import { BrowserWindow, ipcMain as IpcMain } from 'electron'
import { randomUUID } from 'crypto'
import { getDb, getSetting, setSetting, getEQBandsFromPreset } from '../db'
import type { EQPreset, EQBands } from '../../../shared/types'

export function registerEQHandlers(ipc: typeof IpcMain, mainWindow: BrowserWindow): void {
  const db = getDb()

  // Get current EQ bands
  ipc.handle('eq:getBands', (): EQBands => {
    const activePresetId = getSetting('active_eq_preset_id') || 'flat'
    return getEQBandsFromPreset(activePresetId)
  })

  // Set a single EQ band gain
  ipc.handle('eq:setBand', (_, band: number, gain: number) => {
    // Update the active preset's bands on the fly
    const activePresetId = getSetting('active_eq_preset_id') || 'flat'
    const bands = getEQBandsFromPreset(activePresetId)
    bands[band as keyof EQBands] = gain
    // Save as a custom variation
    db.prepare('UPDATE eq_presets SET bands = ? WHERE id = ?').run(
      JSON.stringify(bands),
      activePresetId
    )
    // Notify renderer to update EQ
    mainWindow.webContents.send('eq:bandsChanged', bands)
  })

  // Apply a full preset
  ipc.handle('eq:applyPreset', (_, presetId: string) => {
    setSetting('active_eq_preset_id', presetId)
    const bands = getEQBandsFromPreset(presetId)
    mainWindow.webContents.send('eq:bandsChanged', bands)
    return bands
  })

  // Get all saved presets
  ipc.handle('eq:getPresets', (): EQPreset[] => {
    const rows = db.prepare('SELECT id, name, bands FROM eq_presets ORDER BY created_at').all() as {
      id: string
      name: string
      bands: string
    }[]
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      bands: JSON.parse(r.bands) as EQBands,
      isLocal: true
    }))
  })

  // Save a new preset
  ipc.handle('eq:savePreset', (_, name: string, bands: EQBands): EQPreset => {
    const id = randomUUID()
    db.prepare('INSERT INTO eq_presets (id, name, bands) VALUES (?, ?, ?)').run(
      id,
      name,
      JSON.stringify(bands)
    )
    return { id, name, bands, isLocal: true }
  })

  // Delete a preset
  ipc.handle('eq:deletePreset', (_, id: string) => {
    if (id === 'flat') return // Can't delete the default preset
    db.prepare('DELETE FROM eq_presets WHERE id = ?').run(id)
    // If it was the active preset, revert to flat
    if (getSetting('active_eq_preset_id') === id) {
      setSetting('active_eq_preset_id', 'flat')
    }
  })

  // Get active preset ID
  ipc.handle('eq:getActivePresetId', () => {
    return getSetting('active_eq_preset_id') || 'flat'
  })

  // Apply flat EQ (reset)
  ipc.handle('eq:flatten', () => {
    const flat: EQBands = { 32: 0, 64: 0, 125: 0, 250: 0, 500: 0, 1000: 0, 2000: 0, 4000: 0, 8000: 0, 16000: 0 }
    setSetting('active_eq_preset_id', 'flat')
    mainWindow.webContents.send('eq:bandsChanged', flat)
    return flat
  })
}
