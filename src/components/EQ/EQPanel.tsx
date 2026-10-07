import React, { useState, useCallback, useMemo } from 'react'
import { RotateCcw, Save, Check, Headphones, Search, X } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import DeviceProfiles from './DeviceProfiles'
import type { EQBands } from '@shared/types'
import { AUTOEQ_PROFILES, type AutoEQProfile } from '../../data/autoeq'
import { audioEngine } from '../../audio/AudioEngine'

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

  const [autoEqModalOpen, setAutoEqModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('all')

  const brands = useMemo(() => {
    const bSet = new Set(AUTOEQ_PROFILES.map((p) => p.brand))
    return ['all', ...Array.from(bSet)]
  }, [])

  const filteredAutoEq = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return AUTOEQ_PROFILES.filter((p) => {
      const matchesBrand = selectedBrand === 'all' || p.brand === selectedBrand
      const matchesQuery =
        !q ||
        p.brand.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q)
      return matchesBrand && matchesQuery
    })
  }, [searchQuery, selectedBrand])

  const handleApplyAutoEQ = useCallback(
    (profile: AutoEQProfile) => {
      Object.entries(profile.bands).forEach(([band, gain]) => {
        setEqBand(Number(band) as keyof EQBands, gain)
      })
      audioEngine.applyBands(profile.bands)
      setAutoEqModalOpen(false)
    },
    [setEqBand]
  )

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
            10-band EQ · changes apply in real-time
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setAutoEqModalOpen(true)}
            style={btnStyle('secondary')}
            title="Browse AutoEQ headphone calibration database"
          >
            <Headphones size={14} />
            AutoEQ Presets
          </button>
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
            {justSaved ? 'Preset saved' : 'Save Preset'}
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

      {/* AutoEQ Headphone Calibration Modal */}
      {autoEqModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
            padding: 24
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setAutoEqModalOpen(false)
          }}
        >
          <div
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 24,
              width: 580,
              maxWidth: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                  AutoEQ Headphone Calibration
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                  Calibrated Harman target compensation curves from Jaakko Pasanen's AutoEq database
                </p>
              </div>
              <button
                onClick={() => setAutoEqModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: 4
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '8px 12px',
                marginBottom: 12
              }}
            >
              <Search size={16} color="var(--text-dim)" />
              <input
                type="text"
                placeholder="Search headphone brand or model (e.g. HD 600, XM4, AirPods)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text)',
                  fontSize: 13,
                  width: '100%'
                }}
                autoFocus
              />
            </div>

            {/* Brand Filter Pills */}
            <div
              style={{
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                paddingBottom: 8,
                marginBottom: 12,
                flexShrink: 0
              }}
            >
              {brands.map((b) => (
                <button
                  key={b}
                  onClick={() => setSelectedBrand(b)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 14,
                    fontSize: 11,
                    fontWeight: selectedBrand === b ? 600 : 500,
                    border: '1px solid var(--border)',
                    background: selectedBrand === b ? 'var(--color-accent)' : 'var(--bg-3)',
                    color: selectedBrand === b ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {b === 'all' ? 'All Brands' : b}
                </button>
              ))}
            </div>

            {/* Results List */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                minHeight: 200,
                maxHeight: 400
              }}
            >
              {filteredAutoEq.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-dim)', fontSize: 13 }}>
                  No matching headphone models found.
                </div>
              ) : (
                filteredAutoEq.map((profile) => (
                  <div
                    key={`${profile.brand}-${profile.model}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--bg-3)',
                      border: '1px solid var(--border)',
                      borderRadius: 8
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                        {profile.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                        {profile.source}
                      </div>
                    </div>
                    <button
                      onClick={() => handleApplyAutoEQ(profile)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: 'none',
                        background: 'var(--color-accent)',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Apply Calibration
                    </button>
                  </div>
                ))
              )}
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
