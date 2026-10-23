/**
 * Access checks for the yukinon:// protocol.
 *
 * Local files may only be served if they are indexed tracks or live inside a
 * configured music folder. Remote URLs may only be proxied to the configured
 * Jellyfin / Subsonic servers.
 */

import { resolve, sep } from 'path'

export function isPathInsideFolders(filePath: string, folders: string[]): boolean {
  const target = resolve(filePath)
  return folders.some((folder) => {
    if (typeof folder !== 'string' || !folder.trim()) return false
    const root = resolve(folder)
    return target === root || target.startsWith(root.endsWith(sep) ? root : root + sep)
  })
}

export function getConfiguredOrigin(config: unknown): string | null {
  const url = (config as { url?: unknown } | null)?.url
  if (typeof url !== 'string' || !url.trim()) return null
  try {
    const parsed = new URL(url.trim())
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.origin
  } catch {
    return null
  }
}

export function isUrlAllowed(targetUrl: string, allowedOrigins: (string | null)[]): boolean {
  try {
    const parsed = new URL(targetUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    return allowedOrigins.includes(parsed.origin)
  } catch {
    return false
  }
}
