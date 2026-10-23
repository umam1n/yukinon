import type { CommunityPreset, EQBands } from '@shared/types'

const PRESETS_API_URL = import.meta.env.VITE_PRESETS_API_URL as string | undefined
const CLIENT_ID_KEY = 'yukinon_presets_client_id'

export const isPresetsApiConfigured = !!PRESETS_API_URL

if (!isPresetsApiConfigured) {
  console.warn('[Yukinon] VITE_PRESETS_API_URL not set. Community presets will be unavailable.')
}

export type PresetFilter = {
  genre?: string
  deviceModel?: string
  sortBy?: 'upvotes' | 'newest'
}

type ApiResponse<T> = ({ ok: true } & T) | { ok: false; error: string }

// Random per-install id used by the backend for rate limiting and vote de-duplication
function getClientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(CLIENT_ID_KEY, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

function requireApiUrl(): string {
  if (!PRESETS_API_URL) throw new Error('Community presets backend is not configured.')
  return PRESETS_API_URL
}

async function readResponse<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Presets backend returned HTTP ${res.status}`)
  const body = (await res.json()) as ApiResponse<T>
  if (!body.ok) throw new Error(body.error)
  return body
}

async function post<T>(payload: Record<string, unknown>): Promise<T> {
  // text/plain keeps this a "simple" request; Apps Script cannot answer CORS preflights
  const res = await fetch(requireApiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...payload, clientId: getClientId() })
  })
  return readResponse<T>(res)
}

export async function fetchCommunityPresets(filter: PresetFilter = {}): Promise<CommunityPreset[]> {
  if (!isPresetsApiConfigured) return []

  const url = new URL(requireApiUrl())
  url.searchParams.set('action', 'list')
  url.searchParams.set('sort', filter.sortBy === 'newest' ? 'newest' : 'upvotes')
  url.searchParams.set('limit', '50')
  if (filter.genre) url.searchParams.set('genre', filter.genre)
  if (filter.deviceModel) url.searchParams.set('device', filter.deviceModel)

  const { presets } = await readResponse<{ presets: CommunityPreset[] }>(await fetch(url))
  return presets
}

export async function publishPreset(
  title: string,
  authorName: string,
  bands: EQBands,
  deviceModel?: string,
  genre?: string
): Promise<CommunityPreset> {
  const { preset } = await post<{ preset: CommunityPreset }>({
    action: 'publish',
    title,
    authorName: authorName || 'Anonymous',
    bands,
    deviceModel: deviceModel || '',
    genre: genre || ''
  })
  return preset
}

export async function upvotePreset(id: string): Promise<number> {
  const { upvotes } = await post<{ upvotes: number }>({ action: 'upvote', id })
  return upvotes
}

export const GENRES = [
  'Any',
  'Electronic',
  'Hip-Hop',
  'Rock',
  'Metal',
  'Jazz',
  'Classical',
  'Pop',
  'R&B',
  'Acoustic',
  'Podcast / Spoken Word',
  'Film Score'
]
