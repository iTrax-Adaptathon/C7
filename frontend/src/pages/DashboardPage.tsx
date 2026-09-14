import { Plus } from 'lucide-react';
import { ErrorState } from '../components/ErrorState';
import { ExerciseCard } from '../components/ExerciseCard';
import { LoadingState } from '../components/LoadingState';
import type { AsyncState } from '../hooks/useAsync';
import type { DashboardData } from '../hooks/useStateSummary';
import type { Exercise, ExerciseState } from '../types/api';

interface DashboardPageProps {
  summary: AsyncState<DashboardData>;
  onLog: (state: ExerciseState) => void;
  onLogFirst: (exercise: Exercise) => void;
  onDetails: (exerciseId: number) => void;
}

/** "What should I do next?" — one card per exercise from GET /state/summary. */
export function DashboardPage({ summary, onLog, onLogFirst, onDetails }: DashboardPageProps) {
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="flex flex-col gap-4 pb-6" id="view-dashboard">
      <header className="pt-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">{today}</div>
        <h1 className="text-2xl font-black text-white tracking-tight">Next session</h1>
        <p className="text-sm text-slate-400">
          Recommendations from your logged training response — updated after every session you log.
        </p>
      </header>

      {summary.loading && !summary.data ? (
        <LoadingState message="Loading your recommendations…" />
      ) : summary.error && !summary.data ? (
        <ErrorState error={summary.error} onRetry={summary.reload} />
      ) : summary.data ? (
        <>
          {summary.error && <ErrorState error={summary.error} onRetry={summary.reload} compact />}

          {summary.data.states.length === 0 && summary.data.unstarted.length === 0 && (
            <div className="rounded-2xl bg-[#181d26] border border-slate-800/80 p-6 text-center text-sm text-slate-400">
              No exercises in the database yet.
            </div>
          )}

          <div className="flex flex-col gap-3">
            {summary.data.states.map((state) => (
              <ExerciseCard key={state.exerciseId} state={state} onLog={onLog} onDetails={onDetails} />
            ))}
          </div>

          {summary.data.unstarted.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">No sessions yet</h2>
              {summary.data.unstarted.map((exercise) => (
                <div
                  key={exercise.id}
                  className="rounded-2xl bg-[#181d26]/60 border border-dashed border-slate-800 p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">{exercise.muscleGroup}</div>
                    <div className="font-bold text-slate-200 truncate">{exercise.name}</div>
                    <div className="text-xs text-slate-500">Log a first session to get a recommendation.</div>
                  </div>
                  <button
                    id={`btn-log-first-${exercise.id}`}
                    type="button"
                    onClick={() => onLogFirst(exercise)}
                    className="h-11 px-4 shrink-0 rounded-full bg-[#1e2735] hover:bg-[#28324a] active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 border border-slate-700 transition-all"
                  >
                    <Plus size={14} className="stroke-[3]" />
                    Log
                  </button>
                </div>
              ))}
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
