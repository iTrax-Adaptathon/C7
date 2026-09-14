import { useMemo, useState } from 'react';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { useAllLogs } from '../hooks/useAllLogs';
import type { HistoryEntry } from '../types/api';
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
    `h-9 px-3.5 rounded-full text-[11px] font-mono font-semibold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
      active
        ? 'bg-[#8FB69A] text-[#111312] border border-[#8FB69A] shadow-sm'
        : 'bg-[#171C19] text-[#B8B8AD] hover:bg-[#1D2520] hover:text-[#F1EDE3] border border-[#303832]'
    }`;

  return (
    <div className="flex flex-col gap-4 pb-6" id="view-history">
      <header className="pt-2 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#F1EDE3] tracking-tight">Training History</h1>
          <p className="text-sm text-[#B8B8AD]">Chronological ledger of logged workouts, effort ratings, and scores.</p>
        </div>
        {history.data && (
          <span className="font-mono text-[11px] text-[#8FB69A] shrink-0 bg-[#20352A] px-2.5 py-1 rounded-full border border-[#303832]">
            {history.data.entries.length} session{history.data.entries.length === 1 ? '' : 's'}
          </span>
        )}
      </header>

      {history.data && history.data.exercises.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1" role="tablist" aria-label="Filter by exercise">
          <button type="button" role="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')} className={chip(filter === 'all')}>
            All Movements
          </button>
          {history.data.exercises.map((e) => (
            <button key={e.id} type="button" role="tab" aria-selected={filter === e.id} onClick={() => setFilter(e.id)} className={chip(filter === e.id)}>
              {e.name}
            </button>
          ))}
        </div>
      )}

      {history.loading && !history.data ? (
        <LoadingState message="Loading training history…" />
      ) : history.error && !history.data ? (
        <ErrorState error={history.error} onRetry={history.reload} />
      ) : groups.length === 0 ? (
        <div className="rounded-2xl bg-[#171C19] border border-dashed border-[#303832] p-8 text-center text-sm text-[#B8B8AD]">
          No sessions logged yet.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <section key={group.key} className="flex flex-col gap-2">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#8FB69A] font-mono px-1">{group.label}</h2>
              <ul className="flex flex-col gap-2.5">
                {group.entries.map((entry) => {
                  const rpeBadgeClass =
                    entry.rpe <= 6
                      ? 'text-[#8FB69A] bg-[#8FB69A]/15 border-[#8FB69A]/30'
                      : entry.rpe <= 8
                      ? 'text-[#C7A65A] bg-[#C7A65A]/15 border-[#C7A65A]/30'
                      : 'text-[#C86B68] bg-[#C86B68]/15 border-[#C86B68]/30';
                  const missedPlan =
                    entry.actualWeight !== entry.plannedWeight || entry.actualReps !== entry.plannedReps || entry.actualSets !== entry.plannedSets;
                  return (
                    <li key={`${entry.exerciseId}-${entry.id}`}>
                      <button
                        type="button"
                        onClick={() => onOpenExercise(entry.exerciseId)}
                        className="w-full text-left rounded-2xl bg-[#171C19] border border-[#303832] hover:border-[#8FB69A]/40 p-4 flex items-center justify-between gap-3 active:scale-[0.99] transition-all cursor-pointer shadow-sm"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-[#F1EDE3] truncate">{entry.exerciseName}</div>
                          <div className="font-mono text-sm font-semibold text-[#8FB69A]">
                            {formatPrescription({ weight: entry.actualWeight, reps: entry.actualReps, sets: entry.actualSets })}
                          </div>
                          <div className="font-mono text-xs text-[#B8B8AD] pt-0.5">
                            {formatTime(entry.loggedAt)}
                            {missedPlan && (
                              <span className="text-[#B8B8AD] font-mono text-xs">
                                {' '}· planned {formatWeight(entry.plannedWeight)} × {entry.plannedReps} × {entry.plannedSets}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1 shrink-0">
                          <div className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full border ${rpeBadgeClass}`}>
                            RPE {entry.rpe}
                          </div>
                          <div className="text-[#B8B8AD] font-mono text-[10px]">score {Math.round(entry.sessionScore)}</div>
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
