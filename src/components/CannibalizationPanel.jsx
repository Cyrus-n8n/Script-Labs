import { useState, useRef, useEffect, useMemo } from 'react'
import { GitBranch, Copy, CheckCircle, Loader2, StopCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { analyzeCannibalization, extractSaturatedConcepts, extractCannibalizationData, cancelGeneration } from '../utils/llm'
import { getProviderSettings, findModelInfo, getCostColor } from '../utils/models'

export default function CannibalizationPanel({ videos }) {
  const [analyzing, setAnalyzing] = useState(false)
  const [report, setReport] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)
  const reportRef = useRef(null)

  const settings = getProviderSettings()
  const modelInfo = findModelInfo(settings.model)

  const cannibData = useMemo(() => extractCannibalizationData(report), [report])
  const saturatedText = useMemo(() => extractSaturatedConcepts(report), [report])

  useEffect(() => {
    if (reportRef.current) {
      reportRef.current.scrollTop = reportRef.current.scrollHeight
    }
  }, [report])

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setReport('')
    setError(null)

    try {
      await analyzeCannibalization(videos, (accumulated) => {
        setReport(accumulated)
      })
    } catch (err) {
      if (err.cancelled) {
        if (err.partialContent) setReport(err.partialContent)
        setError('Análisis cancelado por el usuario')
      } else {
        setError(err.message)
      }
    } finally {
      setAnalyzing(false)
    }
  }

  const handleCancel = () => {
    cancelGeneration()
  }

  const handleCopySaturated = async () => {
    if (!saturatedText) return
    await navigator.clipboard.writeText(saturatedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Control panel */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          Análisis de canibalización
        </h3>
        <p className="text-sm text-[var(--color-text-dim)] mb-4">
          Detecta conceptos narrativos repetidos y mide la degradación de rendimiento entre ejecuciones.
        </p>

        <div className="flex gap-6 mb-4 text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
          <span className="text-[var(--color-text-dim)]">
            Vídeos en catálogo: <span className="text-[var(--color-text)]">{videos.length}</span>
          </span>
          {cannibData?.summary && (
            <>
              <span className="text-[var(--color-text-dim)]">
                En clusters: <span className="text-[var(--color-yellow)]">{cannibData.summary.duplicatedVideos}</span>
              </span>
              <span className="text-[var(--color-text-dim)]">
                Saturados: <span className="text-[var(--color-red)]">{cannibData.summary.saturatedConcepts}</span>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {analyzing ? (
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-red)] text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
            >
              <StopCircle size={16} />
              Cancelar
            </button>
          ) : (
            <button
              onClick={handleAnalyze}
              disabled={videos.length < 5}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <GitBranch size={16} />
              Analizar canibalización
            </button>
          )}

          {analyzing && (
            <Loader2 size={18} className="animate-spin text-[var(--color-accent)]" />
          )}

          {/* Model badge */}
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <span className="text-[var(--color-text-dim)]">{modelInfo?.provider || settings.provider}</span>
            <span className="text-[var(--color-text)]">{settings.model}</span>
            {modelInfo && (
              <span style={{ color: getCostColor(modelInfo.cost) }} className="font-semibold">
                x{modelInfo.cost}
              </span>
            )}
          </span>
        </div>

        {error && (
          <p className={`mt-3 text-sm ${error.includes('cancelado') ? 'text-[var(--color-yellow)]' : 'text-[var(--color-red)]'}`}>
            {error}
          </p>
        )}
      </div>

      {/* Summary cards */}
      {cannibData?.clusters?.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
            <span className="text-xs text-[var(--color-text-faint)] uppercase tracking-wider">Clusters</span>
            <p className="text-2xl font-semibold mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
              {cannibData.clusters.length}
            </p>
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
            <span className="text-xs text-[var(--color-text-faint)] uppercase tracking-wider">Saturados</span>
            <p className="text-2xl font-semibold text-[var(--color-red)] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
              {cannibData.saturatedConcepts.length}
            </p>
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
            <span className="text-xs text-[var(--color-text-faint)] uppercase tracking-wider">Disponibles</span>
            <p className="text-2xl font-semibold text-[var(--color-green)] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
              {cannibData.availableConcepts.length}
            </p>
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
            <span className="text-xs text-[var(--color-text-faint)] uppercase tracking-wider">Views perdidas est.</span>
            <p className="text-2xl font-semibold text-[var(--color-yellow)] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
              {cannibData.summary?.estimatedLostViews || '—'}
            </p>
          </div>
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-dim)] uppercase tracking-wider" style={{ fontFamily: 'var(--font-heading)' }}>
              Informe de canibalización
            </h3>
            <div className="flex items-center gap-3">
              {saturatedText && (
                <button
                  onClick={handleCopySaturated}
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--color-red)] hover:text-[var(--color-text)] transition-colors"
                >
                  {copied ? <CheckCircle size={14} className="text-[var(--color-green)]" /> : <Copy size={14} />}
                  {copied ? 'Copiado' : 'Copiar conceptos saturados'}
                </button>
              )}
            </div>
          </div>
          <div
            ref={reportRef}
            className="p-6 max-h-[70vh] overflow-y-auto report-content"
          >
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
