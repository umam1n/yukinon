import React, { useEffect, useState, useCallback } from 'react'
import { Cpu, Trash2, Check } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import type { DeviceProfile, EQBands } from '@shared/types'

export default function DeviceProfiles(): React.ReactElement {
  const { eqBands, eqPresets, applyEqPreset } = useApp()
  const [profiles, setProfiles] = useState<DeviceProfile[]>([])
  const [currentDevice, setCurrentDevice] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  // Detect current output device
  useEffect(() => {
    async function detectDevice(): Promise<void> {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const outputs = devices.filter((d) => d.kind === 'audiooutput')
      // Try to find a non-default device (headphones, external DAC etc.)
      const primary =
        outputs.find((d) => d.deviceId !== 'default' && d.deviceId !== 'communications') ||
        outputs.find((d) => d.deviceId === 'default')
      setCurrentDevice(primary?.label || null)

      // If we have a saved profile for this device, auto-apply it
      if (primary?.label) {
        const profile = await window.yukinon.devices.getProfile(primary.label) as DeviceProfile | null
        if (profile) {
          const preset = eqPresets.find((p) => p.id === profile.presetId)
          if (preset) applyEqPreset(preset)
        }
      }
    }

    detectDevice()
    navigator.mediaDevices.addEventListener('devicechange', detectDevice)
    return () => navigator.mediaDevices.removeEventListener('devicechange', detectDevice)
  }, [eqPresets])

  // Load all saved profiles
  useEffect(() => {
    window.yukinon.devices.listProfiles().then((p: any) => setProfiles(p as DeviceProfile[]))
  }, [justSaved])

  const handleSaveForDevice = useCallback(async () => {
    if (!currentDevice) return
    await window.yukinon.devices.saveProfile(currentDevice, null, null, eqBands)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
  }, [currentDevice, eqBands])

  const handleDelete = useCallback(async (label: string) => {
    await window.yukinon.devices.deleteProfile(label)
    setProfiles((prev) => prev.filter((p) => p.deviceLabel !== label))
  }, [])

  return (
    <div
      className="w-full md:w-[240px] border-t md:border-t-0 md:border-l border-[var(--border)] flex flex-col flex-shrink-0 overflow-hidden bg-[var(--bg-2)]"
    >
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
        <h3
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 12
          }}
        >
          Device Profiles
        </h3>

        {/* Current device */}
        <div
          style={{
            background: 'rgba(var(--color-accent-rgb), 0.08)',
            border: '1px solid rgba(var(--color-accent-rgb), 0.2)',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Cpu size={12} style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Device
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, lineHeight: 1.3 }}>
            {currentDevice || 'Default Output'}
          </p>
        </div>

        <button
          onClick={handleSaveForDevice}
          disabled={!currentDevice}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '8px',
            borderRadius: 8,
            border: 'none',
            background: justSaved ? 'rgba(var(--color-accent-rgb), 0.2)' : 'var(--color-accent)',
            color: justSaved ? 'var(--color-accent)' : '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
            opacity: !currentDevice ? 0.5 : 1
          }}
        >
          {justSaved ? <Check size={13} /> : null}
          {justSaved ? 'EQ Saved!' : 'Save EQ for This Device'}
        </button>
      </div>

      {/* Saved profiles list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {profiles.length === 0 ? (
          <p style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', padding: '16px 8px' }}>
            No saved device profiles yet
          </p>
        ) : (
          profiles.map((p: DeviceProfile) => (
            <div
              key={p.deviceLabel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px',
                borderRadius: 8,
                background: p.deviceLabel === currentDevice ? 'rgba(var(--color-accent-rgb), 0.08)' : 'transparent',
                marginBottom: 4
              }}
            >
              <Cpu
                size={13}
                style={{
                  color: p.deviceLabel === currentDevice ? 'var(--color-accent)' : 'var(--text-dim)',
                  flexShrink: 0
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: p.deviceLabel === currentDevice ? 'var(--color-accent)' : 'var(--text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {p.deviceLabel}
                </p>
                {p.presetName && (
                  <p style={{ fontSize: 10, color: 'var(--text-dim)' }}>{p.presetName}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(p.deviceLabel)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-dim)',
                  padding: 2
                }}
                title="Remove profile"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
