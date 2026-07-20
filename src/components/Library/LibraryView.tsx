import React, { useState, useMemo, useCallback } from 'react'
import { FolderOpen, Search, Music2, RefreshCw, Disc, Mic2 } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import type { Track } from '@shared/types'
import TrackList from './TrackList'

type GroupMode = 'all' | 'album' | 'artist'

export default function LibraryView(): React.ReactElement {
  const { tracks, setTracks, setQueue, notify } = useApp()
  const [search, setSearch] = useState('')
  const [groupMode, setGroupMode] = useState<GroupMode>('all')
  const [instrumentType, setInstrumentType] = useState<'all' | 'vocal' | 'instrumental'>('all')
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'album' | 'genre'>('title')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [scanning, setScanning] = useState(false)

  const filtered = useMemo(() => {
    let result = [...tracks]

    // Filter by instrumental/vocal
    if (instrumentType !== 'all') {
      result = result.filter(t => {
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
      // Shuffle the filtered tracks
      const shuffled = [...filtered].sort(() => Math.random() - 0.5)
      setQueue(shuffled, 0)
    }
  }, [filtered, setQueue])

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
          gap: 10,
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0
        }}
      >
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
            placeholder="Search tracks, artists, albums..."
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

        {/* Sort & Filter Controls */}
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
            <option value="vocal">Original</option>
            <option value="instrumental">Instrumentals</option>
          </select>
        </div>

        {/* Shuffle all */}
        {filtered.length > 0 && (
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
      {tracks.length > 0 && (
        <div
          style={{
            padding: '6px 20px',
            fontSize: 11,
            color: 'var(--text-dim)',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0
          }}
        >
          {filtered.length} tracks
          {search && ` matching "${search}"`}
        </div>
      )}

      {/* Track List / Empty State */}
      {filtered.length === 0 ? (
        <EmptyState onAddFolder={handleAddFolder} scanning={scanning} hasLibrary={tracks.length > 0} />
      ) : (
        <TrackList tracks={filtered} />
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

