import { Plus } from 'lucide-react';
import { ErrorState } from '../components/ErrorState';
import { ExerciseCard } from '../components/ExerciseCard';
import { LoadingState } from '../components/LoadingState';
import { useDeviceMode } from '../context/DeviceModeContext';
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
  const isLaptop = useDeviceMode() === 'laptop';
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="flex flex-col gap-4 pb-6" id="view-dashboard">
      <header className="pt-2 pb-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#8FB69A] font-mono">{today}</div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#F1EDE3] tracking-tight mt-0.5">Next Session Prescriptions</h1>
        <p className="text-sm text-[#B8B8AD] mt-1 max-w-2xl">
          Multi-signal adaptive prescriptions reacting to your actual performance, perceived effort, and recovery baseline.
        </p>
      </header>

      {summary.loading && !summary.data ? (
        <LoadingState message="Calculating athlete training state…" />
      ) : summary.error && !summary.data ? (
        <ErrorState error={summary.error} onRetry={summary.reload} />
      ) : summary.data ? (
        <>
          {summary.error && <ErrorState error={summary.error} onRetry={summary.reload} compact />}

          {summary.data.states.length === 0 && summary.data.unstarted.length === 0 && (
            <div className="rounded-2xl bg-[#171C19] border border-dashed border-[#303832] p-8 text-center text-sm text-[#B8B8AD]">
              No exercises registered in the training engine.
            </div>
          )}

          <div className={`grid ${isLaptop ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
            {summary.data.states.map((state) => (
              <ExerciseCard key={state.exerciseId} state={state} onLog={onLog} onDetails={onDetails} />
            ))}
          </div>

          {summary.data.unstarted.length > 0 && (
            <section className="flex flex-col gap-2.5 pt-4">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#B8B8AD] font-mono">Calibrating Initial Prescriptions</h2>
              <div className={`grid ${isLaptop ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                {summary.data.unstarted.map((exercise) => (
                  <div
                    key={exercise.id}
                    className="rounded-2xl bg-[#171C19] border border-dashed border-[#303832] p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#8FB69A] font-mono">{exercise.muscleGroup}</div>
                      <div className="font-bold text-[#F1EDE3] truncate">{exercise.name}</div>
                      <div className="text-xs text-[#B8B8AD]">Log an introductory session to establish baseline.</div>
                    </div>
                    <button
                      id={`btn-log-first-${exercise.id}`}
                      type="button"
                      onClick={() => onLogFirst(exercise)}
                      className="h-10 px-4 shrink-0 rounded-xl bg-[#8FB69A] hover:bg-[#A8D1B1] active:scale-[0.98] text-[#111312] font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    >
                      <Plus size={14} className="stroke-[2.5]" />
                      Log
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
