import React, { useState, useMemo, useCallback } from 'react'
import { FolderOpen, Search, Music2, RefreshCw, Disc, Mic2, ArrowLeft, Play } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import type { Track } from '../../../../../../shared/types'
import TrackList from './TrackList'

type ViewMode = 'tracks' | 'albums' | 'artists'

interface AlbumGroup {
  albumKey: string
  title: string
  artist: string
  year?: number | string
  artwork?: string
  tracks: Track[]
}

interface ArtistGroup {
  name: string
  tracks: Track[]
  albumCount: number
}

function formatTotalDuration(secs: number): string {
  if (!secs) return '0 min'
  const hours = Math.floor(secs / 3600)
  const minutes = Math.floor((secs % 3600) / 60)
  if (hours > 0) {
    return `${hours} hr ${minutes} min`
  }
  return `${minutes} min`
}

export default function LibraryView(): React.ReactElement {
  const { tracks, setTracks, setQueue, notify } = useApp()
  const [viewMode, setViewMode] = useState<ViewMode>('tracks')
  const [search, setSearch] = useState('')
  const [instrumentType, setInstrumentType] = useState<'all' | 'vocal' | 'instrumental'>('all')
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'album' | 'genre'>('title')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [scanning, setScanning] = useState(false)
  const [selectedAlbumKey, setSelectedAlbumKey] = useState<string | null>(null)
  const [selectedArtistName, setSelectedArtistName] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let result = [...tracks]

    // Filter by instrumental/vocal
    if (instrumentType !== 'all') {
      result = result.filter((t) => {
        const isInst =
          t.title?.toLowerCase().includes('instrumental') ||
          t.title?.toLowerCase().includes('inst.') ||
          t.genre?.toLowerCase().includes('instrumental')
        return instrumentType === 'instrumental' ? isInst : !isInst
      })
    }

    const q = search.toLowerCase()
    if (q) {
      result = result.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.artist?.toLowerCase().includes(q) ||
          t.album?.toLowerCase().includes(q)
      )
    }

    // Sort
    result.sort((a, b) => {
      const aVal = String(a[sortBy] || '').toLowerCase()
      const bVal = String(b[sortBy] || '').toLowerCase()
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [tracks, search, instrumentType, sortBy, sortDirection])

  // Group into albums
  const albums = useMemo(() => {
    const map = new Map<string, AlbumGroup>()
    for (const track of filtered) {
      const key = track.album?.trim() || 'Unknown Album'
      let group = map.get(key)
      if (!group) {
        group = {
          albumKey: key,
          title: key,
          artist: (track.artist || 'Unknown Artist').trim(),
          year: track.year,
          artwork: track.artwork,
          tracks: []
        }
        map.set(key, group)
      }
      if (!group.artwork && track.artwork) {
        group.artwork = track.artwork
      }
      if (!group.year && track.year) {
        group.year = track.year
      }
      group.tracks.push(track)
    }
    return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title))
  }, [filtered])

  // Group into artists
  const artists = useMemo(() => {
    const map = new Map<string, { tracks: Track[]; albums: Set<string> }>()
    for (const track of filtered) {
      const name = track.artist?.trim() || 'Unknown Artist'
      let entry = map.get(name)
      if (!entry) {
        entry = { tracks: [], albums: new Set() }
        map.set(name, entry)
      }
      entry.tracks.push(track)
      if (track.album) {
        entry.albums.add(track.album.trim())
      }
    }
    return Array.from(map.entries())
      .map(([name, { tracks: artistTracks, albums: artistAlbums }]) => ({
        name,
        tracks: artistTracks,
        albumCount: Math.max(1, artistAlbums.size)
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [filtered])

  // Active album for detail view
  const activeAlbum = useMemo(() => {
    if (!selectedAlbumKey) return null
    return albums.find((a) => a.albumKey === selectedAlbumKey) || null
  }, [albums, selectedAlbumKey])

  // Active artist for artists split view
  const activeArtist = useMemo(() => {
    if (!selectedArtistName && artists.length > 0) {
      return artists[0]
    }
    return artists.find((a) => a.name === selectedArtistName) || (artists.length > 0 ? artists[0] : null)
  }, [artists, selectedArtistName])

  const handleAddFolder = useCallback(async () => {
    try {
      const folderPath = await window.yukinon.library.selectFolder()
      if (!folderPath) return

      setScanning(true)
      const result = await window.yukinon.library.scan(folderPath) as { added: number; total: number }
      const updated = await window.yukinon.library.getTracks() as Track[]
      setTracks(updated)
      notify(`Scanned ${result.total} files, added ${result.added} new tracks.`, 'success')
    } catch (err) {
      console.error(err)
      notify('Failed to scan the folder.', 'error')
    } finally {
      setScanning(false)
    }
  }, [setTracks, notify])

  const handlePlayAll = useCallback(() => {
    if (filtered.length > 0) {
      const shuffled = [...filtered].sort(() => Math.random() - 0.5)
      setQueue(shuffled, 0)
    }
  }, [filtered, setQueue])

  const switcherBtnStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    background: active ? 'rgba(var(--color-accent-rgb), 0.15)' : 'transparent',
    color: active ? 'var(--color-accent)' : 'var(--text-muted)',
    transition: 'all 0.15s ease'
  })

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0
        }}
      >
        {/* View Mode Switcher */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-3)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 2,
            flexShrink: 0
          }}
        >
          <button
            onClick={() => {
              setViewMode('tracks')
              setSelectedAlbumKey(null)
            }}
            style={switcherBtnStyle(viewMode === 'tracks')}
            title="Tracks View"
          >
            <Music2 size={13} />
            Tracks
          </button>
          <button
            onClick={() => {
              setViewMode('albums')
              setSelectedAlbumKey(null)
            }}
            style={switcherBtnStyle(viewMode === 'albums')}
            title="Albums View"
          >
            <Disc size={13} />
            Albums
          </button>
          <button
            onClick={() => {
              setViewMode('artists')
              setSelectedAlbumKey(null)
            }}
            style={switcherBtnStyle(viewMode === 'artists')}
            title="Artists View"
          >
            <Mic2 size={13} />
            Artists
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-dim)'
            }}
          />
          <input
            type="text"
            placeholder={
              viewMode === 'tracks'
                ? 'Search tracks, artists, albums...'
                : viewMode === 'albums'
                ? 'Search albums...'
                : 'Search artists...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-3)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '7px 12px 7px 32px',
              color: 'var(--text)',
              fontSize: 13,
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Sort & Filter Controls (only in tracks mode) */}
        {viewMode === 'tracks' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={`${sortBy}-${sortDirection}`}
              onChange={(e) => {
                const [by, dir] = e.target.value.split('-')
                setSortBy(by as any)
                setSortDirection(dir as any)
              }}
              style={{
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '6px 12px',
                color: 'var(--text-muted)',
                fontSize: 12,
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <optgroup label="Sort By">
                <option value="title-asc">Title (A-Z)</option>
                <option value="artist-asc">Artist (A-Z)</option>
                <option value="album-asc">Album (A-Z)</option>
                <option value="genre-asc">Genre (A-Z)</option>
              </optgroup>
            </select>

            <select
              value={instrumentType}
              onChange={(e) => setInstrumentType(e.target.value as any)}
              style={{
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '6px 12px',
                color: 'var(--text-muted)',
                fontSize: 12,
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Audio</option>
              <option value="vocal">Vocals Only</option>
              <option value="instrumental">Instrumentals</option>
            </select>
          </div>
        )}

        {/* Shuffle all */}
        {filtered.length > 0 && viewMode === 'tracks' && (
          <button
            onClick={handlePlayAll}
            title="Shuffle and play all tracks in this view"
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
              cursor: 'pointer',
              transition: 'opacity 0.15s'
            }}
          >
            Shuffle All
          </button>
        )}
      </div>

      {/* Stats bar */}
      {tracks.length > 0 && !selectedAlbumKey && (
        <div
          style={{
            padding: '6px 20px',
            fontSize: 11,
            color: 'var(--text-dim)',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0
          }}
        >
          {viewMode === 'tracks' && `${filtered.length} tracks`}
          {viewMode === 'albums' && `${albums.length} albums`}
          {viewMode === 'artists' && `${artists.length} artists`}
          {search && ` matching "${search}"`}
        </div>
      )}

      {/* Main Content Area */}
      {filtered.length === 0 ? (
        <EmptyState onAddFolder={handleAddFolder} scanning={scanning} hasLibrary={tracks.length > 0} />
      ) : viewMode === 'tracks' ? (
        <TrackList tracks={filtered} />
      ) : viewMode === 'albums' ? (
        activeAlbum ? (
          /* Album Detail View */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                flexShrink: 0
              }}
            >
              <button
                onClick={() => setSelectedAlbumKey(null)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-3)',
                  color: 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  width: 'fit-content'
                }}
              >
                <ArrowLeft size={14} />
                Back to Albums
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div
                  style={{
                    width: 110,
                    height: 110,
                    borderRadius: 6,
                    background: 'var(--bg-3)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  {activeAlbum.artwork ? (
                    <img
                      src={activeAlbum.artwork}
                      alt={activeAlbum.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Disc size={48} style={{ color: 'var(--text-dim)' }} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {activeAlbum.title}
                  </h2>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
                    {activeAlbum.artist}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                    {activeAlbum.year ? `${activeAlbum.year} · ` : ''}
                    {activeAlbum.tracks.length} track{activeAlbum.tracks.length === 1 ? '' : 's'} ·{' '}
                    {formatTotalDuration(
                      activeAlbum.tracks.reduce((acc, t) => acc + (t.duration || 0), 0)
                    )}
                  </p>
                  <div style={{ marginTop: 12 }}>
                    <button
                      onClick={() => setQueue(activeAlbum.tracks, 0)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 18px',
                        borderRadius: 6,
                        border: 'none',
                        background: 'var(--color-accent)',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <Play size={14} fill="currentColor" />
                      Play Album
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <TrackList tracks={activeAlbum.tracks} />
          </div>
        ) : (
          /* Album Grid */
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 16,
              alignContent: 'start'
            }}
          >
            {albums.map((album) => (
              <div
                key={album.albumKey}
                onClick={() => setSelectedAlbumKey(album.albumKey)}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(var(--color-accent-rgb), 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: 6,
                    background: 'var(--bg-3)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10
                  }}
                >
                  {album.artwork ? (
                    <img
                      src={album.artwork}
                      alt={album.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Disc size={40} style={{ color: 'var(--text-dim)' }} />
                  )}
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: 'var(--text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={album.title}
                >
                  {album.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: 2
                  }}
                  title={album.artist}
                >
                  {album.artist}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                  {album.year ? `${album.year} · ` : ''}
                  {album.tracks.length} track{album.tracks.length === 1 ? '' : 's'}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Artists Split View */
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left Column: Artists List */}
          <div
            style={{
              width: 220,
              borderRight: '1px solid var(--border)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              padding: '8px 0',
              flexShrink: 0
            }}
          >
            {artists.map((artist) => {
              const isSelected = activeArtist?.name === artist.name
              return (
                <button
                  key={artist.name}
                  onClick={() => setSelectedArtistName(artist.name)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 16px',
                    border: 'none',
                    background: isSelected ? 'rgba(var(--color-accent-rgb), 0.12)' : 'transparent',
                    color: isSelected ? 'var(--color-accent)' : 'var(--text)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(var(--color-accent-rgb), 0.05)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: isSelected ? 600 : 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginRight: 8
                    }}
                    title={artist.name}
                  >
                    {artist.name}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-dim)',
                      flexShrink: 0,
                      fontFamily: 'JetBrains Mono, monospace'
                    }}
                  >
                    {artist.tracks.length}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Right Column: Artist Tracks */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {activeArtist ? (
              <>
                <div
                  style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0
                  }}
                >
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                      {activeArtist.name}
                    </h2>
                    <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                      {activeArtist.tracks.length} track{activeArtist.tracks.length === 1 ? '' : 's'} ·{' '}
                      {activeArtist.albumCount} album{activeArtist.albumCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <button
                    onClick={() => setQueue(activeArtist.tracks, 0)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 16px',
                      borderRadius: 6,
                      border: 'none',
                      background: 'var(--color-accent)',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Play size={14} fill="currentColor" />
                    Play All
                  </button>
                </div>
                <TrackList tracks={activeArtist.tracks} />
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-dim)',
                  fontSize: 13
                }}
              >
                Select an artist to view tracks
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState({
  onAddFolder,
  scanning,
  hasLibrary
}: {
  onAddFolder: () => void
  scanning: boolean
  hasLibrary: boolean
}): React.ReactElement {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        color: 'var(--text-dim)'
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          background: 'rgba(var(--color-accent-rgb), 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px dashed rgba(var(--color-accent-rgb), 0.3)'
        }}
      >
        <Music2 size={32} style={{ color: 'var(--color-accent)', opacity: 0.6 }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
          {hasLibrary ? 'No results found' : 'Your library is empty'}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          {hasLibrary
            ? 'Try a different search term'
            : 'Add a folder containing your FLAC, WAV, or MP3 files'}
        </p>
      </div>
      {!hasLibrary && (
        <button
          onClick={onAddFolder}
          disabled={scanning}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background: 'var(--color-accent)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <FolderOpen size={16} />
          Add Music Folder
        </button>
      )}
    </div>
  )
}
