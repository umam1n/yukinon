/**
 * YUKINON community EQ presets — Google Apps Script backend.
 *
 * Storage is the spreadsheet this script is bound to (tabs are created on first use).
 * Deploy as a Web App (Execute as: Me, Who has access: Anyone).
 * See README.md in this folder.
 *
 * GET  ?action=list[&genre=Rock][&device=hd600][&sort=upvotes|newest][&limit=50]
 * POST (text/plain JSON body)
 *   { "action": "publish", "clientId": "...", "title": "...", "authorName": "...",
 *     "deviceModel": "...", "genre": "...", "bands": { "32": 0, ..., "16000": 0 } }
 *   { "action": "upvote", "clientId": "...", "id": "<preset id>" }
 *
 * Responses are always HTTP 200 JSON: { ok: true, ... } or { ok: false, error: "..." }.
 */

var PRESETS_SHEET = 'presets'
var VOTES_SHEET = 'votes'
var PRESET_COLUMNS = ['id', 'title', 'author_name', 'device_model', 'genre', 'bands', 'upvotes', 'created_at', 'client_id']
var VOTE_COLUMNS = ['preset_id', 'client_id', 'created_at']

var BAND_KEYS = ['32', '64', '125', '250', '500', '1000', '2000', '4000', '8000', '16000']
var MIN_DB = -12
var MAX_DB = 12

var GENRES = [
  'Electronic', 'Hip-Hop', 'Rock', 'Metal', 'Jazz', 'Classical', 'Pop', 'R&B',
  'Acoustic', 'Podcast / Spoken Word', 'Film Score'
]

// Abuse limits. clientId is self-reported, so the global cap is the real backstop.
var PUBLISH_PER_CLIENT_PER_HOUR = 5
var PUBLISH_GLOBAL_PER_DAY = 300
var UPVOTE_PER_CLIENT_PER_HOUR = 60
var LIST_CACHE_SECONDS = 60
var MAX_LIST_LIMIT = 200

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

// Optional: sheets are also created automatically on the first publish
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  ensureSheet_(ss, PRESETS_SHEET, PRESET_COLUMNS)
  ensureSheet_(ss, VOTES_SHEET, VOTE_COLUMNS)
}

function ensureSheet_(ss, name, columns) {
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name)
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(columns)
    sheet.setFrozenRows(1)
  }
  return sheet
}

// ---------------------------------------------------------------------------
// HTTP entry points
// ---------------------------------------------------------------------------

function doGet(e) {
  try {
    var params = (e && e.parameter) || {}
    if ((params.action || 'list') !== 'list') return json_({ ok: false, error: 'Unknown action' })
    return json_({ ok: true, presets: listPresets_(params) })
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) })
  }
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}')
    var clientId = cleanString_(body.clientId, 64)
    if (!/^[A-Za-z0-9-]{8,64}$/.test(clientId)) throw new Error('Invalid clientId')

    if (body.action === 'publish') return json_({ ok: true, preset: publishPreset_(body, clientId) })
    if (body.action === 'upvote') return json_({ ok: true, upvotes: upvotePreset_(cleanString_(body.id, 64), clientId) })
    throw new Error('Unknown action')
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) })
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function listPresets_(params) {
  var genre = cleanString_(params.genre, 40)
  var device = cleanString_(params.device, 80).toLowerCase()
  var sort = params.sort === 'newest' ? 'newest' : 'upvotes'
  var limit = Math.min(Math.max(parseInt(params.limit, 10) || 50, 1), MAX_LIST_LIMIT)

  var cache = CacheService.getScriptCache()
  var cacheKey = 'list:' + listGeneration_() + ':' + Utilities.base64EncodeWebSafe([genre, device, sort, limit].join('|'))
  var cached = cache.get(cacheKey)
  if (cached) return JSON.parse(cached)

  var presets = readPresets_().filter(function (p) {
    if (genre && p.genre !== genre) return false
    if (device && (p.deviceModel || '').toLowerCase().indexOf(device) === -1) return false
    return true
  })

  presets.sort(function (a, b) {
    if (sort === 'upvotes' && b.upvotes !== a.upvotes) return b.upvotes - a.upvotes
    return b.createdAt < a.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0
  })

  var result = presets.slice(0, limit)
  cache.put(cacheKey, JSON.stringify(result), LIST_CACHE_SECONDS)
  return result
}

function publishPreset_(body, clientId) {
  var title = cleanString_(body.title, 100)
  if (!title) throw new Error('Title is required')
  var authorName = cleanString_(body.authorName, 40) || 'Anonymous'
  var deviceModel = cleanString_(body.deviceModel, 80)
  var genre = cleanString_(body.genre, 40)
  if (genre && GENRES.indexOf(genre) === -1) throw new Error('Unknown genre')
  var bands = validateBands_(body.bands)

  takeRateLimit_('publish:' + clientId, PUBLISH_PER_CLIENT_PER_HOUR, 3600)
  takeRateLimit_('publish:global', PUBLISH_GLOBAL_PER_DAY, 86400)

  var preset = {
    id: Utilities.getUuid(),
    title: title,
    authorName: authorName,
    deviceModel: deviceModel || null,
    genre: genre || null,
    bands: bands,
    upvotes: 0,
    createdAt: new Date().toISOString()
  }

  withLock_(function () {
    sheet_(PRESETS_SHEET).appendRow([
      preset.id,
      safeCell_(title),
      safeCell_(authorName),
      safeCell_(deviceModel),
      safeCell_(genre),
      JSON.stringify(bands),
      0,
      preset.createdAt,
      clientId
    ])
  })
  invalidateListCache_()
  return preset
}

function upvotePreset_(presetId, clientId) {
  if (!presetId) throw new Error('Missing preset id')
  takeRateLimit_('upvote:' + clientId, UPVOTE_PER_CLIENT_PER_HOUR, 3600)

  var upvotes = withLock_(function () {
    var presets = sheet_(PRESETS_SHEET)
    var ids = columnValues_(presets, 1)
    var rowIndex = ids.indexOf(presetId)
    if (rowIndex === -1) throw new Error('Preset not found')
    var row = rowIndex + 2 // header + 1-based

    var votes = sheet_(VOTES_SHEET)
    var voteKeys = votes.getLastRow() > 1
      ? votes.getRange(2, 1, votes.getLastRow() - 1, 2).getValues().map(function (r) { return r[0] + '|' + r[1] })
      : []
    var upvoteCell = presets.getRange(row, PRESET_COLUMNS.indexOf('upvotes') + 1)
    var current = Number(upvoteCell.getValue()) || 0
    if (voteKeys.indexOf(presetId + '|' + clientId) !== -1) return current

    votes.appendRow([presetId, clientId, new Date().toISOString()])
    upvoteCell.setValue(current + 1)
    return current + 1
  })
  invalidateListCache_()
  return upvotes
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readPresets_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PRESETS_SHEET)
  if (!sheet || sheet.getLastRow() < 2) return []
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, PRESET_COLUMNS.length).getValues()
  var out = []
  rows.forEach(function (r) {
    var bands
    try { bands = JSON.parse(r[5]) } catch (err) { return }
    out.push({
      id: String(r[0]),
      title: unsafeCell_(r[1]),
      authorName: unsafeCell_(r[2]) || 'Anonymous',
      deviceModel: unsafeCell_(r[3]) || null,
      genre: unsafeCell_(r[4]) || null,
      bands: bands,
      upvotes: Number(r[6]) || 0,
      createdAt: r[7] instanceof Date ? r[7].toISOString() : String(r[7])
    })
  })
  return out
}

function validateBands_(bands) {
  if (!bands || typeof bands !== 'object') throw new Error('Invalid bands')
  var out = {}
  BAND_KEYS.forEach(function (key) {
    var v = Number(bands[key])
    if (!isFinite(v) || v < MIN_DB || v > MAX_DB) throw new Error('Invalid gain for band ' + key)
    out[key] = Math.round(v * 10) / 10
  })
  return out
}

function cleanString_(value, maxLength) {
  if (typeof value !== 'string') return ''
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength)
}

// Stop user text from being interpreted as a spreadsheet formula
function safeCell_(value) {
  return /^[=+\-@]/.test(value) ? "'" + value : value
}

function unsafeCell_(value) {
  return String(value == null ? '' : value)
}

function takeRateLimit_(key, max, windowSeconds) {
  var cache = CacheService.getScriptCache()
  var bucket = 'rl:' + key + ':' + Math.floor(Date.now() / 1000 / windowSeconds)
  var count = Number(cache.get(bucket)) || 0
  if (count >= max) throw new Error('Rate limit exceeded, try again later')
  cache.put(bucket, String(count + 1), windowSeconds)
}

// List cache keys embed a generation number; bumping it orphans every cached list
function listGeneration_() {
  return CacheService.getScriptCache().get('list:gen') || '0'
}

function invalidateListCache_() {
  CacheService.getScriptCache().put('list:gen', String(Date.now()), 21600)
}

function withLock_(fn) {
  var lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    return fn()
  } finally {
    lock.releaseLock()
  }
}

// Sheets are created on first use; only call this inside withLock_ so two requests can't both insert one
function sheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  return ss.getSheetByName(name) || ensureSheet_(ss, name, name === VOTES_SHEET ? VOTE_COLUMNS : PRESET_COLUMNS)
}

function columnValues_(sheet, column) {
  if (sheet.getLastRow() < 2) return []
  return sheet.getRange(2, column, sheet.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]) })
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON)
}
