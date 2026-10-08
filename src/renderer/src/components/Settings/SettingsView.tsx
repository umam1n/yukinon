import React, { useState, useEffect } from 'react'
import {
  Moon,
  Sun,
  Palette,
  FolderOpen,
  Trash2,
  Info,
  RefreshCw,
  Copy,
  ShieldCheck,
  Blocks,
  Layers,
  Keyboard,
  Sparkles,
  Volume2,
  Sliders,
  Key,
  CheckCircle2,
  AlertCircle,
  Wand2,
  Youtube
} from 'lucide-react'
import { useApp } from '../../store/AppContext'

const ACCENT_PRESETS = [
  { label: 'Lavender', color: '#c084fc' },
  { label: 'Cyan', color: '#67e8f9' },
  { label: 'Rose', color: '#fb7185' },
  { label: 'Amber', color: '#fbbf24' },
  { label: 'Emerald', color: '#34d399' },
  { label: 'Indigo', color: '#818cf8' },
  { label: 'Peach', color: '#fdba74' },
  { label: 'Mint', color: '#86efac' }
]

type SettingsTab = 'general' | 'audio' | 'library' | 'appearance' | 'shortcuts'

const SETTINGS_TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <Layers size={14} /> },
  { id: 'audio', label: 'Audio', icon: <Volume2 size={14} /> },
  { id: 'library', label: 'Library', icon: <FolderOpen size={14} /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette size={14} /> },
  { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard size={14} /> }
]

export default function SettingsView(): React.ReactElement {
  const {
    theme,
    setTheme,
    tracks,
    setTracks,
    activeModules,
    setActiveModules,
    activeView,
    setActiveView,
    renderAlbumArt,
    setRenderAlbumArt,
    reduceBlur,
    setReduceBlur,
    eqPresets,
    activePresetId,
    replaygainEnabled,
    setReplayGainEnabled,
    replaygainPreamp,
    setReplayGainPreamp
  } = useApp()

  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [folders, setFolders] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [duplicateCount, setDuplicateCount] = useState<number | null>(null)
  const [removingDuplicates, setRemovingDuplicates] = useState(false)

  const [alwaysOnTop, setAlwaysOnTop] = useState(false)
  const [globalHotkeys, setGlobalHotkeys] = useState(true)
  const [customHotkeys, setCustomHotkeysState] = useState<{
    playPause: string
    nextTrack: string
    prevTrack: string
  }>({
    playPause: 'MediaPlayPause',
    nextTrack: 'MediaNextTrack',
    prevTrack: 'MediaPreviousTrack'
  })

  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceName, setSelectedDeviceName] = useState<string>('Default Output Device')

  // Gemini AI state
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [isSavingKey, setIsSavingKey] = useState(false)
  const [isTestingKey, setIsTestingKey] = useState(false)
  const [keyStatus, setKeyStatus] = useState<{ valid: boolean; message: string } | null>(null)
  const [isEnriching, setIsEnriching] = useState(false)

  // Load saved configurations on mount
  useEffect(() => {
    window.yukinon.library.getFolders().then((f) => setFolders(f as string[]))
    window.yukinon.window.getAlwaysOnTop().then((val) => setAlwaysOnTop(val))
    window.yukinon.window.getGlobalHotkeys().then((val) => setGlobalHotkeys(val))
    window.yukinon.window.getCustomHotkeys().then((val) => setCustomHotkeysState(val))
    window.yukinon.ai?.getApiKey().then((k: string) => setGeminiApiKey(k || ''))

    // Detect audio output devices
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const outputs = devices.filter((d) => d.kind === 'audiooutput')
        setOutputDevices(outputs)
        const primary =
          outputs.find((d) => d.deviceId !== 'default' && d.deviceId !== 'communications') ||
          outputs.find((d) => d.deviceId === 'default')
        if (primary?.label) {
          setSelectedDeviceName(primary.label)
        }
      })
    }
  }, [])

  const handleSaveApiKey = async () => {
    setIsSavingKey(true)
    try {
      await window.yukinon.ai.setApiKey(geminiApiKey)
      setNotification({ message: 'Gemini API key saved.', type: 'success' })
      setTimeout(() => setNotification(null), 3000)
    } finally {
      setIsSavingKey(false)
    }
  }

  const handleTestApiKey = async () => {
    setIsTestingKey(true)
    setKeyStatus(null)
    try {
      const res = await window.yukinon.ai.testKey(geminiApiKey)
      if (res.valid) {
        setKeyStatus({ valid: true, message: 'Valid Gemini API key!' })
      } else {
        setKeyStatus({ valid: false, message: res.error || 'Invalid API key' })
      }
    } catch (err: any) {
      setKeyStatus({ valid: false, message: err?.message || 'Connection failed' })
    } finally {
      setIsTestingKey(false)
    }
  }

  const handleEnrichLibrary = async () => {
    setIsEnriching(true)
    try {
      const res = await window.yukinon.ai.enrichTracksBatch()
      const updated = await window.yukinon.library.getTracks()
      setTracks(updated as any)
      setNotification({ message: res.message || `Enriched ${res.updatedCount} tracks.`, type: 'success' })
      setTimeout(() => setNotification(null), 4000)
    } catch (err: any) {
      setNotification({ message: err?.message || 'Failed to enrich tracks with AI.', type: 'error' })
      setTimeout(() => setNotification(null), 4000)
    } finally {
      setIsEnriching(false)
    }
  }

  const handleRemoveFolder = async (folder: string): Promise<void> => {
    await window.yukinon.library.removeFolder(folder)
    setFolders((prev) => prev.filter((f) => f !== folder))
  }

  const handleAddFolder = async () => {
    try {
      const folderPath = await window.yukinon.library.selectFolder()
      if (!folderPath) return

      setScanning(true)
      const result = (await window.yukinon.library.scan(folderPath)) as { added: number; total: number }
      const updated = (await window.yukinon.library.getTracks()) as any
      setTracks(updated)

      const newFolders = await window.yukinon.library.getFolders()
      setFolders(newFolders as string[])

      setNotification({
        message: `Scanned ${result.total} files, added ${result.added} new tracks.`,
        type: 'success'
      })
      setTimeout(() => setNotification(null), 4000)
    } catch (err) {
      console.error(err)
      setNotification({
        message: 'Failed to scan the folder.',
        type: 'error'
      })
      setTimeout(() => setNotification(null), 4000)
    } finally {
      setScanning(false)
    }
  }

  const handleFindDuplicates = async () => {
    const result = (await window.yukinon.library.findDuplicates()) as { duplicateCount: number }
    setDuplicateCount(result.duplicateCount)
    if (result.duplicateCount === 0) {
      setNotification({ message: 'No duplicate tracks found.', type: 'success' })
      setTimeout(() => setNotification(null), 4000)
    }
  }

  const handleRemoveDuplicates = async () => {
    setRemovingDuplicates(true)
    try {
      const result = (await window.yukinon.library.removeDuplicates()) as { removed: number; total: number }
      const updated = (await window.yukinon.library.getTracks()) as any
      setTracks(updated)
      setDuplicateCount(null)
      setNotification({
        message:
          result.removed > 0
            ? `Removed ${result.removed} duplicate track${result.removed > 1 ? 's' : ''}. Library refreshed.`
            : 'No duplicates found to remove.',
        type: 'success'
      })
      setTimeout(() => setNotification(null), 5000)
    } catch (err) {
      setNotification({ message: 'Failed to remove duplicates.', type: 'error' })
      setTimeout(() => setNotification(null), 4000)
    } finally {
      setRemovingDuplicates(false)
    }
  }

  const updateHotkey = async (action: 'playPause' | 'nextTrack' | 'prevTrack', e: React.KeyboardEvent) => {
    e.preventDefault()
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return

    const keys: string[] = []
    if (e.ctrlKey && !e.metaKey) keys.push('Ctrl')
    if (e.metaKey) keys.push('Cmd')
    if (e.altKey) keys.push('Alt')
    if (e.shiftKey) keys.push('Shift')

    let keyStr = ''
    if (e.code.startsWith('Key')) keyStr = e.code.replace('Key', '')
    else if (e.code.startsWith('Digit')) keyStr = e.code.replace('Digit', '')
    else if (e.code.startsWith('Arrow')) keyStr = e.code.replace('Arrow', '')
    else if (e.code.startsWith('F') && e.code.length <= 3) keyStr = e.code
    else if (e.code === 'Space') keyStr = 'Space'
    else if (e.code === 'Enter') keyStr = 'Enter'
    else if (e.code === 'Backspace') keyStr = 'Backspace'
    else if (e.code === 'Delete') keyStr = 'Delete'
    else if (e.code === 'Escape') keyStr = 'Esc'
    else if (e.code === 'Tab') keyStr = 'Tab'
    else if (e.key === 'MediaPlayPause') keyStr = 'MediaPlayPause'
    else if (e.key === 'MediaTrackNext') keyStr = 'MediaNextTrack'
    else if (e.key === 'MediaTrackPrevious') keyStr = 'MediaPreviousTrack'
    else return

    keys.push(keyStr)
    const hotkeyCombo = keys.join('+')

    const newHotkeys = { ...customHotkeys, [action]: hotkeyCombo }
    setCustomHotkeysState(newHotkeys)
    await window.yukinon.window.setCustomHotkeys(newHotkeys)
    setNotification({ message: `Updated hotkey to ${hotkeyCombo}`, type: 'success' })
    setTimeout(() => setNotification(null), 3000)
  }

  const activePreset = eqPresets.find((p) => p.id === activePresetId)

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: '24px',
        background: 'var(--bg)'
      }}
    >
      <div style={{ maxWidth: 640 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Settings</h2>

        {/* Tab Navigation Bar */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            borderBottom: '1px solid var(--border)',
            paddingBottom: 12,
            marginBottom: 24,
            overflowX: 'auto'
          }}
        >
          {SETTINGS_TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  background: isActive ? 'rgba(var(--color-accent-rgb), 0.15)' : 'transparent',
                  color: isActive ? 'var(--color-accent)' : 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--text)'
                    e.currentTarget.style.background = 'rgba(var(--color-accent-rgb), 0.05)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--text-muted)'
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Notification Toast */}
        {notification && (
          <div
            className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300"
            style={{
              background:
                notification.type === 'success' ? 'rgba(162, 238, 203, 0.08)' : 'rgba(248, 113, 113, 0.08)',
              borderColor:
                notification.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
              color: notification.type === 'success' ? '#34d399' : '#f87171',
              boxShadow:
                notification.type === 'success'
                  ? '0 10px 25px -5px rgba(16, 185, 129, 0.1), 0 8px 10px -6px rgba(16, 185, 129, 0.1)'
                  : '0 10px 25px -5px rgba(239, 68, 68, 0.1), 0 8px 10px -6px rgba(239, 68, 68, 0.1)'
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500 }}>{notification.message}</span>
          </div>
        )}

        {/* Tab Contents */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* 1. GENERAL TAB */}
          {activeTab === 'general' && (
            <>
              {/* Behavior */}
              <Section title="Behavior" icon={<Layers size={16} />}>
                <SettingRow label="Always on Top" description="Keep Yukinon visible over other applications">
                  <Toggle
                    checked={alwaysOnTop}
                    onChange={async () => {
                      const next = !alwaysOnTop
                      await window.yukinon.window.setAlwaysOnTop(next)
                      setAlwaysOnTop(next)
                    }}
                  />
                </SettingRow>
                <SettingRow
                  label="Global Hotkeys"
                  description="Allow keyboard shortcuts to control playback while app is in background"
                >
                  <Toggle
                    checked={globalHotkeys}
                    onChange={async () => {
                      const next = !globalHotkeys
                      await window.yukinon.window.setGlobalHotkeys(next)
                      setGlobalHotkeys(next)
                    }}
                  />
                </SettingRow>
              </Section>

              {/* Integrations */}
              <Section title="Integrations & Modules" icon={<Blocks size={16} />}>
                <SettingRow label="YouTube Music" description="Enable the embedded YouTube Music player">
                  <Toggle
                    checked={activeModules.ytm}
                    onChange={() => {
                      setActiveModules({ ytm: !activeModules.ytm })
                      if (activeView === 'ytm' && activeModules.ytm) setActiveView('library')
                    }}
                  />
                </SettingRow>

                {/* YouTube Music Card */}
                <div
                  style={{
                    margin: '8px 16px 16px 16px',
                    padding: '14px 16px',
                    borderRadius: 8,
                    background: 'var(--bg-3)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Youtube size={16} style={{ color: 'var(--color-accent)' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                      YouTube Music Authentication
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                    Launches a verified Google authorization session with automated bot-detection bypass. Once signed in, your YouTube Music library, playlists, and recommendations sync automatically.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    <button
                      onClick={async () => {
                        try {
                          await window.yukinon.ytm.openLogin()
                          setNotification({ message: 'Google Sign-In window opened.', type: 'success' })
                          setTimeout(() => setNotification(null), 3000)
                        } catch (err: any) {
                          setNotification({ message: err?.message || 'Failed to open login window', type: 'error' })
                          setTimeout(() => setNotification(null), 4000)
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 14px',
                        borderRadius: 6,
                        border: 'none',
                        background: 'var(--color-accent)',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <ShieldCheck size={14} />
                      Sign In to YouTube Music
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await window.yukinon.ytm.clearSession()
                          setNotification({ message: 'YouTube Music session and cache reset successfully.', type: 'success' })
                          setTimeout(() => setNotification(null), 3000)
                        } catch (err: any) {
                          setNotification({ message: err?.message || 'Failed to reset session', type: 'error' })
                          setTimeout(() => setNotification(null), 4000)
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 14px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      <RefreshCw size={13} />
                      Reset YTM Session & Cache
                    </button>
                  </div>
                </div>

                <SettingRow label="Internet Radio" description="Stream worldwide radio stations">
                  <Toggle
                    checked={activeModules.radio}
                    onChange={() => {
                      setActiveModules({ radio: !activeModules.radio })
                      if (activeView === 'radio' && activeModules.radio) setActiveView('library')
                    }}
                  />
                </SettingRow>
                <SettingRow
                  label="Navidrome / Subsonic"
                  description="Connect to your personal Subsonic API server"
                >
                  <Toggle
                    checked={activeModules.subsonic}
                    onChange={() => {
                      setActiveModules({ subsonic: !activeModules.subsonic })
                      if (activeView === 'subsonic' && activeModules.subsonic) setActiveView('library')
                    }}
                  />
                </SettingRow>
                <SettingRow label="Jellyfin" description="Connect to your Jellyfin media server">
                  <Toggle
                    checked={activeModules.jellyfin}
                    onChange={() => {
                      setActiveModules({ jellyfin: !activeModules.jellyfin })
                      if (activeView === 'jellyfin' && activeModules.jellyfin) setActiveView('library')
                    }}
                  />
                </SettingRow>
              </Section>

              {/* About */}
              <Section title="About" icon={<Info size={16} />}>
                <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.8 }}>
                  <p>
                    <strong style={{ color: 'var(--text)' }}>YUKINON</strong> v0.1.0
                  </p>
                  <p>Hybrid audiophile music player — local FLAC + YouTube Music</p>
                  <p style={{ marginTop: 8 }}>
                    Open source under the MIT license.{' '}
                    <a
                      href="https://github.com/umam1n/yukinon"
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--color-accent)', textDecoration: 'none' }}
                    >
                      View on GitHub
                    </a>
                  </p>
                  <p style={{ marginTop: 4, fontSize: 11, color: 'var(--text-dim)', opacity: 0.7 }}>
                    YouTube Music integration is for personal use only.
                  </p>
                </div>
              </Section>
            </>
          )}

          {/* 2. AUDIO TAB */}
          {activeTab === 'audio' && (
            <>
              {/* Audio & Device Settings */}
              <Section title="Audio & Output Devices" icon={<Volume2 size={16} />}>
                <SettingRow
                  label="Output Device"
                  description="Currently active audio playback interface"
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text)',
                      background: 'var(--bg-3)',
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      maxWidth: 220,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    title={selectedDeviceName}
                  >
                    {selectedDeviceName}
                  </span>
                </SettingRow>
                <SettingRow
                  label="Audio Pipeline"
                  description="Web Audio API DSP graph with 10 peaking filters and gain stages"
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--color-accent)',
                      fontFamily: 'JetBrains Mono, monospace',
                      background: 'rgba(var(--color-accent-rgb), 0.1)',
                      padding: '4px 8px',
                      borderRadius: 4
                    }}
                  >
                    10-Band EQ · 32-bit Float
                  </span>
                </SettingRow>
                <SettingRow
                  label="Latency Mode"
                  description="Buffer scheduling configuration for real-time playback"
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}
                  >
                    playback (interactive)
                  </span>
                </SettingRow>
              </Section>

              {/* Loudness Normalization (ReplayGain / EBU R128) */}
              <Section title="Loudness Normalization (ReplayGain / EBU R128)" icon={<Volume2 size={16} />}>
                <SettingRow
                  label="Loudness Normalization"
                  description="Prevents sudden volume jumps between tracks using studio loudness tags"
                >
                  <Toggle
                    checked={replaygainEnabled}
                    onChange={() => setReplayGainEnabled(!replaygainEnabled)}
                  />
                </SettingRow>
                <SettingRow
                  label="Preamp Offset"
                  description={`Adjust reference loudness calibration offset (${replaygainPreamp > 0 ? `+${replaygainPreamp}` : replaygainPreamp} dB)`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="range"
                      min="-6"
                      max="6"
                      step="0.5"
                      value={replaygainPreamp}
                      disabled={!replaygainEnabled}
                      onChange={(e) => setReplayGainPreamp(Number(e.target.value))}
                      style={{ width: 120, cursor: replaygainEnabled ? 'pointer' : 'not-allowed', opacity: replaygainEnabled ? 1 : 0.5 }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: 'JetBrains Mono, monospace',
                        minWidth: 48,
                        textAlign: 'right',
                        color: 'var(--text)'
                      }}
                    >
                      {replaygainPreamp > 0 ? `+${replaygainPreamp.toFixed(1)}` : `${replaygainPreamp.toFixed(1)}`} dB
                    </span>
                  </div>
                </SettingRow>
              </Section>

              {/* EQ Integration */}
              <Section title="EQ Integration" icon={<Sliders size={16} />}>
                <SettingRow
                  label="Equalizer Status"
                  description={
                    activePreset
                      ? `Active preset: ${activePreset.name}`
                      : 'Manual custom curve active'
                  }
                >
                  <button
                    onClick={() => setActiveView('eq')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 14px',
                      borderRadius: 6,
                      border: 'none',
                      background: 'var(--color-accent)',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Sliders size={13} />
                    Open Equalizer
                  </button>
                </SettingRow>
                <SettingRow
                  label="Frequency Coverage"
                  description="10 standard ISO octave-spaced frequency centers"
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-dim)',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}
                  >
                    32Hz · 64Hz · 125Hz · 250Hz · 500Hz · 1kHz · 2kHz · 4kHz · 8kHz · 16kHz
                  </span>
                </SettingRow>
              </Section>
            </>
          )}

          {/* 3. LIBRARY TAB */}
          {activeTab === 'library' && (
            <>
              {/* Music Folders */}
              <Section title="Music Library Folders" icon={<FolderOpen size={16} />}>
                <div style={{ padding: '0 16px 16px 16px' }}>
                  <button
                    onClick={handleAddFolder}
                    disabled={scanning}
                    title="Add music folder"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 16px',
                      borderRadius: 6,
                      border: 'none',
                      background: 'var(--color-accent)',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'opacity 0.15s',
                      marginBottom: 16
                    }}
                  >
                    {scanning ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <FolderOpen size={14} />
                    )}
                    {scanning ? 'Scanning...' : 'Add Folder'}
                  </button>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {folders.length === 0 ? (
                      <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>No folders added yet.</p>
                    ) : (
                      folders.map((folder) => (
                        <div
                          key={folder}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 12px',
                            background: 'var(--bg-3)',
                            border: '1px solid var(--border)',
                            borderRadius: 6
                          }}
                        >
                          <FolderOpen
                            size={14}
                            style={{ color: 'var(--color-accent)', flexShrink: 0 }}
                          />
                          <span
                            style={{
                              flex: 1,
                              fontSize: 12,
                              color: 'var(--text-muted)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontFamily: 'JetBrains Mono, monospace'
                            }}
                          >
                            {folder}
                          </span>
                          <button
                            onClick={() => handleRemoveFolder(folder)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-dim)',
                              padding: 2
                            }}
                            title="Remove folder"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Section>

              {/* Duplicate Management */}
              <Section title="Duplicates Removal" icon={<ShieldCheck size={16} />}>
                <SettingRow
                  label="Find Duplicate Tracks"
                  description="Scan library for tracks sharing matching title and artist"
                >
                  <button
                    onClick={handleFindDuplicates}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 14px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-3)',
                      color: 'var(--text)',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    <Copy size={13} />
                    {duplicateCount !== null ? `${duplicateCount} found` : 'Scan'}
                  </button>
                </SettingRow>
                {duplicateCount !== null && duplicateCount > 0 && (
                  <SettingRow
                    label="Remove Duplicates"
                    description={`Retain highest bit-depth/format, remove ${duplicateCount} duplicate${
                      duplicateCount > 1 ? 's' : ''
                    }`}
                  >
                    <button
                      onClick={handleRemoveDuplicates}
                      disabled={removingDuplicates}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 14px',
                        borderRadius: 6,
                        border: 'none',
                        background: '#ef4444',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: removingDuplicates ? 'not-allowed' : 'pointer',
                        opacity: removingDuplicates ? 0.6 : 1
                      }}
                    >
                      {removingDuplicates ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                      {removingDuplicates ? 'Removing...' : 'Remove Duplicates'}
                    </button>
                  </SettingRow>
                )}
              </Section>

              {/* Gemini AI & Smart Classification */}
              <Section title="AI & Semantic Classification (Gemini 2.5 Flash Free)" icon={<Sparkles size={16} />}>
                <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                      Google Gemini API Key
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="password"
                        placeholder="Enter your Gemini API key..."
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        style={{
                          flex: 1,
                          background: 'var(--bg-3)',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: '8px 12px',
                          fontSize: 12,
                          color: 'var(--text)',
                          outline: 'none',
                          fontFamily: 'JetBrains Mono, monospace'
                        }}
                      />
                      <button
                        onClick={handleSaveApiKey}
                        disabled={isSavingKey}
                        style={{
                          background: 'var(--color-accent)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '8px 14px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: isSavingKey ? 'not-allowed' : 'pointer',
                          opacity: isSavingKey ? 0.7 : 1
                        }}
                      >
                        {isSavingKey ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={handleTestApiKey}
                        disabled={isTestingKey || !geminiApiKey.trim()}
                        style={{
                          background: 'var(--bg-3)',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: '8px 14px',
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--text)',
                          cursor: isTestingKey || !geminiApiKey.trim() ? 'not-allowed' : 'pointer',
                          opacity: isTestingKey || !geminiApiKey.trim() ? 0.6 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        {isTestingKey ? <RefreshCw size={12} className="animate-spin" /> : <Key size={12} />}
                        Test
                      </button>
                    </div>

                    {keyStatus && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 12,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          color: keyStatus.valid ? '#34d399' : '#f87171'
                        }}
                      >
                        {keyStatus.valid ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        <span>{keyStatus.message}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          Enrich Library with AI
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                          Classify moods, acoustic styles, and semantic tags for tracks using Gemini Flash
                        </div>
                      </div>
                      <button
                        onClick={handleEnrichLibrary}
                        disabled={isEnriching}
                        style={{
                          background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '8px 16px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: isEnriching ? 'not-allowed' : 'pointer',
                          opacity: isEnriching ? 0.7 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        {isEnriching ? <RefreshCw size={13} className="animate-spin" /> : <Wand2 size={13} />}
                        {isEnriching ? 'Enriching...' : 'Enrich Library'}
                      </button>
                    </div>
                  </div>
                </div>
              </Section>

              {/* Scan Diagnostics */}
              <Section title="Scan Diagnostics" icon={<RefreshCw size={16} />}>
                <SettingRow
                  label="Indexed Tracks"
                  description="Total tracks registered in Yukinon SQLite storage"
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--color-accent)',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}
                  >
                    {tracks.length} tracks
                  </span>
                </SettingRow>
                <SettingRow
                  label="Monitored Folders"
                  description="Configured directory trees being scanned"
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text)',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}
                  >
                    {folders.length} folder{folders.length === 1 ? '' : 's'}
                  </span>
                </SettingRow>
              </Section>
            </>
          )}

          {/* 4. APPEARANCE TAB */}
          {activeTab === 'appearance' && (
            <>
              <Section title="Theme & Colors" icon={<Palette size={16} />}>
                {/* Theme mode */}
                <SettingRow label="Theme" description="Switch between dark and light mode">
                  <div
                    style={{
                      display: 'flex',
                      background: 'var(--bg-3)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      overflow: 'hidden'
                    }}
                  >
                    <ModeBtn
                      active={theme.mode === 'dark'}
                      onClick={() => setTheme({ mode: 'dark' })}
                      icon={<Moon size={14} />}
                      label="Dark"
                    />
                    <ModeBtn
                      active={theme.mode === 'light'}
                      onClick={() => setTheme({ mode: 'light' })}
                      icon={<Sun size={14} />}
                      label="Light"
                    />
                  </div>
                </SettingRow>

                {/* Accent color */}
                <SettingRow
                  label="Primary Accent"
                  description="Primary highlight color used throughout the interface"
                >
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {ACCENT_PRESETS.map((p) => (
                      <button
                        key={p.color}
                        onClick={() => setTheme({ accentColor: p.color })}
                        title={p.label}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: p.color,
                          border:
                            theme.accentColor === p.color
                              ? '3px solid var(--text)'
                              : '2px solid transparent',
                          cursor: 'pointer',
                          outline: 'none',
                          boxShadow: theme.accentColor === p.color ? `0 0 0 1px ${p.color}` : 'none',
                          transition: 'transform 0.15s'
                        }}
                      />
                    ))}
                    {/* Custom color picker */}
                    <div style={{ position: 'relative' }}>
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: `conic-gradient(red, yellow, lime, cyan, blue, magenta, red)`,
                          border: '2px solid var(--border)',
                          cursor: 'pointer',
                          overflow: 'hidden'
                        }}
                      >
                        <input
                          type="color"
                          value={theme.accentColor}
                          onChange={(e) => setTheme({ accentColor: e.target.value })}
                          style={{
                            opacity: 0,
                            position: 'absolute',
                            inset: 0,
                            cursor: 'pointer'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </SettingRow>

                {/* Secondary accent */}
                <SettingRow
                  label="Secondary Accent"
                  description="Used for EQ curves and supplementary visual highlights"
                >
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {ACCENT_PRESETS.slice(4).map((p) => (
                      <button
                        key={p.color}
                        onClick={() => setTheme({ accent2Color: p.color })}
                        title={p.label}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: p.color,
                          border:
                            theme.accent2Color === p.color
                              ? '3px solid var(--text)'
                              : '2px solid transparent',
                          cursor: 'pointer',
                          outline: 'none',
                          transition: 'transform 0.15s'
                        }}
                      />
                    ))}
                    <div style={{ position: 'relative' }}>
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: `conic-gradient(red, yellow, lime, cyan, blue, magenta, red)`,
                          border: '2px solid var(--border)',
                          cursor: 'pointer',
                          overflow: 'hidden'
                        }}
                      >
                        <input
                          type="color"
                          value={theme.accent2Color}
                          onChange={(e) => setTheme({ accent2Color: e.target.value })}
                          style={{
                            opacity: 0,
                            position: 'absolute',
                            inset: 0,
                            cursor: 'pointer'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </SettingRow>
              </Section>

              {/* Performance & Display */}
              <Section title="Performance & Display" icon={<Sparkles size={16} />}>
                <SettingRow
                  label="Album Artwork"
                  description="Extract and render album cover artwork in players. Disabling saves memory."
                >
                  <Toggle
                    checked={renderAlbumArt}
                    onChange={() => setRenderAlbumArt(!renderAlbumArt)}
                  />
                </SettingRow>
                <SettingRow
                  label="Reduce Blur Effects"
                  description="Disable heavy backdrop blurs for smoother UI rendering on low-spec hardware"
                >
                  <Toggle checked={reduceBlur} onChange={() => setReduceBlur(!reduceBlur)} />
                </SettingRow>
              </Section>
            </>
          )}

          {/* 5. SHORTCUTS TAB */}
          {activeTab === 'shortcuts' && (
            <Section title="Shortcut Mapping" icon={<Keyboard size={16} />}>
              {!globalHotkeys && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(var(--color-accent-rgb), 0.08)',
                    borderRadius: 6,
                    margin: '8px 16px',
                    fontSize: 12,
                    color: 'var(--text-muted)'
                  }}
                >
                  Note: Global hotkeys are currently disabled in <strong>General</strong> settings.
                </div>
              )}
              <SettingRow label="Play / Pause" description="Shortcut combo to toggle playback">
                <HotkeyInput
                  value={customHotkeys.playPause}
                  onKeyDown={(e) => updateHotkey('playPause', e)}
                />
              </SettingRow>
              <SettingRow label="Next Track" description="Shortcut combo to skip forward">
                <HotkeyInput
                  value={customHotkeys.nextTrack}
                  onKeyDown={(e) => updateHotkey('nextTrack', e)}
                />
              </SettingRow>
              <SettingRow label="Previous Track" description="Shortcut combo to skip backward">
                <HotkeyInput
                  value={customHotkeys.prevTrack}
                  onKeyDown={(e) => updateHotkey('prevTrack', e)}
                />
              </SettingRow>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  icon,
  children
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ color: 'var(--color-accent)' }}>{icon}</span>
        <h3
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text)',
            letterSpacing: '0.02em'
          }}
        >
          {title}
        </h3>
      </div>
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '4px 0',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {children}
      </div>
    </div>
  )
}

function SettingRow({
  label,
  description,
  children
}: {
  label: string
  description: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
        gap: 16
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{description}</div>
      </div>
      {children}
    </div>
  )
}

function ModeBtn({
  active,
  onClick,
  icon,
  label
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}): React.ReactElement {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '7px 14px',
        fontSize: 12,
        fontWeight: 500,
        border: 'none',
        cursor: 'pointer',
        background: active ? 'rgba(var(--color-accent-rgb), 0.15)' : 'transparent',
        color: active ? 'var(--color-accent)' : 'var(--text-muted)',
        transition: 'all 0.15s'
      }}
    >
      {icon}
      {label}
    </button>
  )
}

function Toggle({
  checked,
  onChange
}: {
  checked: boolean
  onChange: () => void
}): React.ReactElement {
  return (
    <button
      onClick={onChange}
      style={{
        width: 44,
        height: 24,
        borderRadius: 24,
        background: checked ? 'var(--color-accent)' : 'var(--bg-3)',
        border: '1px solid var(--border)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s',
        flexShrink: 0
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: checked ? '#000' : 'var(--text-dim)',
          position: 'absolute',
          top: 3,
          left: checked ? 23 : 3,
          transition: 'all 0.2s'
        }}
      />
    </button>
  )
}

function HotkeyInput({
  value,
  onKeyDown
}: {
  value: string
  onKeyDown: (e: React.KeyboardEvent) => void
}): React.ReactElement {
  const [isRecording, setIsRecording] = useState(false)

  return (
    <button
      onClick={() => setIsRecording(true)}
      onBlur={() => setIsRecording(false)}
      onKeyDown={(e) => {
        if (isRecording) {
          onKeyDown(e)
          setIsRecording(false)
        }
      }}
      style={{
        background: isRecording ? 'rgba(var(--color-accent-rgb), 0.15)' : 'var(--bg-3)',
        border: `1px solid ${isRecording ? 'var(--color-accent)' : 'var(--border)'}`,
        color: isRecording ? 'var(--color-accent)' : 'var(--text)',
        padding: '6px 12px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        minWidth: 120,
        textAlign: 'center',
        outline: 'none',
        boxShadow: isRecording ? '0 0 0 2px rgba(var(--color-accent-rgb), 0.2)' : 'none',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6
      }}
    >
      {isRecording ? 'Recording...' : value || 'Click to bind'}
    </button>
  )
}
