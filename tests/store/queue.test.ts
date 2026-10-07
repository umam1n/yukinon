import { describe, it, expect } from 'vitest'
import type { Track } from '@shared/types'

export interface QueueState {
  queue: Track[]
  currentIndex: number
  shuffle: boolean
  repeat: 'off' | 'all' | 'one'
  status: 'playing' | 'paused' | 'stopped'
}

export function createInitialQueueState(): QueueState {
  return {
    queue: [],
    currentIndex: 0,
    shuffle: false,
    repeat: 'off',
    status: 'stopped'
  }
}

export function addToQueue(state: QueueState, track: Track): QueueState {
  if (state.queue.length === 0) {
    return {
      ...state,
      queue: [track],
      currentIndex: 0,
      status: 'playing'
    }
  }
  return {
    ...state,
    queue: [...state.queue, track]
  }
}

export function playNextTrack(state: QueueState, track: Track): QueueState {
  if (state.queue.length === 0) {
    return {
      ...state,
      queue: [track],
      currentIndex: 0,
      status: 'playing'
    }
  }
  const newQueue = [...state.queue]
  newQueue.splice(state.currentIndex + 1, 0, track)
  return {
    ...state,
    queue: newQueue
  }
}

export function clearQueue(state: QueueState): QueueState {
  if (state.status === 'playing' && state.queue[state.currentIndex]) {
    return {
      ...state,
      queue: [state.queue[state.currentIndex]],
      currentIndex: 0
    }
  }
  return {
    ...state,
    queue: [],
    currentIndex: 0,
    status: 'stopped'
  }
}

export function setQueue(state: QueueState, newQueue: Track[], startIndex = 0): QueueState {
  return {
    ...state,
    queue: newQueue,
    currentIndex: startIndex,
    status: newQueue.length > 0 ? 'playing' : 'stopped'
  }
}

export function removeFromQueue(state: QueueState, index: number): QueueState {
  if (index < 0 || index >= state.queue.length) return state

  const newQueue = [...state.queue]
  newQueue.splice(index, 1)

  let newIndex = state.currentIndex
  if (index < state.currentIndex) {
    newIndex = state.currentIndex - 1
  } else if (index === state.currentIndex) {
    if (newQueue.length === 0) {
      newIndex = 0
    } else if (newIndex >= newQueue.length) {
      newIndex = newQueue.length - 1
    }
  }

  return {
    ...state,
    queue: newQueue,
    currentIndex: newIndex,
    status: newQueue.length === 0 ? 'stopped' : state.status
  }
}

export function toggleShuffle(state: QueueState): QueueState {
  return {
    ...state,
    shuffle: !state.shuffle
  }
}

export function toggleRepeat(state: QueueState): QueueState {
  const nextRepeat: 'off' | 'all' | 'one' =
    state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off'
  return {
    ...state,
    repeat: nextRepeat
  }
}

export function getNextQueueIndex(
  state: QueueState,
  randomGenerator: () => number = Math.random
): { nextIndex: number | null; status: 'playing' | 'stopped' } {
  if (state.queue.length === 0) {
    return { nextIndex: null, status: 'stopped' }
  }

  if (state.repeat === 'one') {
    return { nextIndex: state.currentIndex, status: 'playing' }
  }

  if (state.shuffle) {
    if (state.queue.length <= 1) {
      return { nextIndex: 0, status: 'playing' }
    }
    const r = Math.floor(randomGenerator() * (state.queue.length - 1))
    const nextIndex = r >= state.currentIndex ? r + 1 : r
    return { nextIndex, status: 'playing' }
  }

  if (state.repeat === 'all') {
    return { nextIndex: (state.currentIndex + 1) % state.queue.length, status: 'playing' }
  }

  // repeat === 'off'
  if (state.currentIndex < state.queue.length - 1) {
    return { nextIndex: state.currentIndex + 1, status: 'playing' }
  }

  return { nextIndex: null, status: 'stopped' }
}

export function getPrevQueueIndex(state: QueueState): number | null {
  if (state.queue.length === 0) return null
  if (state.repeat === 'one') {
    return state.currentIndex
  }
  if (state.currentIndex > 0) {
    return state.currentIndex - 1
  }
  if (state.repeat === 'all') {
    return state.queue.length - 1
  }
  return 0
}

const mockTrack = (id: string, title: string): Track => ({
  id,
  title,
  artist: 'Artist ' + id,
  source: 'local'
})

describe('Queue State Logic', () => {
  describe('Adding and setting tracks', () => {
    it('initializes playback when addToQueue is called on empty queue', () => {
      let state = createInitialQueueState()
      const t1 = mockTrack('1', 'Song 1')
      state = addToQueue(state, t1)

      expect(state.queue).toHaveLength(1)
      expect(state.currentIndex).toBe(0)
      expect(state.status).toBe('playing')
      expect(state.queue[0].id).toBe('1')
    })

    it('adds tracks to the queue sequentially if not empty', () => {
      let state = createInitialQueueState()
      const t1 = mockTrack('1', 'Song 1')
      const t2 = mockTrack('2', 'Song 2')

      state = addToQueue(state, t1)
      state = addToQueue(state, t2)
      expect(state.queue).toHaveLength(2)
      expect(state.queue[1].id).toBe('2')
    })

    it('sets a batch queue and active index', () => {
      const tracks = [mockTrack('1', 'A'), mockTrack('2', 'B'), mockTrack('3', 'C')]
      const state = setQueue(createInitialQueueState(), tracks, 1)

      expect(state.queue).toHaveLength(3)
      expect(state.currentIndex).toBe(1)
      expect(state.status).toBe('playing')
    })
  })

  describe('Play Next Track insertion', () => {
    it('starts playing immediately if queue is empty', () => {
      let state = createInitialQueueState()
      const track = mockTrack('1', 'Song 1')
      state = playNextTrack(state, track)

      expect(state.queue).toHaveLength(1)
      expect(state.currentIndex).toBe(0)
      expect(state.status).toBe('playing')
      expect(state.queue[0].id).toBe('1')
    })

    it('inserts track at currentIndex + 1 in non-empty queue', () => {
      const tracks = [mockTrack('1', 'Song 1'), mockTrack('2', 'Song 2'), mockTrack('3', 'Song 3')]
      let state = setQueue(createInitialQueueState(), tracks, 0)
      const nextTrack = mockTrack('insert', 'Insert Song')

      state = playNextTrack(state, nextTrack)
      expect(state.queue).toHaveLength(4)
      expect(state.currentIndex).toBe(0)
      expect(state.queue[1].id).toBe('insert')
      expect(state.queue[2].id).toBe('2')
    })
  })

  describe('Clear Queue', () => {
    it('keeps only the currently playing track at index 0 when playing', () => {
      const tracks = [mockTrack('1', 'Song 1'), mockTrack('2', 'Song 2'), mockTrack('3', 'Song 3')]
      let state = setQueue(createInitialQueueState(), tracks, 1) // status: 'playing', current: '2'

      state = clearQueue(state)
      expect(state.queue).toHaveLength(1)
      expect(state.queue[0].id).toBe('2')
      expect(state.currentIndex).toBe(0)
    })

    it('clears queue completely when status is stopped', () => {
      const tracks = [mockTrack('1', 'Song 1'), mockTrack('2', 'Song 2')]
      let state = setQueue(createInitialQueueState(), tracks, 0)
      state.status = 'stopped'

      state = clearQueue(state)
      expect(state.queue).toHaveLength(0)
      expect(state.currentIndex).toBe(0)
      expect(state.status).toBe('stopped')
    })
  })

  describe('Removing tracks and index adjustment', () => {
    const tracks = [
      mockTrack('0', 'Track 0'),
      mockTrack('1', 'Track 1'),
      mockTrack('2', 'Track 2'),
      mockTrack('3', 'Track 3')
    ]

    it('decrements currentIndex when removing a track before the active index', () => {
      let state = setQueue(createInitialQueueState(), tracks, 2)
      state = removeFromQueue(state, 0)

      expect(state.queue).toHaveLength(3)
      expect(state.currentIndex).toBe(1)
      expect(state.queue[state.currentIndex].id).toBe('2')
    })

    it('keeps currentIndex when removing a track after the active index', () => {
      let state = setQueue(createInitialQueueState(), tracks, 1)
      state = removeFromQueue(state, 3)

      expect(state.queue).toHaveLength(3)
      expect(state.currentIndex).toBe(1)
      expect(state.queue[state.currentIndex].id).toBe('1')
    })

    it('handles removing the currently active track', () => {
      let state = setQueue(createInitialQueueState(), tracks, 1)
      state = removeFromQueue(state, 1)

      expect(state.queue).toHaveLength(3)
      expect(state.currentIndex).toBe(1)
      expect(state.queue[state.currentIndex].id).toBe('2')
    })

    it('clamps currentIndex to valid range when removing last element while active', () => {
      let state = setQueue(createInitialQueueState(), [mockTrack('0', 'T0'), mockTrack('1', 'T1')], 1)
      state = removeFromQueue(state, 1)

      expect(state.queue).toHaveLength(1)
      expect(state.currentIndex).toBe(0)
    })

    it('transitions to stopped state when last track is removed', () => {
      let state = setQueue(createInitialQueueState(), [mockTrack('0', 'T0')], 0)
      state = removeFromQueue(state, 0)

      expect(state.queue).toHaveLength(0)
      expect(state.status).toBe('stopped')
    })
  })

  describe('Decoupled Shuffle and Repeat controls', () => {
    it('toggles shuffle independently', () => {
      let state = createInitialQueueState()
      expect(state.shuffle).toBe(false)

      state = toggleShuffle(state)
      expect(state.shuffle).toBe(true)

      state = toggleShuffle(state)
      expect(state.shuffle).toBe(false)
    })

    it('cycles repeat modes: off -> all -> one -> off', () => {
      let state = createInitialQueueState()
      expect(state.repeat).toBe('off')

      state = toggleRepeat(state)
      expect(state.repeat).toBe('all')

      state = toggleRepeat(state)
      expect(state.repeat).toBe('one')

      state = toggleRepeat(state)
      expect(state.repeat).toBe('off')
    })

    it('allows shuffle and repeat to be active simultaneously', () => {
      let state = createInitialQueueState()
      state = toggleShuffle(state) // shuffle = true
      state = toggleRepeat(state)  // repeat = 'all'

      expect(state.shuffle).toBe(true)
      expect(state.repeat).toBe('all')
    })
  })

  describe('Next Track Logic Across Decoupled Modes', () => {
    const tracks = [mockTrack('0', 'T0'), mockTrack('1', 'T1'), mockTrack('2', 'T2')]

    it('repeat: off advances index and stops at the end of queue', () => {
      let state = setQueue(createInitialQueueState(), tracks, 0)
      state.repeat = 'off'
      state.shuffle = false

      let result = getNextQueueIndex(state)
      expect(result).toEqual({ nextIndex: 1, status: 'playing' })

      state.currentIndex = 1
      result = getNextQueueIndex(state)
      expect(result).toEqual({ nextIndex: 2, status: 'playing' })

      state.currentIndex = 2
      result = getNextQueueIndex(state)
      expect(result).toEqual({ nextIndex: null, status: 'stopped' })
    })

    it('repeat: all wraps to beginning at the end of queue', () => {
      let state = setQueue(createInitialQueueState(), tracks, 2)
      state.repeat = 'all'
      state.shuffle = false

      const result = getNextQueueIndex(state)
      expect(result).toEqual({ nextIndex: 0, status: 'playing' })
    })

    it('repeat: one always retains current index even with shuffle active', () => {
      let state = setQueue(createInitialQueueState(), tracks, 1)
      state.repeat = 'one'
      state.shuffle = true

      const result = getNextQueueIndex(state)
      expect(result).toEqual({ nextIndex: 1, status: 'playing' })
    })

    it('shuffle selects random index excluding current index when queue length > 1', () => {
      let state = setQueue(createInitialQueueState(), tracks, 0)
      state.shuffle = true
      state.repeat = 'off'

      // Random 0.0 -> r = 0 -> maps to 1 (since 0 >= 0 -> r+1 = 1)
      let result = getNextQueueIndex(state, () => 0.0)
      expect(result).toEqual({ nextIndex: 1, status: 'playing' })

      // Random 0.99 -> r = 1 -> maps to 2
      result = getNextQueueIndex(state, () => 0.99)
      expect(result).toEqual({ nextIndex: 2, status: 'playing' })

      // At currentIndex = 1: random 0.0 -> r = 0 < 1 -> nextIndex = 0
      state.currentIndex = 1
      result = getNextQueueIndex(state, () => 0.0)
      expect(result).toEqual({ nextIndex: 0, status: 'playing' })
    })

    it('shuffle handles single track queue gracefully', () => {
      let state = setQueue(createInitialQueueState(), [mockTrack('0', 'T0')], 0)
      state.shuffle = true

      const result = getNextQueueIndex(state)
      expect(result).toEqual({ nextIndex: 0, status: 'playing' })
    })

    it('shuffle and repeat: all simultaneously selects random index', () => {
      let state = setQueue(createInitialQueueState(), tracks, 1)
      state.shuffle = true
      state.repeat = 'all'

      const result = getNextQueueIndex(state, () => 0.6)
      expect(result.status).toBe('playing')
      expect(result.nextIndex).not.toBe(1)
    })
  })

  describe('Previous Track Logic Across Decoupled Modes', () => {
    const tracks = [mockTrack('0', 'T0'), mockTrack('1', 'T1'), mockTrack('2', 'T2')]

    it('repeat: one retains current index on prev', () => {
      let state = setQueue(createInitialQueueState(), tracks, 1)
      state.repeat = 'one'
      expect(getPrevQueueIndex(state)).toBe(1)
    })

    it('repeat: all wraps backwards across queue boundary', () => {
      let state = setQueue(createInitialQueueState(), tracks, 0)
      state.repeat = 'all'
      expect(getPrevQueueIndex(state)).toBe(2)

      state = { ...state, currentIndex: 1 }
      expect(getPrevQueueIndex(state)).toBe(0)
    })

    it('repeat: off clamps to index 0 when at beginning', () => {
      let state = setQueue(createInitialQueueState(), tracks, 0)
      state.repeat = 'off'
      expect(getPrevQueueIndex(state)).toBe(0)
    })
  })
})
