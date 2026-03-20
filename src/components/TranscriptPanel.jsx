import { useState, useEffect } from 'react'
import { Download, AlertTriangle, CheckCircle, XCircle, Loader2, HardDrive, Upload, Trash2 } from 'lucide-react'
import { downloadTranscripts } from '../utils/transcripts'
import { getAllTranscripts, getTranscriptCount, importTranscripts, clearTranscripts } from '../utils/storage'
import VideoTable from './VideoTable'

export default function TranscriptPanel({ videos, onTranscriptsDownloaded, onToggleSelect, onToggleAll }) {
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(null)
  const [successCount, setSuccessCount] = useState(0)
  const [failCount, setFailCount] = useState(0)
  const [cachedCount, setCachedCount] = useState(0)
  const [importMsg, setImportMsg] = useState(null)
  const [lastError, setLastError] = useState(null)

  const selected = videos.filter(v => v.selected)
  const withTranscript = selected.filter(v => v.transcript)
  const pending = selected.filter(v => !v.transcript)

  // Load cache count on mount
  useEffect(() => {
    getTranscriptCount().then(setCachedCount).catch(() => {})
  }, [videos])

  const handleDownload = async () => {
    if (pending.length === 0) return

    setDownloading(true)
    setSuccessCount(0)
    setFailCount(0)
    setLastError(null)
    setProgress({ current: 0, total: pending.length })

    let successes = 0
    let fails = 0

    const results = await downloadTranscripts(pending, (p) => {
      setProgress({ current: p.current, total: p.total, videoId: p.videoId })
      if (p.success) successes++
      else {
        fails++
        setLastError(p.error || 'Error desconocido')
      }
      setSuccessCount(successes)
      setFailCount(fails)
    })

    onTranscriptsDownloaded(results)
    setDownloading(false)

    // Refresh cache count
    getTranscriptCount().then(setCachedCount).catch(() => {})
  }

  const handleExport = async () => {
    try {
      const all = await getAllTranscripts()
      const data = all.map(({ videoId, text }) => ({ videoId, text }))
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `scriptlab-transcripts-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return

      try {
        const text = await file.text()
        const data = JSON.parse(text)
        if (!Array.isArray(data)) throw new Error('El archivo debe contener un array JSON')
        const count = await importTranscripts(data)

        // Hydrate current videos with imported transcripts
        const imported = new Map(data.filter(d => d.videoId && d.text).map(d => [d.videoId, d.text]))
        const results = videos
          .filter(v => !v.transcript && imported.has(v.videoId))
          .map(v => ({ videoId: v.videoId, transcript: imported.get(v.videoId), success: true }))

        if (results.length > 0) {
          onTranscriptsDownloaded(results)
        }

        setImportMsg(`${count} transcripciones importadas, ${results.length} aplicadas a vídeos actuales`)
        getTranscriptCount().then(setCachedCount).catch(() => {})
        setTimeout(() => setImportMsg(null), 4000)
      } catch (err) {
        setImportMsg(`Error: ${err.message}`)
        setTimeout(() => setImportMsg(null), 4000)
      }
    }
    input.click()
  }

  const handleClear = async () => {
    try {
      await clearTranscripts()
      setCachedCount(0)
      setImportMsg('Caché borrada')
      setTimeout(() => setImportMsg(null), 2000)
    } catch (err) {
      console.error('Clear failed:', err)
    }
  }

  const progressPct = progress ? (progress.current / progress.total) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Control panel */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
          Descarga de transcripciones
        </h3>

        {/* Counters */}
        <div className="flex gap-6 mb-4 text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
          <span className="text-[var(--color-text-dim)]">
            Seleccionados: <span className="text-[var(--color-text)]">{selected.length}</span>
          </span>
          <span className="text-[var(--color-text-dim)]">
            Descargados: <span className="text-[var(--color-green)]">{withTranscript.length}</span>
          </span>
          <span className="text-[var(--color-text-dim)]">
            Pendientes: <span className="text-[var(--color-yellow)]">{pending.length}</span>
          </span>
        </div>

        {/* Rate limit warning */}
        <div className="flex items-center gap-2 text-xs text-[var(--color-yellow)] mb-4">
          <AlertTriangle size={14} />
          <span>RapidAPI: ~100 peticiones/mes, 6s entre cada petición</span>
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={downloading || pending.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Descargando...
            </>
          ) : (
            <>
              <Download size={16} />
              Descargar ({pending.length} pendientes)
            </>
          )}
        </button>

        {/* Progress bar */}
        {progress && (
          <div className="mt-4">
            <div className="w-full h-2 bg-[var(--color-surface-3)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-accent)] transition-all duration-300 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-[var(--color-text-dim)]" style={{ fontFamily: 'var(--font-mono)' }}>
              <span>{progress.current} / {progress.total}</span>
              <div className="flex gap-4">
                <span className="flex items-center gap-1">
                  <CheckCircle size={12} className="text-[var(--color-green)]" />
                  {successCount}
                </span>
                <span className="flex items-center gap-1">
                  <XCircle size={12} className="text-[var(--color-red)]" />
                  {failCount}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Last error detail */}
        {lastError && (
          <p className="mt-3 text-xs text-[var(--color-red)]" style={{ fontFamily: 'var(--font-mono)' }}>
            Último error: {lastError}
          </p>
        )}
      </div>

      {/* Cache management panel */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive size={16} className="text-[var(--color-text-dim)]" />
          <h3 className="text-sm font-semibold text-[var(--color-text-dim)] uppercase tracking-wider" style={{ fontFamily: 'var(--font-heading)' }}>
            Caché local
          </h3>
          <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)]" style={{ fontFamily: 'var(--font-mono)' }}>
            {cachedCount} guardadas
          </span>
        </div>

        <p className="text-xs text-[var(--color-text-faint)] mb-4">
          Las transcripciones se guardan automáticamente en IndexedDB. Al subir un CSV, se recuperan las que ya estén descargadas.
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleExport}
            disabled={cachedCount === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            Exportar JSON
          </button>
          <button
            onClick={handleImport}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-all"
          >
            <Upload size={14} />
            Importar JSON
          </button>
          <button
            onClick={handleClear}
            disabled={cachedCount === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-[var(--color-red)]/30 text-[var(--color-red)]/70 hover:text-[var(--color-red)] hover:bg-[var(--color-red)]/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 size={14} />
            Borrar caché
          </button>
        </div>

        {importMsg && (
          <p className={`mt-3 text-xs ${importMsg.startsWith('Error') ? 'text-[var(--color-red)]' : 'text-[var(--color-green)]'}`} style={{ fontFamily: 'var(--font-mono)' }}>
            {importMsg}
          </p>
        )}
      </div>

      {/* Video table with checkboxes */}
      <VideoTable
        videos={videos}
        onToggleSelect={onToggleSelect}
        onToggleAll={onToggleAll}
      />
    </div>
  )
}
