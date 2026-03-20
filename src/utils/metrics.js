import Papa from 'papaparse'

// Parse Spanish number format: 1.234,56 → 1234.56
export function parseSpanishNumber(str) {
  if (str == null || str === '') return 0
  const s = String(str).trim()
  // Remove thousand separators (dots), then replace decimal comma with dot
  const cleaned = s.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

// Parse date like "Feb 20, 2026"
export function parseDate(str) {
  if (!str) return null
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

// Days since publication
export function daysSince(dateStr) {
  const d = parseDate(dateStr)
  if (!d) return 1
  const now = new Date()
  const diff = Math.max(1, Math.floor((now - d) / (1000 * 60 * 60 * 24)))
  return diff
}

// Format seconds as MM:SS
export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// Format large numbers: 1234567 → 1.23M, 12345 → 12.3K
export function formatNumber(n) {
  if (n == null) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString('es-ES', { maximumFractionDigits: 1 })
}

export function formatCurrency(n) {
  if (n == null) return '—'
  return '$' + n.toFixed(2)
}

export function formatPercent(n) {
  if (n == null) return '—'
  return n.toFixed(1) + '%'
}

// Parse CSV and compute all metrics
export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        try {
          const videos = results.data
            .filter(row => {
              const content = (row['Contenido'] || '').trim()
              return content !== '' && content.toLowerCase() !== 'total'
            })
            .map(row => {
              const videoId = (row['Contenido'] || '').trim()
              const title = (row['Título del vídeo'] || '').trim()
              const pubDate = (row['Hora de publicación del vídeo'] || '').trim()
              const duration = parseSpanishNumber(row['Duración'])
              const views = parseSpanishNumber(row['Visualizaciones'])
              const watchTimeHours = parseSpanishNumber(row['Tiempo de visualización (horas)'])
              const subscribers = parseSpanishNumber(row['Suscriptores'])
              const revenue = parseSpanishNumber(row['Ingresos estimados (USD)'])
              const impressions = parseSpanishNumber(row['Impresiones'])
              const ctr = parseSpanishNumber(row['Porcentaje de clics de las impresiones (%)'])

              const days = daysSince(pubDate)
              const adv = views / days
              const retention = duration > 0 && views > 0
                ? ((watchTimeHours * 3600) / (views * duration)) * 100
                : 0
              const rpm = views > 0 ? revenue / (views / 1000) : 0
              const vph = views / (days * 24)
              const impressionEfficiency = impressions > 0 ? (views / impressions) * 100 : 0

              return {
                videoId,
                title,
                pubDate,
                pubDateObj: parseDate(pubDate),
                duration,
                views,
                watchTimeHours,
                subscribers,
                revenue,
                impressions,
                ctr,
                days,
                adv,
                retention,
                rpm,
                vph,
                impressionEfficiency,
                transcript: null,
                selected: false,
              }
            })

          resolve(videos)
        } catch (e) {
          reject(e)
        }
      },
      error: reject,
    })
  })
}

// Compute summary stats
export function computeStats(videos) {
  if (!videos.length) return {}

  const totalVideos = videos.length
  const totalViews = videos.reduce((s, v) => s + v.views, 0)
  const avgAdv = videos.reduce((s, v) => s + v.adv, 0) / totalVideos
  const avgRetention = videos.reduce((s, v) => s + v.retention, 0) / totalVideos
  const avgCtr = videos.reduce((s, v) => s + v.ctr, 0) / totalVideos
  const totalRevenue = videos.reduce((s, v) => s + v.revenue, 0)
  const totalSubscribers = videos.reduce((s, v) => s + v.subscribers, 0)

  const sortedViews = [...videos].sort((a, b) => a.views - b.views)
  const mid = Math.floor(sortedViews.length / 2)
  const medianViews = sortedViews.length % 2 === 0
    ? (sortedViews[mid - 1].views + sortedViews[mid].views) / 2
    : sortedViews[mid].views

  return {
    totalVideos,
    totalViews,
    avgAdv,
    avgRetention,
    avgCtr,
    totalRevenue,
    totalSubscribers,
    medianViews,
  }
}
