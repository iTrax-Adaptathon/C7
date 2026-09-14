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
      className="rounded-2xl bg-[#171C19] border border-[#303832] shadow-lg shadow-black/40 overflow-hidden flex transition-all duration-200 hover:border-[#8FB69A]/30"
    >
      <div className="w-1.5 shrink-0" style={{ backgroundColor: theme.accent }} aria-hidden />

      <div className="flex-1 p-4 sm:p-5 flex flex-col gap-3.5 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => onDetails(state.exerciseId)}
            className="text-left min-w-0 group"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#B8B8AD] font-mono">
              {state.muscleGroup}
            </div>
            <h3 className="text-lg font-bold text-[#F1EDE3] leading-tight truncate group-hover:text-[#8FB69A] transition-colors">
              {state.exerciseName}
            </h3>
          </button>
          <DecisionBadge decision={state.decision} />
        </div>

        <div className="bg-[#1D2520] p-3 rounded-xl border border-[#303832]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#B8B8AD] font-mono mb-1">Prescription</div>
          <PrescriptionDisplay prescription={state.current} />
        </div>

        <div className="flex items-center flex-wrap gap-2.5 font-mono text-[11px] text-[#B8B8AD]">
          <span>
            <span className={`font-bold ${theme.text}`}>{state.confidence}%</span> confidence
          </span>
          <span aria-hidden className="text-[#303832]">·</span>
          <span className="text-[#F1EDE3]">
            {trendGlyph(state.trendDirection)} {trendLabel(state.trendDirection)}
          </span>
          <span aria-hidden className="text-[#303832]">·</span>
          <span>Updated {formatDayLabel(state.updatedAt)}</span>
          {state.athleteState && (
            <>
              <span aria-hidden className="text-[#303832]">·</span>
              <span className="text-[#8FB69A] font-semibold">
                Readiness {state.athleteState.readinessPct}%
              </span>
            </>
          )}
        </div>

        <div className="flex gap-2.5 pt-1">
          <button
            id={`btn-log-${state.exerciseId}`}
            type="button"
            onClick={() => onLog(state)}
            className="flex-1 h-11 rounded-xl bg-[#8FB69A] hover:bg-[#A8D1B1] text-[#111312] font-semibold text-xs tracking-wide flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] cursor-pointer"
          >
            <Plus size={15} className="stroke-[2.5]" />
            Log session
          </button>
          <button
            id={`btn-details-${state.exerciseId}`}
            type="button"
            onClick={() => onDetails(state.exerciseId)}
            className="h-11 px-4 rounded-xl bg-[#1D2520] hover:bg-[#20352A] text-[#F1EDE3] font-medium text-xs tracking-wide flex items-center justify-center gap-1 border border-[#303832] transition-all active:scale-[0.99] cursor-pointer"
          >
            Details
            <ChevronRight size={14} className="text-[#B8B8AD]" />
          </button>
        </div>
      </div>
    </article>
  );

}
