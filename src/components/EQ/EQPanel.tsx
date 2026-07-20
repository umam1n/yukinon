import React, { useState, useCallback } from 'react'
import { RotateCcw, Save, Check } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import DeviceProfiles from './DeviceProfiles'
import type { EQBands } from '@shared/types'

const EQ_BANDS: { freq: number; label: string }[] = [
  { freq: 32, label: '32Hz' },
  { freq: 64, label: '64Hz' },
  { freq: 125, label: '125Hz' },
  { freq: 250, label: '250Hz' },
  { freq: 500, label: '500Hz' },
  { freq: 1000, label: '1kHz' },
  { freq: 2000, label: '2kHz' },
  { freq: 4000, label: '4kHz' },
  { freq: 8000, label: '8kHz' },
  { freq: 16000, label: '16kHz' }
]

const MIN_DB = -12
const MAX_DB = 12

export default function EQPanel(): React.ReactElement {
  const { eqBands, setEqBand, eqPresets, activePresetId, applyEqPreset, saveEqPreset } = useApp()
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [justSaved, setJustSaved] = useState(false)

  const handleReset = useCallback(() => {
    const flat: EQBands = { 32: 0, 64: 0, 125: 0, 250: 0, 500: 0, 1000: 0, 2000: 0, 4000: 0, 8000: 0, 16000: 0 }
    Object.entries(flat).forEach(([band, gain]) => {
      setEqBand(Number(band) as keyof EQBands, gain)
    })
  }, [setEqBand])

  const handleSave = useCallback(async () => {
    if (!saveName.trim()) return
    await saveEqPreset(saveName.trim())
    setSaveName('')
    setSaveModalOpen(false)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
  }, [saveName, saveEqPreset])

  // Calculate a visual EQ curve color per band
  const getBandColor = (gain: number) => {
    if (gain > 0) return `rgba(var(--color-accent-rgb), ${0.4 + gain / MAX_DB * 0.6})`
    if (gain < 0) return `rgba(var(--color-accent-rgb), ${0.2 + Math.abs(gain) / MAX_DB * 0.3})`
    return 'var(--text-dim)'
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0
        }}
      >
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Equalizer</h2>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
            10-band parametric EQ · changes apply in real-time
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleReset}
            style={btnStyle('secondary')}
            title="Reset to flat"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <button
            onClick={() => setSaveModalOpen(true)}
            style={btnStyle('primary')}
          >
            {justSaved ? <Check size={14} /> : <Save size={14} />}
            {justSaved ? 'Saved!' : 'Save Preset'}
          </button>
        </div>
      </div>

      <div className="flex md:flex-row flex-col flex-1 overflow-y-auto md:overflow-hidden">
        {/* EQ Sliders */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            gap: 24,
            overflow: 'auto'
          }}
        >
          {/* Presets selector */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {eqPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyEqPreset(preset)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 500,
                  border: '1px solid',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  borderColor: activePresetId === preset.id ? 'var(--color-accent)' : 'var(--border)',
                  background: activePresetId === preset.id ? 'rgba(var(--color-accent-rgb), 0.15)' : 'transparent',
                  color: activePresetId === preset.id ? 'var(--color-accent)' : 'var(--text-muted)'
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>

          {/* The EQ band sliders */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: 16,
              padding: '20px 0',
              flex: 1,
              position: 'relative'
            }}
          >
            {/* 0dB center line */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: 1,
                background: 'var(--border)',
                top: '50%',
                pointerEvents: 'none',
                zIndex: 0
              }}
            />

            {EQ_BANDS.map(({ freq, label }) => {
              const gain = eqBands[freq as keyof EQBands] ?? 0
              return (
                <div
                  key={freq}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    zIndex: 1
                  }}
                >
                  {/* Gain value */}
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: gain !== 0 ? 'var(--color-accent)' : 'var(--text-dim)',
                      fontFamily: 'JetBrains Mono, monospace',
                      minWidth: 36,
                      textAlign: 'center',
                      background: gain !== 0 ? 'rgba(var(--color-accent-rgb), 0.1)' : 'transparent',
                      padding: '2px 4px',
                      borderRadius: 4
                    }}
                  >
                    {gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}
                  </div>

                  {/* Vertical slider */}
                  <div style={{ width: 28, height: 160, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <input
                      type="range"
                      className="eq-slider"
                      min={MIN_DB}
                      max={MAX_DB}
                      step={0.5}
                      value={gain}
                      onChange={(e) => setEqBand(freq as keyof EQBands, Number(e.target.value))}
                      title={`${label}: ${gain.toFixed(1)}dB`}
                      style={{ '--slider-color': getBandColor(gain) } as React.CSSProperties}
                    />
                  </div>

                  {/* Frequency label */}
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--text-dim)',
                      fontFamily: 'JetBrains Mono, monospace',
                      letterSpacing: '-0.02em'
                    }}
                  >
                    {label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Device Profiles sidebar */}
        <DeviceProfiles />
      </div>

      {/* Save Preset Modal */}
      {saveModalOpen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            backdropFilter: 'blur(4px)'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setSaveModalOpen(false) }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 28,
              width: 360,
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)'
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Save EQ Preset</h3>
            <input
              type="text"
              placeholder="Preset name (e.g. 'Studio Headphones')"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
              autoFocus
              style={{
                width: '100%',
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 14px',
                color: 'var(--text)',
                fontSize: 14,
                outline: 'none',
                fontFamily: 'inherit',
                marginBottom: 16
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setSaveModalOpen(false)} style={btnStyle('secondary')}>
                Cancel
              </button>
              <button onClick={handleSave} style={btnStyle('primary')}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function btnStyle(variant: 'primary' | 'secondary'): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 16px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    border: variant === 'primary' ? 'none' : '1px solid var(--border)',
    background: variant === 'primary' ? 'var(--color-accent)' : 'var(--bg-3)',
    color: variant === 'primary' ? '#fff' : 'var(--text-muted)',
    transition: 'opacity 0.15s'
  }
}
