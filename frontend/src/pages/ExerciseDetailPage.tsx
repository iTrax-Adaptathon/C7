import { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { DecisionBadge } from '../components/DecisionBadge';
import { ErrorState } from '../components/ErrorState';
import { GlassBoxDrawer } from '../components/GlassBoxDrawer';
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
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-[#1D2520] hover:bg-[#20352A] active:scale-95 text-[#F1EDE3] font-medium text-sm transition-all border border-[#303832] cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        {state && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8FB69A] font-mono">{state.muscleGroup}</span>
        )}
      </div>

      {detail.loading && !data ? (
        <LoadingState message="Loading exercise…" />
      ) : detail.error && !data ? (
        <ErrorState error={detail.error} onRetry={detail.reload} />
      ) : data ? (
        <>
          <h1 className="text-2xl font-black text-[#F1EDE3] tracking-tight leading-tight">{data.exerciseName}</h1>

          {/* Next-session recommendation */}
          {state && theme ? (
            <section className="rounded-2xl bg-[#171C19] border border-[#303832] p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: theme.accent }} aria-hidden />
              <div className="flex items-center justify-between pl-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#B8B8AD] font-mono">Next session</span>
                <DecisionBadge decision={state.decision} />
              </div>
              <div className="pl-2">
                <PrescriptionDisplay prescription={state.current} size="lg" />
              </div>
              <div className="pl-2 flex items-center gap-3 font-mono text-[11px] text-[#B8B8AD]">
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
            <section className="rounded-2xl bg-[#171C19] border border-dashed border-[#303832] p-4 text-sm text-[#B8B8AD]">
              No sessions logged yet — log your first session to get a recommendation.
            </section>
          )}

          {/* Why */}
          {state && (
            <section className="rounded-2xl bg-[#171C19] border border-[#303832] shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setWhyOpen((o) => !o)}
                aria-expanded={whyOpen}
                className="w-full flex items-center justify-between p-4 text-left cursor-pointer hover:bg-[#1D2520] transition-colors"
              >
                <span className="text-sm font-bold text-[#F1EDE3]">Why this recommendation?</span>
                {whyOpen ? <ChevronDown size={18} className="text-[#B8B8AD]" /> : <ChevronRight size={18} className="text-[#B8B8AD]" />}
              </button>
              {whyOpen && <p className="px-4 pb-4 text-sm leading-relaxed text-[#F1EDE3]">{state.explanation}</p>}
            </section>
          )}

          {/* Glass-Box Explainability Drawer for this exercise */}
          {state && (
            <GlassBoxDrawer
              confidence={state.confidence}
              action={state.decision}
              componentBreakdown={state.componentBreakdown}
              triggeredRules={state.triggeredRules}
              coachingRationale={state.coachingRationale || state.explanation}
              athleteState={state.athleteState}
              baseline={state.baseline}
              counterfactuals={state.counterfactuals}
              sessionDelta={state.sessionDelta}
              initialExpanded={true}
            />
          )}

          {/* Trend */}
          <section className="rounded-2xl bg-[#171C19] border border-[#303832] p-4 sm:p-5 shadow-lg flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#F1EDE3]">Recent trend</span>
              <span className="font-mono text-[10px] text-[#B8B8AD] uppercase tracking-wider">
                Last {data.logs.length} session{data.logs.length === 1 ? '' : 's'}
              </span>
            </div>
            <TrendChart logs={data.logs} />
          </section>

          {/* Recent sessions */}
          {recent.length > 0 && (
            <section className="rounded-2xl bg-[#171C19] border border-[#303832] shadow-lg overflow-hidden">
              <div className="p-4 pb-2 text-sm font-bold text-[#F1EDE3]">Recent sessions</div>
              <ul className="divide-y divide-[#303832]">
                {recent.map((log) => {
                  const tier = rpeTier(log.rpe);
                  const missedPlan = log.actualWeight !== log.plannedWeight || log.actualReps !== log.plannedReps || log.actualSets !== log.plannedSets;
                  return (
                    <li key={log.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-sm font-bold text-[#F1EDE3]">
                          {formatPrescription({ weight: log.actualWeight, reps: log.actualReps, sets: log.actualSets })}
                        </div>
                        <div className="font-mono text-[10px] text-[#B8B8AD]">
                          {formatDate(log.loggedAt)}
                          {missedPlan && (
                            <span className="text-[#B8B8AD] font-mono text-xs">
                              {' '}· planned {formatWeight(log.plannedWeight)} × {log.plannedReps} × {log.plannedSets}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right font-mono text-[11px] shrink-0">
                        <div className={`font-bold ${tier.text}`}>RPE {log.rpe}</div>
                        <div className="text-[#B8B8AD]">score {Math.round(log.sessionScore)}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Decision history */}
          {data.adaptations.length > 0 && (
            <section className="rounded-2xl bg-[#171C19] border border-[#303832] shadow-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setDecisionsOpen((o) => !o)}
                aria-expanded={decisionsOpen}
                className="w-full flex items-center justify-between p-4 text-left cursor-pointer hover:bg-[#1D2520] transition-colors"
              >
                <span className="text-sm font-bold text-[#F1EDE3]">Decision history</span>
                {decisionsOpen ? <ChevronDown size={18} className="text-[#B8B8AD]" /> : <ChevronRight size={18} className="text-[#B8B8AD]" />}
              </button>
              {decisionsOpen && (
                <ul className="divide-y divide-[#303832]">
                  {data.adaptations.slice(0, RECENT_COUNT).map((a) => (
                    <li key={a.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-[11px] text-[#F1EDE3]">
                          {formatPrescription(a.previous)} <span className="text-[#B8B8AD]">→</span> {formatPrescription(a.next)}
                        </div>
                        <div className="font-mono text-[10px] text-[#B8B8AD]">
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
            className="w-full h-13 rounded-xl bg-[#8FB69A] hover:bg-[#A8D1B1] active:scale-[0.98] text-[#111312] font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <Plus size={18} className="stroke-[2.5]" />
            Log today's session
          </button>
        </>
      ) : null}
    </div>
  );
}
