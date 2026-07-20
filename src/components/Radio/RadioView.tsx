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
    url: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
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
    <div className="p-4 md:p-8 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 md:mb-8">
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'var(--color-accent)', color: 'var(--bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }} className="flex items-center justify-center">
          <Radio size={20} />
        </div>
        <div>
          <h1 className="text-xl md:text-3xl font-extrabold m-0 leading-tight">Internet Radio</h1>
          <p style={{ color: 'var(--text-muted)', margin: '2px 0 0 0', fontSize: 12 }} className="line-clamp-1">
            Direct, DRM-free audio streams processed natively through your Equalizer.
          </p>
        </div>
      </div>

      {/* Grid of Stations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STATIONS.map(station => {
          const isPlaying = player.source === 'radio' && player.radioInfo?.station === station.name && player.radioInfo?.title === station.title

          return (
            <div
              key={station.id}
              onClick={() => play({ id: station.id, source: 'radio', streamUrl: station.url, title: station.title, artist: station.name, artwork: station.artwork })}
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 14,
                padding: 12,
                cursor: 'pointer',
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                border: isPlaying ? '1px solid var(--color-accent)' : '1px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              <div style={{
                width: 64, height: 64, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                background: 'rgba(0,0,0,0.2)'
              }}>
                <img src={station.artwork} alt={station.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-accent)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {station.name}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
                  {station.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.3 }} className="line-clamp-2">
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
