import { BrowserWindow, ipcMain as IpcMain } from 'electron'
import { getSetting, setSetting } from '../db'
import type { AppTheme } from '../../../shared/types'

export function registerThemeHandlers(ipc: typeof IpcMain, mainWindow: BrowserWindow): void {
  ipc.handle('theme:get', (): AppTheme => {
    return {
      mode: (getSetting('theme_mode') as 'dark' | 'light') || 'dark',
      accentColor: getSetting('accent_color') || '#c084fc',
      accent2Color: getSetting('accent2_color') || '#67e8f9'
    }
  })

  ipc.handle('theme:set', (_, theme: Partial<AppTheme>) => {
    if (theme.mode !== undefined) setSetting('theme_mode', theme.mode)
    if (theme.accentColor !== undefined) setSetting('accent_color', theme.accentColor)
    if (theme.accent2Color !== undefined) setSetting('accent2_color', theme.accent2Color)
    mainWindow.webContents.send('theme:changed', theme)
  })
}
