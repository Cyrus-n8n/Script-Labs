import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, FlaskConical } from 'lucide-react'

export default function CsvUploader({ onFileLoaded }) {
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState(null)

  const handleFile = useCallback((file) => {
    if (!file) return
    setFileName(file.name)
    onFileLoaded(file)
  }, [onFileLoaded])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }, [handleFile])

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback(() => setDragging(false), [])

  const onInputChange = useCallback((e) => {
    handleFile(e.target.files[0])
  }, [handleFile])

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 inline-flex items-center gap-3" style={{ fontFamily: 'var(--font-heading)' }}>
          <FlaskConical size={36} className="text-[var(--color-accent)]" />
          Script Labs
        </h1>
        <p className="text-[var(--color-text-dim)] text-lg">
          Análisis de retención y guiones de YouTube
        </p>
      </div>

      <label
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`
          relative flex flex-col items-center justify-center w-full max-w-xl h-64
          rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200
          ${dragging
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
            : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-surface-2)]'
          }
        `}
      >
        <input
          type="file"
          accept=".csv"
          onChange={onInputChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />

        {fileName ? (
          <>
            <FileSpreadsheet size={48} className="text-[var(--color-green)] mb-4" />
            <p className="text-lg font-medium text-[var(--color-text)]">{fileName}</p>
            <p className="text-sm text-[var(--color-text-dim)] mt-1">Procesando...</p>
          </>
        ) : (
          <>
            <Upload size={48} className="text-[var(--color-text-faint)] mb-4" />
            <p className="text-lg font-medium text-[var(--color-text-dim)]">
              Arrastra tu CSV de YouTube Studio
            </p>
            <p className="text-sm text-[var(--color-text-faint)] mt-2">
              o haz clic para seleccionar archivo
            </p>
          </>
        )}
      </label>
    </div>
  )
}
