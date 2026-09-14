import { useId, useState } from 'react';
import type { WorkoutLog } from '../types/api';
import { formatDate, formatTime, formatWeight } from '../utils/format';

type Metric = 'weight' | 'score' | 'rpe';

interface TrendChartProps {
  /** Oldest → newest. */
  logs: WorkoutLog[];
}

const METRICS: { id: Metric; label: string; pick: (l: WorkoutLog) => number; fmt: (v: number) => string; domain?: [number, number] }[] = [
  { id: 'weight', label: 'Weight', pick: (l) => l.actualWeight, fmt: (v) => formatWeight(v) },
  { id: 'score', label: 'Session score', pick: (l) => l.sessionScore, fmt: (v) => `${Math.round(v)} / 100`, domain: [0, 100] },
  { id: 'rpe', label: 'RPE', pick: (l) => l.rpe, fmt: (v) => `RPE ${v}`, domain: [1, 10] },
];

const W = 340;
const H = 120;
const PAD_X = 14;
const PAD_TOP = 18;
const PAD_BOTTOM = 10;
const LINE = '#8FB69A';

/**
 * Single-series line over the real session history. One metric at a time
 * (toggle), one y-axis, hover tooltip per point, direct labels only on the
 * last point and the extremes.
 */
export function TrendChart({ logs }: TrendChartProps) {
  const [metric, setMetric] = useState<Metric>('weight');
  const [hover, setHover] = useState<number | null>(null);
  const gradId = useId();

  const m = METRICS.find((x) => x.id === metric)!;
  const values = logs.map(m.pick);

  if (logs.length === 0) {
    return (
      <div className="w-full h-28 bg-[#111312] border border-[#303832] rounded-xl flex items-center justify-center text-sm text-[#B8B8AD]">
        No sessions logged yet.
      </div>
    );
  }

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const [lo, hi] = m.domain ?? [dataMin - 2.5, dataMax + 2.5];
  const range = hi - lo || 1;
  const plotW = W - PAD_X * 2;
  const plotH = H - PAD_TOP - PAD_BOTTOM;

  const pts = logs.map((log, i) => ({
    x: logs.length === 1 ? W / 2 : PAD_X + (i / (logs.length - 1)) * plotW,
    y: PAD_TOP + plotH - ((values[i] - lo) / range) * plotH,
    value: values[i],
    log,
  }));
  const path = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const last = pts.length - 1;
  const maxIdx = values.indexOf(dataMax);
  const minIdx = values.indexOf(dataMin);
  const labelled = new Set([last, maxIdx, minIdx]);
  const active = hover ?? last;
  const activePt = pts[active];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5" role="tablist" aria-label="Chart metric">
        {METRICS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={metric === opt.id}
            onClick={() => {
              setMetric(opt.id);
              setHover(null);
            }}
            className={`h-8 px-3 rounded-full text-[11px] font-mono font-semibold uppercase tracking-wider border transition-all cursor-pointer ${
              metric === opt.id
                ? 'bg-[#8FB69A] text-[#111312] border-[#8FB69A] shadow-sm'
                : 'bg-[#111312] border-[#303832] text-[#B8B8AD] hover:text-[#F1EDE3] hover:bg-[#1D2520]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="w-full bg-[#111312] border border-[#303832] rounded-xl p-2 relative overflow-hidden">
        <div className="flex items-baseline justify-between px-1 pb-1 font-mono">
          <span className="text-[10px] uppercase tracking-wider text-[#B8B8AD]">
            {formatDate(activePt.log.loggedAt)} · {formatTime(activePt.log.loggedAt)}
          </span>
          <span className="text-sm font-bold text-[#F1EDE3]">{m.fmt(activePt.value)}</span>
        </div>
        <svg
          className="w-full h-auto"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${m.label} across the last ${logs.length} sessions`}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LINE} stopOpacity="0.3" />
              <stop offset="100%" stopColor={LINE} stopOpacity="0" />
            </linearGradient>
          </defs>

          {pts.length > 1 && (
            <polygon points={`${pts[0].x},${H - PAD_BOTTOM} ${path} ${pts[last].x},${H - PAD_BOTTOM}`} fill={`url(#${gradId})`} />
          )}
          {pts.length > 1 && (
            <polyline fill="none" stroke={LINE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={path} />
          )}

          {hover != null && (
            <line x1={activePt.x} x2={activePt.x} y1={PAD_TOP - 6} y2={H - PAD_BOTTOM} stroke="#8FB69A" strokeWidth="1" strokeDasharray="3 3" />
          )}

          {pts.map((p, i) => (
            <g key={p.log.id}>
              {labelled.has(i) && (
                <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="9" fontFamily="JetBrains Mono, monospace" fill="#F1EDE3" fontWeight="bold">
                  {Number.isInteger(p.value) ? p.value : p.value.toFixed(1)}
                </text>
              )}
              <circle cx={p.x} cy={p.y} r={i === active ? 5 : 4} fill={i === last ? '#A8D1B1' : LINE} stroke="#111312" strokeWidth="2" />
              {/* enlarged hit target */}
              <rect
                x={p.x - Math.max(8, plotW / logs.length / 2)}
                y={0}
                width={Math.max(16, plotW / logs.length)}
                height={H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onTouchStart={() => setHover(i)}
              />
            </g>
          ))}
        </svg>
        <div className="flex justify-between px-1 pt-1 font-mono text-[10px] text-[#B8B8AD]">
          <span>{formatDate(logs[0].loggedAt)}</span>
          {logs.length > 1 && <span className="text-emerald-400 font-semibold">{formatDate(logs[last].loggedAt)}</span>}
        </div>
      </div>
    </div>
  );
}
