import React, { useState, useEffect } from 'react'
import { useApp } from '../../store/AppContext'
import { Cloud, Server, Lock, User, Play, Loader2 } from 'lucide-react'
import { getSubsonicConfig, setSubsonicConfig, getAlbumList2, getCoverArtUrl, type SubsonicConfig } from '../../lib/subsonic'

export default function SubsonicView(): React.ReactElement {
  const { play, setQueue } = useApp()
  const [config, setConfig] = useState<SubsonicConfig | null>(getSubsonicConfig())
  const [isConfiguring, setIsConfiguring] = useState(!config)

  const [url, setUrl] = useState(config?.url || '')
  const [username, setUsername] = useState(config?.username || '')
  const [password, setPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const [albums, setAlbums] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    window.yukinon.settings.get('subsonic_config').then((savedConfig: any) => {
      if (savedConfig) {
        setConfig(savedConfig)
        setSubsonicConfig(savedConfig)
        setIsConfiguring(false)
        setUrl(savedConfig.url)
        setUsername(savedConfig.username)
      }
    })
  }, [])

  useEffect(() => {
    if (config && !isConfiguring) {
      loadLibrary()
    }
  }, [config, isConfiguring])

  const loadLibrary = async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await getAlbumList2('newest', 40)
      if (res.albumList2 && res.albumList2.album) {
        setAlbums(res.albumList2.album)
      }
    } catch (err: any) {
      setError('Failed to fetch library: ' + err.message)
      if (err.message.includes('auth')) {
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
      formattedUrl = 'https://' + formattedUrl
    }

    const newConfig: SubsonicConfig = {
      url: formattedUrl.endsWith('/') ? formattedUrl.slice(0, -1) : formattedUrl,
      username,
      password,
      client: 'YukinonDesktop',
      version: '1.16.1'
    }

    try {
      setSubsonicConfig(newConfig)
      const { ping } = await import('../../lib/subsonic')
      await ping()

      const currentConfig = getSubsonicConfig()!
      const safeConfig = {
        url: currentConfig.url,
        username: currentConfig.username,
        token: currentConfig.token,
        salt: currentConfig.salt,
        client: currentConfig.client,
        version: currentConfig.version
      }
      
      await window.yukinon.settings.set('subsonic_config', safeConfig)
      setConfig(safeConfig)
      setIsConfiguring(false)
      setPassword('')
    } catch (err: any) {
      setError(err.message || 'Connection failed. Please check your credentials.')
      setSubsonicConfig(config!)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePlayAlbum = async (album: any) => {
    try {
      const { subsonicFetch } = await import('../../lib/subsonic')
      const res = await subsonicFetch('getAlbum', { id: album.id })
      const songs = res.album.song
      
      if (songs && songs.length > 0) {
        const mappedTracks = await Promise.all(songs.map(async (song: any) => {
          const artwork = await getCoverArtUrl(song.coverArt || album.coverArt || '')
          return {
            id: song.id,
            source: 'subsonic' as const,
            title: song.title,
            artist: song.artist,
            album: song.album || album.title || album.name,
            duration: song.duration,
            artwork
          }
        }))
        setQueue(mappedTracks, 0)
      }
    } catch (err) {
      console.error('Failed to play album:', err)
    }
  }

  if (isConfiguring) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }} className="p-6 md:p-10 rounded-2xl w-full max-w-[460px]">
          <div className="flex items-center gap-4 mb-8">
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--color-accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Server size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold margin-0">Connect to Server</h2>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>Subsonic / Navidrome</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div>
              <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Server URL</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '0 12px' }}>
                <Cloud size={16} style={{ color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  placeholder="music.yourdomain.com"
                  required
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  style={{ flex: 1, background: 'transparent', border: 'none', padding: '10px', color: 'var(--text)', outline: 'none', fontSize: 14 }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Username</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '0 12px' }}>
                <User size={16} style={{ color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  style={{ flex: 1, background: 'transparent', border: 'none', padding: '10px', color: 'var(--text)', outline: 'none', fontSize: 14 }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Password</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '0 12px' }}>
                <Lock size={16} style={{ color: 'var(--text-dim)' }} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ flex: 1, background: 'transparent', border: 'none', padding: '10px', color: 'var(--text)', outline: 'none', fontSize: 14 }}
                />
              </div>
            </div>

            {error && <div style={{ color: '#ef4444', fontSize: 13, background: 'rgba(239,68,68,0.1)', padding: 10, borderRadius: 8 }}>{error}</div>}

            <button
              type="submit"
              disabled={isSaving}
              style={{
                background: 'var(--color-accent)',
                color: '#000',
                border: 'none',
                padding: '12px',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: isSaving ? 'wait' : 'pointer',
                opacity: isSaving ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 8
              }}
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Connect'}
            </button>
            {config && (
              <button
                type="button"
                onClick={() => setIsConfiguring(false)}
                style={{ background: 'transparent', color: 'var(--text-dim)', border: 'none', cursor: 'pointer', fontSize: 13 }}
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
    <div className="p-4 md:p-8 h-full overflow-y-auto">
      <div className="flex md:flex-row flex-col md:items-center justify-between gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-4">
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--color-accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cloud size={20} />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-extrabold m-0 leading-tight">Navidrome</h1>
            <p style={{ color: 'var(--text-muted)', margin: '2px 0 0 0', fontSize: 12 }}>
              Connected to {config?.url ? config.url.replace('https://', '').replace('http://', '') : 'Not connected'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsConfiguring(true)}
          style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text)', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
          className="self-start md:self-auto"
        >
          Server Settings
        </button>
      </div>

      {error && <div style={{ color: '#ef4444', marginBottom: 16 }}>{error}</div>}

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Recently Added Albums</h2>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)', fontSize: 13 }}>
            <Loader2 size={16} className="animate-spin" /> Loading library...
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {albums.map((album, i) => {
              const baseUrl = config!.url.endsWith('/') ? config!.url.slice(0, -1) : config!.url;
              const coverUrl = `${baseUrl}/rest/getCoverArt?u=${encodeURIComponent(config!.username)}&t=${config!.token}&s=${config!.salt}&v=${config!.version}&c=${encodeURIComponent(config!.client)}&id=${album.coverArt || album.id}&size=300`
              
              return (
                <div
                  key={album.id + i}
                  onClick={() => handlePlayAlbum(album)}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 12,
                    padding: 10,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: 8, overflow: 'hidden', marginBottom: 8, background: 'rgba(0,0,0,0.2)', position: 'relative' }}>
                    <img src={coverUrl} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 1 }}>
                    {album.title || album.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {album.artist}
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
