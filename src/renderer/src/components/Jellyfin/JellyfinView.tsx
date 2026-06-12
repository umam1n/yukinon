import React, { useState, useEffect } from 'react'
import { useApp } from '../../store/AppContext'
import { Cloud, Server, Lock, User, Play, Loader2, Disc, Users, Music, ListMusic } from 'lucide-react'
import {
  getJellyfinConfig,
  setJellyfinConfig,
  getAlbums,
  getAlbumTracks,
  getCoverArtUrl,
  getArtists,
  getSongs,
  getPlaylists,
  type JellyfinConfig
} from '../../lib/jellyfin'
import type { Track } from '../../../../shared/types'
import AddToPlaylistModal from '../Playlists/AddToPlaylistModal'

export default function JellyfinView(): React.ReactElement {
  const { play, setQueue, addToQueue, notify } = useApp()
  const [config, setConfig] = useState<JellyfinConfig | null>(getJellyfinConfig())
  const [isConfiguring, setIsConfiguring] = useState(!config)

  // Form states
  const [url, setUrl] = useState(config?.url || '')
  const [username, setUsername] = useState(config?.username || '')
  const [password, setPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  // Library states
  const [activeTab, setActiveTab] = useState<'albums' | 'artists' | 'songs' | 'playlists'>('albums')
  const [albums, setAlbums] = useState<any[]>([])
  const [artists, setArtists] = useState<any[]>([])
  const [songs, setSongs] = useState<any[]>([])
  const [playlists, setPlaylists] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [trackToPlaylist, setTrackToPlaylist] = useState<Track | null>(null)

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

  // Fetch library when config, tab, or search changes
  useEffect(() => {
    const t = setTimeout(() => {
      if (config && !isConfiguring && config.accessToken) {
        loadTabContent(activeTab)
      }
    }, 500)
    return () => clearTimeout(t)
  }, [config, isConfiguring, activeTab, searchQuery])

  const loadTabContent = async (tab: 'albums' | 'artists' | 'songs' | 'playlists') => {
    setIsLoading(true)
    setError('')
    try {
      if (tab === 'albums') {
        const res = await getAlbums(undefined, searchQuery)
        if (res && res.Items) setAlbums(res.Items)
      } else if (tab === 'artists') {
        const res = await getArtists(searchQuery)
        if (res && res.Items) setArtists(res.Items)
      } else if (tab === 'songs') {
        const res = await getSongs(searchQuery)
        if (res && res.Items) setSongs(res.Items)
      } else if (tab === 'playlists') {
        // Jellyfin Playlists don't support simple SearchTerm easily, or we just rely on generic items query
        const res = await getPlaylists()
        if (res && res.Items) setPlaylists(res.Items)
      }
    } catch (err: any) {
      setError(`Failed to fetch ${tab}: ` + err.message)
      if (err.message?.includes('401') || err.message?.includes('AuthenticateByName')) {
        setIsConfiguring(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const mapJellyfinTrack = (item: any): Track => {
    return {
      id: item.Id,
      source: 'jellyfin',
      title: item.Name,
      artist: item.Artists?.[0] || item.AlbumArtist || 'Unknown Artist',
      album: item.Album || 'Unknown Album',
      duration: item.RunTimeTicks ? Math.floor(item.RunTimeTicks / 10000000) : 0,
      artwork: getCoverArtUrl(item.AlbumId || item.Id)
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
      password
    }

    try {
      setJellyfinConfig(newConfig)
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
      setPassword('') // Clear password
      loadTabContent(activeTab)
    } catch (err: any) {
      setError(err.message || 'Connection failed. Please check your credentials.')
      if (config) setJellyfinConfig(config) // Revert
    } finally {
      setIsSaving(false)
    }
  }

  const handlePlayAlbum = async (album: any, shuffle = false) => {
    try {
      const { getAlbumTracks } = await import('../../lib/jellyfin')
      const res = await getAlbumTracks(album.Id)
      const items = res.Items

      if (items && items.length > 0) {
        let mappedTracks = items.map((item: any) => mapJellyfinTrack(item))
        if (shuffle) {
          mappedTracks = mappedTracks.sort(() => Math.random() - 0.5)
        }
        setQueue(mappedTracks, 0)
        notify(`Playing album ${shuffle ? 'shuffled' : ''}`)
      }
    } catch (err) {
      console.error('Failed to play album:', err)
      notify('Failed to play album', 'error')
    }
  }

  const handlePlayArtist = async (artist: any, shuffle = false) => {
    try {
      const { getArtistTracks } = await import('../../lib/jellyfin')
      const res = await getArtistTracks(artist.Id)
      const items = res.Items

      if (items && items.length > 0) {
        let mappedTracks = items.map((item: any) => mapJellyfinTrack(item))
        if (shuffle) {
          mappedTracks = mappedTracks.sort(() => Math.random() - 0.5)
        }
        setQueue(mappedTracks, 0)
        notify(`Playing artist ${shuffle ? 'shuffled' : ''}`)
      }
    } catch (err) {
      console.error('Failed to play artist tracks:', err)
      notify('Failed to play artist', 'error')
    }
  }

  const handlePlayPlaylist = async (playlist: any, shuffle = false) => {
    try {
      const { getAlbumTracks } = await import('../../lib/jellyfin')
      const res = await getAlbumTracks(playlist.Id)
      const items = res.Items

      if (items && items.length > 0) {
        let mappedTracks = items.map((item: any) => mapJellyfinTrack(item))
        if (shuffle) {
          mappedTracks = mappedTracks.sort(() => Math.random() - 0.5)
        }
        setQueue(mappedTracks, 0)
        notify(`Playing playlist ${shuffle ? 'shuffled' : ''}`)
      }
    } catch (err) {
      console.error('Failed to play playlist tracks:', err)
      notify('Failed to play playlist', 'error')
    }
  }

  const handlePlaySong = (song: any, index: number) => {
    const mappedTracks = songs.map((item: any) => mapJellyfinTrack(item))
    setQueue(mappedTracks, index)
  }

  const handleAddToQueue = (song: any) => {
    const track = mapJellyfinTrack(song)
    addToQueue(track)
    notify('Added to queue')
  }

  const handleShuffleAllSongs = () => {
    if (songs.length === 0) return
    const mappedTracks = songs.map((s) => mapJellyfinTrack(s)).sort(() => Math.random() - 0.5)
    setQueue(mappedTracks, 0)
    notify(`Playing ${songs.length} songs shuffled`)
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
    <div style={{ padding: 32, height: '100%', overflowY: 'auto', background: 'var(--bg)' }}>
      {/* Header */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="text"
            placeholder="Search (live, instrument, etc...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '8px 16px',
              color: 'var(--text)',
              fontSize: 14,
              outline: 'none',
              width: 250
            }}
          />
          <button
            onClick={() => setIsConfiguring(true)}
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text)', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
          >
            Server Settings
          </button>
        </div>
      </div>

      {error && <div style={{ color: '#ef4444', marginBottom: 24, background: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 8 }}>{error}</div>}

      {/* Tabs Selector */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 24, paddingBottom: 0 }}>
        {(['albums', 'artists', 'songs', 'playlists'] as const).map((tab) => {
          const isActive = activeTab === tab
          const label = tab.charAt(0).toUpperCase() + tab.slice(1)
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'transparent',
                border: 'none',
                color: isActive ? 'var(--color-accent)' : 'var(--text-dim)',
                padding: '12px 20px',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                marginBottom: -1,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              {tab === 'albums' && <Disc size={16} />}
              {tab === 'artists' && <Users size={16} />}
              {tab === 'songs' && <Music size={16} />}
              {tab === 'playlists' && <ListMusic size={16} />}
              {label}
            </button>
          )
        })}
      </div>

      {/* Main Content */}
      <div style={{ minHeight: 200 }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)', padding: 20 }}>
            <Loader2 size={20} className="animate-spin" /> Loading {activeTab}...
          </div>
        ) : (
          <>
            {/* Albums Tab */}
            {activeTab === 'albums' && (
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
                        transition: 'all 0.2s',
                        position: 'relative'
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
                        {coverUrl ? <img src={coverUrl} alt={album.Name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Disc size={32} /></div>}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/40 transition-opacity gap-2">
                          <button onClick={(e) => { e.stopPropagation(); handlePlayAlbum(album, false) }} className="w-10 h-10 rounded-full bg-accent text-black flex items-center justify-center pl-1 shadow-lg hover:scale-110 transition-transform">
                            <Play size={18} fill="currentColor" />
                          </button>
                          <button title="Shuffle Play" onClick={(e) => { e.stopPropagation(); handlePlayAlbum(album, true) }} className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.2)] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l4.1-5.8c.8-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.8.8 3.6 2l3.5 5.2c.9 1.3 2.4 2.1 4 2.1H22"/><path d="m18 22 4-4-4-4"/></svg>
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
                        {album.Name}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {album.AlbumArtist || album.Artists?.[0] || 'Unknown Artist'}
                      </div>
                    </div>
                  )
                })}
                {albums.length === 0 && <div style={{ color: 'var(--text-dim)', padding: 20 }}>No albums found.</div>}
              </div>
            )}

            {/* Artists Tab */}
            {activeTab === 'artists' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 24
              }}>
                {artists.map((artist, i) => {
                  const coverUrl = getCoverArtUrl(artist.Id, 180)
                  return (
                    <div
                      key={artist.Id + i}
                      onClick={() => handlePlayArtist(artist)}
                      style={{
                        background: 'transparent',
                        borderRadius: 12,
                        padding: 12,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none'
                      }}
                    >
                      <div style={{
                        width: 120,
                        height: 120,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        margin: '0 auto 12px auto',
                        background: 'rgba(255,255,255,0.03)',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        position: 'relative'
                      }} className="group">
                        {coverUrl ? <img src={coverUrl} alt={artist.Name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={32} /></div>}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity gap-2">
                          <button onClick={(e) => { e.stopPropagation(); handlePlayArtist(artist, false) }} className="w-10 h-10 rounded-full bg-accent text-black flex items-center justify-center pl-1 shadow-lg hover:scale-110 transition-transform">
                            <Play size={18} fill="currentColor" />
                          </button>
                          <button title="Shuffle Play" onClick={(e) => { e.stopPropagation(); handlePlayArtist(artist, true) }} className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.2)] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l4.1-5.8c.8-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.8.8 3.6 2l3.5 5.2c.9 1.3 2.4 2.1 4 2.1H22"/><path d="m18 22 4-4-4-4"/></svg>
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {artist.Name}
                      </div>
                    </div>
                  )
                })}
                {artists.length === 0 && <div style={{ color: 'var(--text-dim)', padding: 20 }}>No artists found.</div>}
              </div>
            )}

            {/* Songs Tab */}
            {activeTab === 'songs' && (
              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                  <button
                    onClick={handleShuffleAllSongs}
                    disabled={songs.length === 0}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 16px',
                      borderRadius: 8,
                      border: 'none',
                      background: 'var(--color-accent)',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: songs.length ? 'pointer' : 'not-allowed',
                      opacity: songs.length ? 1 : 0.5
                    }}
                  >
                    Shuffle All
                  </button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-dim)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>#</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>Title</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>Artist</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>Album</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {songs.map((song, idx) => {
                      const track = mapJellyfinTrack(song)
                      return (
                        <tr
                          key={song.Id + idx}
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            transition: 'background 0.2s',
                            cursor: 'default'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          <td style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: 14 }}>{idx + 1}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <img src={track.artwork} style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover', background: 'rgba(0,0,0,0.2)' }} />
                              <div style={{ fontWeight: 600, color: 'var(--text)' }}>{track.title}</div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: 14 }}>{track.artist}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: 14 }}>{track.album}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                              <button
                                onClick={() => handlePlaySong(song, idx)}
                                style={{
                                  background: 'var(--color-accent)',
                                  color: 'black',
                                  border: 'none',
                                  borderRadius: 6,
                                  padding: '6px 12px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                <Play size={12} fill="currentColor" /> Play
                              </button>
                              <button
                                onClick={() => handleAddToQueue(song)}
                                style={{
                                  background: 'rgba(255,255,255,0.08)',
                                  color: 'var(--text)',
                                  border: 'none',
                                  borderRadius: 6,
                                  padding: '6px 12px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                + Queue
                              </button>
                              <button
                                onClick={() => setTrackToPlaylist(mapJellyfinTrack(song))}
                                style={{
                                  background: 'rgba(255,255,255,0.08)',
                                  color: 'var(--text)',
                                  border: 'none',
                                  borderRadius: 6,
                                  padding: '6px 12px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                + Playlist
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {songs.length === 0 && <div style={{ color: 'var(--text-dim)', padding: 20, textAlign: 'center' }}>No songs found.</div>}
              </div>
            )}

            {/* Playlists Tab */}
            {activeTab === 'playlists' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 24
              }}>
                {playlists.map((playlist, i) => {
                  const coverUrl = getCoverArtUrl(playlist.Id)
                  return (
                    <div
                      key={playlist.Id + i}
                      onClick={() => handlePlayPlaylist(playlist)}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: 12,
                        padding: 12,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        position: 'relative'
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
                        {coverUrl ? <img src={coverUrl} alt={playlist.Name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ListMusic size={32} /></div>}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/40 transition-opacity gap-2">
                          <button onClick={(e) => { e.stopPropagation(); handlePlayPlaylist(playlist, false) }} className="w-10 h-10 rounded-full bg-accent text-black flex items-center justify-center pl-1 shadow-lg hover:scale-110 transition-transform">
                            <Play size={18} fill="currentColor" />
                          </button>
                          <button title="Shuffle Play" onClick={(e) => { e.stopPropagation(); handlePlayPlaylist(playlist, true) }} className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.2)] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l4.1-5.8c.8-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.8.8 3.6 2l3.5 5.2c.9 1.3 2.4 2.1 4 2.1H22"/><path d="m18 22 4-4-4-4"/></svg>
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
                        {playlist.Name}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Playlist
                      </div>
                    </div>
                  )
                })}
                {playlists.length === 0 && <div style={{ color: 'var(--text-dim)', padding: 20 }}>No playlists found.</div>}
              </div>
            )}
          </>
        )}
      </div>
      <AddToPlaylistModal track={trackToPlaylist} onClose={() => setTrackToPlaylist(null)} />
    </div>
  )
}
