import React, { useState, useEffect, useCallback } from 'react'
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Music2, Shuffle, Repeat, Sparkles, Repeat1
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import type { Track } from '../../../../../shared/types'

function formatTime(secs: number): string {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function NowPlaying(): React.ReactElement {
  const { player, tracks, togglePlayPause, playNext, playPrev, seekTo, setVolume, playbackMode, togglePlaybackMode, isSmartPlay, toggleSmartPlay, setActiveView } = useApp()
  const [isMuted, setIsMuted] = useState(false)
  const [dragPosition, setDragPosition] = useState<number | null>(null)

  const currentTrack = tracks.find((t) => t.id === player.currentTrackId)

  const handleSeekChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDragPosition(Number(e.target.value))
  }, [])

  const handleSeekEnd = useCallback(() => {
    if (dragPosition !== null) {
      seekTo(dragPosition)
      setDragPosition(null)
    }
  }, [dragPosition, seekTo])

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    setIsMuted(v === 0)
    setVolume(v)
  }, [setVolume])

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    if (newMuted) {
      setVolume(0)
    } else {
      setVolume(0.8)
    }
  }, [isMuted, setVolume])

  const progressPercent =
    player.duration > 0 ? ((dragPosition !== null ? dragPosition : player.position) / player.duration) * 100 : 0

  return (
    <div
      className="glass"
      style={{
        height: 80,
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 48px)',
        maxWidth: 1000,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 20,
        borderRadius: 40,
        boxShadow: '0 20px 40px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.1)',
        zIndex: 50,
        overflow: 'hidden'
      }}
    >
      {/* Progress bar (positioned absolutely at the very bottom edge of the pill) */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          background: 'transparent'
        }}
      >
        <input
          type="range"
          className="progress-slider"
          min={0}
          max={player.duration || 0}
          value={dragPosition !== null ? dragPosition : player.position}
          step={0.5}
          onChange={handleSeekChange}
          onMouseUp={handleSeekEnd}
          onTouchEnd={handleSeekEnd}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
            zIndex: 1
          }}
        />
        <div
          style={{
            height: '100%',
            width: '100%',
            background: `linear-gradient(90deg, var(--color-accent), var(--color-accent-2))`,
            borderRadius: 100,
            transform: `scaleX(${progressPercent / 100})`,
            transformOrigin: 'left',
            transition: 'transform 0.3s linear'
          }}
        />
      </div>

      {/* Track Info (Clickable for Fullscreen) */}
      <div 
        onClick={() => setActiveView('fullscreen')}
        style={{ display: 'flex', alignItems: 'center', gap: 12, width: 260, flexShrink: 0, cursor: 'pointer', padding: 4, borderRadius: 8, transition: 'background 0.2s' }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        {/* Artwork */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'var(--bg-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
            border: '1px solid var(--border)'
          }}
        >
          {player.artwork ? (
            <img
              src={player.artwork}
              alt="artwork"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Music2 size={20} style={{ color: 'var(--text-dim)' }} />
          )}
        </div>

        {/* Title / Artist */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {player.source === 'ytm'
              ? player.ytmInfo?.title || 'YouTube Music'
              : player.source === 'radio'
              ? player.radioInfo?.title || 'Internet Radio'
              : player.source === 'subsonic'
              ? player.subsonicInfo?.title || 'Navidrome'
              : player.source === 'jellyfin'
              ? player.jellyfinInfo?.title || 'Jellyfin'
              : currentTrack?.title || 'Nothing playing'}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {player.source === 'ytm'
              ? player.ytmInfo?.artist || ''
              : player.source === 'radio'
              ? player.radioInfo?.station || ''
              : player.source === 'subsonic'
              ? player.subsonicInfo?.artist || ''
              : player.source === 'jellyfin'
              ? player.jellyfinInfo?.artist || ''
              : currentTrack?.artist || '—'}
          </div>
          {currentTrack && player.source === 'local' && (
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>
              {currentTrack.format.toUpperCase()}
              {currentTrack.bitDepth ? ` · ${currentTrack.bitDepth}bit` : ''}
              {currentTrack.sampleRate ? ` · ${(currentTrack.sampleRate / 1000).toFixed(1)}kHz` : ''}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ControlButton onClick={toggleSmartPlay} title="Smart Play (Favor Most Played & Favorites)" active={isSmartPlay}>
            <Sparkles size={16} style={{ color: isSmartPlay ? 'var(--color-accent)' : 'inherit' }} />
          </ControlButton>

          <ControlButton onClick={playPrev} title="Previous">
            <SkipBack size={18} />
          </ControlButton>

          <button
            onClick={togglePlayPause}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--color-accent)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
              boxShadow: '0 0 16px rgba(var(--color-accent-rgb), 0.4)',
              transition: 'transform 0.15s, opacity 0.15s'
            }}
            title={player.status === 'playing' ? 'Pause' : 'Play'}
          >
            {player.status === 'playing' ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <ControlButton onClick={playNext} title="Next">
            <SkipForward size={18} />
          </ControlButton>

          <ControlButton 
            onClick={togglePlaybackMode} 
            title={playbackMode === 'normal' ? 'Normal' : playbackMode === 'shuffle' ? 'Shuffle' : playbackMode === 'repeat-all' ? 'Repeat All' : 'Repeat One'} 
            active={playbackMode !== 'normal'}
          >
            {playbackMode === 'shuffle' && <Shuffle size={16} style={{ color: 'var(--color-accent)' }} />}
            {playbackMode === 'repeat-all' && <Repeat size={16} style={{ color: 'var(--color-accent)' }} />}
            {playbackMode === 'repeat-one' && <Repeat1 size={16} style={{ color: 'var(--color-accent)' }} />}
            {playbackMode === 'normal' && <Repeat size={16} style={{ color: 'inherit' }} />}
          </ControlButton>
        </div>

        {/* Time */}
        <div style={{ fontSize: 11, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums', fontFamily: 'JetBrains Mono, monospace' }}>
          {formatTime(dragPosition !== null ? dragPosition : player.position)} / {formatTime(player.duration)}
        </div>
      </div>

      {/* Volume */}
      <div
        style={{
          width: 160,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0
        }}
      >
        <button
          onClick={toggleMute}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: 4
          }}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={isMuted ? 0 : player.volume ?? 0.8}
          onChange={handleVolume}
          style={{
            flex: 1,
            height: 4,
            accentColor: 'var(--color-accent)',
            cursor: 'pointer'
          }}
        />
      </div>
    </div>
  )
}

function ControlButton({ onClick, children, title, active }: any) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: active ? 'rgba(var(--color-accent-rgb), 0.15)' : 'none',
        border: 'none',
        color: active ? 'var(--color-accent)' : 'var(--text-dim)',
        cursor: 'pointer',
        padding: 6,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s'
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget.style.color = 'var(--text)')
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget.style.color = 'var(--text-dim)')
      }}
    >
      {children}
    </button>
  )
}
