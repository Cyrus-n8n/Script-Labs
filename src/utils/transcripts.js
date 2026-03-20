const DELAY_MS = 6000

function extractText(data) {
  // Array of objects with "text" field
  if (Array.isArray(data)) {
    return data.map(item => item.text || '').join(' ').trim()
  }

  if (data && typeof data === 'object') {
    // Object with "transcript" field
    if (data.transcript) {
      if (typeof data.transcript === 'string') return data.transcript.trim()
      if (Array.isArray(data.transcript)) {
        return data.transcript.map(item =>
          typeof item === 'string' ? item : (item.text || '')
        ).join(' ').trim()
      }
    }
    // Object with "text" field
    if (typeof data.text === 'string') return data.text.trim()
  }

  return null
}

async function fetchTranscript(videoId, lang) {
  const res = await fetch(`/api/transcript/api/transcript?videoId=${videoId}&lang=${lang}`)
  if (!res.ok) {
    let detail = ''
    try { detail = await res.text() } catch {}
    throw new Error(`HTTP ${res.status}${detail ? ': ' + detail.slice(0, 200) : ''}`)
  }
  const data = await res.json()
  const text = extractText(data)
  if (!text) throw new Error('No transcript text found in response')
  return text
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Download transcripts sequentially with delay
// onProgress({ current, total, videoId, success, error })
export async function downloadTranscripts(videos, onProgress) {
  const results = []

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i]

    // Skip if already has transcript
    if (video.transcript) {
      results.push({ videoId: video.videoId, transcript: video.transcript, success: true })
      onProgress({ current: i + 1, total: videos.length, videoId: video.videoId, success: true })
      continue
    }

    try {
      const text = await fetchTranscript(video.videoId, 'en')
      results.push({ videoId: video.videoId, transcript: text, success: true })
      onProgress({ current: i + 1, total: videos.length, videoId: video.videoId, success: true })
    } catch {
      try {
        const text = await fetchTranscript(video.videoId, 'es')
        results.push({ videoId: video.videoId, transcript: text, success: true })
        onProgress({ current: i + 1, total: videos.length, videoId: video.videoId, success: true })
      } catch (err2) {
        results.push({ videoId: video.videoId, transcript: null, success: false, error: err2.message })
        onProgress({ current: i + 1, total: videos.length, videoId: video.videoId, success: false, error: err2.message })
      }
    }

    // Wait between requests (except after last)
    if (i < videos.length - 1) {
      await sleep(DELAY_MS)
    }
  }

  return results
}
