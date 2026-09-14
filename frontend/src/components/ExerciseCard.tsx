import { ChevronRight, Plus } from 'lucide-react';
import type { ExerciseState } from '../types/api';
import { decisionTheme, trendGlyph, trendLabel } from '../utils/decision';
import { formatDayLabel } from '../utils/format';
import { DecisionBadge } from './DecisionBadge';
import { PrescriptionDisplay } from './PrescriptionDisplay';

interface ExerciseCardProps {
  state: ExerciseState;
  onLog: (state: ExerciseState) => void;
  onDetails: (exerciseId: number) => void;
}

/** One dashboard card: the exercise's next prescription and the decision behind it. */
export function ExerciseCard({ state, onLog, onDetails }: ExerciseCardProps) {
  const theme = decisionTheme(state.decision);

  return (
    <article
      id={`exercise-card-${state.exerciseId}`}
      className="rounded-2xl bg-[#181d26] border border-slate-800/80 shadow-md overflow-hidden flex"
    >
      <div className="w-1.5 shrink-0" style={{ backgroundColor: theme.accent }} aria-hidden />

      <div className="flex-1 p-4 flex flex-col gap-3 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => onDetails(state.exerciseId)}
            className="text-left min-w-0 group"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              {state.muscleGroup}
            </div>
            <h3 className="text-lg font-bold text-white leading-tight truncate group-hover:text-[#38bdf8] transition-colors">
              {state.exerciseName}
            </h3>
          </button>
          <DecisionBadge decision={state.decision} />
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">Next session</div>
          <PrescriptionDisplay prescription={state.current} />
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
          <span>
            <span className={`font-bold ${theme.text}`}>{state.confidence}%</span> confidence
          </span>
          <span aria-hidden>·</span>
          <span>
            {trendGlyph(state.trendDirection)} {trendLabel(state.trendDirection)}
          </span>
          <span aria-hidden>·</span>
          <span>Updated {formatDayLabel(state.updatedAt)}</span>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            id={`btn-log-${state.exerciseId}`}
            type="button"
            onClick={() => onLog(state)}
            className="flex-1 h-12 rounded-full bg-[#38bdf8] hover:bg-[#5ccbff] active:scale-[0.98] text-[#051c2c] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#38bdf8]/20 transition-all"
          >
            <Plus size={16} className="stroke-[3]" />
            Log session
          </button>
          <button
            id={`btn-details-${state.exerciseId}`}
            type="button"
            onClick={() => onDetails(state.exerciseId)}
            className="h-12 px-4 rounded-full bg-[#1e2735] hover:bg-[#28324a] active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1 border border-slate-700 transition-all"
          >
            Details
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}
