import { useState, useCallback } from 'react'
import { BarChart3, Table, FileText, Brain, LineChart, Settings } from 'lucide-react'
import CsvUploader from './components/CsvUploader'
import StatsCards from './components/StatsCards'
import Charts from './components/Charts'
import VideoTable from './components/VideoTable'
import TranscriptPanel from './components/TranscriptPanel'
import LlmPanel from './components/LlmPanel'
import SettingsModal from './components/SettingsModal'
import { parseCSV, computeStats } from './utils/metrics'

const TABS = [
  { id: 'metrics', label: 'Métricas', icon: BarChart3 },
  { id: 'charts', label: 'Gráficas', icon: LineChart },
  { id: 'table', label: 'Tabla', icon: Table },
  { id: 'transcripts', label: 'Transcripciones', icon: FileText },
  { id: 'llm', label: 'Análisis LLM', icon: Brain },
]

export default function App() {
  const [videos, setVideos] = useState([])
  const [activeTab, setActiveTab] = useState('metrics')
  const [annotations, setAnnotations] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleFileLoaded = useCallback(async (file) => {
    try {
      const parsed = await parseCSV(file)

      // Auto-select top 10 + bottom 10 by views
      const sorted = [...parsed].sort((a, b) => b.views - a.views)
      const top10Ids = new Set(sorted.slice(0, 10).map(v => v.videoId))
      const bottom10Ids = new Set(sorted.slice(-10).map(v => v.videoId))

      const withSelection = parsed.map(v => ({
        ...v,
        selected: top10Ids.has(v.videoId) || bottom10Ids.has(v.videoId),
      }))

      setVideos(withSelection)
      setActiveTab('metrics')
    } catch (err) {
      console.error('Error parsing CSV:', err)
    }
  }, [])

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

  const handleTranscriptsDownloaded = useCallback((results) => {
    setVideos(prev => prev.map(v => {
      const result = results.find(r => r.videoId === v.videoId)
      if (result?.success && result.transcript) {
        return { ...v, transcript: result.transcript }
      }
      return v
    }))
  }, [])

  const stats = videos.length > 0 ? computeStats(videos) : {}

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
            className="text-xl font-bold text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Script Lab
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
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 text-[var(--color-text-faint)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] rounded-lg transition-all"
              title="Ajustes"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={() => { setVideos([]); setAnnotations(null) }}
              className="text-xs text-[var(--color-text-faint)] hover:text-[var(--color-text-dim)] transition-colors"
            >
              Nuevo CSV
            </button>
          </div>
        </div>
      </header>

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
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
