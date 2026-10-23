import { describe, it, expect } from 'vitest'
import { setPlayerPosition, getPlayerPosition, subscribePlayerPosition } from '@renderer/store/positionStore'

describe('positionStore', () => {
  it('notifies subscribers only when the position changes', () => {
    let calls = 0
    const unsubscribe = subscribePlayerPosition(() => calls++)

    setPlayerPosition(10)
    setPlayerPosition(10)
    setPlayerPosition(11)
    expect(getPlayerPosition()).toBe(11)
    expect(calls).toBe(2)

    unsubscribe()
    setPlayerPosition(12)
    expect(calls).toBe(2)
  })
})
