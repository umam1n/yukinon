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
  Music2,
  Sparkles,
  Volume2,
  Key,
  Wand2
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

type SettingsTab = 'general' | 'audio' | 'library' | 'appearance' | 'about'

const SETTINGS_TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <Layers size={14} /> },
  { id: 'audio', label: 'Audio', icon: <Volume2 size={14} /> },
  { id: 'library', label: 'Library', icon: <FolderOpen size={14} /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette size={14} /> },
  { id: 'about', label: 'About', icon: <Info size={14} /> }
]

export default function SettingsView(): React.ReactElement {
  const {
    theme,
    setTheme,
    setTracks,
    activeModules,
    setActiveModules,
    activeView,
    setActiveView,
    confirm,
    renderAlbumArt,
    setRenderAlbumArt,
    reduceBlur,
    setReduceBlur,
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
  const [preamp, setPreamp] = useState(0)
  const [debugLog, setDebugLog] = useState<string | null>(null)

  // Gemini AI state
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [isSavingKey, setIsSavingKey] = useState(false)
  const [isTestingKey, setIsTestingKey] = useState(false)
  const [keyStatus, setKeyStatus] = useState<{ valid: boolean; message: string } | null>(null)
  const [isEnriching, setIsEnriching] = useState(false)

  useEffect(() => {
    window.yukinon.library.getFolders().then((f: any) => setFolders(f as string[]))
    if (window.yukinon.settings?.getPreampGain) {
      window.yukinon.settings.getPreampGain().then((val: number) => setPreamp(val))
    }
    window.yukinon.ai?.getApiKey().then((k: string) => setGeminiApiKey(k || ''))
  }, [])

  const handleSaveApiKey = async () => {
    setIsSavingKey(true)
    try {
      await window.yukinon.ai?.setApiKey(geminiApiKey)
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
      const res = await window.yukinon.ai?.testKey(geminiApiKey)
      if (res?.valid) {
        setKeyStatus({ valid: true, message: 'Valid Gemini API key!' })
      } else {
        setKeyStatus({ valid: false, message: res?.error || 'Invalid API key' })
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
      const res = await window.yukinon.ai?.enrichTracksBatch()
      const updated = await window.yukinon.library.getTracks()
      setTracks(updated as any)
      setNotification({ message: res?.message || 'Enriched tracks.', type: 'success' })
      setTimeout(() => setNotification(null), 4000)
    } catch (err: any) {
      setNotification({ message: err?.message || 'Failed to enrich tracks.', type: 'error' })
      setTimeout(() => setNotification(null), 4000)
    } finally {
      setIsEnriching(false)
    }
  }

  const handleRemoveFolder = async (folder: string): Promise<void> => {
    await window.yukinon.library.removeFolder(folder)
    setFolders((prev) => prev.filter((f) => f !== folder))
  }

  const showScanDiagnostics = (result: any, folderPath: string) => {
    if (result && result.total === 0) {
      if (result.pluginError) {
        setDebugLog(
          `NATIVE PLUGIN ERROR for folder "${folderPath}":\n` +
          `----------------------------------------\n` +
          `${result.pluginError}`
        )
        return
      }
      setDebugLog(
        `SCAN DIAGNOSTICS for folder "${folderPath}":\n` +
        `----------------------------------------\n` +
        `- Resolved Path: ${result.resolvedPath || 'N/A'}\n` +
        `- Folder Exists on Disk: ${result.exists !== undefined ? String(result.exists) : 'N/A'}\n` +
        `- Is Directory: ${result.isDirectory !== undefined ? String(result.isDirectory) : 'N/A'}\n` +
        `- All Files Access (isManager): ${result.isManager !== undefined ? String(result.isManager) : 'N/A'}\n` +
        `- Files found under Music/:\n${JSON.stringify(result.musicDirContents, null, 2) || 'None'}\n` +
        `- Files found under resolved path:\n${JSON.stringify(result.resolvedPathContents, null, 2) || 'None'}`
      )
    } else {
      setDebugLog(null)
    }
  }

  const handleAddFolder = async () => {
    try {
      const folderPath = await window.yukinon.library.selectFolder()
      if (!folderPath) return

      setScanning(true)
      const result = (await window.yukinon.library.scan(folderPath)) as any
      const updated = (await window.yukinon.library.getTracks()) as any
      setTracks(updated)

      const newFolders = await window.yukinon.library.getFolders()
      setFolders(newFolders as string[])

      setNotification({
        message: `Scanned ${result.total} files, added ${result.added} new tracks.`,
        type: 'success'
      })
      setTimeout(() => setNotification(null), 4000)

      showScanDiagnostics(result, folderPath)
    } catch (err: any) {
      console.error(err)
      setNotification({
        message: `Failed: ${err.message || 'Failed to scan the folder.'}`,
        type: 'error'
      })
      setTimeout(() => setNotification(null), 6000)
    } finally {
      setScanning(false)
    }
  }

  const handleRescanLibrary = async () => {
    if (folders.length === 0) {
      setNotification({ message: 'No folders in your library to scan.', type: 'error' })
      setTimeout(() => setNotification(null), 4000)
      return
    }

    try {
      setScanning(true)
      let totalAdded = 0
      let totalFiles = 0

      for (const folder of folders) {
        const result = (await window.yukinon.library.scan(folder)) as any
        totalAdded += result.added
        totalFiles += result.total
        showScanDiagnostics(result, folder)
      }

      const updated = (await window.yukinon.library.getTracks()) as any
      setTracks(updated)

      setNotification({
        message: `Scan complete: Checked ${totalFiles} files, added ${totalAdded} new tracks.`,
        type: 'success'
      })
      setTimeout(() => setNotification(null), 5000)
    } catch (err: any) {
      console.error('[Rescan] Failed:', err)
      setNotification({
        message: `Failed: ${err.message || 'Failed to re-scan library.'}`,
        type: 'error'
      })
      setTimeout(() => setNotification(null), 6000)
    } finally {
      setScanning(false)
    }
  }

  const handleRebuildLibrary = async () => {
    const confirmClear = await confirm({
      title: 'Rebuild Library',
      message: 'Are you sure you want to clear and rebuild your local library? This will wipe your current database.',
      confirmText: 'Rebuild',
      cancelText: 'Cancel',
      isDestructive: true
    })
    if (!confirmClear) return

    try {
      setScanning(true)
      await window.yukinon.library.removeFolder('Local Storage')
      setTracks([])
      setFolders([])

      const folderPath = await window.yukinon.library.selectFolder()
      if (!folderPath) {
        setNotification({ message: 'Library database cleared.', type: 'success' })
        setTimeout(() => setNotification(null), 3000)
        return
      }

      const result = (await window.yukinon.library.scan(folderPath)) as any
      const updated = (await window.yukinon.library.getTracks()) as any
      setTracks(updated)

      const newFolders = await window.yukinon.library.getFolders()
      setFolders(newFolders as string[])

      setNotification({
        message: `Library rebuilt: Scanned ${result.total} files, added ${result.added} tracks.`,
        type: 'success'
      })
      setTimeout(() => setNotification(null), 5000)

      showScanDiagnostics(result, folderPath)
    } catch (err: any) {
      console.error(err)
      setNotification({
        message: `Failed: ${err.message || 'Failed to rebuild the library.'}`,
        type: 'error'
      })
      setTimeout(() => setNotification(null), 6000)
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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* Top Header & Tab Bar */}
      <div
        style={{
          padding: '20px 20px 0 20px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 14px 0' }}>Settings</h2>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10 }}>
          {SETTINGS_TABS.map((t) => {
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: active ? '1px solid rgba(var(--color-accent-rgb), 0.35)' : '1px solid transparent',
                  background: active ? 'rgba(var(--color-accent-rgb), 0.14)' : 'var(--bg-3)',
                  color: active ? 'var(--color-accent)' : 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {t.icon}
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {notification && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            padding: '10px 18px',
            borderRadius: 10,
            background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
            border: `1px solid ${notification.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
            color: notification.type === 'success' ? '#34d399' : '#f87171',
            fontSize: 13,
            fontWeight: 600
          }}
        >
          {notification.message}
        </div>
      )}

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 640 }}>
          {activeTab === 'general' && (
            <>
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
                <SettingRow label="Internet Radio" description="Stream worldwide radio stations">
                  <Toggle
                    checked={activeModules.radio}
                    onChange={() => {
                      setActiveModules({ radio: !activeModules.radio })
                      if (activeView === 'radio' && activeModules.radio) setActiveView('library')
                    }}
                  />
                </SettingRow>
                <SettingRow label="Navidrome / Subsonic" description="Connect to your personal Subsonic API server">
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

              <Section title="Performance & Display" icon={<Sparkles size={16} />}>
                <SettingRow
                  label="Album Artwork"
                  description="Render album and single cover artwork in players. Disabling saves memory and battery."
                >
                  <Toggle checked={renderAlbumArt} onChange={() => setRenderAlbumArt(!renderAlbumArt)} />
                </SettingRow>
                <SettingRow
                  label="Reduce Blur Effects"
                  description="Disable heavy glassmorphism blurs for smoother UI rendering and battery efficiency."
                >
                  <Toggle checked={reduceBlur} onChange={() => setReduceBlur(!reduceBlur)} />
                </SettingRow>
              </Section>

              <Section title="Smart Playlists & AI (Gemini 2.5 Flash)" icon={<Key size={16} />}>
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    Optional Gemini API key for natural-language Smart Playlist generation.
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      style={{
                        flex: 1,
                        minWidth: 180,
                        background: 'var(--bg-3)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        color: 'var(--text)',
                        fontSize: 12,
                        outline: 'none'
                      }}
                    />
                    <button
                      onClick={handleSaveApiKey}
                      disabled={isSavingKey}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        border: 'none',
                        background: 'var(--color-accent)',
                        color: '#000',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={handleTestApiKey}
                      disabled={isTestingKey}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-3)',
                        color: 'var(--text)',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      {isTestingKey ? 'Testing...' : 'Test'}
                    </button>
                  </div>
                  {keyStatus && (
                    <div style={{ fontSize: 12, color: keyStatus.valid ? '#34d399' : '#f87171' }}>
                      {keyStatus.message}
                    </div>
                  )}
                </div>
              </Section>
            </>
          )}

          {activeTab === 'audio' && (
            <Section title="Audio Output & Calibration" icon={<Music2 size={16} />}>
              <SettingRow
                label="Loudness Normalization (ReplayGain / EBU R128)"
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
                    style={{ width: 120, opacity: replaygainEnabled ? 1 : 0.5 }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, width: 48, textAlign: 'right', color: 'var(--text)' }}>
                    {replaygainPreamp > 0 ? `+${replaygainPreamp.toFixed(1)}` : `${replaygainPreamp.toFixed(1)}`} dB
                  </span>
                </div>
              </SettingRow>
              <SettingRow label="Hardware Preamp Gain" description="Adjust base volume to offset device differences (-5 to +5)">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="range"
                    min="-5"
                    max="5"
                    step="1"
                    value={preamp}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      setPreamp(val)
                      window.yukinon.settings?.setPreampGain?.(val)
                    }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, width: 24, textAlign: 'right', color: 'var(--text)' }}>
                    {preamp > 0 ? `+${preamp}` : preamp}
                  </span>
                </div>
              </SettingRow>
            </Section>
          )}

          {activeTab === 'library' && (
            <>
              <Section title="Music Library Folders" icon={<FolderOpen size={16} />}>
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                    <button
                      onClick={handleAddFolder}
                      disabled={scanning}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: 'none',
                        background: 'var(--color-accent)',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {scanning ? <RefreshCw size={14} className="animate-spin" /> : <FolderOpen size={14} />}
                      {scanning ? 'Scanning...' : 'Add Folder'}
                    </button>

                    <button
                      onClick={handleRescanLibrary}
                      disabled={scanning}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-3)',
                        color: 'var(--text-muted)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
                      Re-scan Folders
                    </button>

                    <button
                      onClick={handleRebuildLibrary}
                      disabled={scanning}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        background: 'rgba(239, 68, 68, 0.05)',
                        color: '#f87171',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={14} />
                      Rebuild Library
                    </button>
                  </div>

                  {debugLog && (
                    <div
                      style={{
                        marginBottom: 16,
                        padding: 16,
                        background: 'var(--bg-3)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 12,
                        color: 'var(--text-muted)',
                        fontSize: 12,
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        maxHeight: 250,
                        overflowY: 'auto'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#f87171', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Scan Debug Diagnostics</span>
                        <button
                          onClick={() => setDebugLog(null)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 11 }}
                        >
                          Clear
                        </button>
                      </div>
                      {debugLog}
                    </div>
                  )}

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
                            borderRadius: 8
                          }}
                        >
                          <FolderOpen size={14} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
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
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 2 }}
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

              <Section title="Library Management" icon={<ShieldCheck size={16} />}>
                <SettingRow label="Find Duplicate Tracks" description="Detect tracks with the same title and artist">
                  <button
                    onClick={handleFindDuplicates}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 14px',
                      borderRadius: 8,
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
                    description={`Keep the first version, remove ${duplicateCount} duplicate${duplicateCount > 1 ? 's' : ''}`}
                  >
                    <button
                      onClick={handleRemoveDuplicates}
                      disabled={removingDuplicates}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 14px',
                        borderRadius: 8,
                        border: 'none',
                        background: '#ef4444',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: removingDuplicates ? 'not-allowed' : 'pointer',
                        opacity: removingDuplicates ? 0.6 : 1
                      }}
                    >
                      {removingDuplicates ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      {removingDuplicates ? 'Removing...' : 'Remove Duplicates'}
                    </button>
                  </SettingRow>
                )}
                <SettingRow
                  label="Auto-Tag & Enrich Library"
                  description="Classify instrumental, live, and vocal tracks for Smart Playlists"
                >
                  <button
                    onClick={handleEnrichLibrary}
                    disabled={isEnriching}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 14px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-3)',
                      color: 'var(--text)',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    <Wand2 size={13} />
                    {isEnriching ? 'Analyzing...' : 'Enrich Tracks'}
                  </button>
                </SettingRow>
              </Section>
            </>
          )}

          {activeTab === 'appearance' && (
            <Section title="Appearance" icon={<Palette size={16} />}>
              <SettingRow label="Theme" description="Switch between dark and light mode">
                <div
                  style={{
                    display: 'flex',
                    background: 'var(--bg-3)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
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

              <SettingRow label="Accent Color" description="Primary highlight color used throughout the app">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ACCENT_PRESETS.map((p) => (
                    <button
                      key={p.color}
                      onClick={() => setTheme({ accentColor: p.color })}
                      title={p.label}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: p.color,
                        border: theme.accentColor === p.color ? '3px solid var(--text)' : '2px solid transparent',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    />
                  ))}
                </div>
              </SettingRow>

              <SettingRow label="Secondary Accent" description="Used for EQ curve gradients and highlights">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ACCENT_PRESETS.slice(4).map((p) => (
                    <button
                      key={p.color}
                      onClick={() => setTheme({ accent2Color: p.color })}
                      title={p.label}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: p.color,
                        border: theme.accent2Color === p.color ? '3px solid var(--text)' : '2px solid transparent',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    />
                  ))}
                </div>
              </SettingRow>
            </Section>
          )}

          {activeTab === 'about' && (
            <Section title="About" icon={<Info size={16} />}>
              <div style={{ padding: 16, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.8 }}>
                <p><strong style={{ color: 'var(--text)' }}>YUKINON</strong> v0.1.0 (Android)</p>
                <p>Hybrid audiophile music player — local FLAC + YouTube Music + Jellyfin + Subsonic</p>
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
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }): React.ReactElement {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ color: 'var(--color-accent)' }}>{icon}</span>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.02em', margin: 0 }}>{title}</h3>
      </div>
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
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

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }): React.ReactElement {
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

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }): React.ReactElement {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '7px 14px',
        minHeight: 40,
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

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }): React.ReactElement {
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
