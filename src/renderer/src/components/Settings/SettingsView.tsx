import React, { useState } from 'react'
import { Moon, Sun, Palette, FolderOpen, Trash2, Info, RefreshCw, Copy, ShieldCheck, Blocks } from 'lucide-react'
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

export default function SettingsView(): React.ReactElement {
  const { theme, setTheme, setTracks, activeModules, setActiveModules, activeView, setActiveView } = useApp()
  const [folders, setFolders] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [duplicateCount, setDuplicateCount] = useState<number | null>(null)
  const [removingDuplicates, setRemovingDuplicates] = useState(false)

  // Load saved folders on mount
  React.useEffect(() => {
    window.yukinon.library.getFolders().then((f) => setFolders(f as string[]))
  }, [])

  const handleRemoveFolder = async (folder: string): Promise<void> => {
    await window.yukinon.library.removeFolder(folder)
    setFolders((prev) => prev.filter((f) => f !== folder))
  }

  const handleAddFolder = async () => {
    try {
      const folderPath = await window.yukinon.library.selectFolder()
      if (!folderPath) return

      setScanning(true)
      const result = await window.yukinon.library.scan(folderPath) as { added: number; total: number }
      const updated = await window.yukinon.library.getTracks() as any
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
    const result = await window.yukinon.library.findDuplicates() as { duplicateCount: number }
    setDuplicateCount(result.duplicateCount)
    if (result.duplicateCount === 0) {
      setNotification({ message: 'No duplicate tracks found!', type: 'success' })
      setTimeout(() => setNotification(null), 4000)
    }
  }

  const handleRemoveDuplicates = async () => {
    setRemovingDuplicates(true)
    try {
      const result = await window.yukinon.library.removeDuplicates() as { removed: number; total: number }
      const updated = await window.yukinon.library.getTracks() as any
      setTracks(updated)
      setDuplicateCount(null)
      setNotification({
        message: result.removed > 0
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
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: '24px',
        background: 'var(--bg)'
      }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Settings</h2>

      {notification && (
        <div
          className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300"
          style={{
            background: notification.type === 'success' ? 'rgba(162, 238, 203, 0.08)' : 'rgba(248, 113, 113, 0.08)',
            borderColor: notification.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
            color: notification.type === 'success' ? '#34d399' : '#f87171',
            boxShadow: notification.type === 'success' 
              ? '0 10px 25px -5px rgba(16, 185, 129, 0.1), 0 8px 10px -6px rgba(16, 185, 129, 0.1)'
              : '0 10px 25px -5px rgba(239, 68, 68, 0.1), 0 8px 10px -6px rgba(239, 68, 68, 0.1)'
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500 }}>{notification.message}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 560 }}>
        {/* Appearance */}
        <Section title="Appearance" icon={<Palette size={16} />}>
          {/* Theme mode */}
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

          {/* Accent color */}
          <SettingRow label="Accent Color" description="Primary highlight color used throughout the app">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ACCENT_PRESETS.map((p) => (
                <button
                  key={p.color}
                  onClick={() => setTheme({ accentColor: p.color })}
                  title={p.label}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: p.color,
                    border: theme.accentColor === p.color ? '3px solid var(--text)' : '2px solid transparent',
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
                    width: 28,
                    height: 28,
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
                    style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>
          </SettingRow>

          {/* Accent 2 (secondary) */}
          <SettingRow label="Secondary Accent" description="Used for EQ curve gradients and highlights">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ACCENT_PRESETS.slice(4).map((p) => (
                <button
                  key={p.color}
                  onClick={() => setTheme({ accent2Color: p.color })}
                  title={p.label}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: p.color,
                    border: theme.accent2Color === p.color ? '3px solid var(--text)' : '2px solid transparent',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'transform 0.15s'
                  }}
                />
              ))}
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
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
                    style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>
          </SettingRow>
        </Section>

        {/* Integrations */}
        <Section title="Integrations & Modules" icon={<Blocks size={16} />}>
          <SettingRow label="YouTube Music" description="Enable the embedded YouTube Music player">
            <Toggle checked={activeModules.ytm} onChange={() => {
              setActiveModules({ ytm: !activeModules.ytm })
              if (activeView === 'ytm' && activeModules.ytm) setActiveView('library')
            }} />
          </SettingRow>
          <SettingRow label="Internet Radio" description="Stream worldwide radio stations">
            <Toggle checked={activeModules.radio} onChange={() => {
              setActiveModules({ radio: !activeModules.radio })
              if (activeView === 'radio' && activeModules.radio) setActiveView('library')
            }} />
          </SettingRow>
          <SettingRow label="Navidrome / Subsonic" description="Connect to your personal Subsonic API server">
            <Toggle checked={activeModules.subsonic} onChange={() => {
              setActiveModules({ subsonic: !activeModules.subsonic })
              if (activeView === 'subsonic' && activeModules.subsonic) setActiveView('library')
            }} />
          </SettingRow>
          <SettingRow label="Jellyfin" description="Connect to your Jellyfin media server">
            <Toggle checked={activeModules.jellyfin} onChange={() => {
              setActiveModules({ jellyfin: !activeModules.jellyfin })
              if (activeView === 'jellyfin' && activeModules.jellyfin) setActiveView('library')
            }} />
          </SettingRow>
        </Section>

        {/* Music Folders */}
        <Section title="Music Library" icon={<FolderOpen size={16} />}>
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
                borderRadius: 8,
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
              {scanning ? <RefreshCw size={14} className="animate-spin" /> : <FolderOpen size={14} />}
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

        {/* Library Management */}
        <Section title="Library Management" icon={<ShieldCheck size={16} />}>
          <SettingRow label="Find Duplicate Tracks" description="Detect tracks with the same title and artist">
            <button
              onClick={handleFindDuplicates}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--bg-3)', color: 'var(--text)', fontSize: 12,
                fontWeight: 500, cursor: 'pointer'
              }}
            >
              <Copy size={13} />
              {duplicateCount !== null ? `${duplicateCount} found` : 'Scan'}
            </button>
          </SettingRow>
          {duplicateCount !== null && duplicateCount > 0 && (
            <SettingRow
              label="Remove Duplicates"
              description={`Keep the highest-quality version, remove ${duplicateCount} duplicate${duplicateCount > 1 ? 's' : ''}`}
            >
              <button
                onClick={handleRemoveDuplicates}
                disabled={removingDuplicates}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8, border: 'none',
                  background: '#ef4444', color: '#fff', fontSize: 12,
                  fontWeight: 600, cursor: removingDuplicates ? 'not-allowed' : 'pointer',
                  opacity: removingDuplicates ? 0.6 : 1
                }}
              >
                {removingDuplicates ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                {removingDuplicates ? 'Removing...' : 'Remove Duplicates'}
              </button>
            </SettingRow>
          )}
        </Section>

        {/* About */}
        <Section title="About" icon={<Info size={16} />}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.8 }}>
            <p><strong style={{ color: 'var(--text)' }}>YUKINON</strong> v0.1.0</p>
            <p>Hybrid audiophile music player — local FLAC + YouTube Music</p>
            <p style={{ marginTop: 8 }}>
              Open source under the MIT license.{' '}
              <a
                href="https://github.com/umam1n/yukinon"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--color-accent)', textDecoration: 'none' }}
              >
                View on GitHub →
              </a>
            </p>
            <p style={{ marginTop: 4, fontSize: 11, color: 'var(--text-dim)', opacity: 0.7 }}>
              YouTube Music integration is for personal use only.
            </p>
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }): React.ReactElement {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ color: 'var(--color-accent)' }}>{icon}</span>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.02em' }}>{title}</h3>
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
