import { useState, useEffect } from 'react'
import { X, Eye, EyeOff } from 'lucide-react'
import { MODEL_GROUPS, getProviderSettings, saveSettings, getCostColor } from '../utils/models'

export default function SettingsModal({ open, onClose }) {
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    if (open) {
      const s = getProviderSettings()
      setApiKey(s.apiKey)
      setModel(s.model)
    }
  }, [open])

  const handleSave = () => {
    saveSettings({ apiKey, model })
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-full max-w-lg p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            Ajustes
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* API Key */}
        <div className="mb-5">
          <label className="block text-sm text-[var(--color-text-dim)] mb-2">API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 pr-10 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)] hover:text-[var(--color-text)] transition-colors"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Model selector */}
        <div className="mb-6">
          <label className="block text-sm text-[var(--color-text-dim)] mb-2">Modelo</label>
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] appearance-none cursor-pointer"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {MODEL_GROUPS.map(group => (
              <optgroup key={group.provider} label={group.provider}>
                {group.models.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.id} — x{m.cost}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {/* Visual model list with colored costs */}
          <div className="mt-3 max-h-52 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]">
            {MODEL_GROUPS.map(group => (
              <div key={group.provider}>
                <div className="px-3 py-1.5 text-xs font-semibold text-[var(--color-text-faint)] uppercase tracking-wider bg-[var(--color-surface-3)] sticky top-0">
                  {group.provider}
                </div>
                {group.models.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setModel(m.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[var(--color-surface-3)] transition-colors ${model === m.id ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'text-[var(--color-text)]'}`}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{m.id}</span>
                    <span
                      className="text-xs font-semibold"
                      style={{ fontFamily: 'var(--font-mono)', color: getCostColor(m.cost) }}
                    >
                      x{m.cost}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-[var(--color-accent)] text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
