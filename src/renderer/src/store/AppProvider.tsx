import React, { useState, useCallback, useEffect, useRef } from 'react'
import { AppContext, type AppStore } from './AppContext'
import { audioEngine } from '../audio/AudioEngine'
import { LocalPlayer } from '../audio/LocalPlayer'
import { YTMPlayer } from '../audio/YTMPlayer'
import { RadioPlayer } from '../audio/RadioPlayer'
import { SubsonicPlayer } from '../audio/SubsonicPlayer'
import { JellyfinPlayer } from '../audio/JellyfinPlayer'
import type { IPlayerProvider } from '../audio/IPlayerProvider'
import type { Track, EQBands, EQPreset, AppTheme, PlayerState } from '../../../../shared/types'

const yukinon = window.yukinon

const DEFAULT_BANDS: EQBands = {
  32: 0, 64: 0, 125: 0, 250: 0, 500: 0,
  1000: 0, 2000: 0, 4000: 0, 8000: 0, 16000: 0
}

export function AppProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  // Orchestrator State
  const localPlayerRef = useRef<LocalPlayer | null>(null)
  const ytmPlayerRef = useRef<YTMPlayer | null>(null)
  const radioPlayerRef = useRef<RadioPlayer | null>(null)
  const subsonicPlayerRef = useRef<SubsonicPlayer | null>(null)
  const jellyfinPlayerRef = useRef<JellyfinPlayer | null>(null)
  const activePlayerRef = useRef<IPlayerProvider | null>(null)

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

  // Prevent React re-render cascades by keeping a mutable ref of the state
  const playerStateRef = useRef(player)
  const setPlayer = useCallback((state: Partial<PlayerState>) => {
    playerStateRef.current = { ...playerStateRef.current, ...state }
    setPlayerState(playerStateRef.current)
  }, [])

  // Apply theme to DOM
  const applyThemeToDOM = useCallback((t: AppTheme) => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(t.mode)
    root.style.setProperty('--color-accent', t.accentColor)

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
      yukinon.ytm.setTheme?.(newTheme.accentColor, newTheme.mode)
    },
    [theme, applyThemeToDOM]
  )

  const playTrack = useCallback(async (track: Track) => {
    // Switch orchestrator to Local
    activePlayerRef.current = localPlayerRef.current
    activePlayerRef.current?.setVolume(playerStateRef.current.volume)

    // Pause other players
    yukinon.ytm.setLock?.(true)
    ytmPlayerRef.current?.pause()
    radioPlayerRef.current?.pause()
    subsonicPlayerRef.current?.pause()
    jellyfinPlayerRef.current?.pause()

    setPlayer({ source: 'local' })
    
    await localPlayerRef.current?.play(track)
    
    // Fetch artwork asynchronously
    yukinon.library.getTrackArtwork(track.id).then((artwork) => {
      setPlayer({ artwork })
    })
  }, [setPlayer])

  const playRadio = useCallback(async (url: string, info: { title: string, station: string, artwork?: string }) => {
    // Switch orchestrator to Radio
    activePlayerRef.current = radioPlayerRef.current
    activePlayerRef.current?.setVolume(playerStateRef.current.volume)
    
    // Pause other players
    yukinon.ytm.setLock?.(true)
    ytmPlayerRef.current?.pause()
    localPlayerRef.current?.pause()
    subsonicPlayerRef.current?.pause()
    jellyfinPlayerRef.current?.pause()

    setPlayer({ source: 'radio' })
    
    radioPlayerRef.current?.play(url, info)
  }, [setPlayer])

  const playSubsonic = useCallback(async (id: string, info: { title: string, artist: string, duration?: number, artwork?: string }) => {
    // Switch orchestrator to Subsonic
    activePlayerRef.current = subsonicPlayerRef.current
    activePlayerRef.current?.setVolume(playerStateRef.current.volume)

    // Pause other players
    yukinon.ytm.setLock?.(true)
    ytmPlayerRef.current?.pause()
    localPlayerRef.current?.pause()
    radioPlayerRef.current?.pause()
    jellyfinPlayerRef.current?.pause()

    setPlayer({ source: 'subsonic' })

    await subsonicPlayerRef.current?.play(id, info)
  }, [setPlayer])

  const playJellyfin = useCallback(async (id: string, info: { title: string, artist: string, duration?: number, artwork?: string }) => {
    // Switch orchestrator to Jellyfin
    activePlayerRef.current = jellyfinPlayerRef.current
    activePlayerRef.current?.setVolume(playerStateRef.current.volume)

    // Pause other players
    yukinon.ytm.setLock?.(true)
    ytmPlayerRef.current?.pause()
    localPlayerRef.current?.pause()
    radioPlayerRef.current?.pause()
    subsonicPlayerRef.current?.pause()

    setPlayer({ source: 'jellyfin' })

    await jellyfinPlayerRef.current?.play(id, info)
  }, [setPlayer])

  const playNextRef = useRef<() => void>()
  const playNext = useCallback(() => {
    if (activePlayerRef.current === ytmPlayerRef.current) {
      activePlayerRef.current?.next?.()
      return
    }

    if (activePlayerRef.current === localPlayerRef.current && queue.length > 0) {
      let nextIndex = currentQueueIndex

      if (playbackMode === 'repeat-one') {
        // Just play the exact same index again
      } else if (isSmartPlay) {
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
        if (currentQueueIndex + 1 >= queue.length && playbackMode === 'normal') {
          activePlayerRef.current?.pause()
          setPlayer({ status: 'stopped', position: 0 })
          return
        }
        nextIndex = (currentQueueIndex + 1) % queue.length
      }

      setCurrentQueueIndex(nextIndex)
      playTrack(queue[nextIndex])
    }
  }, [queue, currentQueueIndex, playbackMode, isSmartPlay, playTrack, setPlayer])
  
  // Keep ref up to date
  useEffect(() => { playNextRef.current = playNext }, [playNext])

  const playPrev = useCallback(() => {
    if (activePlayerRef.current === ytmPlayerRef.current) {
      activePlayerRef.current?.prev?.()
      return
    }

    if (activePlayerRef.current === radioPlayerRef.current || activePlayerRef.current === subsonicPlayerRef.current || activePlayerRef.current === jellyfinPlayerRef.current) {
      return // Radio and currently Subsonic/Jellyfin cannot seek/skip via queue yet
    }

    if (activePlayerRef.current === localPlayerRef.current && queue.length > 0) {
      const prevIndex = (currentQueueIndex - 1 + queue.length) % queue.length
      setCurrentQueueIndex(prevIndex)
      playTrack(queue[prevIndex])
    }
  }, [queue, currentQueueIndex, playTrack])

  const togglePlayPause = useCallback(() => {
    if (activePlayerRef.current) {
      if (playerStateRef.current.status === 'playing') {
        activePlayerRef.current.pause()
        if (activePlayerRef.current === localPlayerRef.current) {
          yukinon.ytm.setLock?.(false) // Release lock so user can interact with YTM freely
        }
      } else {
        if (activePlayerRef.current === localPlayerRef.current || activePlayerRef.current === radioPlayerRef.current || activePlayerRef.current === subsonicPlayerRef.current || activePlayerRef.current === jellyfinPlayerRef.current) {
          yukinon.ytm.setLock?.(true)
          ytmPlayerRef.current?.pause()
        }
        activePlayerRef.current.resume()
      }
    }
  }, [])

  const seekTo = useCallback((position: number) => {
    activePlayerRef.current?.seek(position)
    setPlayer({ position })
  }, [setPlayer])

  const setVolume = useCallback((volume: number) => {
    activePlayerRef.current?.setVolume(volume)
    setPlayer({ volume })
  }, [setPlayer])

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

  // Initialize Players and Global Listeners
  useEffect(() => {
    localPlayerRef.current = new LocalPlayer()
    ytmPlayerRef.current = new YTMPlayer()
    radioPlayerRef.current = new RadioPlayer()
    subsonicPlayerRef.current = new SubsonicPlayer()
    jellyfinPlayerRef.current = new JellyfinPlayer()
    activePlayerRef.current = localPlayerRef.current

    // Subscribe to LocalPlayer
    const unsubLocal = localPlayerRef.current.onStateChange((state) => {
      if (activePlayerRef.current === localPlayerRef.current) {
        setPlayer(state)
        if (state.status === 'stopped') {
          playNextRef.current?.()
        }
      }
    })

    // Subscribe to YTMPlayer
    const unsubYTM = ytmPlayerRef.current.onStateChange((state) => {
      // If YTM starts playing, it steals the orchestrator focus
      if (state.status === 'playing' && activePlayerRef.current !== ytmPlayerRef.current) {
        localPlayerRef.current?.pause()
        activePlayerRef.current = ytmPlayerRef.current
        yukinon.ytm.setLock?.(false)
      }
      // Update UI if YTM is the active source or if it's broadcasting metadata
      if (activePlayerRef.current === ytmPlayerRef.current || state.status === 'playing' || state.ytmInfo) {
         setPlayer(state)
      }
    })

    // Subscribe to RadioPlayer
    const unsubRadio = radioPlayerRef.current.onStateChange((state) => {
      if (activePlayerRef.current === radioPlayerRef.current) {
        setPlayer(state)
      }
    })

    // Subscribe to SubsonicPlayer
    const unsubSubsonic = subsonicPlayerRef.current.onStateChange((state) => {
      if (activePlayerRef.current === subsonicPlayerRef.current) {
        setPlayer(state)
        if (state.status === 'stopped') {
          playNextRef.current?.()
        }
      }
    })

    // Subscribe to JellyfinPlayer
    const unsubJellyfin = jellyfinPlayerRef.current.onStateChange((state) => {
      if (activePlayerRef.current === jellyfinPlayerRef.current) {
        setPlayer(state)
        if (state.status === 'stopped') {
          playNextRef.current?.()
        }
      }
    })

    // Initial setup
    yukinon.theme.get().then((t: AppTheme) => {
      setThemeState(t)
      applyThemeToDOM(t)
    })

    yukinon.library.getTracks().then(setTracks)

    Promise.all([yukinon.eq.getBands(), yukinon.eq.getPresets(), yukinon.eq.getActivePresetId()]).then(
      ([bands, presets, presetId]) => {
        setEqBands(bands as EQBands)
        setEqPresets(presets as EQPreset[])
        setActivePresetId(presetId as string)
        audioEngine.applyBands(bands as EQBands)
      }
    )

    const unsubEq = yukinon.eq.onBandsChanged((bands) => {
      setEqBands(bands as EQBands)
      audioEngine.applyBands(bands as EQBands)
    })

    const unsubTheme = yukinon.theme.onChange((t) => {
      setThemeState((prev) => ({ ...prev, ...(t as Partial<AppTheme>) }))
      applyThemeToDOM({ ...theme, ...(t as Partial<AppTheme>) })
    })

    // Media keys
    const unsubPlay = yukinon.media.onPlayPause(togglePlayPause)
    const unsubNext = yukinon.media.onNext(() => playNextRef.current?.())
    const unsubPrev = yukinon.media.onPrev(playPrev)

    return () => {
      unsubLocal()
      unsubYTM()
      unsubRadio()
      unsubSubsonic()
      unsubJellyfin()
      localPlayerRef.current?.destroy()
      ytmPlayerRef.current?.destroy()
      radioPlayerRef.current?.destroy()
      subsonicPlayerRef.current?.destroy()
      jellyfinPlayerRef.current?.destroy()
      unsubEq()
      unsubTheme()
      unsubPlay()
      unsubNext()
      unsubPrev()
    }
  }, []) // We use refs for functions inside to prevent re-initializing players

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
        playTrack, playRadio, playSubsonic, playJellyfin, togglePlayPause, playNext, playPrev, seekTo, setVolume,
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
            
            if (activePlayerRef.current === ytmPlayerRef.current) {
              if (nextMode === 'shuffle') activePlayerRef.current?.shuffle?.()
              else if (nextMode.startsWith('repeat')) activePlayerRef.current?.repeat?.()
              else if (nextMode === 'normal') activePlayerRef.current?.repeat?.() // cycle back
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
