import React from 'react'
import { useApp } from '../../store/AppContext'
import TrackList from '../Library/TrackList'
import { Trash2 } from 'lucide-react'

export default function QueueView(): React.ReactElement {
  const { queue, clearQueue } = useApp()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Play Queue</h2>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {queue.length} {queue.length === 1 ? 'track' : 'tracks'}
          </span>
        </div>
        {queue.length > 0 && (
          <button
            onClick={clearQueue}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            title="Clear Queue"
          >
            <Trash2 size={14} />
            Clear Queue
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {queue.length > 0 ? (
          <TrackList tracks={queue} isQueueView={true} />
        ) : (
          <div style={{ padding: 20, color: 'var(--text-dim)' }}>Queue is empty.</div>
        )}
      </div>
    </div>
  )
}
