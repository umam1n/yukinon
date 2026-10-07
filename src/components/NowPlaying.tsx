import React, { useState, useEffect, useCallback } from 'react'
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Music2, ChevronUp } from 'lucide-react'
import { useApp } from '../store/AppContext'

function formatTime(secs: number): string {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getTitle(player: any, currentTrack: any) {
  if (player.source === 'ytm') return player.ytmInfo?.title || 'YouTube Music'
  if (player.source === 'radio') return player.radioInfo?.title || 'Internet Radio'
  if (player.source === 'subsonic') return player.subsonicInfo?.title || 'Navidrome'
  if (player.source === 'jellyfin') return player.jellyfinInfo?.title || 'Jellyfin'
  return currentTrack?.title || 'Nothing playing'
}

function getArtist(player: any, currentTrack: any) {
  if (player.source === 'ytm') return player.ytmInfo?.artist || ''
  if (player.source === 'radio') return player.radioInfo?.station || ''
  if (player.source === 'subsonic') return player.subsonicInfo?.artist || ''
  if (player.source === 'jellyfin') return player.jellyfinInfo?.artist || ''
  return currentTrack?.artist || '—'
}

export default function NowPlaying(): React.ReactElement {
  const { player, tracks, queue, togglePlayPause, playNext, playPrev, seekTo, shuffle, repeat, toggleShuffle, toggleRepeat, setActiveView, renderAlbumArt } = useApp()
  const [dragPosition, setDragPosition] = useState<number | null>(null)
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 360,
    height: typeof window !== 'undefined' ? window.innerHeight : 640
  })

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const currentTrack = tracks.find(t => t.id === player.currentTrackId) || queue.find(t => t.id === player.currentTrackId)

  const handleSeekChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDragPosition(Number(e.target.value))
  }, [])

  const handleSeekEnd = useCallback(() => {
    if (dragPosition !== null) {
      seekTo(dragPosition)
      setDragPosition(null)
    }
  }, [dragPosition, seekTo])

  const progressPercent = player.duration > 0
    ? ((dragPosition !== null ? dragPosition : player.position) / player.duration) * 100
    : 0

  return (
    <div
      style={{
        position: 'fixed',
        bottom: dimensions.height < 500 ? 48 : 68,
        left: 0,
        right: 0,
        height: dimensions.height < 500 ? 50 : 64,
        borderRadius: 0,
        background: 'var(--bg-2)',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.2)',
        zIndex: 50,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 8,
      }}
    >
      {/* Progress bar - top edge with 24px touch-friendly hit area */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 24, zIndex: 10, cursor: 'pointer' }}>
        <input
          type="range"
          min={0}
          max={player.duration || 0}
          value={dragPosition !== null ? dragPosition : player.position}
          step={0.5}
          onChange={handleSeekChange}
          onTouchEnd={handleSeekEnd}
          onMouseUp={handleSeekEnd}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 24,
            margin: 0,
            opacity: 0,
            width: '100%',
            cursor: 'pointer',
            zIndex: 2
          }}
        />
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'var(--border)'
        }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, var(--color-accent), var(--color-accent-2))',
            transform: `scaleX(${progressPercent / 100})`,
            transformOrigin: 'left',
            transition: 'transform 0.3s linear',
            borderRadius: 100,
          }} />
        </div>
      </div>

      {/* Artwork + tap for fullscreen */}
      <div
        onClick={() => setActiveView('fullscreen')}
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'var(--bg-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
          border: '1px solid var(--border)',
          cursor: 'pointer',
        }}
      >
        {renderAlbumArt && player.artwork
          ? <img src={player.artwork} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Music2 size={18} style={{ color: 'var(--text-dim)' }} />
        }
      </div>

      {/* Track info - takes remaining space */}
      <div
        onClick={() => setActiveView('fullscreen')}
        style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
      >
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {getTitle(player, currentTrack)}
        </div>
        <div style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {getArtist(player, currentTrack)}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
          {formatTime(dragPosition !== null ? dragPosition : player.position)} / {formatTime(player.duration)}
        </div>
      </div>

      {/* Controls: only the essentials */}
      <button onClick={playPrev} style={btnStyle}>
        <SkipBack size={18} />
      </button>

      <button
        onClick={togglePlayPause}
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--color-accent)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#fff',
          flexShrink: 0,
          boxShadow: '0 0 12px rgba(var(--color-accent-rgb), 0.5)',
        }}
      >
        {player.status === 'playing' ? <Pause size={20} /> : <Play size={20} />}
      </button>

      <button onClick={playNext} style={btnStyle}>
        <SkipForward size={18} />
      </button>

      <button
        className="nowplaying-secondary-btn"
        onClick={toggleShuffle}
        title={shuffle ? 'Shuffle: On' : 'Shuffle: Off'}
        style={{ ...btnStyle, color: shuffle ? 'var(--color-accent)' : 'var(--text-dim)' }}
      >
        <Shuffle size={18} />
      </button>

      <button
        className="nowplaying-secondary-btn"
        onClick={toggleRepeat}
        title={`Repeat: ${repeat === 'off' ? 'Off' : repeat === 'all' ? 'All' : 'One'}`}
        style={{ ...btnStyle, color: repeat !== 'off' ? 'var(--color-accent)' : 'var(--text-dim)' }}
      >
        {repeat === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
      </button>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-dim)',
  cursor: 'pointer',
  padding: 10,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  minWidth: 44,
  minHeight: 44,
}
