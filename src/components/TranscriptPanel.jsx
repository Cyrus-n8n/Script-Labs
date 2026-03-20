import { useState } from 'react'
import { Download, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { downloadTranscripts } from '../utils/transcripts'
import VideoTable from './VideoTable'

export default function TranscriptPanel({ videos, onTranscriptsDownloaded, onToggleSelect, onToggleAll }) {
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(null)
  const [successCount, setSuccessCount] = useState(0)
  const [failCount, setFailCount] = useState(0)

  const selected = videos.filter(v => v.selected)
  const withTranscript = selected.filter(v => v.transcript)
  const pending = selected.filter(v => !v.transcript)

  const handleDownload = async () => {
    if (pending.length === 0) return

    setDownloading(true)
    setSuccessCount(0)
    setFailCount(0)
    setProgress({ current: 0, total: pending.length })

    let successes = 0
    let fails = 0

    const results = await downloadTranscripts(pending, (p) => {
      setProgress({ current: p.current, total: p.total, videoId: p.videoId })
      if (p.success) successes++
      else fails++
      setSuccessCount(successes)
      setFailCount(fails)
    })

    onTranscriptsDownloaded(results)
    setDownloading(false)
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
