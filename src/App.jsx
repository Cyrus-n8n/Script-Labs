import { useState, useCallback, useEffect } from 'react'
import { BarChart3, Table, FileText, Brain, LineChart, Settings, FlaskConical, GitBranch } from 'lucide-react'
import CsvUploader from './components/CsvUploader'
import StatsCards from './components/StatsCards'
import Charts from './components/Charts'
import VideoTable from './components/VideoTable'
import TranscriptPanel from './components/TranscriptPanel'
import LlmPanel from './components/LlmPanel'
import SettingsModal from './components/SettingsModal'
import CannibalizationPanel from './components/CannibalizationPanel'
import { parseCSV, computeStats } from './utils/metrics'
import { getTranscripts, saveTranscripts, saveCsvSession, loadCsvSession, clearCsvSession } from './utils/storage'

const TABS = [
  { id: 'metrics', label: 'Métricas', icon: BarChart3 },
  { id: 'charts', label: 'Gráficas', icon: LineChart },
  { id: 'table', label: 'Tabla', icon: Table },
  { id: 'transcripts', label: 'Transcripciones', icon: FileText },
  { id: 'llm', label: 'Análisis LLM', icon: Brain },
  { id: 'cannibalization', label: 'Canibalización', icon: GitBranch },
]

export default function App() {
  const [videos, setVideos] = useState([])
  const [activeTab, setActiveTab] = useState('metrics')
  const [annotations, setAnnotations] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [cacheHits, setCacheHits] = useState(0)
  const [csvName, setCsvName] = useState(null)
  const [restoring, setRestoring] = useState(true)

  // Process parsed CSV data: auto-select, hydrate transcripts
  const processVideos = useCallback(async (parsed) => {
    const sorted = [...parsed].sort((a, b) => b.views - a.views)
    const top10Ids = new Set(sorted.slice(0, 10).map(v => v.videoId))
    const bottom10Ids = new Set(sorted.slice(-10).map(v => v.videoId))

    const videoIds = parsed.map(v => v.videoId)
    let cached = new Map()
    try {
      cached = await getTranscripts(videoIds)
    } catch (err) {
      console.warn('Could not read transcript cache:', err)
    }

    setCacheHits(cached.size)

    return parsed.map(v => ({
      ...v,
      selected: top10Ids.has(v.videoId) || bottom10Ids.has(v.videoId),
      transcript: cached.get(v.videoId) || null,
    }))
  }, [])

  // Restore last session on mount
  useEffect(() => {
    (async () => {
      try {
        const session = await loadCsvSession()
        if (session?.csvText) {
          const parsed = await parseCSV(session.csvText)
          const withSelection = await processVideos(parsed)
          setVideos(withSelection)
          setCsvName(session.fileName)
          setActiveTab('metrics')
        }
      } catch (err) {
        console.warn('Could not restore CSV session:', err)
      } finally {
        setRestoring(false)
      }
    })()
  }, [processVideos])

  const handleFileLoaded = useCallback(async (file) => {
    try {
      // Read raw text for persistence
      const csvText = await file.text()

      const parsed = await parseCSV(csvText)
      const withSelection = await processVideos(parsed)

      // Save to IndexedDB
      try {
        await saveCsvSession(file.name, csvText)
      } catch (err) {
        console.warn('Could not save CSV session:', err)
      }

      setCsvName(file.name)
      setVideos(withSelection)
      setActiveTab('metrics')
    } catch (err) {
      console.error('Error parsing CSV:', err)
    }
  }, [processVideos])

  const toggleSelect = useCallback((videoId) => {
    setVideos(prev => prev.map(v =>
      v.videoId === videoId ? { ...v, selected: !v.selected } : v
    ))
  }, [])

  const toggleAll = useCallback(() => {
    setVideos(prev => {
      const allSelected = prev.every(v => v.selected)
      return prev.map(v => ({ ...v, selected: !allSelected }))
    })
  }, [])

  const handleTranscriptsDownloaded = useCallback(async (results) => {
    const toSave = results
      .filter(r => r.success && r.transcript)
      .map(r => ({ videoId: r.videoId, text: r.transcript }))

    if (toSave.length > 0) {
      try {
        await saveTranscripts(toSave)
      } catch (err) {
        console.warn('Could not save transcripts to cache:', err)
      }
    }

    setVideos(prev => prev.map(v => {
      const result = results.find(r => r.videoId === v.videoId)
      if (result?.success && result.transcript) {
        return { ...v, transcript: result.transcript }
      }
      return v
    }))
  }, [])

  const handleNewCsv = useCallback(async () => {
    setVideos([])
    setAnnotations(null)
    setCacheHits(0)
    setCsvName(null)
    try { await clearCsvSession() } catch {}
  }, [])

  const stats = videos.length > 0 ? computeStats(videos) : {}

  // Show loading while restoring session
  if (restoring) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="text-[var(--color-text-faint)] text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
          Cargando sesión...
        </div>
      </div>
    )
  }

  // Phase 0: no data loaded
  if (videos.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <CsvUploader onFileLoaded={handleFileLoaded} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg)]/80 backdrop-blur-md border-b border-[var(--color-border)]">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <h1
            className="text-xl font-bold text-[var(--color-text)] inline-flex items-center gap-2"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <FlaskConical size={22} className="text-[var(--color-accent)]" />
            Script Labs
          </h1>

          {/* Tab navigation */}
          <nav className="flex gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`
                  inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${activeTab === id
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
                  }
                `}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Current CSV name */}
            {csvName && (
              <span className="text-xs text-[var(--color-text-faint)] max-w-[150px] truncate" style={{ fontFamily: 'var(--font-mono)' }} title={csvName}>
                {csvName}
              </span>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 text-[var(--color-text-faint)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] rounded-lg transition-all"
              title="Ajustes"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={handleNewCsv}
              className="text-xs text-[var(--color-text-faint)] hover:text-[var(--color-text-dim)] transition-colors"
            >
              Nuevo CSV
            </button>
          </div>
        </div>
      </header>

      {/* Cache notification */}
      {cacheHits > 0 && (
        <div className="max-w-[1600px] mx-auto px-6 pt-3">
          <div className="flex items-center gap-2 text-xs text-[var(--color-green)] bg-[var(--color-green)]/10 border border-[var(--color-green)]/20 rounded-lg px-3 py-2">
            <span style={{ fontFamily: 'var(--font-mono)' }}>
              {cacheHits} transcripciones recuperadas de caché local
            </span>
            <button
              onClick={() => setCacheHits(0)}
              className="ml-auto text-[var(--color-text-faint)] hover:text-[var(--color-text-dim)]"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {activeTab === 'metrics' && (
          <div>
            <StatsCards stats={stats} />
            <Charts videos={videos} annotations={annotations} />
          </div>
        )}

        {activeTab === 'charts' && (
          <Charts videos={videos} annotations={annotations} />
        )}

        {activeTab === 'table' && (
          <VideoTable
            videos={videos}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
          />
        )}

        {activeTab === 'transcripts' && (
          <TranscriptPanel
            videos={videos}
            onTranscriptsDownloaded={handleTranscriptsDownloaded}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
          />
        )}

        {activeTab === 'llm' && (
          <LlmPanel
            videos={videos}
            onAnnotations={setAnnotations}
          />
        )}

        {activeTab === 'cannibalization' && (
          <CannibalizationPanel videos={videos} />
        )}
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
