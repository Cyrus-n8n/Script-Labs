import { useMemo } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line, ReferenceLine, Legend, Cell, ZAxis, ComposedChart
} from 'recharts'
import { computeStats } from '../utils/metrics'

const COLORS = {
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#eab308',
  cyan: '#06b6d4',
  accent: '#6366f1',
  textDim: '#8888a0',
  border: '#2a2a3d',
  surface: '#12121a',
  surface2: '#1a1a26',
}

function ChartCard({ title, children, fullWidth = false }) {
  return (
    <div className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 ${fullWidth ? 'col-span-2' : ''}`}>
      <h3 className="text-sm font-semibold text-[var(--color-text-dim)] uppercase tracking-wider mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg p-3 text-sm max-w-xs">
      <p className="font-medium text-[var(--color-text)] mb-1 truncate">{d.title}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[var(--color-text-dim)]">
          {p.name}: <span style={{ fontFamily: 'var(--font-mono)', color: p.color || 'var(--color-text)' }}>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </p>
      ))}
    </div>
  )
}

// Chart 1: ADV vs Retention scatter
function AdvRetentionChart({ videos, annotations }) {
  const stats = useMemo(() => computeStats(videos), [videos])
  const annotationMap = useMemo(() => {
    const m = {}
    if (annotations) annotations.forEach(a => { m[a.videoId] = a })
    return m
  }, [annotations])

  const data = videos.map(v => ({
    x: v.adv,
    y: v.retention,
    z: v.impressions,
    title: v.title,
    videoId: v.videoId,
  }))

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
        <XAxis type="number" dataKey="x" name="ADV" stroke={COLORS.textDim} tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} label={{ value: 'ADV', position: 'bottom', fill: COLORS.textDim, fontSize: 12 }} />
        <YAxis type="number" dataKey="y" name="Retención %" stroke={COLORS.textDim} tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} label={{ value: 'Retención %', angle: -90, position: 'insideLeft', fill: COLORS.textDim, fontSize: 12 }} />
        <ZAxis type="number" dataKey="z" range={[40, 400]} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine x={stats.avgAdv} stroke={COLORS.accent} strokeDasharray="5 5" />
        <ReferenceLine y={stats.avgRetention} stroke={COLORS.accent} strokeDasharray="5 5" />
        <Scatter data={data}>
          {data.map((entry, i) => {
            const a = annotationMap[entry.videoId]
            let fill = COLORS.accent
            if (a) {
              if (a.type === 'positive') fill = COLORS.green
              else if (a.type === 'negative') fill = COLORS.red
            }
            return <Cell key={i} fill={fill} fillOpacity={0.8} />
          })}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}

// Chart 2: CTR vs Retention quadrants
function CtrRetentionChart({ videos }) {
  const stats = useMemo(() => computeStats(videos), [videos])

  const data = videos.map(v => {
    const highCtr = v.ctr >= stats.avgCtr
    const highRet = v.retention >= stats.avgRetention
    let quadrant
    if (highCtr && highRet) quadrant = 'ideal'
    else if (highCtr && !highRet) quadrant = 'clickbait'
    else if (!highCtr && highRet) quadrant = 'hidden'
    else quadrant = 'problem'

    return { x: v.ctr, y: v.retention, title: v.title, quadrant }
  })

  const quadrantColors = { ideal: COLORS.green, clickbait: COLORS.yellow, hidden: COLORS.cyan, problem: COLORS.red }
  const quadrantLabels = { ideal: 'Alto CTR + Alta Ret.', clickbait: 'Alto CTR + Baja Ret.', hidden: 'Bajo CTR + Alta Ret.', problem: 'Bajo CTR + Baja Ret.' }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
        <XAxis type="number" dataKey="x" name="CTR %" stroke={COLORS.textDim} tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} label={{ value: 'CTR %', position: 'bottom', fill: COLORS.textDim, fontSize: 12 }} />
        <YAxis type="number" dataKey="y" name="Retención %" stroke={COLORS.textDim} tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} label={{ value: 'Retención %', angle: -90, position: 'insideLeft', fill: COLORS.textDim, fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine x={stats.avgCtr} stroke={COLORS.accent} strokeDasharray="5 5" />
        <ReferenceLine y={stats.avgRetention} stroke={COLORS.accent} strokeDasharray="5 5" />
        <Legend
          payload={Object.entries(quadrantLabels).map(([key, label]) => ({
            value: label, type: 'circle', color: quadrantColors[key],
          }))}
        />
        <Scatter data={data}>
          {data.map((entry, i) => (
            <Cell key={i} fill={quadrantColors[entry.quadrant]} fillOpacity={0.8} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}

// Chart 3: Top/Bottom 12 by retention (horizontal bars)
function RetentionRankChart({ videos }) {
  const stats = useMemo(() => computeStats(videos), [videos])
  const sorted = useMemo(() => [...videos].sort((a, b) => b.retention - a.retention), [videos])

  const top12 = sorted.slice(0, 12)
  const bottom12 = sorted.slice(-12).reverse()

  const data = [
    ...top12.map(v => ({ title: v.title.length > 40 ? v.title.slice(0, 40) + '…' : v.title, retention: v.retention, type: 'top', fullTitle: v.title })),
    ...bottom12.map(v => ({ title: v.title.length > 40 ? v.title.slice(0, 40) + '…' : v.title, retention: v.retention, type: 'bottom', fullTitle: v.title })),
  ]

  return (
    <ResponsiveContainer width="100%" height={600}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, bottom: 10, left: 200 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} horizontal={false} />
        <XAxis type="number" stroke={COLORS.textDim} tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} />
        <YAxis type="category" dataKey="title" stroke={COLORS.textDim} tick={{ fontSize: 10, fontFamily: 'var(--font-body)' }} width={190} />
        <Tooltip content={({ active, payload }) => {
          if (!active || !payload?.length) return null
          const d = payload[0].payload
          return (
            <div className="bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg p-3 text-sm max-w-xs">
              <p className="font-medium text-[var(--color-text)] mb-1">{d.fullTitle}</p>
              <p style={{ fontFamily: 'var(--font-mono)' }}>Retención: {d.retention.toFixed(1)}%</p>
            </div>
          )
        }} />
        <ReferenceLine x={stats.avgRetention} stroke={COLORS.accent} strokeDasharray="5 5" label={{ value: 'Media', fill: COLORS.accent, fontSize: 11 }} />
        <Bar dataKey="retention" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.type === 'top' ? COLORS.green : COLORS.red} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Chart 4: Timeline ADV + CTR
function TimelineChart({ videos }) {
  const data = useMemo(() => {
    return [...videos]
      .filter(v => v.pubDateObj)
      .sort((a, b) => a.pubDateObj - b.pubDateObj)
      .map(v => ({
        date: v.pubDateObj.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        adv: v.adv,
        ctr: v.ctr,
        title: v.title,
      }))
  }, [videos])

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={data} margin={{ top: 10, right: 50, bottom: 20, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
        <XAxis dataKey="date" stroke={COLORS.textDim} tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} />
        <YAxis yAxisId="left" stroke={COLORS.accent} tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} label={{ value: 'ADV', angle: -90, position: 'insideLeft', fill: COLORS.accent, fontSize: 12 }} />
        <YAxis yAxisId="right" orientation="right" stroke={COLORS.cyan} tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} label={{ value: 'CTR %', angle: 90, position: 'insideRight', fill: COLORS.cyan, fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="adv" stroke={COLORS.accent} name="ADV" dot={{ r: 3 }} />
        <Line yAxisId="right" type="monotone" dataKey="ctr" stroke={COLORS.cyan} name="CTR %" dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// Chart 5: Duration vs Retention grouped bars
function DurationRetentionChart({ videos }) {
  const ranges = [
    { label: '<15min', min: 0, max: 900 },
    { label: '15-25min', min: 900, max: 1500 },
    { label: '25-35min', min: 1500, max: 2100 },
    { label: '35-45min', min: 2100, max: 2700 },
    { label: '45-55min', min: 2700, max: 3300 },
    { label: '>55min', min: 3300, max: Infinity },
  ]

  const data = useMemo(() => {
    return ranges.map(r => {
      const group = videos.filter(v => v.duration >= r.min && v.duration < r.max)
      return {
        range: r.label,
        retention: group.length ? group.reduce((s, v) => s + v.retention, 0) / group.length : 0,
        adv: group.length ? group.reduce((s, v) => s + v.adv, 0) / group.length : 0,
        count: group.length,
      }
    })
  }, [videos])

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
        <XAxis dataKey="range" stroke={COLORS.textDim} tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} />
        <YAxis yAxisId="left" stroke={COLORS.green} tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} label={{ value: 'Retención %', angle: -90, position: 'insideLeft', fill: COLORS.green, fontSize: 12 }} />
        <YAxis yAxisId="right" orientation="right" stroke={COLORS.accent} tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} label={{ value: 'ADV', angle: 90, position: 'insideRight', fill: COLORS.accent, fontSize: 12 }} />
        <Tooltip content={({ active, payload }) => {
          if (!active || !payload?.length) return null
          const d = payload[0].payload
          return (
            <div className="bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg p-3 text-sm">
              <p className="font-medium text-[var(--color-text)] mb-1">{d.range} ({d.count} vídeos)</p>
              <p style={{ fontFamily: 'var(--font-mono)' }}>Retención: {d.retention.toFixed(1)}%</p>
              <p style={{ fontFamily: 'var(--font-mono)' }}>ADV: {d.adv.toFixed(1)}</p>
            </div>
          )
        }} />
        <Legend />
        <Bar yAxisId="left" dataKey="retention" name="Retención %" fill={COLORS.green} fillOpacity={0.8} radius={[4, 4, 0, 0]} />
        <Bar yAxisId="right" dataKey="adv" name="ADV" fill={COLORS.accent} fillOpacity={0.8} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function Charts({ videos, annotations }) {
  if (!videos.length) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ChartCard title="ADV vs Retención estimada">
        <AdvRetentionChart videos={videos} annotations={annotations} />
      </ChartCard>
      <ChartCard title="CTR vs Retención (cuadrantes)">
        <CtrRetentionChart videos={videos} />
      </ChartCard>
      <ChartCard title="Top 12 vs Bottom 12 por retención" fullWidth>
        <RetentionRankChart videos={videos} />
      </ChartCard>
      <ChartCard title="ADV + CTR por fecha de publicación">
        <TimelineChart videos={videos} />
      </ChartCard>
      <ChartCard title="Duración vs Retención">
        <DurationRetentionChart videos={videos} />
      </ChartCard>
    </div>
  )
}
