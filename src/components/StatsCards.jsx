import { BarChart3, Eye, TrendingUp, Clock, MousePointerClick, DollarSign, Users, Activity } from 'lucide-react'
import { formatNumber, formatCurrency, formatPercent } from '../utils/metrics'

const cards = [
  { key: 'totalVideos', label: 'Total vídeos', icon: BarChart3, format: v => v },
  { key: 'totalViews', label: 'Vistas totales', icon: Eye, format: formatNumber },
  { key: 'avgAdv', label: 'ADV medio', icon: TrendingUp, format: v => formatNumber(v) },
  { key: 'avgRetention', label: 'Retención media', icon: Clock, format: formatPercent },
  { key: 'avgCtr', label: 'CTR medio', icon: MousePointerClick, format: formatPercent },
  { key: 'totalRevenue', label: 'Ingresos totales', icon: DollarSign, format: formatCurrency },
  { key: 'totalSubscribers', label: 'Suscriptores ganados', icon: Users, format: formatNumber },
  { key: 'medianViews', label: 'Mediana de vistas', icon: Activity, format: formatNumber },
]

export default function StatsCards({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {cards.map(({ key, label, icon: Icon, format }) => (
        <div
          key={key}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col gap-2"
        >
          <div className="flex items-center gap-2 text-[var(--color-text-dim)]">
            <Icon size={16} />
            <span className="text-xs uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
              {label}
            </span>
          </div>
          <span
            className="text-2xl font-semibold text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {stats[key] != null ? format(stats[key]) : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}
