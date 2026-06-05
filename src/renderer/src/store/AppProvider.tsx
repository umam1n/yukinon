import React, { useState, useCallback, useEffect, useRef } from 'react'
import { AppContext, type AppStore } from './AppContext'
import { audioEngine } from '../audio/AudioEngine'
import type { Track, EQBands, EQPreset, AppTheme, PlayerState } from '../../../../shared/types'

const yukinon = window.yukinon

const DEFAULT_BANDS: EQBands = {
  32: 0, 64: 0, 125: 0, 250: 0, 500: 0,
  1000: 0, 2000: 0, 4000: 0, 8000: 0, 16000: 0
}

export function AppProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // Source-of-truth lock: if true, local audio is playing and ALL YTM state updates are ignored
  const localActiveRef = useRef(false)

  const [tracks, setTracks] = useState<Track[]>([])
  const [queue, setQueueState] = useState<Track[]>([])
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0)
  const [eqBands, setEqBands] = useState<EQBands>(DEFAULT_BANDS)
  const [eqPresets, setEqPresets] = useState<EQPreset[]>([])
  const [activePresetId, setActivePresetId] = useState('flat')
  const [theme, setThemeState] = useState<AppTheme>({
    mode: 'dark',
    accentColor: '#c084fc',
    accent2Color: '#67e8f9'
  })
  const [activeView, setActiveView] = useState<AppStore['activeView']>('library')
  const [playbackMode, setPlaybackMode] = useState<'normal' | 'shuffle' | 'repeat-all' | 'repeat-one'>('normal')
  const [isSmartPlay, setIsSmartPlay] = useState(false)
  const [player, setPlayerState] = useState<PlayerState>({
    source: 'local',
    status: 'stopped',
    currentTrackId: null,
    position: 0,
    duration: 0,
    volume: 0.8
  })

  const setPlayer = useCallback((state: Partial<PlayerState>) => {
    setPlayerState((prev) => ({ ...prev, ...state }))
  }, [])

  // Initialize on mount
  useEffect(() => {
    // Load theme
    yukinon.theme.get().then((t: AppTheme) => {
      setThemeState(t)
      applyThemeToDOM(t)
    })

    // Load library
    yukinon.library.getTracks().then(setTracks)

    // Load EQ state
    Promise.all([yukinon.eq.getBands(), yukinon.eq.getPresets(), yukinon.eq.getActivePresetId()]).then(
      ([bands, presets, presetId]) => {
        setEqBands(bands as EQBands)
        setEqPresets(presets as EQPreset[])
        setActivePresetId(presetId as string)
        audioEngine.initialize()
        audioEngine.applyBands(bands as EQBands)
      }
    )

    // Listen for EQ band changes from main process
    const unsub = yukinon.eq.onBandsChanged((bands) => {
      setEqBands(bands as EQBands)
      audioEngine.applyBands(bands as EQBands)
    })

    // Listen for theme changes
    const unsubTheme = yukinon.theme.onChange((t) => {
      setThemeState((prev) => ({ ...prev, ...(t as Partial<AppTheme>) }))
      applyThemeToDOM({ ...theme, ...(t as Partial<AppTheme>) })
    })

    // Media key listeners
    const unsubPlay = yukinon.media.onPlayPause(togglePlayPause)
    const unsubNext = yukinon.media.onNext(playNext)
    const unsubPrev = yukinon.media.onPrev(playPrev)

    return () => {
      unsub()
      unsubTheme()
      unsubPlay()
      unsubNext()
      unsubPrev()
    }
  }, [])

  // Listen for real-time YTM state updates
  useEffect(() => {
    if (!yukinon.ytm.onStateUpdate) return
    const unsub = yukinon.ytm.onStateUpdate((info: any) => {
      console.log('[Frontend] Received ytm:state-update:', info)
      // If YTM just started playing → it wins. Pause local audio, release the mute lock, hand control to YTM.
      if (info.isPlaying && localActiveRef.current) {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause()
        }
        localActiveRef.current = false
        // Unmute YTM so we can hear it
        yukinon.ytm.setLock?.(false)
      }

      // Update player state for YTM if it's the active source or just became active
      if (info.isPlaying || info.title) {
        setPlayerState((prev) => ({
          ...prev,
          source: 'ytm',
          status: info.isPlaying ? 'playing' : 'paused',
          ytmInfo: { title: info.title, artist: info.artist },
          artwork: info.artwork || prev.artwork,
          position: info.position,
          duration: info.duration
        }))
      }
    })
    return () => unsub()
  }, [])

  // Apply theme to DOM
  const applyThemeToDOM = useCallback((t: AppTheme) => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(t.mode)
    root.style.setProperty('--color-accent', t.accentColor)

    // Convert hex accent to RGB for alpha usage
    const hex = t.accentColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    root.style.setProperty('--color-accent-rgb', `${r}, ${g}, ${b}`)
    root.style.setProperty('--color-accent-2', t.accent2Color)
  }, [])

  const setTheme = useCallback(
    (updates: Partial<AppTheme>) => {
      const newTheme = { ...theme, ...updates }
      setThemeState(newTheme)
      applyThemeToDOM(newTheme)
      yukinon.theme.set(updates)
      // Sync YTM theme: dark/light + accent color
      yukinon.ytm.setTheme?.(newTheme.accentColor, newTheme.mode)
    },
    [theme, applyThemeToDOM]
  )

  const playTrack = useCallback(async (track: Track) => {
    // Acquire lock synchronously before any async work
    localActiveRef.current = true
    // Mute YTM at OS/Chromium level (setAudioMuted) AND actually pause its video
    yukinon.ytm.setLock?.(true)
    yukinon.ytm.pause?.()

    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioEngine.initialize()
      audioEngine.connectLocalAudio(audioRef.current)
    }

    audioEngine.resume()
    audioRef.current.src = `yukinon://local/track?path=${encodeURIComponent(track.path)}`
    audioRef.current.play().catch(err => {
      console.error('[Playback] Failed to play local file:', err)
      localActiveRef.current = false
      yukinon.ytm.setLock?.(false)
    })

    audioRef.current.ontimeupdate = () => {
      setPlayer({ position: audioRef.current!.currentTime })
    }
    audioRef.current.onended = () => {
      playNext()
    }
    audioRef.current.onloadedmetadata = () => {
      setPlayer({ duration: audioRef.current!.duration })
    }

    setPlayer({
      source: 'local',
      status: 'playing',
      currentTrackId: track.id,
      duration: track.duration,
      artwork: null
    })

    yukinon.library.getTrackArtwork(track.id).then((artwork) => {
      setPlayer({ artwork })
    })
  }, [])

  const togglePlayPause = useCallback(() => {
    if (player.source === 'local') {
      if (audioRef.current) {
        if (player.status === 'playing') {
          audioRef.current.pause()
          // Release the lock so the user can interact with YTM freely
          localActiveRef.current = false
          yukinon.ytm.setLock?.(false)
          setPlayer({ status: 'paused' })
        } else {
          // Re-acquire the lock before resuming local
          localActiveRef.current = true
          yukinon.ytm.setLock?.(true)
          yukinon.ytm.pause?.()
          audioRef.current.play()
          setPlayer({ status: 'playing' })
        }
      }
    } else {
      yukinon.ytm.playPause()
    }
  }, [player])

  const playNext = useCallback(() => {
    if (player.source === 'local' && queue.length > 0) {
      let nextIndex = currentQueueIndex

      if (playbackMode === 'repeat-one') {
        // Just play the exact same index again
      } else if (isSmartPlay) {
        // Smart play: favor tracks with high playCount and isFavorite
        const candidates = queue.map((t, i) => {
          let score = 1
          if (t.isFavorite) score += 5
          if (t.playCount) score += t.playCount
          return { index: i, score }
        })
        const totalScore = candidates.reduce((acc, c) => acc + c.score, 0)
        let r = Math.random() * totalScore
        for (const c of candidates) {
          r -= c.score
          if (r <= 0) {
            nextIndex = c.index
            break
          }
        }
      } else if (playbackMode === 'shuffle') {
        nextIndex = Math.floor(Math.random() * queue.length)
      } else {
        // Normal or Repeat-All
        if (currentQueueIndex + 1 >= queue.length && playbackMode === 'normal') {
          // Stop at the end of the queue
          audioRef.current?.pause()
          setPlayer({ status: 'stopped', position: 0 })
          return
        }
        nextIndex = (currentQueueIndex + 1) % queue.length
      }

      setCurrentQueueIndex(nextIndex)
      playTrack(queue[nextIndex])
    } else if (player.source === 'ytm') {
      yukinon.ytm.next()
    }
  }, [player, queue, currentQueueIndex, playTrack, playbackMode, isSmartPlay])

  const playPrev = useCallback(() => {
    if (player.source === 'local' && queue.length > 0) {
      const prevIndex = (currentQueueIndex - 1 + queue.length) % queue.length
      setCurrentQueueIndex(prevIndex)
      playTrack(queue[prevIndex])
    } else if (player.source === 'ytm') {
      yukinon.ytm.prev()
    }
  }, [player, queue, currentQueueIndex, playTrack])

  const setQueue = useCallback(
    (newQueue: Track[], startIndex = 0) => {
      setQueueState(newQueue)
      setCurrentQueueIndex(startIndex)
      if (newQueue.length > 0) {
        playTrack(newQueue[startIndex])
      }
    },
    [playTrack]
  )

  const setEqBand = useCallback((band: keyof EQBands, gain: number) => {
    setEqBands((prev) => ({ ...prev, [band]: gain }))
    audioEngine.setGain(
      [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000].indexOf(Number(band)),
      gain
    )
    yukinon.eq.setBand(Number(band), gain)
  }, [])

  const applyEqPreset = useCallback((preset: EQPreset) => {
    setEqBands(preset.bands)
    setActivePresetId(preset.id)
    audioEngine.applyBands(preset.bands)
    yukinon.eq.applyPreset(preset.id)
  }, [])

  const saveEqPreset = useCallback(
    async (name: string) => {
      const saved = await yukinon.eq.savePreset(name, eqBands)
      setEqPresets((prev) => [...prev, saved as EQPreset])
    },
    [eqBands]
  )

  return (
    <AppContext.Provider
      value={{
        tracks, setTracks,
        player, setPlayer,
        playTrack, togglePlayPause, playNext, playPrev,
        queue,
        setQueue,
        currentQueueIndex,
        playbackMode,
        togglePlaybackMode: () => {
          setPlaybackMode((prev) => {
            let nextMode = 'normal'
            if (prev === 'normal') nextMode = 'shuffle'
            else if (prev === 'shuffle') nextMode = 'repeat-all'
            else if (prev === 'repeat-all') nextMode = 'repeat-one'
            
            if (player.source === 'ytm') {
              if (nextMode === 'shuffle') window.yukinon.ytm.shuffle?.()
              else if (nextMode.startsWith('repeat')) window.yukinon.ytm.repeat?.()
              else if (nextMode === 'normal') window.yukinon.ytm.repeat?.() // cycle back
            }
            
            return nextMode as typeof playbackMode
          })
        },
        isSmartPlay,
        toggleSmartPlay: () => setIsSmartPlay(!isSmartPlay),
        eqBands, setEqBand, applyEqPreset,
        eqPresets, activePresetId, setActivePresetId, saveEqPreset,
        theme, setTheme,
        activeView, setActiveView
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
