import { contextBridge, ipcRenderer } from 'electron'

// Expose typed IPC API to the renderer process
const api = {
  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  },

  // Library
  library: {
    selectFolder: () => ipcRenderer.invoke('library:selectFolder'),
    scan: (folderPath: string) => ipcRenderer.invoke('library:scan', folderPath),
    getTracks: () => ipcRenderer.invoke('library:getTracks'),
    getTrack: (id: string) => ipcRenderer.invoke('library:getTrack', id),
    getTrackArtwork: (id: string) => ipcRenderer.invoke('library:getTrackArtwork', id),
    getLyrics: (id: string) => ipcRenderer.invoke('library:getLyrics', id),
    removeTrack: (id: string) => ipcRenderer.invoke('library:removeTrack', id),
    getFolders: () => ipcRenderer.invoke('library:getFolders'),
    removeFolder: (folderPath: string) => ipcRenderer.invoke('library:removeFolder', folderPath),
    findDuplicates: () => ipcRenderer.invoke('library:findDuplicates'),
    removeDuplicates: () => ipcRenderer.invoke('library:removeDuplicates')
  },

  // Equalizer
  eq: {
    getBands: () => ipcRenderer.invoke('eq:getBands'),
    setBand: (band: number, gain: number) => ipcRenderer.invoke('eq:setBand', band, gain),
    applyPreset: (presetId: string) => ipcRenderer.invoke('eq:applyPreset', presetId),
    getPresets: () => ipcRenderer.invoke('eq:getPresets'),
    savePreset: (name: string, bands: object) => ipcRenderer.invoke('eq:savePreset', name, bands),
    deletePreset: (id: string) => ipcRenderer.invoke('eq:deletePreset', id),
    getActivePresetId: () => ipcRenderer.invoke('eq:getActivePresetId'),
    flatten: () => ipcRenderer.invoke('eq:flatten'),
    onBandsChanged: (callback: (bands: object) => void) => {
      const sub = (_: Electron.IpcRendererEvent, bands: object) => callback(bands)
      ipcRenderer.on('eq:bandsChanged', sub)
      return () => ipcRenderer.removeListener('eq:bandsChanged', sub)
    }
  },

  // Device profiles
  devices: {
    getProfile: (deviceLabel: string) => ipcRenderer.invoke('devices:getProfile', deviceLabel),
    saveProfile: (
      deviceLabel: string,
      presetId: string | null,
      presetName: string | null,
      bands: object
    ) => ipcRenderer.invoke('devices:saveProfile', deviceLabel, presetId, presetName, bands),
    listProfiles: () => ipcRenderer.invoke('devices:listProfiles'),
    deleteProfile: (deviceLabel: string) => ipcRenderer.invoke('devices:deleteProfile', deviceLabel)
  },

  // YouTube Music
  ytm: {
    navigate: (url: string) => ipcRenderer.invoke('ytm:navigate', url),
    show: () => ipcRenderer.invoke('ytm:show'),
    hide: () => ipcRenderer.invoke('ytm:hide'),
    playPause: () => ipcRenderer.invoke('ytm:playPause'),
    next: () => ipcRenderer.invoke('ytm:next'),
    prev: () => ipcRenderer.invoke('ytm:prev'),
    pause: () => ipcRenderer.invoke('ytm:pause'),
    shuffle: () => ipcRenderer.invoke('ytm:shuffle'),
    repeat: () => ipcRenderer.invoke('ytm:repeat'),
    setVolume: (v: number) => ipcRenderer.invoke('ytm:setVolume', v),
    setLock: (isLocked: boolean) => ipcRenderer.invoke('ytm:setLock', isLocked),
    setTheme: (accent: string, mode: string) => ipcRenderer.invoke('ytm:setTheme', accent, mode),
    seek: (pos: number) => ipcRenderer.invoke('ytm:seek', pos),
    onStateUpdate: (callback: (state: any) => void) => {
      ipcRenderer.on('ytm:state-update', (_event, state) => callback(state))
      return () => ipcRenderer.removeAllListeners('ytm:state-update')
    }
  },

  // Theme
  theme: {
    get: () => ipcRenderer.invoke('theme:get'),
    set: (theme: object) => ipcRenderer.invoke('theme:set', theme),
    onChange: (callback: (theme: object) => void) => {
      const sub = (_: Electron.IpcRendererEvent, theme: object) => callback(theme)
      ipcRenderer.on('theme:changed', sub)
      return () => ipcRenderer.removeListener('theme:changed', sub)
    }
  },

  // Media key events from main
  media: {
    onPlayPause: (cb: () => void) => {
      ipcRenderer.on('media:playPause', cb)
      return () => ipcRenderer.removeListener('media:playPause', cb)
    },
    onNext: (cb: () => void) => {
      ipcRenderer.on('media:next', cb)
      return () => ipcRenderer.removeListener('media:next', cb)
    },
    onPrev: (cb: () => void) => {
      ipcRenderer.on('media:prev', cb)
      return () => ipcRenderer.removeListener('media:prev', cb)
    }
  },

  // Utilities
  utils: {
    md5: (text: string) => ipcRenderer.invoke('utils:md5', text)
  },

  // Settings
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('settings:set', key, value)
  },

  platform: process.platform
}

contextBridge.exposeInMainWorld('yukinon', api)

// TypeScript declaration for the renderer
export type YukinonAPI = typeof api
