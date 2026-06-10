import React, { useState, useEffect } from 'react'
import { useApp } from '../../store/AppContext'
import { Cloud, Server, Lock, User, Play, Loader2 } from 'lucide-react'
import { getJellyfinConfig, setJellyfinConfig, getAlbums, getAlbumTracks, getCoverArtUrl, type JellyfinConfig } from '../../lib/jellyfin'

export default function JellyfinView(): React.ReactElement {
  const { playJellyfin } = useApp()
  const [config, setConfig] = useState<JellyfinConfig | null>(getJellyfinConfig())
  const [isConfiguring, setIsConfiguring] = useState(!config)

  // Form states
  const [url, setUrl] = useState(config?.url || '')
  const [username, setUsername] = useState(config?.username || '')
  const [password, setPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  // Library states
  const [albums, setAlbums] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Load saved config on mount
  useEffect(() => {
    window.yukinon.settings.get('jellyfin_config').then((savedConfig) => {
      if (savedConfig) {
        setConfig(savedConfig)
        setJellyfinConfig(savedConfig)
        setIsConfiguring(false)
        setUrl(savedConfig.url)
        setUsername(savedConfig.username)
      }
    })
  }, [])

  // Fetch albums when config is ready
  useEffect(() => {
    if (config && !isConfiguring && config.accessToken) {
      loadLibrary()
    }
  }, [config, isConfiguring])

  const loadLibrary = async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await getAlbums()
      if (res && res.Items) {
        setAlbums(res.Items)
      }
    } catch (err: any) {
      setError('Failed to fetch library: ' + err.message)
      if (err.message.includes('401')) {
        setIsConfiguring(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError('')

    let formattedUrl = url.trim()
    if (!formattedUrl.startsWith('http')) {
      formattedUrl = 'http://' + formattedUrl
    }

    const newConfig: JellyfinConfig = {
      url: formattedUrl.endsWith('/') ? formattedUrl.slice(0, -1) : formattedUrl,
      username,
      password,
    }

    try {
      setJellyfinConfig(newConfig)
      // Ping / login to verify
      const { login } = await import('../../lib/jellyfin')
      await login()

      const currentConfig = getJellyfinConfig()!
      const safeConfig = {
        url: currentConfig.url,
        username: currentConfig.username,
        accessToken: currentConfig.accessToken,
        userId: currentConfig.userId
      }
      
      await window.yukinon.settings.set('jellyfin_config', safeConfig)
      setConfig(safeConfig)
      setIsConfiguring(false)
      setPassword('') // Clear from memory
      loadLibrary()
    } catch (err: any) {
      setError(err.message || 'Connection failed. Please check your credentials.')
      if (config) setJellyfinConfig(config) // revert
    } finally {
      setIsSaving(false)
    }
  }

  const handlePlayAlbum = async (album: any) => {
    try {
      const { getAlbumTracks } = await import('../../lib/jellyfin')
      const res = await getAlbumTracks(album.Id)
      const tracks = res.Items
      
      if (tracks && tracks.length > 0) {
        const firstTrack = tracks[0]
        const artwork = getCoverArtUrl(album.Id)
        // For simplicity, just play the first track.
        playJellyfin(firstTrack.Id, {
          title: firstTrack.Name,
          artist: firstTrack.Artists?.[0] || album.AlbumArtist || 'Unknown Artist',
          duration: firstTrack.RunTimeTicks ? firstTrack.RunTimeTicks / 10000000 : 0,
          artwork
        })
      }
    } catch (err) {
      console.error('Failed to play album:', err)
    }
  }

  if (isConfiguring) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 32 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: 40, borderRadius: 24, width: '100%', maxWidth: 500, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Server size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 24 }}>Connect to Server</h2>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Jellyfin</p>
            </div>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-dim)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase' }}>Server URL</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '0 12px' }}>
                <Cloud size={16} style={{ color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  placeholder="http://192.168.1.10:8096"
                  required
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  style={{ flex: 1, background: 'transparent', border: 'none', padding: '12px', color: 'var(--text)', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-dim)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase' }}>Username</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '0 12px' }}>
                <User size={16} style={{ color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  style={{ flex: 1, background: 'transparent', border: 'none', padding: '12px', color: 'var(--text)', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-dim)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase' }}>Password</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '0 12px' }}>
                <Lock size={16} style={{ color: 'var(--text-dim)' }} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ flex: 1, background: 'transparent', border: 'none', padding: '12px', color: 'var(--text)', outline: 'none' }}
                />
              </div>
            </div>

            {error && <div style={{ color: '#ef4444', fontSize: 14, background: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 8 }}>{error}</div>}

            <button
              type="submit"
              disabled={isSaving}
              style={{
                background: 'var(--color-accent)',
                color: '#000',
                border: 'none',
                padding: '14px',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: isSaving ? 'wait' : 'pointer',
                opacity: isSaving ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 12
              }}
            >
              {isSaving ? <Loader2 size={20} className="animate-spin" /> : 'Connect'}
            </button>
            {config && config.accessToken && (
               <button
               type="button"
               onClick={() => setIsConfiguring(false)}
               style={{ background: 'transparent', color: 'var(--text-dim)', border: 'none', cursor: 'pointer', fontSize: 14 }}
             >
               Cancel
             </button>
            )}
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 32, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cloud size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Jellyfin</h1>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: 14 }}>
              Connected to {config?.url.replace('https://', '').replace('http://', '')}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsConfiguring(true)}
          style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text)', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
        >
          Server Settings
        </button>
      </div>

      {error && <div style={{ color: '#ef4444', marginBottom: 24 }}>{error}</div>}

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Albums</h2>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)' }}>
             <Loader2 size={20} className="animate-spin" /> Loading library...
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 24
          }}>
            {albums.map((album, i) => {
               const coverUrl = getCoverArtUrl(album.Id)
               
               return (
                <div
                  key={album.Id + i}
                  onClick={() => handlePlayAlbum(album)}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 12,
                    padding: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.transform = 'translateY(-4px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                    e.currentTarget.style.transform = 'none'
                  }}
                >
                  <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: 8, overflow: 'hidden', marginBottom: 12, background: 'rgba(0,0,0,0.2)', position: 'relative' }}>
                    {coverUrl ? <img src={coverUrl} alt={album.Name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Cloud size={32}/></div>}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/40 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-accent text-black flex items-center justify-center pl-1 shadow-lg">
                        <Play size={20} fill="currentColor" />
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
                    {album.Name}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {album.AlbumArtist || album.Artists?.[0] || 'Unknown'}
                  </div>
                </div>
               )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
