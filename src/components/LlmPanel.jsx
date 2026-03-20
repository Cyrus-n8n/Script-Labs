import { useState, useRef, useEffect } from 'react'
import { Brain, Copy, CheckCircle, Loader2, StopCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { analyzeWithLLM, extractAnnotations, cancelGeneration } from '../utils/llm'
import { getProviderSettings, findModelInfo, getCostColor } from '../utils/models'

export default function LlmPanel({ videos, onAnnotations }) {
  const [analyzing, setAnalyzing] = useState(false)
  const [report, setReport] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)
  const reportRef = useRef(null)

  const settings = getProviderSettings()
  const modelInfo = findModelInfo(settings.model)

  const withMetrics = videos.filter(v => v.views > 0)
  const withTranscript = videos.filter(v => v.transcript)

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
      const fullText = await analyzeWithLLM(videos, (accumulated) => {
        setReport(accumulated)
      })

      // Extract annotations from completed report
      const annotations = extractAnnotations(fullText)
      if (annotations.length > 0) {
        onAnnotations(annotations)
      }
    } catch (err) {
      if (err.cancelled) {
        // Keep partial content on cancel
        if (err.partialContent) {
          setReport(err.partialContent)
        }
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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(report)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Control panel */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
          Análisis con LLM
        </h3>

        {/* Stats */}
        <div className="flex gap-6 mb-4 text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
          <span className="text-[var(--color-text-dim)]">
            Con métricas: <span className="text-[var(--color-text)]">{withMetrics.length}</span>
          </span>
          <span className="text-[var(--color-text-dim)]">
            Con transcripción: <span className="text-[var(--color-green)]">{withTranscript.length}</span>
          </span>
        </div>

        {/* Analyze / Cancel buttons + model badge */}
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
              disabled={withMetrics.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Brain size={16} />
              Analizar
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

      {/* Report */}
      {report && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-dim)] uppercase tracking-wider" style={{ fontFamily: 'var(--font-heading)' }}>
              Informe
            </h3>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors"
            >
              {copied ? <CheckCircle size={14} className="text-[var(--color-green)]" /> : <Copy size={14} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
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
