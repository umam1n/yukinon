import React from 'react'
import { useApp } from '../../store/AppContext'
import TrackList from '../Library/TrackList'

export default function QueueView(): React.ReactElement {
  const { queue } = useApp()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Play Queue</h2>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {queue.length > 0 ? (
          <TrackList tracks={queue} />
        ) : (
          <div style={{ padding: 20, color: 'var(--text-dim)' }}>Queue is empty.</div>
        )}
      </div>
    </div>
  )
}
