import React, { useState, useEffect } from 'react'
import { useApp } from '../../store/AppContext'
import { Cloud, Server, Lock, User, Play, Loader2, Disc, Users, Music, ListMusic, Plus, Trash2, Tag } from 'lucide-react'
import {
  getJellyfinConfig,
  setJellyfinConfig,
  getAlbums,
  getAlbumTracks,
  getCoverArtUrl,
  getArtists,
  getSongs,
  getPlaylists,
  getGenres,
  type JellyfinConfig
} from '../../lib/jellyfin'
import type { Track } from '@shared/types'
import AddToPlaylistModal from '../Playlists/AddToPlaylistModal'

export default function JellyfinView(): React.ReactElement {
  const { play, setQueue, addToQueue, notify } = useApp()
  const [config, setConfig] = useState<JellyfinConfig | null>(getJellyfinConfig())
  const [isConfiguring, setIsConfiguring] = useState(!config)

  const [url, setUrl] = useState(config?.url || '')
  const [username, setUsername] = useState(config?.username || '')
  const [password, setPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const [activeTab, setActiveTab] = useState<'albums' | 'artists' | 'songs' | 'playlists' | 'genres'>('albums')
  const [albums, setAlbums] = useState<any[]>([])
  const [artists, setArtists] = useState<any[]>([])
  const [songs, setSongs] = useState<any[]>([])
  const [playlists, setPlaylists] = useState<any[]>([])
  const [genres, setGenres] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [trackToPlaylist, setTrackToPlaylist] = useState<Track | null>(null)

  useEffect(() => {
    window.yukinon.settings.get('jellyfin_config').then((savedConfig: any) => {
      if (savedConfig) {
        setConfig(savedConfig)
        setJellyfinConfig(savedConfig)
        setIsConfiguring(false)
        setUrl(savedConfig.url)
        setUsername(savedConfig.username)
      }
    })
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      if (config && !isConfiguring && config.accessToken) {
        loadTabContent(activeTab)
      }
    }, 500)
    return () => clearTimeout(t)
  }, [config, isConfiguring, activeTab, searchQuery])

  const loadTabContent = async (tab: 'albums' | 'artists' | 'songs' | 'playlists' | 'genres') => {
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
        const res = await getPlaylists()
        if (res && res.Items) setPlaylists(res.Items)
      } else if (tab === 'genres') {
        const res = await getGenres(searchQuery)
        if (res && res.Items) setGenres(res.Items)
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
      setPassword('')
      loadTabContent(activeTab)
    } catch (err: any) {
      setError(err.message || 'Connection failed. Please check your credentials.')
      if (config) setJellyfinConfig(config)
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

  const handlePlayGenre = async (genre: any, shuffle = true) => {
    try {
      const { getSongsByGenre } = await import('../../lib/jellyfin')
      const res = await getSongsByGenre(genre.Name)
      const items = res.Items

      if (items && items.length > 0) {
        let mappedTracks = items.map((item: any) => mapJellyfinTrack(item))
        if (shuffle) {
          mappedTracks = mappedTracks.sort(() => Math.random() - 0.5)
        }
        setQueue(mappedTracks, 0)
        notify(`Playing genre: ${genre.Name} ${shuffle ? 'shuffled' : ''}`)
      } else {
        notify('No tracks found in this genre', 'error')
      }
    } catch (err) {
      console.error('Failed to play genre tracks:', err)
      notify('Failed to play genre', 'error')
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
      <div className="flex items-center justify-center h-full p-4">
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }} className="p-6 md:p-10 rounded-2xl w-full max-w-[460px]">
          <div className="flex items-center gap-4 mb-8">
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--color-accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Server size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold m-0">Connect to Server</h2>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>Jellyfin</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div>
              <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Server URL</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '0 12px' }}>
                <Cloud size={16} style={{ color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  placeholder="http://192.168.1.10:8096"
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
            {config && config.accessToken && (
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
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-[var(--bg)]">
      {/* Header */}
      <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-4">
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--color-accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cloud size={20} />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-extrabold m-0 leading-tight">Jellyfin</h1>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: 12 }}>
              Connected to {config?.url ? config.url.replace('https://', '').replace('http://', '') : 'Not connected'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '8px 12px',
              color: 'var(--text)',
              fontSize: 13,
              outline: 'none',
            }}
            className="flex-1 md:w-48"
          />
          <button
            onClick={() => setIsConfiguring(true)}
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text)', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}
          >
            Settings
          </button>
        </div>
      </div>

      {error && <div style={{ color: '#ef4444', marginBottom: 16, background: 'rgba(239,68,68,0.1)', padding: 10, borderRadius: 8, fontSize: 13 }}>{error}</div>}

      {/* Tabs Selector */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }} className="overflow-x-auto hide-scrollbar">
        {(['albums', 'artists', 'songs', 'playlists', 'genres'] as const).map((tab) => {
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
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                marginBottom: -1,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap'
              }}
            >
              {tab === 'albums' && <Disc size={14} />}
              {tab === 'artists' && <Users size={14} />}
              {tab === 'songs' && <Music size={14} />}
              {tab === 'playlists' && <ListMusic size={14} />}
              {tab === 'genres' && <Tag size={14} />}
              {label}
            </button>
          )
        })}
      </div>

      {/* Main Content */}
      <div style={{ minHeight: 200 }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)', padding: 20, fontSize: 13 }}>
            <Loader2 size={16} className="animate-spin" /> Loading {activeTab}...
          </div>
        ) : (
          <>
            {activeTab === 'albums' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {albums.map((album, i) => {
                  const coverUrl = getCoverArtUrl(album.Id)
                  return (
                    <div
                      key={album.Id + i}
                      onClick={() => handlePlayAlbum(album)}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: 12,
                        padding: 10,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: 8, overflow: 'hidden', marginBottom: 8, background: 'rgba(0,0,0,0.2)', position: 'relative' }}>
                        {coverUrl ? <img src={coverUrl} alt={album.Name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Disc size={24} /></div>}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 1 }}>
                        {album.Name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {album.AlbumArtist || album.Artists?.[0] || 'Unknown Artist'}
                      </div>
                    </div>
                  )
                })}
                {albums.length === 0 && <div style={{ color: 'var(--text-dim)', padding: 12, fontSize: 13 }}>No albums found.</div>}
              </div>
            )}

            {activeTab === 'artists' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {artists.map((artist, i) => {
                  const coverUrl = getCoverArtUrl(artist.Id, 180)
                  return (
                    <div
                      key={artist.Id + i}
                      onClick={() => handlePlayArtist(artist)}
                      style={{
                        background: 'rgba(255,255,255,0.01)',
                        borderRadius: 12,
                        padding: 10,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        margin: '0 auto 8px auto',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        position: 'relative'
                      }}>
                        {coverUrl ? <img src={coverUrl} alt={artist.Name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={20} /></div>}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {artist.Name}
                      </div>
                    </div>
                  )
                })}
                {artists.length === 0 && <div style={{ color: 'var(--text-dim)', padding: 12, fontSize: 13 }}>No artists found.</div>}
              </div>
            )}

            {activeTab === 'songs' && (
              <div className="flex flex-col gap-2">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <button
                    onClick={handleShuffleAllSongs}
                    disabled={songs.length === 0}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: 'none',
                      background: 'var(--color-accent)',
                      color: '#000',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: songs.length ? 'pointer' : 'not-allowed',
                      opacity: songs.length ? 1 : 0.5
                    }}
                  >
                    Shuffle All
                  </button>
                </div>
                
                {songs.map((song, idx) => {
                  const track = mapJellyfinTrack(song)
                  return (
                    <div
                      key={song.Id + idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '40px 1fr auto',
                        gap: 12,
                        padding: '10px 12px',
                        alignItems: 'center',
                        borderRadius: 10,
                        background: 'rgba(255,255,255,0.02)',
                        marginBottom: 2
                      }}
                    >
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', fontFamily: 'monospace' }}>{idx + 1}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artist} · {track.album}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => handlePlaySong(song, idx)}
                          style={{ background: 'var(--color-accent)', color: 'black', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Play
                        </button>
                        <button
                          onClick={() => handleAddToQueue(song)}
                          style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text)', border: 'none', borderRadius: 6, padding: '6px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          +Q
                        </button>
                        <button
                          onClick={() => setTrackToPlaylist(mapJellyfinTrack(song))}
                          style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text)', border: 'none', borderRadius: 6, padding: '6px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          +P
                        </button>
                      </div>
                    </div>
                  )
                })}
                {songs.length === 0 && <div style={{ color: 'var(--text-dim)', padding: 20, textAlign: 'center', fontSize: 13 }}>No songs found.</div>}
              </div>
            )}

            {activeTab === 'playlists' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {playlists.map((playlist, i) => {
                  const coverUrl = getCoverArtUrl(playlist.Id)
                  return (
                    <div
                      key={playlist.Id + i}
                      onClick={() => handlePlayPlaylist(playlist)}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: 12,
                        padding: 10,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: 8, overflow: 'hidden', marginBottom: 8, background: 'rgba(0,0,0,0.2)', position: 'relative' }}>
                        {coverUrl ? <img src={coverUrl} alt={playlist.Name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ListMusic size={24} /></div>}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 1 }}>
                        {playlist.Name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Playlist
                      </div>
                    </div>
                  )
                })}
                {playlists.length === 0 && <div style={{ color: 'var(--text-dim)', padding: 12, fontSize: 13 }}>No playlists found.</div>}
              </div>
            )}

            {activeTab === 'genres' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {genres.map((genre, i) => {
                  const coverUrl = getCoverArtUrl(genre.Id)
                  return (
                    <div
                      key={genre.Id + i}
                      onClick={() => handlePlayGenre(genre, true)}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: 12,
                        padding: 10,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: 8, overflow: 'hidden', marginBottom: 8, background: 'rgba(0,0,0,0.2)', position: 'relative' }}>
                        {coverUrl ? <img src={coverUrl} alt={genre.Name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}><Tag size={24} /></div>}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 1 }}>
                        {genre.Name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Genre
                      </div>
                    </div>
                  )
                })}
                {genres.length === 0 && <div style={{ color: 'var(--text-dim)', padding: 12, fontSize: 13 }}>No genres found.</div>}
              </div>
            )}
          </>
        )}
      </div>
      <AddToPlaylistModal track={trackToPlaylist} onClose={() => setTrackToPlaylist(null)} />
    </div>
  )
}
