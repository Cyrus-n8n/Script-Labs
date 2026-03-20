import { useState, useMemo } from 'react'
import { ArrowUpDown, ExternalLink, Circle } from 'lucide-react'
import { formatNumber, formatCurrency, formatPercent, formatDuration } from '../utils/metrics'

const columns = [
  { key: 'title', label: 'Título', sortable: true },
  { key: 'views', label: 'Vistas', sortable: true, format: formatNumber, mono: true },
  { key: 'adv', label: 'ADV', sortable: true, format: v => v.toFixed(1), mono: true },
  { key: 'retention', label: 'Ret. %', sortable: true, mono: true },
  { key: 'ctr', label: 'CTR %', sortable: true, format: formatPercent, mono: true },
  { key: 'duration', label: 'Duración', sortable: true, format: formatDuration, mono: true },
  { key: 'rpm', label: 'RPM', sortable: true, format: v => '$' + v.toFixed(2), mono: true },
  { key: 'vph', label: 'VPH', sortable: true, format: v => v.toFixed(2), mono: true },
  { key: 'impressionEfficiency', label: 'Ef. Impr.', sortable: true, format: formatPercent, mono: true },
  { key: 'impressions', label: 'Impresiones', sortable: true, format: formatNumber, mono: true },
  { key: 'revenue', label: 'Ingresos', sortable: true, format: formatCurrency, mono: true },
  { key: 'transcript', label: '📝', sortable: false },
]

export default function VideoTable({ videos, onToggleSelect, onToggleAll }) {
  const [sortKey, setSortKey] = useState('views')
  const [sortDir, setSortDir] = useState('desc')

  const avgRetention = useMemo(() => {
    if (!videos.length) return 0
    return videos.reduce((s, v) => s + v.retention, 0) / videos.length
  }, [videos])

  const sorted = useMemo(() => {
    return [...videos].sort((a, b) => {
      let va = a[sortKey]
      let vb = b[sortKey]
      if (sortKey === 'title') {
        va = (va || '').toLowerCase()
        vb = (vb || '').toLowerCase()
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }
      if (typeof va === 'string') va = 0
      if (typeof vb === 'string') vb = 0
      return sortDir === 'asc' ? va - vb : vb - va
    })
  }, [videos, sortKey, sortDir])

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const allSelected = videos.length > 0 && videos.every(v => v.selected)

  function getRetentionColor(ret) {
    if (ret >= avgRetention * 1.2) return 'text-[var(--color-green)]'
    if (ret >= avgRetention * 0.9) return 'text-[var(--color-yellow)]'
    return 'text-[var(--color-red)]'
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--color-surface-2)]">
            <th className="p-3 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onToggleAll()}
                className="accent-[var(--color-accent)] w-4 h-4"
              />
            </th>
            {columns.map(col => (
              <th
                key={col.key}
                className={`p-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-dim)] whitespace-nowrap ${col.sortable ? 'cursor-pointer hover:text-[var(--color-text)] select-none' : ''}`}
                style={{ fontFamily: 'var(--font-heading)' }}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <ArrowUpDown size={12} className="text-[var(--color-accent)]" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((video) => (
            <tr
              key={video.videoId}
              className={`border-t border-[var(--color-border)] hover:bg-[var(--color-surface-2)] transition-colors ${video.selected ? 'bg-[var(--color-accent)]/5' : ''}`}
            >
              <td className="p-3">
                <input
                  type="checkbox"
                  checked={video.selected}
                  onChange={() => onToggleSelect(video.videoId)}
                  className="accent-[var(--color-accent)] w-4 h-4"
                />
              </td>
              {/* Title */}
              <td className="p-3 max-w-[250px]">
                <a
                  href={`https://www.youtube.com/watch?v=${video.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors inline-flex items-center gap-1 group"
                >
                  <span className="truncate block max-w-[220px]" title={video.title}>
                    {video.title}
                  </span>
                  <ExternalLink size={12} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </td>
              {/* Views */}
              <td className="p-3" style={{ fontFamily: 'var(--font-mono)' }}>{formatNumber(video.views)}</td>
              {/* ADV */}
              <td className="p-3" style={{ fontFamily: 'var(--font-mono)' }}>{video.adv.toFixed(1)}</td>
              {/* Retention */}
              <td className={`p-3 ${getRetentionColor(video.retention)}`} style={{ fontFamily: 'var(--font-mono)' }}>
                {video.retention.toFixed(1)}%
              </td>
              {/* CTR */}
              <td className="p-3" style={{ fontFamily: 'var(--font-mono)' }}>{formatPercent(video.ctr)}</td>
              {/* Duration */}
              <td className="p-3" style={{ fontFamily: 'var(--font-mono)' }}>{formatDuration(video.duration)}</td>
              {/* RPM */}
              <td className="p-3" style={{ fontFamily: 'var(--font-mono)' }}>${video.rpm.toFixed(2)}</td>
              {/* VPH */}
              <td className="p-3" style={{ fontFamily: 'var(--font-mono)' }}>{video.vph.toFixed(2)}</td>
              {/* Impression Efficiency */}
              <td className="p-3" style={{ fontFamily: 'var(--font-mono)' }}>{formatPercent(video.impressionEfficiency)}</td>
              {/* Impressions */}
              <td className="p-3" style={{ fontFamily: 'var(--font-mono)' }}>{formatNumber(video.impressions)}</td>
              {/* Revenue */}
              <td className="p-3" style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(video.revenue)}</td>
              {/* Transcript indicator */}
              <td className="p-3 text-center">
                <Circle
                  size={10}
                  fill={video.transcript ? 'var(--color-green)' : 'transparent'}
                  stroke={video.transcript ? 'var(--color-green)' : 'var(--color-text-faint)'}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
