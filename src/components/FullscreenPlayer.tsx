import React, { useCallback, useState } from 'react'
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Music2, Shuffle, Repeat, Repeat1, Minimize2, ListMusic
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import { fetchLyrics, parseLRC, type LyricLine } from '../lib/lyrics'

function formatTime(secs: number): string {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function FullscreenPlayer(): React.ReactElement {
  const { player, tracks, togglePlayPause, playNext, playPrev, setPlayer, playbackMode, togglePlaybackMode, setActiveView, setVolume, seekTo } = useApp()
  const [isMuted, setIsMuted] = useState(false)
  const [showLyrics, setShowLyrics] = useState(false)
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false)
  const [isPlainLyrics, setIsPlainLyrics] = useState(false)
  const [dragPosition, setDragPosition] = useState<number | null>(null)
  
  const currentTrack = tracks.find((t) => t.id === player.currentTrackId)
  const lyricsContainerRef = React.useRef<HTMLDivElement>(null)
  const activeLyricRef = React.useRef<HTMLDivElement>(null)

  const title = player.source === 'ytm' ? player.ytmInfo?.title || 'YouTube Music' : player.source === 'radio' ? player.radioInfo?.title || 'Internet Radio' : player.source === 'subsonic' ? player.subsonicInfo?.title || 'Navidrome' : player.source === 'jellyfin' ? player.jellyfinInfo?.title || 'Jellyfin' : currentTrack?.title || 'Nothing playing'
  const artist = player.source === 'ytm' ? player.ytmInfo?.artist || '' : player.source === 'radio' ? player.radioInfo?.station || '' : player.source === 'subsonic' ? player.subsonicInfo?.artist || '' : player.source === 'jellyfin' ? player.jellyfinInfo?.artist || '' : currentTrack?.artist || '—'
  const artwork = player.artwork

  React.useEffect(() => {
    if (!showLyrics) return
    let isMounted = true

    async function loadLyrics() {
      setIsLoadingLyrics(true)
      setLyrics([])
      setIsPlainLyrics(false)
      if (!player.currentTrackId) return
      const raw = await fetchLyrics(player.source, player.currentTrackId, title, artist, player.duration)
      if (isMounted) {
        if (raw) {
          const parsed = parseLRC(raw)
          setLyrics(parsed)
          setIsPlainLyrics(parsed.every(l => l.time === -1))
        }
        setIsLoadingLyrics(false)
      }
    }

    loadLyrics()
    return () => { isMounted = false }
  }, [showLyrics, player.currentTrackId, title, artist, player.duration, player.source])

  // Scroll to active lyric
  React.useEffect(() => {
    if (showLyrics && !isPlainLyrics && activeLyricRef.current && lyricsContainerRef.current) {
      activeLyricRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [player.position, showLyrics, isPlainLyrics])

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

  const progressPercent = player.duration > 0 ? ((dragPosition !== null ? dragPosition : player.position) / player.duration) * 100 : 0

  let activeLyricIndex = -1
  if (!isPlainLyrics && lyrics.length > 0) {
    for (let i = 0; i < lyrics.length; i++) {
      if (player.position >= lyrics[i].time) {
        activeLyricIndex = i
      } else {
        break
      }
    }
  }

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      color: 'var(--text)',
      overflow: 'hidden'
    }}>
      {/* Dynamic blurred background */}
      {artwork && (
        <div style={{
          position: 'absolute',
          top: -100, left: -100, right: -100, bottom: -100,
          backgroundImage: `url(${artwork})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(80px) brightness(0.25)',
          opacity: 0.55,
          zIndex: -1,
          transform: 'scale(1.1)'
        }} />
      )}

      {/* Top Bar with Minimize Button */}
      <div className="p-4 md:p-8 flex justify-end z-10">
        <button
          onClick={() => {
            if (player.source === 'ytm') setActiveView('ytm')
            else if (player.source === 'radio') setActiveView('radio')
            else if (player.source === 'subsonic') setActiveView('subsonic')
            else setActiveView('library')
          }}
          className="bg-white/10 text-white p-3 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-95"
          title="Minimize Player"
        >
          <Minimize2 size={24} />
        </button>
      </div>

      {/* Responsive layout wrapper */}
      <div className="flex-1 flex md:flex-row flex-col items-center justify-center gap-6 md:gap-16 px-6 md:px-16 overflow-y-auto pb-8 md:pb-0">
        
        {/* Left Side / Top: Artwork */}
        <div className="w-[min(260px,35vh)] h-[min(260px,35vh)] md:w-[min(420px,40vh)] md:h-[min(420px,40vh)] rounded-2xl bg-black/20 shadow-2xl flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/5">
          {artwork ? (
            <img src={artwork} alt="artwork" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Music2 size={64} style={{ color: 'var(--text-dim)' }} />
          )}
        </div>

        {/* Right Side / Bottom: Track Info & Controls OR Lyrics */}
        <div className="flex flex-col flex-1 w-full max-w-[500px] md:h-[min(420px,40vh)] relative">
          
          {/* Default Controls View */}
          <div style={{ 
            display: 'flex', flexDirection: 'column', height: '100%',
            opacity: showLyrics ? 0 : 1, pointerEvents: showLyrics ? 'none' : 'auto',
            transition: 'opacity 0.3s ease'
          }} className={showLyrics ? "hidden" : "w-full"}>
            
            {/* Title / Artist */}
            <div className="text-center md:text-left mb-6">
              <h1 className="text-2xl md:text-4xl font-extrabold mb-1 line-clamp-2 leading-snug drop-shadow-md">
                {title}
              </h1>
              <p className="text-base md:text-xl text-white/60 font-medium">
                {artist}
              </p>
            </div>

            {/* Scrubber */}
            <div className="flex flex-col gap-2 mb-6">
              <div className="relative h-2 bg-white/10 rounded-full">
                <input
                  type="range"
                  min={0}
                  max={player.duration || 0}
                  value={dragPosition !== null ? dragPosition : player.position}
                  step={0.5}
                  onChange={handleSeekChange}
                  onMouseUp={handleSeekEnd}
                  onTouchEnd={handleSeekEnd}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  background: 'var(--color-accent)',
                  borderRadius: 9999,
                  boxShadow: '0 0 10px rgba(var(--color-accent-rgb), 0.5)'
                }} />
              </div>
              <div className="flex justify-between text-xs md:text-sm text-white/50 font-mono">
                <span>{formatTime(dragPosition !== null ? dragPosition : player.position)}</span>
                <span>{formatTime(player.duration)}</span>
              </div>
            </div>

            {/* Main Playback Controls */}
            <div className="flex items-center justify-center md:justify-start gap-8 mb-6">
              <button
                onClick={togglePlaybackMode}
                className="p-2 text-white/50 active:scale-90 transition-all"
                style={{ color: playbackMode !== 'normal' ? 'var(--color-accent)' : undefined }}
              >
                {playbackMode === 'shuffle' && <Shuffle size={20} />}
                {playbackMode === 'repeat-all' && <Repeat size={20} />}
                {playbackMode === 'repeat-one' && <Repeat1 size={20} />}
                {playbackMode === 'normal' && <Repeat size={20} />}
              </button>

              <button onClick={playPrev} className="p-2 text-white active:scale-90 transition-all">
                <SkipBack size={30} />
              </button>

              <button
                onClick={togglePlayPause}
                className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-lg active:scale-95 transition-all"
              >
                {player.status === 'playing' ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" style={{ marginLeft: 4 }} />}
              </button>

              <button onClick={playNext} className="p-2 text-white active:scale-90 transition-all">
                <SkipForward size={30} />
              </button>
              
              <button 
                onClick={() => setShowLyrics(true)}
                className="p-2 text-white/50 active:scale-90 transition-all"
              >
                <ListMusic size={20} />
              </button>
            </div>

            {/* Volume slider */}
            <div className="flex items-center gap-4 w-[180px] mx-auto md:mx-0">
              <button onClick={toggleMute} className="text-white/60 active:scale-90 transition-all">
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min={0} max={1} step={0.01}
                value={isMuted ? 0 : player.volume ?? 0.8}
                onChange={handleVolume}
                className="flex-1 h-1 bg-white/20 rounded-full accent-white cursor-pointer"
              />
            </div>
          </div>

          {/* Lyrics View */}
          <div style={{
            opacity: showLyrics ? 1 : 0, pointerEvents: showLyrics ? 'auto' : 'none',
            transition: 'opacity 0.3s ease', display: showLyrics ? 'flex' : 'none',
            flexDirection: 'column', height: '100%'
          }} className="w-full h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg md:text-xl font-bold m-0">Lyrics</h2>
              <button 
                onClick={() => setShowLyrics(false)}
                className="bg-white/10 text-white px-4 py-1.5 rounded-full text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <div ref={lyricsContainerRef} style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)' }} className="flex-1 overflow-y-auto pr-2 scroll-smooth">
              {isLoadingLyrics ? (
                <div className="flex items-center justify-center h-full text-white/50 text-sm">
                  Loading lyrics...
                </div>
              ) : lyrics.length > 0 ? (
                <div className="py-20 flex flex-col gap-6 text-center md:text-left">
                  {lyrics.map((line, index) => {
                    const isActive = activeLyricIndex === index
                    return (
                      <div
                        key={index}
                        ref={isActive ? activeLyricRef : null}
                        style={{
                          transition: 'all 0.3s ease',
                          color: isActive || isPlainLyrics ? 'var(--text)' : 'rgba(255,255,255,0.25)'
                        }}
                        className={`text-lg md:text-2xl font-bold leading-relaxed ${isActive || isPlainLyrics ? 'scale-105 transform origin-center md:origin-left' : ''}`}
                      >
                        {line.text || ' '}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-white/50 text-sm">
                  No lyrics found for this track.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
