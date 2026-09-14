import { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { DecisionBadge } from '../components/DecisionBadge';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { PrescriptionDisplay } from '../components/PrescriptionDisplay';
import { TrendChart } from '../components/TrendChart';
import { useExerciseDetail } from '../hooks/useExerciseDetail';
import type { Prescription } from '../types/api';
import { decisionTheme, rpeTier, trendGlyph, trendLabel } from '../utils/decision';
import { formatDate, formatDayLabel, formatPrescription, formatWeight } from '../utils/format';

interface ExerciseDetailPageProps {
  exerciseId: number;
  refreshKey: number;
  onBack: () => void;
  onLog: (exerciseId: number, exerciseName: string, planned: Prescription | null) => void;
}

const RECENT_COUNT = 5;

export function ExerciseDetailPage({ exerciseId, refreshKey, onBack, onLog }: ExerciseDetailPageProps) {
  const detail = useExerciseDetail(exerciseId, refreshKey);
  const [whyOpen, setWhyOpen] = useState(true);
  const [decisionsOpen, setDecisionsOpen] = useState(false);

  const data = detail.data;
  const state = data?.state ?? null;
  const theme = state ? decisionTheme(state.decision) : null;
  const recent = data ? [...data.logs].reverse().slice(0, RECENT_COUNT) : [];

  return (
    <div className="flex flex-col gap-4 pb-8" id="view-exercise-detail">
      <div className="flex items-center justify-between pt-1">
        <button
          id="btn-back-to-dashboard"
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 h-11 px-4 rounded-xl bg-[#181d26] hover:bg-[#202734] active:scale-95 text-white font-semibold text-sm transition-all border border-slate-800"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        {state && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">{state.muscleGroup}</span>
        )}
      </div>

      {detail.loading && !data ? (
        <LoadingState message="Loading exercise…" />
      ) : detail.error && !data ? (
        <ErrorState error={detail.error} onRetry={detail.reload} />
      ) : data ? (
        <>
          <h1 className="text-2xl font-black text-white tracking-tight leading-tight">{data.exerciseName}</h1>

          {/* Next-session recommendation */}
          {state && theme ? (
            <section className="rounded-2xl bg-[#181d26] border border-slate-800/80 p-4 shadow-md flex flex-col gap-3 relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: theme.accent }} aria-hidden />
              <div className="flex items-center justify-between pl-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Next session</span>
                <DecisionBadge decision={state.decision} />
              </div>
              <div className="pl-2">
                <PrescriptionDisplay prescription={state.current} size="lg" />
              </div>
              <div className="pl-2 flex items-center gap-3 font-mono text-[11px] text-slate-400">
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
            </section>
          ) : (
            <section className="rounded-2xl bg-[#181d26] border border-dashed border-slate-800 p-4 text-sm text-slate-400">
              No sessions logged yet — log your first session to get a recommendation.
            </section>
          )}

          {/* Why */}
          {state && (
            <section className="rounded-2xl bg-[#181d26] border border-slate-800/80 shadow-md overflow-hidden">
              <button
                type="button"
                onClick={() => setWhyOpen((o) => !o)}
                aria-expanded={whyOpen}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <span className="text-sm font-bold text-white">Why this recommendation?</span>
                {whyOpen ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
              </button>
              {whyOpen && <p className="px-4 pb-4 text-sm leading-relaxed text-slate-300">{state.explanation}</p>}
            </section>
          )}

          {/* Trend */}
          <section className="rounded-2xl bg-[#181d26] border border-slate-800/80 p-4 shadow-md flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Recent trend</span>
              <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">
                Last {data.logs.length} session{data.logs.length === 1 ? '' : 's'}
              </span>
            </div>
            <TrendChart logs={data.logs} />
          </section>

          {/* Recent sessions */}
          {recent.length > 0 && (
            <section className="rounded-2xl bg-[#181d26] border border-slate-800/80 shadow-md overflow-hidden">
              <div className="p-4 pb-2 text-sm font-bold text-white">Recent sessions</div>
              <ul className="divide-y divide-slate-800/70">
                {recent.map((log) => {
                  const tier = rpeTier(log.rpe);
                  const missedPlan = log.actualWeight !== log.plannedWeight || log.actualReps !== log.plannedReps || log.actualSets !== log.plannedSets;
                  return (
                    <li key={log.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-sm font-bold text-white">
                          {formatPrescription({ weight: log.actualWeight, reps: log.actualReps, sets: log.actualSets })}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500">
                          {formatDate(log.loggedAt)}
                          {missedPlan && (
                            <span className="text-[#fbbf24]">
                              {' '}· planned {formatWeight(log.plannedWeight)} × {log.plannedReps} × {log.plannedSets}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right font-mono text-[11px] shrink-0">
                        <div className={`font-bold ${tier.text}`}>RPE {log.rpe}</div>
                        <div className="text-slate-400">score {Math.round(log.sessionScore)}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Decision history */}
          {data.adaptations.length > 0 && (
            <section className="rounded-2xl bg-[#181d26] border border-slate-800/80 shadow-md overflow-hidden">
              <button
                type="button"
                onClick={() => setDecisionsOpen((o) => !o)}
                aria-expanded={decisionsOpen}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <span className="text-sm font-bold text-white">Decision history</span>
                {decisionsOpen ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
              </button>
              {decisionsOpen && (
                <ul className="divide-y divide-slate-800/70">
                  {data.adaptations.slice(0, RECENT_COUNT).map((a) => (
                    <li key={a.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-[11px] text-slate-300">
                          {formatPrescription(a.previous)} <span className="text-slate-500">→</span> {formatPrescription(a.next)}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500">
                          {formatDate(a.loggedAt)} · {a.confidence}% confidence
                        </div>
                      </div>
                      <DecisionBadge decision={a.decision} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <button
            id="btn-open-logger-from-detail"
            type="button"
            onClick={() => onLog(exerciseId, data.exerciseName, state?.current ?? null)}
            className="w-full h-14 rounded-full bg-[#38bdf8] hover:bg-[#5ccbff] active:scale-[0.98] text-[#051c2c] font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-[#38bdf8]/20 transition-all"
          >
            <Plus size={18} className="stroke-[3]" />
            Log today's session
          </button>
        </>
      ) : null}
    </div>
  );
}
