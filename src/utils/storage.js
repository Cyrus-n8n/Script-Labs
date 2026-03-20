// ─────────────────────────────────────────────────────────
// storage.js — IndexedDB persistence for transcripts + CSV
// Survives page reloads. No size limit like localStorage.
// ─────────────────────────────────────────────────────────

const DB_NAME = 'scriptlab'
const DB_VERSION = 2
const TRANSCRIPTS_STORE = 'transcripts'
const CSV_STORE = 'csv_sessions'

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(TRANSCRIPTS_STORE)) {
        db.createObjectStore(TRANSCRIPTS_STORE, { keyPath: 'videoId' })
      }
      if (!db.objectStoreNames.contains(CSV_STORE)) {
        db.createObjectStore(CSV_STORE, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ── CSV session persistence ──────────────────────────────

// Save CSV raw text + filename
export async function saveCsvSession(fileName, csvText) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CSV_STORE, 'readwrite')
    tx.objectStore(CSV_STORE).put({
      id: 'current',
      fileName,
      csvText,
      savedAt: Date.now(),
    })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Load last CSV session → { fileName, csvText } | null
export async function loadCsvSession() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CSV_STORE, 'readonly')
    const req = tx.objectStore(CSV_STORE).get('current')
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

// Clear saved CSV session
export async function clearCsvSession() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CSV_STORE, 'readwrite')
    tx.objectStore(CSV_STORE).delete('current')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── Transcript persistence ───────────────────────────────

// Save a single transcript
export async function saveTranscript(videoId, text) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRANSCRIPTS_STORE, 'readwrite')
    tx.objectStore(TRANSCRIPTS_STORE).put({ videoId, text, savedAt: Date.now() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Save multiple transcripts at once
export async function saveTranscripts(entries) {
  if (!entries.length) return
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRANSCRIPTS_STORE, 'readwrite')
    const store = tx.objectStore(TRANSCRIPTS_STORE)
    for (const { videoId, text } of entries) {
      store.put({ videoId, text, savedAt: Date.now() })
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Get transcripts for a list of videoIds → Map<videoId, text>
export async function getTranscripts(videoIds) {
  const db = await openDB()
  const results = new Map()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRANSCRIPTS_STORE, 'readonly')
    const store = tx.objectStore(TRANSCRIPTS_STORE)

    for (const id of videoIds) {
      const req = store.get(id)
      req.onsuccess = () => {
        if (req.result) results.set(id, req.result.text)
      }
    }

    tx.oncomplete = () => resolve(results)
    tx.onerror = () => reject(tx.error)
  })
}

// Get all stored transcripts (for export)
export async function getAllTranscripts() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRANSCRIPTS_STORE, 'readonly')
    const req = tx.objectStore(TRANSCRIPTS_STORE).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// Get count of stored transcripts
export async function getTranscriptCount() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRANSCRIPTS_STORE, 'readonly')
    const req = tx.objectStore(TRANSCRIPTS_STORE).count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// Import transcripts from JSON array [{videoId, text}]
export async function importTranscripts(data) {
  const entries = data
    .filter(d => d.videoId && d.text)
    .map(d => ({ videoId: d.videoId, text: d.text }))
  await saveTranscripts(entries)
  return entries.length
}

// Clear all stored transcripts
export async function clearTranscripts() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRANSCRIPTS_STORE, 'readwrite')
    tx.objectStore(TRANSCRIPTS_STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
