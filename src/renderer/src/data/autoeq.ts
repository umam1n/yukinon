import type { EQBands } from '../../../../shared/types'

export interface AutoEQProfile {
  brand: string
  model: string
  name: string
  source: string
  bands: EQBands
}

export const AUTOEQ_PROFILES: AutoEQProfile[] = [
  // Sennheiser
  {
    brand: 'Sennheiser',
    model: 'HD 600',
    name: 'Sennheiser HD 600',
    source: 'Harman Over-Ear Target (AutoEQ)',
    bands: { 32: 6.5, 64: 3.5, 125: 0.5, 250: -0.5, 500: 0.0, 1000: 0.0, 2000: -1.0, 4000: 1.5, 8000: -1.0, 16000: -2.0 }
  },
  {
    brand: 'Sennheiser',
    model: 'HD 650',
    name: 'Sennheiser HD 650',
    source: 'Harman Over-Ear Target (AutoEQ)',
    bands: { 32: 7.0, 64: 3.0, 125: -0.5, 250: -1.0, 500: -0.5, 1000: 0.5, 2000: -0.5, 4000: 2.0, 8000: -1.5, 16000: -2.5 }
  },
  {
    brand: 'Sennheiser',
    model: 'HD 560S',
    name: 'Sennheiser HD 560S',
    source: 'Harman Over-Ear Target (AutoEQ)',
    bands: { 32: 3.0, 64: 1.5, 125: 0.0, 250: -0.5, 500: 0.0, 1000: 0.5, 2000: 0.0, 4000: -2.0, 8000: -1.5, 16000: 0.5 }
  },
  {
    brand: 'Sennheiser',
    model: 'HD 800 S',
    name: 'Sennheiser HD 800 S',
    source: 'Harman Over-Ear Target (AutoEQ)',
    bands: { 32: 6.0, 64: 3.5, 125: 0.5, 250: 0.0, 500: 0.0, 1000: 0.5, 2000: 1.5, 4000: 1.0, 8000: -3.5, 16000: -2.0 }
  },
  {
    brand: 'Sennheiser',
    model: 'Momentum 4',
    name: 'Sennheiser Momentum 4',
    source: 'Harman Over-Ear Target (AutoEQ)',
    bands: { 32: -3.5, 64: -4.0, 125: -2.5, 250: -1.0, 500: 0.5, 1000: 0.0, 2000: 1.0, 4000: 2.5, 8000: 1.5, 16000: -1.0 }
  },
  // Sony
  {
    brand: 'Sony',
    model: 'WH-1000XM4',
    name: 'Sony WH-1000XM4',
    source: 'Harman Over-Ear Target (AutoEQ)',
    bands: { 32: -2.0, 64: -4.5, 125: -5.0, 250: -2.5, 500: 1.0, 1000: 1.5, 2000: 2.0, 4000: 1.5, 8000: -1.0, 16000: 3.0 }
  },
  {
    brand: 'Sony',
    model: 'WH-1000XM5',
    name: 'Sony WH-1000XM5',
    source: 'Harman Over-Ear Target (AutoEQ)',
    bands: { 32: -1.5, 64: -3.5, 125: -4.0, 250: -1.5, 500: 0.5, 1000: 1.0, 2000: 2.5, 4000: 1.0, 8000: 0.5, 16000: 2.0 }
  },
  {
    brand: 'Sony',
    model: 'WF-1000XM4',
    name: 'Sony WF-1000XM4',
    source: 'Harman In-Ear Target (AutoEQ)',
    bands: { 32: 1.0, 64: -1.5, 125: -2.0, 250: -1.0, 500: 0.5, 1000: 0.0, 2000: 2.0, 4000: 1.5, 8000: -2.5, 16000: 1.0 }
  },
  {
    brand: 'Sony',
    model: 'MDR-7506',
    name: 'Sony MDR-7506',
    source: 'Harman Over-Ear Target (AutoEQ)',
    bands: { 32: 4.5, 64: 2.0, 125: 0.0, 250: -0.5, 500: 0.0, 1000: -1.0, 2000: -1.5, 4000: -2.0, 8000: -4.5, 16000: -1.5 }
  },
  // Apple
  {
    brand: 'Apple',
    model: 'AirPods Pro 2',
    name: 'Apple AirPods Pro 2',
    source: 'Harman In-Ear Target (AutoEQ)',
    bands: { 32: 0.5, 64: -0.5, 125: -1.0, 250: -0.5, 500: 0.5, 1000: 0.0, 2000: 0.5, 4000: -1.0, 8000: 1.5, 16000: -1.0 }
  },
  {
    brand: 'Apple',
    model: 'AirPods Max',
    name: 'Apple AirPods Max',
    source: 'Harman Over-Ear Target (AutoEQ)',
    bands: { 32: 1.0, 64: 0.0, 125: -1.5, 250: -1.0, 500: 0.0, 1000: 0.5, 2000: 1.5, 4000: -2.0, 8000: 2.5, 16000: -1.5 }
  },
  // Audio-Technica
  {
    brand: 'Audio-Technica',
    model: 'ATH-M50x',
    name: 'Audio-Technica ATH-M50x',
    source: 'Harman Over-Ear Target (AutoEQ)',
    bands: { 32: 1.5, 64: -2.0, 125: -3.5, 250: -1.5, 500: 0.5, 1000: 0.0, 2000: 1.5, 4000: -1.0, 8000: -4.0, 16000: -1.0 }
  },
  {
    brand: 'Audio-Technica',
    model: 'ATH-M40x',
    name: 'Audio-Technica ATH-M40x',
    source: 'Harman Over-Ear Target (AutoEQ)',
    bands: { 32: 2.5, 64: 0.0, 125: -2.0, 250: -1.0, 500: 0.0, 1000: 0.5, 2000: 1.0, 4000: -1.5, 8000: -3.0, 16000: -0.5 }
  },
  {
    brand: 'Audio-Technica',
    model: 'ATH-R70x',
    name: 'Audio-Technica ATH-R70x',
    source: 'Harman Over-Ear Target (AutoEQ)',
    bands: { 32: 4.5, 64: 2.5, 125: 0.5, 250: 0.0, 500: -0.5, 1000: 0.5, 2000: 0.0, 4000: 1.0, 8000: -1.0, 16000: -1.5 }
  },
  // Beyerdynamic
  {
    brand: 'Beyerdynamic',
    model: 'DT 770 Pro (80 Ohm)',
    name: 'Beyerdynamic DT 770 Pro (80 Ohm)',
    source: 'Harman Over-Ear Target (AutoEQ)',
    bands: { 32: -1.0, 64: -2.0, 125: -1.5, 250: 0.0, 500: 1.0, 1000: 0.5, 2000: -1.0, 4000: 2.0, 8000: -5.5, 16000: -2.0 }
  },
  {
    brand: 'Beyerdynamic',
    model: 'DT 990 Pro (250 Ohm)',
    name: 'Beyerdynamic DT 990 Pro (250 Ohm)',
    source: 'Harman Over-Ear Target (AutoEQ)',
    bands: { 32: 4.0, 64: 1.0, 125: -1.5, 250: -1.0, 500: 0.5, 1000: 0.0, 2000: -0.5, 4000: 1.5, 8000: -6.0, 16000: -3.0 }
  },
  {
    brand: 'Beyerdynamic',
    model: 'DT 1990 Pro',
    name: 'Beyerdynamic DT 1990 Pro',
    source: 'Harman Over-Ear Target (AutoEQ)',
    bands: { 32: 2.5, 64: 1.0, 125: -0.5, 250: 0.0, 500: 0.0, 1000: 0.5, 2000: -1.0, 4000: 1.5, 8000: -5.0, 16000: -1.5 }
  },
  // Moondrop
  {
    brand: 'Moondrop',
    model: 'Blessing 2',
    name: 'Moondrop Blessing 2',
    source: 'Harman In-Ear Target (AutoEQ)',
    bands: { 32: 3.5, 64: 2.5, 125: 1.0, 250: 0.0, 500: -0.5, 1000: 0.0, 2000: 0.5, 4000: -1.5, 8000: 1.0, 16000: -0.5 }
  },
  {
    brand: 'Moondrop',
    model: 'Blessing 3',
    name: 'Moondrop Blessing 3',
    source: 'Harman In-Ear Target (AutoEQ)',
    bands: { 32: 2.0, 64: 1.0, 125: 0.0, 250: -0.5, 500: 0.0, 1000: 0.5, 2000: -1.0, 4000: -1.5, 8000: 0.5, 16000: 0.0 }
  },
  {
    brand: 'Moondrop',
    model: 'Aria',
    name: 'Moondrop Aria',
    source: 'Harman In-Ear Target (AutoEQ)',
    bands: { 32: 0.5, 64: 0.0, 125: -0.5, 250: -0.5, 500: 0.0, 1000: 0.5, 2000: 0.0, 4000: -1.0, 8000: 1.5, 16000: -1.0 }
  },
  {
    brand: 'Moondrop',
    model: 'Kato',
    name: 'Moondrop Kato',
    source: 'Harman In-Ear Target (AutoEQ)',
    bands: { 32: 1.0, 64: 0.5, 125: 0.0, 250: -0.5, 500: 0.0, 1000: 0.5, 2000: -0.5, 4000: -1.0, 8000: 1.0, 16000: -0.5 }
  },
  {
    brand: 'Moondrop',
    model: 'Chu II',
    name: 'Moondrop Chu II',
    source: 'Harman In-Ear Target (AutoEQ)',
    bands: { 32: -1.0, 64: -1.5, 125: -1.0, 250: 0.0, 500: 0.5, 1000: 0.0, 2000: 0.5, 4000: -1.5, 8000: 2.0, 16000: -1.0 }
  },
  // HiFiMAN
  {
    brand: 'HiFiMAN',
    model: 'Sundara',
    name: 'HiFiMAN Sundara',
    source: 'Harman Over-Ear Target (AutoEQ)',
    bands: { 32: 5.5, 64: 3.0, 125: 0.5, 250: 0.0, 500: 0.0, 1000: 0.0, 2000: 1.5, 4000: -1.0, 8000: -1.5, 16000: 0.5 }
  },
  {
    brand: 'HiFiMAN',
    model: 'Edition XS',
    name: 'HiFiMAN Edition XS',
    source: 'Harman Over-Ear Target (AutoEQ)',
    bands: { 32: 3.5, 64: 1.5, 125: 0.0, 250: -0.5, 500: 0.0, 1000: 0.5, 2000: 1.0, 4000: -1.5, 8000: -2.0, 16000: 1.0 }
  },
  {
    brand: 'HiFiMAN',
    model: 'Ananda',
    name: 'HiFiMAN Ananda',
    source: 'Harman Over-Ear Target (AutoEQ)',
    bands: { 32: 4.5, 64: 2.0, 125: 0.5, 250: 0.0, 500: 0.0, 1000: 0.0, 2000: 1.5, 4000: -1.5, 8000: -2.5, 16000: 0.0 }
  },
  // Bose
  {
    brand: 'Bose',
    model: 'QuietComfort 45',
    name: 'Bose QuietComfort 45',
    source: 'Harman Over-Ear Target (AutoEQ)',
    bands: { 32: 1.0, 64: 0.0, 125: -1.5, 250: -1.0, 500: 0.5, 1000: 1.0, 2000: 0.0, 4000: 1.5, 8000: -4.5, 16000: 1.0 }
  },
  {
    brand: 'Bose',
    model: 'QC Ultra',
    name: 'Bose QC Ultra',
    source: 'Harman Over-Ear Target (AutoEQ)',
    bands: { 32: -1.5, 64: -2.0, 125: -1.0, 250: 0.0, 500: 0.5, 1000: 0.5, 2000: 1.0, 4000: -0.5, 8000: -1.5, 16000: 1.5 }
  },
  // AKG
  {
    brand: 'AKG',
    model: 'K371',
    name: 'AKG K371',
    source: 'Harman Over-Ear Target (AutoEQ)',
    bands: { 32: 0.5, 64: -0.5, 125: -0.5, 250: 0.0, 500: 0.0, 1000: 0.5, 2000: -0.5, 4000: 0.0, 8000: 1.0, 16000: -0.5 }
  },
  {
    brand: 'AKG',
    model: 'K240 Studio',
    name: 'AKG K240 Studio',
    source: 'Harman Over-Ear Target (AutoEQ)',
    bands: { 32: 8.5, 64: 5.0, 125: 1.0, 250: -1.5, 500: -0.5, 1000: 0.0, 2000: 1.0, 4000: -1.5, 8000: -1.0, 16000: -2.0 }
  },
  // Shure
  {
    brand: 'Shure',
    model: 'SE215',
    name: 'Shure SE215',
    source: 'Harman In-Ear Target (AutoEQ)',
    bands: { 32: -3.0, 64: -4.0, 125: -3.0, 250: -1.0, 500: 0.5, 1000: 1.0, 2000: 2.0, 4000: 3.5, 8000: 4.0, 16000: 1.0 }
  },
  {
    brand: 'Shure',
    model: 'SRH840',
    name: 'Shure SRH840',
    source: 'Harman Over-Ear Target (AutoEQ)',
    bands: { 32: 1.5, 64: 0.0, 125: -1.5, 250: -0.5, 500: 0.5, 1000: 0.0, 2000: -0.5, 4000: 1.0, 8000: -2.5, 16000: -1.0 }
  },
  // 7Hz
  {
    brand: '7Hz',
    model: 'Timeless',
    name: '7Hz Timeless',
    source: 'Harman In-Ear Target (AutoEQ)',
    bands: { 32: 0.0, 64: -0.5, 125: -0.5, 250: 0.0, 500: 0.5, 1000: 0.0, 2000: 0.5, 4000: -1.0, 8000: -2.5, 16000: 1.5 }
  },
  {
    brand: '7Hz',
    model: 'Salnotes Zero',
    name: '7Hz Salnotes Zero',
    source: 'Harman In-Ear Target (AutoEQ)',
    bands: { 32: 2.0, 64: 1.0, 125: 0.0, 250: -0.5, 500: 0.0, 1000: 0.5, 2000: 0.0, 4000: -1.5, 8000: 1.5, 16000: -1.0 }
  }
]
