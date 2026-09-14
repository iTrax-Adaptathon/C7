import { useMemo, useState } from 'react';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { useAllLogs } from '../hooks/useAllLogs';
import type { HistoryEntry } from '../types/api';
import { rpeTier } from '../utils/decision';
import { formatDayLabel, formatPrescription, formatTime, formatWeight, localDayKey } from '../utils/format';

interface HistoryPageProps {
  refreshKey: number;
  onOpenExercise: (exerciseId: number) => void;
}

interface DayGroup {
  key: string;
  label: string;
  entries: HistoryEntry[];
}

function groupByDay(entries: HistoryEntry[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const entry of entries) {
    const key = localDayKey(entry.loggedAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.entries.push(entry);
    else groups.push({ key, label: formatDayLabel(entry.loggedAt), entries: [entry] });
  }
  return groups;
}

/** Every logged session across exercises, newest first, from GET /logs/{id}. */
export function HistoryPage({ refreshKey, onOpenExercise }: HistoryPageProps) {
  const history = useAllLogs(refreshKey);
  const [filter, setFilter] = useState<number | 'all'>('all');

  const visible = useMemo(() => {
    const entries = history.data?.entries ?? [];
    return filter === 'all' ? entries : entries.filter((e) => e.exerciseId === filter);
  }, [history.data, filter]);
  const groups = useMemo(() => groupByDay(visible), [visible]);

  const chip = (active: boolean) =>
    `h-9 px-3.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider border whitespace-nowrap transition-all ${
      active ? 'bg-[#38bdf8] text-[#051c2c] border-[#38bdf8]' : 'bg-[#181d26] text-slate-300 border-slate-800 hover:border-slate-600'
    }`;

  return (
    <div className="flex flex-col gap-4 pb-6" id="view-history">
      <header className="pt-1 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">History</h1>
          <p className="text-sm text-slate-400">Every session you've logged.</p>
        </div>
        {history.data && (
          <span className="font-mono text-[11px] text-slate-400 shrink-0">
            {history.data.entries.length} session{history.data.entries.length === 1 ? '' : 's'}
          </span>
        )}
      </header>

      {history.data && history.data.exercises.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1" role="tablist" aria-label="Filter by exercise">
          <button type="button" role="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')} className={chip(filter === 'all')}>
            All
          </button>
          {history.data.exercises.map((e) => (
            <button key={e.id} type="button" role="tab" aria-selected={filter === e.id} onClick={() => setFilter(e.id)} className={chip(filter === e.id)}>
              {e.name}
            </button>
          ))}
        </div>
      )}

      {history.loading && !history.data ? (
        <LoadingState message="Loading history…" />
      ) : history.error && !history.data ? (
        <ErrorState error={history.error} onRetry={history.reload} />
      ) : groups.length === 0 ? (
        <div className="rounded-2xl bg-[#181d26] border border-dashed border-slate-800 p-6 text-center text-sm text-slate-400">
          No sessions logged yet.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <section key={group.key} className="flex flex-col gap-2">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono px-1">{group.label}</h2>
              <ul className="flex flex-col gap-2">
                {group.entries.map((entry) => {
                  const tier = rpeTier(entry.rpe);
                  const missedPlan =
                    entry.actualWeight !== entry.plannedWeight || entry.actualReps !== entry.plannedReps || entry.actualSets !== entry.plannedSets;
                  return (
                    <li key={`${entry.exerciseId}-${entry.id}`}>
                      <button
                        type="button"
                        onClick={() => onOpenExercise(entry.exerciseId)}
                        className="w-full text-left rounded-2xl bg-[#181d26] border border-slate-800/80 p-4 flex items-center justify-between gap-3 hover:border-slate-600 active:scale-[0.99] transition-all"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate">{entry.exerciseName}</div>
                          <div className="font-mono text-sm text-slate-200">
                            {formatPrescription({ weight: entry.actualWeight, reps: entry.actualReps, sets: entry.actualSets })}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500">
                            {formatTime(entry.loggedAt)}
                            {missedPlan && (
                              <span className="text-[#fbbf24]">
                                {' '}· planned {formatWeight(entry.plannedWeight)} × {entry.plannedReps} × {entry.plannedSets}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right font-mono text-[11px] shrink-0">
                          <div className={`font-bold ${tier.text}`}>RPE {entry.rpe}</div>
                          <div className="text-slate-400">score {Math.round(entry.sessionScore)}</div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
