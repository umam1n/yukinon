import { describe, it, expect } from 'vitest'

export interface AppSettings {
  theme_mode: 'dark' | 'light'
  accent_color: string
  accent2_color: string
  volume: number
  active_eq_preset_id: string
  music_folders: string[]
  global_hotkeys: boolean
  always_on_top: boolean
  render_album_art: boolean
  reduce_blur: boolean
  active_modules: {
    ytm: boolean
    radio: boolean
    subsonic: boolean
    jellyfin: boolean
  }
}

export interface HotkeysConfig {
  playPause: string
  nextTrack: string
  prevTrack: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme_mode: 'dark',
  accent_color: '#c084fc',
  accent2_color: '#67e8f9',
  volume: 0.8,
  active_eq_preset_id: 'flat',
  music_folders: [],
  global_hotkeys: true,
  always_on_top: false,
  render_album_art: true,
  reduce_blur: false,
  active_modules: {
    ytm: false,
    radio: false,
    subsonic: false,
    jellyfin: false
  }
}

export const DEFAULT_HOTKEYS: HotkeysConfig = {
  playPause: 'MediaPlayPause',
  nextTrack: 'MediaNextTrack',
  prevTrack: 'MediaPreviousTrack'
}

export function validateSetting(key: string, value: unknown): boolean {
  switch (key) {
    case 'theme_mode':
      return value === 'dark' || value === 'light'
    case 'accent_color':
    case 'accent2_color':
      return typeof value === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
    case 'volume':
      return typeof value === 'number' && !isNaN(value) && value >= 0 && value <= 1
    case 'active_eq_preset_id':
      return typeof value === 'string' && value.trim().length > 0
    case 'music_folders':
      return Array.isArray(value) && value.every((f) => typeof f === 'string')
    case 'global_hotkeys':
    case 'always_on_top':
    case 'render_album_art':
    case 'reduce_blur':
      return typeof value === 'boolean' || value === 0 || value === 1
    case 'active_modules':
      if (typeof value !== 'object' || value === null) return false
      const v = value as Record<string, unknown>
      return (
        typeof v.ytm === 'boolean' &&
        typeof v.radio === 'boolean' &&
        typeof v.subsonic === 'boolean' &&
        typeof v.jellyfin === 'boolean'
      )
    default:
      return false
  }
}

export function validateHotkeys(hotkeys: unknown): boolean {
  if (typeof hotkeys !== 'object' || hotkeys === null) return false
  const h = hotkeys as Record<string, unknown>
  const required = ['playPause', 'nextTrack', 'prevTrack']
  return required.every((k) => typeof h[k] === 'string' && (h[k] as string).trim().length > 0)
}

describe('Settings & Hotkeys Validation', () => {
  describe('Setting Defaults', () => {
    it('has dark mode as default theme', () => {
      expect(DEFAULT_SETTINGS.theme_mode).toBe('dark')
    })

    it('has standard Yukinon accent colors', () => {
      expect(DEFAULT_SETTINGS.accent_color).toBe('#c084fc')
      expect(DEFAULT_SETTINGS.accent2_color).toBe('#67e8f9')
    })

    it('has initial volume set to 0.8 (80%)', () => {
      expect(DEFAULT_SETTINGS.volume).toBe(0.8)
    })

    it('defaults active EQ preset to flat', () => {
      expect(DEFAULT_SETTINGS.active_eq_preset_id).toBe('flat')
    })

    it('defaults global hotkeys to enabled and always_on_top to disabled', () => {
      expect(DEFAULT_SETTINGS.global_hotkeys).toBe(true)
      expect(DEFAULT_SETTINGS.always_on_top).toBe(false)
    })

    it('defaults render_album_art to true and reduce_blur to false', () => {
      expect(DEFAULT_SETTINGS.render_album_art).toBe(true)
      expect(DEFAULT_SETTINGS.reduce_blur).toBe(false)
    })

    it('initializes integrations and music folders as empty/disabled', () => {
      expect(DEFAULT_SETTINGS.music_folders).toEqual([])
      expect(DEFAULT_SETTINGS.active_modules).toEqual({
        ytm: false,
        radio: false,
        subsonic: false,
        jellyfin: false
      })
    })
  })

  describe('Hotkeys Mapping', () => {
    it('provides standard media key mappings by default', () => {
      expect(DEFAULT_HOTKEYS.playPause).toBe('MediaPlayPause')
      expect(DEFAULT_HOTKEYS.nextTrack).toBe('MediaNextTrack')
      expect(DEFAULT_HOTKEYS.prevTrack).toBe('MediaPreviousTrack')
    })

    it('validates complete hotkeys configurations', () => {
      expect(validateHotkeys(DEFAULT_HOTKEYS)).toBe(true)
      expect(
        validateHotkeys({
          playPause: 'Ctrl+Alt+Space',
          nextTrack: 'Ctrl+Alt+Right',
          prevTrack: 'Ctrl+Alt+Left'
        })
      ).toBe(true)
    })

    it('rejects invalid or incomplete hotkey configurations', () => {
      expect(validateHotkeys(null)).toBe(false)
      expect(validateHotkeys({ playPause: 'Space' })).toBe(false)
      expect(validateHotkeys({ playPause: '', nextTrack: 'F1', prevTrack: 'F2' })).toBe(false)
    })
  })

  describe('Settings Key-Value Validation', () => {
    it('validates theme mode values', () => {
      expect(validateSetting('theme_mode', 'dark')).toBe(true)
      expect(validateSetting('theme_mode', 'light')).toBe(true)
      expect(validateSetting('theme_mode', 'solarized')).toBe(false)
      expect(validateSetting('theme_mode', 123)).toBe(false)
    })

    it('validates hex accent color strings', () => {
      expect(validateSetting('accent_color', '#c084fc')).toBe(true)
      expect(validateSetting('accent_color', '#fff')).toBe(true)
      expect(validateSetting('accent_color', 'purple')).toBe(false)
      expect(validateSetting('accent_color', '#1234567')).toBe(false)
    })

    it('validates volume range [0.0, 1.0]', () => {
      expect(validateSetting('volume', 0)).toBe(true)
      expect(validateSetting('volume', 0.5)).toBe(true)
      expect(validateSetting('volume', 1)).toBe(true)
      expect(validateSetting('volume', -0.1)).toBe(false)
      expect(validateSetting('volume', 1.1)).toBe(false)
      expect(validateSetting('volume', '0.8')).toBe(false)
    })

    it('validates music folders list', () => {
      expect(validateSetting('music_folders', ['/home/music', '/media/songs'])).toBe(true)
      expect(validateSetting('music_folders', [])).toBe(true)
      expect(validateSetting('music_folders', 'single_folder')).toBe(false)
      expect(validateSetting('music_folders', [123])).toBe(false)
    })

    it('validates active modules configuration object', () => {
      expect(
        validateSetting('active_modules', {
          ytm: true,
          radio: false,
          subsonic: false,
          jellyfin: true
        })
      ).toBe(true)
      expect(validateSetting('active_modules', { ytm: 'yes' })).toBe(false)
      expect(validateSetting('active_modules', null)).toBe(false)
    })

    it('validates performance settings (render_album_art, reduce_blur)', () => {
      expect(validateSetting('render_album_art', true)).toBe(true)
      expect(validateSetting('render_album_art', false)).toBe(true)
      expect(validateSetting('render_album_art', 1)).toBe(true)
      expect(validateSetting('render_album_art', 0)).toBe(true)
      expect(validateSetting('render_album_art', 'yes')).toBe(false)

      expect(validateSetting('reduce_blur', true)).toBe(true)
      expect(validateSetting('reduce_blur', false)).toBe(true)
      expect(validateSetting('reduce_blur', 1)).toBe(true)
      expect(validateSetting('reduce_blur', 0)).toBe(true)
      expect(validateSetting('reduce_blur', null)).toBe(false)
    })
  })
})
