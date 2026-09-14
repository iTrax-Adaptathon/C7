import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type { Recommendation } from '../types/api';
import { decisionTheme, trendGlyph, trendLabel, weightDelta } from '../utils/decision';
import { formatPrescription } from '../utils/format';
import { DecisionBadge } from './DecisionBadge';

interface AdaptationResultModalProps {
  exerciseName: string;
  recommendation: Recommendation;
  onDismiss: () => void;
}

/** The backend's fresh recommendation after POST /logs — shown verbatim. */
export function AdaptationResultModal({ exerciseName, recommendation: r, onDismiss }: AdaptationResultModalProps) {
  const theme = decisionTheme(r.decision);
  const delta = weightDelta(r.previous.weight, r.next.weight);

  return (
    <div
      className="fixed md:absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adaptation-result-title"
    >
      <div className="w-full max-w-md max-h-full overflow-y-auto no-scrollbar rounded-3xl bg-[#101419] border border-slate-800 shadow-2xl">
        <div className="h-1.5 w-full" style={{ backgroundColor: theme.accent }} aria-hidden />

        <div className="p-5 flex flex-col gap-5">
          <div className="flex items-center gap-2 text-[#4edea3] text-xs font-bold uppercase tracking-wider font-mono">
            <CheckCircle2 size={16} className="stroke-[2.5]" />
            Session logged · {exerciseName}
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <DecisionBadge decision={r.decision} size="lg" />
            <h2 id="adaptation-result-title" className={`text-4xl font-black tracking-tight ${theme.text}`}>
              {r.decision}
            </h2>
          </div>

          <div className="rounded-2xl bg-[#181d26] border border-slate-800/80 p-4 flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Previous</span>
                <span className="font-mono text-base font-semibold text-slate-300 whitespace-nowrap">{formatPrescription(r.previous)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  <ArrowRight size={12} className="text-slate-600" />
                  Next session
                </span>
                <span className="flex items-baseline gap-2 whitespace-nowrap">
                  {delta && <span className={`font-mono text-[11px] font-bold ${theme.text}`}>{delta}</span>}
                  <span className={`font-mono text-2xl font-black ${theme.text}`}>{formatPrescription(r.next)}</span>
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
                <span>
                  Confidence <span className="text-white font-bold">{r.confidence}%</span>
                </span>
                <span>
                  {trendGlyph(r.trendDirection)} {trendLabel(r.trendDirection)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#11151c] border border-slate-800 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${r.confidence}%`, backgroundColor: theme.accent }} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#181d26] border border-slate-800/80 p-4 flex flex-col gap-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Why</div>
            <p className="text-sm leading-relaxed text-slate-200">{r.explanation}</p>
            <div className="font-mono text-[10px] text-slate-500 pt-1">
              Based on {r.reasoning.sessionCount} recent session{r.reasoning.sessionCount === 1 ? '' : 's'} · this session scored{' '}
              {Math.round(r.reasoning.sessionScore)} / 100
            </div>
          </div>

          <button
            id="btn-dismiss-adaptation"
            type="button"
            onClick={onDismiss}
            className="w-full h-14 rounded-full bg-[#38bdf8] hover:bg-[#5ccbff] active:scale-[0.98] text-[#051c2c] font-black text-sm uppercase tracking-wider shadow-xl shadow-[#38bdf8]/20 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
