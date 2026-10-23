import { sep } from 'path'

// Escape LIKE wildcards so folder paths containing % or _ match literally
export function folderLikePattern(folderPath: string): string {
  const root = folderPath.endsWith(sep) ? folderPath : folderPath + sep
  return root.replace(/[\\%_]/g, (c) => '\\' + c) + '%'
}

// Artwork files live under userData/artworks and are served through the yukinon:// protocol
export function artworkUrl(filePath: string): string {
  return `yukinon://local/artwork?path=${encodeURIComponent(filePath)}`
}
