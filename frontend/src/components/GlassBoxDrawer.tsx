import { useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Cpu,
  History,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { useDeviceMode } from '../context/DeviceModeContext';
import type {
  AthleteState,
  ComponentBreakdown,
  CounterfactualOption,
  Decision,
  GlassBoxMetadata,
  PersonalBaseline,
  SessionDelta,
} from '../types/api';

interface GlassBoxDrawerProps {
  metadata?: GlassBoxMetadata | null;
  componentBreakdown?: ComponentBreakdown | null;
  triggeredRules?: string[];
  coachingRationale?: string | null;
  confidence?: number;
  action?: Decision;
  signalScore?: number;
  athleteState?: AthleteState | null;
  baseline?: PersonalBaseline | null;
  counterfactuals?: CounterfactualOption[];
  sessionDelta?: SessionDelta | null;
  initialExpanded?: boolean;
}

import { RULE_METADATA } from '../utils/ruleMetadata';

export function GlassBoxDrawer({
  metadata,
  componentBreakdown,
  triggeredRules,
  coachingRationale,
  confidence: propConfidence,
  athleteState: propAthleteState,
  baseline: propBaseline,
  counterfactuals: propCounterfactuals,
  sessionDelta: propSessionDelta,
  initialExpanded = true,
}: GlassBoxDrawerProps) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const isLaptop = useDeviceMode() === 'laptop';

  const breakdown: ComponentBreakdown =
    metadata?.componentBreakdown ||
    componentBreakdown || {
      perfTrend: 0,
      scoreLevel: 0,
      rpeSignal: 0,
      volumeTrend: 0,
    };

  const rules = metadata?.triggeredRules || triggeredRules || [];
  const rationale = metadata?.coachingRationale || coachingRationale;
  const confidence =
    metadata?.confidence != null
      ? Math.round(metadata.confidence <= 1.0 ? metadata.confidence * 100 : metadata.confidence)
      : propConfidence != null
      ? Math.round(propConfidence <= 1.0 ? propConfidence * 100 : propConfidence)
      : 80;

  const athleteState = metadata?.athleteState || propAthleteState;
  const baseline = metadata?.baseline || propBaseline;
  const counterfactuals = metadata?.counterfactuals || propCounterfactuals || [];
  const delta = metadata?.sessionDelta || propSessionDelta;

  const drivers = [
    {
      id: 'perf_trend',
      label: 'Performance Trend',
      weight: '35%',
      value: breakdown.perfTrend,
      desc: 'Weighted slope of recent session performance scores',
    },
    {
      id: 'score_level',
      label: 'Performance Level',
      weight: '30%',
      value: breakdown.scoreLevel,
      desc: 'Recency-weighted score vs neutral baseline (67.5)',
    },
    {
      id: 'rpe_signal',
      label: 'Effort & RPE Driver',
      weight: '20%',
      value: breakdown.rpeSignal,
      desc: 'RPE trend direction combined with reserve proximity',
    },
    {
      id: 'volume_trend',
      label: 'Volume Progression',
      weight: '15%',
      value: breakdown.volumeTrend,
      desc: 'Tonnage trajectory normalized across the window',
    },
  ];

  return (
    <div
      id="glass-box-algorithmic-drawer"
      className="w-full rounded-2xl bg-[#171C19] border border-[#303832] shadow-xl overflow-hidden transition-all"
    >
      {/* Header Bar with Toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between bg-[#1D2520]/80 hover:bg-[#1D2520] transition-colors border-b border-[#303832] cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-lg bg-[#20352A] border border-[#8FB69A]/30 flex items-center justify-center text-[#8FB69A]">
            <Cpu size={15} />
          </span>
          <div className="text-left">
            <div className="text-xs font-bold text-[#F1EDE3] tracking-wide uppercase font-mono flex items-center gap-2">
              Glass-Box Explainability
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#20352A] border border-[#8FB69A]/20 text-[#8FB69A] font-mono lowercase">
                audit trail
              </span>
            </div>
            <div className="text-[10px] text-[#B8B8AD]">Algorithmic rationale, athlete state & counterfactuals</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-right font-mono">
            <span className="text-[10px] text-[#B8B8AD]">Confidence</span>
            <span className="text-xs font-bold text-[#8FB69A]">{confidence}%</span>
          </div>
          {expanded ? <ChevronUp size={16} className="text-[#B8B8AD]" /> : <ChevronDown size={16} className="text-[#B8B8AD]" />}
        </div>
      </button>

      {expanded && (
        <div className="p-4 sm:p-5 flex flex-col gap-5">
          {/* Athlete State HUD Model */}
          {athleteState && (
            <div className="p-3.5 rounded-xl bg-[#1D2520] border border-[#303832]">
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#8FB69A] mb-2.5">
                <UserCheck size={13} className="stroke-[2.5]" />
                Athlete State Estimation Model
              </div>
              <div className={`grid gap-2 text-center ${isLaptop ? 'grid-cols-6' : 'grid-cols-3'}`}>
                <div className="bg-[#171C19] p-2 rounded-lg border border-[#303832]">
                  <div className="text-[9px] font-mono uppercase text-[#B8B8AD]">Readiness</div>
                  <div className="text-base font-bold text-[#8FB69A]">{athleteState.readinessPct}%</div>
                </div>
                <div className="bg-[#171C19] p-2 rounded-lg border border-[#303832]">
                  <div className="text-[9px] font-mono uppercase text-[#B8B8AD]">Performance</div>
                  <div className={`text-xs font-bold mt-1 ${athleteState.performanceStatus === 'Improving' ? 'text-[#8FB69A]' : athleteState.performanceStatus === 'Declining' ? 'text-[#C86B68]' : 'text-[#F1EDE3]'}`}>
                    {athleteState.performanceStatus}
                  </div>
                </div>
                <div className="bg-[#171C19] p-2 rounded-lg border border-[#303832]">
                  <div className="text-[9px] font-mono uppercase text-[#B8B8AD]">Fatigue</div>
                  <div className={`text-xs font-bold mt-1 ${athleteState.fatigueLevel === 'High' ? 'text-[#C86B68]' : athleteState.fatigueLevel === 'Moderate' ? 'text-[#C7A65A]' : 'text-[#8FB69A]'}`}>
                    {athleteState.fatigueLevel}
                  </div>
                </div>
                <div className="bg-[#171C19] p-2 rounded-lg border border-[#303832]">
                  <div className="text-[9px] font-mono uppercase text-[#B8B8AD]">Recovery</div>
                  <div className="text-xs font-bold text-[#F1EDE3] mt-1">{athleteState.recoveryStatus}</div>
                </div>
                <div className="bg-[#171C19] p-2 rounded-lg border border-[#303832]">
                  <div className="text-[9px] font-mono uppercase text-[#B8B8AD]">Adaptation</div>
                  <div className="text-xs font-bold text-[#A8D1B1] mt-1">{athleteState.adaptationStatus}</div>
                </div>
                <div className="bg-[#171C19] p-2 rounded-lg border border-[#303832]">
                  <div className="text-[9px] font-mono uppercase text-[#B8B8AD]">Confidence</div>
                  <div className="text-base font-bold text-[#8FB69A]">{athleteState.confidencePct}%</div>
                </div>
              </div>
            </div>
          )}

          {/* Coaching Rationale Box */}
          {rationale && (
            <div className="bg-[#1D2520] border-l-4 border-[#8FB69A] p-4 rounded-r-xl border-y border-r border-[#303832] flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#8FB69A]">
                <Activity size={13} className="stroke-[2.5]" />
                Sports Science Coaching Rationale
              </div>
              <p className="text-[#F1EDE3] text-sm leading-relaxed font-sans">{rationale}</p>
            </div>
          )}

          {/* Active Triggered Rules Badges */}
          {rules.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#B8B8AD]">
                Active Rule Triggers & Safety Gates ({rules.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {rules.map((ruleKey) => {
                  const meta = RULE_METADATA[ruleKey] || {
                    label: ruleKey,
                    desc: 'Activated engine rule',
                    icon: ShieldCheck,
                    color: 'border-[#303832] bg-[#1D2520] text-[#B8B8AD]',
                  };
                  const Icon = meta.icon;
                  return (
                    <div
                      key={ruleKey}
                      title={meta.desc}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-semibold ${meta.color}`}
                    >
                      <Icon size={13} className="shrink-0" />
                      <span>{meta.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grid: 4-Driver Contribution Bars + Confidence Gauge */}
          <div className={`gap-4 pt-1 ${isLaptop ? 'grid grid-cols-3' : 'flex flex-col'}`}>
            {/* Left 2 Cols on Laptop: 4 Driver Horizontal Contribution Bars */}
            <div className={isLaptop ? "col-span-2 flex flex-col gap-3" : "w-full flex flex-col gap-3"}>
              <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-[#B8B8AD]">
                <span>Signal Driver Attribution</span>
                <span className="text-[#7A7E77] font-normal">Terracotta = Fatigue (-) · Sage = Positive (+)</span>
              </div>

              <div className="flex flex-col gap-2.5">
                {drivers.map((d) => {
                  const val = d.value;
                  const isPositive = val >= 0;
                  const absVal = Math.abs(val);
                  const barWidthPct = Math.min(Math.round((absVal / 0.35) * 100), 100);

                  return (
                    <div key={d.id} className="flex flex-col gap-1 rounded-xl bg-[#1D2520] p-2.5 border border-[#303832]">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-medium text-[#F1EDE3]">
                          {isPositive ? (
                            <TrendingUp size={13} className="text-[#8FB69A]" />
                          ) : (
                            <TrendingDown size={13} className="text-[#C86B68]" />
                          )}
                          <span>{d.label}</span>
                          <span className="text-[10px] text-[#B8B8AD] font-mono">({d.weight})</span>
                        </div>
                        <span
                          className={`font-mono font-bold text-xs ${
                            isPositive ? 'text-[#8FB69A]' : 'text-[#C86B68]'
                          }`}
                        >
                          {val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                        </span>
                      </div>

                      {/* Split Zero-Centered Diverging Bar */}
                      <div className="relative h-2 w-full bg-[#171C19] rounded-full overflow-hidden flex">
                        <div className="w-1/2 h-full flex justify-end border-r border-[#303832]">
                          {!isPositive && (
                            <div
                              className="h-full bg-[#C86B68] rounded-l-full transition-all duration-300"
                              style={{ width: `${barWidthPct}%` }}
                            />
                          )}
                        </div>
                        <div className="w-1/2 h-full flex justify-start">
                          {isPositive && (
                            <div
                              className="h-full bg-[#8FB69A] rounded-r-full transition-all duration-300"
                              style={{ width: `${barWidthPct}%` }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 1 Col: Circular Confidence Dial */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-[#1D2520] border border-[#303832] text-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#B8B8AD]">
                Confidence Dial
              </span>

              <div className="relative w-24 h-24 flex items-center justify-center my-1">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-[#20352A]"
                    strokeWidth="3.2"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={`${confidence >= 70 ? 'text-[#8FB69A]' : 'text-[#C7A65A]'} transition-all duration-700`}
                    strokeDasharray={`${confidence}, 100`}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="font-mono text-xl font-black text-[#F1EDE3]">{confidence}%</span>
                  <span className="text-[9px] font-mono text-[#8FB69A]">SIGNAL</span>
                </div>
              </div>

              <span className="text-[11px] text-[#B8B8AD] leading-tight">
                {confidence >= 70 ? 'High historical agreement' : confidence >= 50 ? 'Moderate agreement' : 'Noise-gated'}
              </span>
            </div>
          </div>

          {/* Personal Baseline & Since Last Session Row */}
          {(baseline || delta) && (
            <div className={`gap-3 pt-1 ${isLaptop ? 'grid grid-cols-2' : 'flex flex-col'}`}>
              {baseline && (
                <div className="p-3.5 rounded-xl bg-[#1D2520] border border-[#303832]">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#8FB69A] mb-2">
                    <History size={13} />
                    Personal Athlete Baseline ({baseline.sessionsAnalyzed} sessions)
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#171C19] p-2 rounded-lg border border-[#303832]">
                      <span className="text-[#B8B8AD] block text-[10px]">Typical RPE</span>
                      <span className="font-mono font-bold text-[#F1EDE3]">{baseline.typicalRpe}</span>
                    </div>
                    <div className="bg-[#171C19] p-2 rounded-lg border border-[#303832]">
                      <span className="text-[#B8B8AD] block text-[10px]">Typical Score</span>
                      <span className="font-mono font-bold text-[#8FB69A]">{baseline.typicalScore} pts</span>
                    </div>
                    <div className="bg-[#171C19] p-2 rounded-lg border border-[#303832]">
                      <span className="text-[#B8B8AD] block text-[10px]">Typical Volume</span>
                      <span className="font-mono font-bold text-[#F1EDE3]">{baseline.typicalVolume} kg</span>
                    </div>
                    <div className="bg-[#171C19] p-2 rounded-lg border border-[#303832]">
                      <span className="text-[#B8B8AD] block text-[10px]">Typical Reps</span>
                      <span className="font-mono font-bold text-[#F1EDE3]">{baseline.typicalReps} reps</span>
                    </div>
                  </div>
                </div>
              )}

              {delta && (
                <div className="p-3.5 rounded-xl bg-[#1D2520] border border-[#303832]">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#C7A65A] mb-2">
                    <Activity size={13} />
                    Session-Over-Session Delta
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#171C19] p-2 rounded-lg border border-[#303832]">
                      <span className="text-[#B8B8AD] block text-[10px]">Performance Shift</span>
                      <span className={`font-mono font-bold ${delta.perfDeltaPct >= 0 ? 'text-[#8FB69A]' : 'text-[#C86B68]'}`}>
                        {delta.perfDeltaPct > 0 ? `+${delta.perfDeltaPct}%` : `${delta.perfDeltaPct}%`}
                      </span>
                    </div>
                    <div className="bg-[#171C19] p-2 rounded-lg border border-[#303832]">
                      <span className="text-[#B8B8AD] block text-[10px]">RPE Exertion Delta</span>
                      <span className={`font-mono font-bold ${delta.rpeDelta <= 0 ? 'text-[#8FB69A]' : 'text-[#C86B68]'}`}>
                        {delta.rpeDelta > 0 ? `+${delta.rpeDelta}` : `${delta.rpeDelta}`}
                      </span>
                    </div>
                    <div className="bg-[#171C19] p-2 rounded-lg border border-[#303832]">
                      <span className="text-[#B8B8AD] block text-[10px]">Prescription Load</span>
                      <span className="font-mono font-bold text-[#F1EDE3]">
                        {delta.loadDelta > 0 ? `+${delta.loadDelta} kg` : `${delta.loadDelta} kg`}
                      </span>
                    </div>
                    <div className="bg-[#171C19] p-2 rounded-lg border border-[#303832]">
                      <span className="text-[#B8B8AD] block text-[10px]">Reps / Sets Delta</span>
                      <span className="font-mono font-bold text-[#F1EDE3]">
                        {delta.repsDelta >= 0 ? `+${delta.repsDelta}` : delta.repsDelta} reps / {delta.setsDelta >= 0 ? `+${delta.setsDelta}` : delta.setsDelta} sets
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Counterfactual Explanations Section */}
          {counterfactuals.length > 0 && (
            <div className="p-4 rounded-xl bg-[#1D2520] border border-[#303832] flex flex-col gap-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#8FB69A]">
                <Sparkles size={13} />
                What Would Have Changed The Decision? (Counterfactual Analysis)
              </div>
              <div className={`gap-2.5 ${isLaptop ? 'grid grid-cols-2' : 'grid grid-cols-1'}`}>
                {counterfactuals.map((cf, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-[#171C19] border border-[#303832] flex flex-col gap-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                      <span className="font-medium text-[#F1EDE3] leading-snug">{cf.condition}</span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border self-start sm:self-auto shrink-0 whitespace-nowrap ${
                          cf.resultingAction.includes('PROGRESS')
                            ? 'bg-[#8FB69A]/15 border-[#8FB69A]/30 text-[#8FB69A]'
                            : cf.resultingAction.includes('BACK OFF')
                            ? 'bg-[#C86B68]/15 border-[#C86B68]/30 text-[#C86B68]'
                            : 'bg-[#C7A65A]/15 border-[#C7A65A]/30 text-[#C7A65A]'
                        }`}
                      >
                        → {cf.resultingAction}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#B8B8AD] leading-relaxed">{cf.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
