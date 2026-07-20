import { supabase, isSupabaseConfigured } from './supabase'
import type { CommunityPreset, EQBands } from '@shared/types'

export type PresetFilter = {
  genre?: string
  deviceModel?: string
  sortBy?: 'upvotes' | 'newest'
}

export async function fetchCommunityPresets(filter: PresetFilter = {}): Promise<CommunityPreset[]> {
  if (!isSupabaseConfigured) {
    console.warn('[Yukinon] Supabase is not configured. Returning empty presets.')
    return []
  }

  let query = supabase
    .from('yukinon_presets')
    .select('*')
    .order(filter.sortBy === 'newest' ? 'created_at' : 'upvotes', { ascending: false })
    .limit(50)

  if (filter.genre) {
    query = query.eq('genre', filter.genre)
  }
  if (filter.deviceModel) {
    query = query.ilike('device_model', `%${filter.deviceModel}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    authorName: row.author_name || 'Anonymous',
    deviceModel: row.device_model,
    genre: row.genre,
    bands: row.bands as EQBands,
    upvotes: row.upvotes,
    createdAt: row.created_at
  }))
}

export async function publishPreset(
  title: string,
  authorName: string,
  bands: EQBands,
  deviceModel?: string,
  genre?: string
): Promise<CommunityPreset> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Community publishing is unavailable.')
  }

  const { data, error } = await supabase
    .from('yukinon_presets')
    .insert({
      title,
      author_name: authorName || 'Anonymous',
      bands,
      device_model: deviceModel || null,
      genre: genre || null,
      upvotes: 0
    })
    .select()
    .single()

  if (error) throw error

  return {
    id: data.id,
    title: data.title,
    authorName: data.author_name,
    deviceModel: data.device_model,
    genre: data.genre,
    bands: data.bands as EQBands,
    upvotes: data.upvotes,
    createdAt: data.created_at
  }
}

export async function upvotePreset(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Community voting is unavailable.')
  }
  const { error } = await supabase.rpc('upvote_yukinon_preset', { preset_id: id })
  if (error) throw error
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
