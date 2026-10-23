import { describe, it, expect } from 'vitest'
import { isPathInsideFolders, isUrlAllowed, getConfiguredOrigin } from '@main/lib/protocolGuard'
import { folderLikePattern } from '@main/lib/paths'

describe('isPathInsideFolders', () => {
  const folders = ['/home/user/Music']

  it('allows files inside a music folder', () => {
    expect(isPathInsideFolders('/home/user/Music/Album/01.flac', folders)).toBe(true)
  })

  it('rejects files outside music folders', () => {
    expect(isPathInsideFolders('/home/user/.ssh/id_rsa', folders)).toBe(false)
  })

  it('rejects sibling folders sharing a prefix', () => {
    expect(isPathInsideFolders('/home/user/Music2/track.flac', folders)).toBe(false)
  })

  it('rejects path traversal out of a music folder', () => {
    expect(isPathInsideFolders('/home/user/Music/../.ssh/id_rsa', folders)).toBe(false)
  })

  it('ignores empty folder entries', () => {
    expect(isPathInsideFolders('/etc/passwd', ['', '  '])).toBe(false)
  })
})

describe('isUrlAllowed', () => {
  const origins = [getConfiguredOrigin({ url: 'https://jelly.example.com/' }), getConfiguredOrigin(null)]

  it('allows URLs on a configured server', () => {
    expect(isUrlAllowed('https://jelly.example.com/Items/1/Download?api_key=x', origins)).toBe(true)
  })

  it('rejects other hosts', () => {
    expect(isUrlAllowed('http://169.254.169.254/latest/meta-data', origins)).toBe(false)
  })

  it('rejects non-http schemes and invalid URLs', () => {
    expect(isUrlAllowed('file:///etc/passwd', origins)).toBe(false)
    expect(isUrlAllowed('not a url', origins)).toBe(false)
  })

  it('returns null origin for missing or non-http config', () => {
    expect(getConfiguredOrigin({ url: 'javascript:alert(1)' })).toBeNull()
    expect(getConfiguredOrigin({})).toBeNull()
  })
})

describe('folderLikePattern', () => {
  it('only matches inside the folder, not sibling prefixes', () => {
    expect(folderLikePattern('/home/user/Music')).toBe('/home/user/Music/%')
    expect(folderLikePattern('/home/user/Music/')).toBe('/home/user/Music/%')
  })

  it('escapes LIKE wildcards in the folder path', () => {
    expect(folderLikePattern('/mnt/100%_lossless')).toBe('/mnt/100\\%\\_lossless/%')
  })
})
