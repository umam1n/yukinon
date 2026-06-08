export interface SubsonicConfig {
  url: string
  username: string
  password?: string
  token?: string
  salt?: string
  client: string
  version: string
}

let config: SubsonicConfig | null = null

export function setSubsonicConfig(c: SubsonicConfig) {
  config = c
}

export function getSubsonicConfig(): SubsonicConfig | null {
  return config
}

async function buildAuthParams(): Promise<string> {
  if (!config) throw new Error('Subsonic config not set')
  
  if (config.token && config.salt) {
    return `u=${encodeURIComponent(config.username)}&t=${config.token}&s=${config.salt}&v=${config.version}&c=${encodeURIComponent(config.client)}&f=json`
  }

  if (config.password) {
    const salt = Math.random().toString(36).substring(2, 15)
    // We exposed utils.md5 via IPC in preload/index.ts
    const token = await window.yukinon.utils.md5(config.password + salt)
    
    // Cache it
    config.token = token
    config.salt = salt
    return `u=${encodeURIComponent(config.username)}&t=${token}&s=${salt}&v=${config.version}&c=${encodeURIComponent(config.client)}&f=json`
  }

  throw new Error('No password or token provided')
}

export async function subsonicFetch(endpoint: string, extraParams: Record<string, string | number> = {}): Promise<any> {
  if (!config) throw new Error('Subsonic config not set')
  
  const authParams = await buildAuthParams()
  const safeUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
  let url = `${safeUrl}/rest/${endpoint}?${authParams}`
  
  for (const [key, value] of Object.entries(extraParams)) {
    url += `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`
  }

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Subsonic API Error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  
  if (data['subsonic-response']?.status === 'failed') {
    throw new Error(data['subsonic-response'].error.message || 'Subsonic API failed')
  }

  return data['subsonic-response']
}

export async function ping() {
  return await subsonicFetch('ping')
}

export async function getAlbumList2(type: 'recent' | 'random' | 'newest' | 'frequent' | 'recent' | 'alphabeticalByName' = 'newest', size = 20) {
  return await subsonicFetch('getAlbumList2', { type, size })
}

export async function getAlbum(id: string) {
  return await subsonicFetch('getAlbum', { id })
}

export async function getPlaylists() {
  return await subsonicFetch('getPlaylists')
}

export async function getPlaylist(id: string) {
  return await subsonicFetch('getPlaylist', { id })
}

export async function getCoverArtUrl(id: string, size = 300): Promise<string> {
  if (!config) return ''
  const authParams = await buildAuthParams()
  const safeUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
  return `${safeUrl}/rest/getCoverArt?${authParams}&id=${id}&size=${size}`
}

export async function getStreamUrl(id: string): Promise<string> {
  if (!config) throw new Error('Subsonic config not set')
  const authParams = await buildAuthParams()
  const safeUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
  return `${safeUrl}/rest/stream?${authParams}&id=${id}`
}
