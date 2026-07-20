import React, { useState, useCallback } from 'react'
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
  const { player, tracks, togglePlayPause, playNext, playPrev, seekTo, playbackMode, togglePlaybackMode, setActiveView } = useApp()
  const [dragPosition, setDragPosition] = useState<number | null>(null)

  const currentTrack = tracks.find(t => t.id === player.currentTrackId)

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

  const PlayIcon = playbackMode === 'shuffle' ? Shuffle : playbackMode === 'repeat-all' ? Repeat : playbackMode === 'repeat-one' ? Repeat1 : Repeat

  return (
    <div
      className="glass"
      style={{
        position: 'fixed',
        bottom: 64, // sits above 64px bottom tab bar
        left: 8,
        right: 8,
        height: 72,
        borderRadius: 20,
        zIndex: 50,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      {/* Progress bar - absolutely at bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 }}>
        <input
          type="range"
          min={0}
          max={player.duration || 0}
          value={dragPosition !== null ? dragPosition : player.position}
          step={0.5}
          onChange={handleSeekChange}
          onTouchEnd={handleSeekEnd}
          onMouseUp={handleSeekEnd}
          style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 1 }}
        />
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, var(--color-accent), var(--color-accent-2))',
          transform: `scaleX(${progressPercent / 100})`,
          transformOrigin: 'left',
          transition: 'transform 0.3s linear',
          borderRadius: 100,
        }} />
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
        {player.artwork
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
          width: 44,
          height: 44,
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
        onClick={togglePlaybackMode}
        style={{ ...btnStyle, color: playbackMode !== 'normal' ? 'var(--color-accent)' : 'var(--text-dim)' }}
      >
        <PlayIcon size={16} />
      </button>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-dim)',
  cursor: 'pointer',
  padding: 8,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  minWidth: 36,
  minHeight: 36,
}
