import React from 'react'
import { useApp } from '../../store/AppContext'
import { Radio } from 'lucide-react'

const STATIONS = [
  {
    id: 'soma-groove-salad',
    name: 'SomaFM',
    title: 'Groove Salad',
    url: 'https://ice1.somafm.com/groovesalad-256-mp3',
    artwork: 'https://somafm.com/img300/groovesalad300.jpg',
    description: 'A beautifully chilled plate of ambient/beat grooves.'
  },
  {
    id: 'soma-defcon',
    name: 'SomaFM',
    title: 'DEF CON Radio',
    url: 'https://ice1.somafm.com/defcon-256-mp3',
    artwork: 'https://somafm.com/img300/defcon300.png',
    description: 'Music for Hacking. The DEF CON Year-Round Channel.'
  },
  {
    id: 'lofi-girl',
    name: 'Chill / Lofi',
    title: 'Lofi Hip Hop Radio',
    url: 'https://stream.zeno.fm/f3wvbbqmdg8uv', // Working Lofi stream
    artwork: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hq720.jpg',
    description: 'Beats to relax/study to.'
  },
  {
    id: 'soma-secret-agent',
    name: 'SomaFM',
    title: 'Secret Agent',
    url: 'https://ice1.somafm.com/secretagent-128-aac',
    artwork: 'https://somafm.com/img300/secretagent300.jpg',
    description: 'The soundtrack for your stylish, mysterious, dangerous life.'
  }
]

export default function RadioView(): React.ReactElement {
  const { play, player } = useApp()

  return (
    <div style={{ padding: 32, height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'var(--color-accent)', color: 'var(--bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Radio size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Internet Radio</h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: 14 }}>
            Direct, DRM-free audio streams processed natively through your Equalizer.
          </p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 24
      }}>
        {STATIONS.map(station => {
          const isPlaying = player.source === 'radio' && player.radioInfo?.station === station.name && player.radioInfo?.title === station.title

          return (
            <div
              key={station.id}
              onClick={() => play({ id: station.id, source: 'radio', streamUrl: station.url, title: station.title, artist: station.name, artwork: station.artwork })}
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 16,
                padding: 16,
                cursor: 'pointer',
                display: 'flex',
                gap: 16,
                alignItems: 'center',
                border: isPlaying ? '1px solid var(--color-accent)' : '1px solid transparent',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                e.currentTarget.style.transform = 'none'
              }}
            >
              <div style={{
                width: 80, height: 80, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                background: 'rgba(0,0,0,0.2)'
              }}>
                <img src={station.artwork} alt={station.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-accent)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {station.name}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
                  {station.title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {station.description}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
