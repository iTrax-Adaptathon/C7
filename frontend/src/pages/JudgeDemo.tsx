import { useMemo, useState } from 'react';
import {
  Activity,
  BatteryCharging,
  CheckCircle2,
  Cpu,
  Dumbbell,
  FastForward,
  Layers,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { GlassBoxDrawer } from '../components/GlassBoxDrawer';
import { RULE_METADATA } from '../utils/ruleMetadata';
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

type MovementArchetype = 'barbell' | 'dumbbell';

interface Preset {
  id: string;
  title: string;
  tag: string;
  badgeColor: string;
  description: string;
  archetype: MovementArchetype;
  sleep: number;
  freshness: number;
  energy: number;
  stress: number;
  soreness: number;
  perfTrend: number; // -5 to +5
  scoreLevel: number; // 40 to 100
  rpeTrend: number; // -1.0 to +1.0
  weightedRpe: number; // 5 to 10
  volumeTrend: number; // -15 to +15 %
  consistency: number; // stddev 0 to 15
  lastScore: number; // 0 to 100
  recentPoorSessions: number; // 0 to 5
  plannedWeight: number;
  plannedReps: number;
  plannedSets: number;
  actualReps: number;
  loggedRpe: number;
}

const PRESETS: Preset[] = [
  {
    id: 'bad_day',
    title: 'Preset 1: The One-Off Bad Day',
    tag: 'Noise Resilience',
    badgeColor: 'border-[#8FB69A]/30 bg-[#8FB69A]/15 text-[#8FB69A]',
    description:
      'Athlete is historically strong, but had an acute off-day (missed reps & RPE 10). The engine activates ONE_BAD_DAY_GUARD to HOLD the plan without falsely deloading.',
    archetype: 'barbell',
    sleep: 2,
    freshness: 2,
    energy: 2,
    stress: 4,
    soreness: 4,
    perfTrend: -0.8,
    scoreLevel: 75.0,
    rpeTrend: 0.1,
    weightedRpe: 7.2,
    volumeTrend: 0.0,
    consistency: 8.5,
    lastScore: 50.0,
    recentPoorSessions: 1,
    plannedWeight: 100.0,
    plannedReps: 5,
    plannedSets: 3,
    actualReps: 3,
    loggedRpe: 10,
  },
  {
    id: 'creeping_fatigue',
    title: 'Preset 2: Creeping Overtraining',
    tag: 'Autoregulated Deload',
    badgeColor: 'border-[#C86B68]/30 bg-[#C86B68]/15 text-[#C86B68]',
    description:
      'Athlete completed target reps initially, but perceived exertion steadily climbed across sessions. RPE creep and declining recovery triggers an evidence-backed BACK OFF.',
    archetype: 'barbell',
    sleep: 2,
    freshness: 1,
    energy: 2,
    stress: 4,
    soreness: 5,
    perfTrend: -3.5,
    scoreLevel: 56.0,
    rpeTrend: 0.5,
    weightedRpe: 8.8,
    volumeTrend: -6.0,
    consistency: 4.2,
    lastScore: 54.0,
    recentPoorSessions: 2,
    plannedWeight: 100.0,
    plannedReps: 8,
    plannedSets: 3,
    actualReps: 7,
    loggedRpe: 9,
  },
  {
    id: 'supercompensation',
    title: 'Preset 3: Steady Supercompensation',
    tag: 'Controlled Overload',
    badgeColor: 'border-[#8FB69A]/30 bg-[#8FB69A]/15 text-[#A8D1B1]',
    description:
      'High execution, climbing performance slope, and comfortable RPE (< 7.5). Strong positive signal triggers PROGRESS (+5% load step).',
    archetype: 'barbell',
    sleep: 5,
    freshness: 5,
    energy: 5,
    stress: 1,
    soreness: 1,
    perfTrend: 3.2,
    scoreLevel: 84.0,
    rpeTrend: -0.3,
    weightedRpe: 6.4,
    volumeTrend: 8.0,
    consistency: 2.1,
    lastScore: 86.0,
    recentPoorSessions: 0,
    plannedWeight: 100.0,
    plannedReps: 5,
    plannedSets: 3,
    actualReps: 5,
    loggedRpe: 6,
  },
  {
    id: 'double_progression',
    title: 'Preset 4: Dumbbell Double Progression',
    tag: 'Rep Ceiling Step',
    badgeColor: 'border-[#C7A65A]/30 bg-[#C7A65A]/15 text-[#C7A65A]',
    description:
      'Light hypertrophy movement. Rep ceiling (12 reps) reached with solid confidence, prompting a 2.5 kg plate increase while resetting reps back to floor (8 reps).',
    archetype: 'dumbbell',
    sleep: 4,
    freshness: 4,
    energy: 4,
    stress: 2,
    soreness: 2,
    perfTrend: 2.0,
    scoreLevel: 78.0,
    rpeTrend: -0.1,
    weightedRpe: 6.8,
    volumeTrend: 5.0,
    consistency: 2.5,
    lastScore: 80.0,
    recentPoorSessions: 0,
    plannedWeight: 20.0,
    plannedReps: 12,
    plannedSets: 3,
    actualReps: 12,
    loggedRpe: 7,
  },
];

export function JudgeDemo() {
  const deviceMode = useDeviceMode();
  const isLaptop = deviceMode === 'laptop';

  // Active Preset Selection
  const [activePresetId, setActivePresetId] = useState<string>('bad_day');

  // Input states
  const [archetype, setArchetype] = useState<MovementArchetype>('barbell');
  const [sleep, setSleep] = useState<number>(2);
  const [freshness, setFreshness] = useState<number>(2);
  const [energy, setEnergy] = useState<number>(2);
  const [stress, setStress] = useState<number>(4);
  const [soreness, setSoreness] = useState<number>(4);

  // Performance history states
  const [perfTrend, setPerfTrend] = useState<number>(-0.8);
  const [scoreLevel, setScoreLevel] = useState<number>(75.0);
  const [rpeTrend, setRpeTrend] = useState<number>(0.1);
  const [weightedRpe, setWeightedRpe] = useState<number>(7.2);
  const [volumeTrend, setVolumeTrend] = useState<number>(0.0);
  const [consistency, setConsistency] = useState<number>(8.5);
  const [lastScore, setLastScore] = useState<number>(50.0);
  const [recentPoorSessions, setRecentPoorSessions] = useState<number>(1);

  // Current session parameters
  const [plannedWeight, setPlannedWeight] = useState<number>(100.0);
  const [plannedReps, setPlannedReps] = useState<number>(5);
  const [plannedSets, setPlannedSets] = useState<number>(3);
  const [actualReps, setActualReps] = useState<number>(3);
  const [loggedRpe, setLoggedRpe] = useState<number>(10);

  // Apply Preset
  const applyPreset = (preset: Preset) => {
    setActivePresetId(preset.id);
    setArchetype(preset.archetype);
    setSleep(preset.sleep);
    setFreshness(preset.freshness);
    setEnergy(preset.energy);
    setStress(preset.stress);
    setSoreness(preset.soreness);
    setPerfTrend(preset.perfTrend);
    setScoreLevel(preset.scoreLevel);
    setRpeTrend(preset.rpeTrend);
    setWeightedRpe(preset.weightedRpe);
    setVolumeTrend(preset.volumeTrend);
    setConsistency(preset.consistency);
    setLastScore(preset.lastScore);
    setRecentPoorSessions(preset.recentPoorSessions);
    setPlannedWeight(preset.plannedWeight);
    setPlannedReps(preset.plannedReps);
    setPlannedSets(preset.plannedSets);
    setActualReps(preset.actualReps);
    setLoggedRpe(preset.loggedRpe);
  };

  const activePreset = useMemo(() => {
    return PRESETS.find((p) => p.id === activePresetId) || PRESETS[0];
  }, [activePresetId]);

  const isCustomized = useMemo(() => {
    const current = PRESETS.find((p) => p.id === activePresetId);
    if (!current) return false;
    return (
      archetype !== current.archetype ||
      sleep !== current.sleep ||
      freshness !== current.freshness ||
      energy !== current.energy ||
      stress !== current.stress ||
      soreness !== current.soreness ||
      perfTrend !== current.perfTrend ||
      scoreLevel !== current.scoreLevel ||
      rpeTrend !== current.rpeTrend ||
      weightedRpe !== current.weightedRpe ||
      volumeTrend !== current.volumeTrend ||
      consistency !== current.consistency ||
      lastScore !== current.lastScore ||
      recentPoorSessions !== current.recentPoorSessions ||
      plannedWeight !== current.plannedWeight ||
      plannedReps !== current.plannedReps ||
      plannedSets !== current.plannedSets ||
      actualReps !== current.actualReps ||
      loggedRpe !== current.loggedRpe
    );
  }, [
    activePresetId,
    archetype,
    sleep,
    freshness,
    energy,
    stress,
    soreness,
    perfTrend,
    scoreLevel,
    rpeTrend,
    weightedRpe,
    volumeTrend,
    consistency,
    lastScore,
    recentPoorSessions,
    plannedWeight,
    plannedReps,
    plannedSets,
    actualReps,
    loggedRpe,
  ]);

  const resetToActivePreset = () => {
    applyPreset(activePreset);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Math simulation engine
  const evaluation = useMemo(() => {
    const clampVal = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

    // 1. Pre-workout readiness calculation (10 - 100%)
    // sleep, freshness, energy are positive; stress and soreness are negative fatigue signals
    const rawReadiness =
      (sleep * 0.25 + freshness * 0.25 + energy * 0.25 + (6 - stress) * 0.125 + (6 - soreness) * 0.125) * 20;
    const readinessPct = Math.round(clampVal(rawReadiness, 15, 98));
    const readinessModifier = Number(((readinessPct - 75) / 250).toFixed(3)); // [-0.10, +0.10]

    // Dynamic adjusted baseline load
    const weightStep = 2.5;
    const adjustedBaselineLoad = Math.max(
      Math.round((plannedWeight * (1 + readinessModifier)) / weightStep) * weightStep,
      2.5
    );

    // 2. Normalized multi-signal terms (Section 5 & 6)
    const trendScale = 4.0;
    const levelScale = 15.0;
    const rpeTrendScale = 0.6;
    const rpeLevelScale = 2.0;
    const volumeTrendScale = 10.0;
    const neutralScore = 67.5;
    const rpeTarget = 7.0;

    const perfNorm = clampVal(perfTrend / trendScale, -1.0, 1.0);
    const rpeTrendNorm = clampVal(-rpeTrend / rpeTrendScale, -1.0, 1.0);
    const rpeLevelNorm = clampVal((rpeTarget - weightedRpe) / rpeLevelScale, -1.0, 1.0);
    const rpeNorm = 0.5 * rpeTrendNorm + 0.5 * rpeLevelNorm;
    const recoveryNorm = clampVal((readinessPct - 75) / 20.0, -1.0, 1.0);
    const volumeNorm = clampVal(volumeTrend / volumeTrendScale, -1.0, 1.0);
    const sessionQualityNorm = clampVal((lastScore - neutralScore) / levelScale, -1.0, 1.0);

    // Composite Adaptation Score (35% Perf, 25% RPE, 20% Recovery, 10% Vol, 10% Quality)
    const wPerf = 0.35;
    const wRpe = 0.25;
    const wRec = 0.20;
    const wVol = 0.10;
    const wQual = 0.10;

    const rawSignal =
      wPerf * perfNorm + wRpe * rpeNorm + wRec * recoveryNorm + wVol * volumeNorm + wQual * sessionQualityNorm;
    const signalScore = Number(clampVal(rawSignal, -1.0, 1.0).toFixed(2));

    const breakdown: ComponentBreakdown = {
      perfTrend: Number((wPerf * perfNorm).toFixed(2)),
      scoreLevel: Number((wRec * recoveryNorm).toFixed(2)), // mapped to recovery/readiness
      rpeSignal: Number((wRpe * rpeNorm).toFixed(2)),
      volumeTrend: Number((wVol * volumeNorm + wQual * sessionQualityNorm).toFixed(2)),
    };

    // 3. Confidence Calculation (Section 15: meaningful multi-factor score 0-100)
    const historyCredit = 25.0; // 5 sessions window
    const consistencyCredit = clampVal(1.0 - consistency / 12.0, 0.0, 1.0) * 30.0;
    const trendFitCredit = 25.0;
    const agreementCredit = clampVal(1.0 - Math.abs(volumeNorm - rpeTrendNorm) / 2.0, 0.0, 1.0) * 15.0;
    const rawConf = historyCredit + consistencyCredit + trendFitCredit + agreementCredit;
    const confidence = Math.round(clampVal(rawConf, 15.0, 95.0));

    // 4. Decision Engine & Safety Gates
    let decision: Decision = 'HOLD';
    const rules: string[] = [];
    const safetyChecks: { label: string; passed: boolean }[] = [];
    const poorSessionScore = 60.0;
    const minConfidenceToAct = 50;

    // Safety checks evaluation
    const isLastSessionPoor = lastScore < poorSessionScore || actualReps < plannedReps || loggedRpe >= 9;
    const isRpeSafeForProgression = weightedRpe <= 7.8 && loggedRpe <= 8;
    const isRecoverySafe = readinessPct >= 50;
    const isSignalConsistent = consistency <= 9.0;

    safetyChecks.push({
      label: 'Recovery adequate (Readiness ≥ 50%)',
      passed: isRecoverySafe,
    });
    safetyChecks.push({
      label: 'Perceived effort within target (RPE ≤ 8.0)',
      passed: isRpeSafeForProgression,
    });
    safetyChecks.push({
      label: 'Multi-session signal consistency',
      passed: isSignalConsistent,
    });

    if (confidence < minConfidenceToAct) {
      rules.push('LOW_CONFIDENCE_GATE');
      decision = 'HOLD';
    } else if (
      signalScore >= 0.25 &&
      isRpeSafeForProgression &&
      !isLastSessionPoor &&
      isRecoverySafe
    ) {
      decision = 'PROGRESS';
      rules.push('SUPERCOMPENSATION_PROGRESSION');
    } else if (
      (signalScore <= -0.22 && recentPoorSessions >= 2) ||
      (recentPoorSessions >= 2 && weightedRpe >= 8.5) ||
      (signalScore <= -0.35 && !isRecoverySafe)
    ) {
      decision = 'BACK OFF';
      rules.push('PERSISTENT_FATIGUE_BACKOFF');
    } else {
      decision = 'HOLD';
      if (isLastSessionPoor && (signalScore > 0 || perfTrend >= -1.0)) {
        rules.push('ONE_BAD_DAY_GUARD');
        safetyChecks.push({
          label: 'One-Bad-Day Guard active (prevents false regression)',
          passed: true,
        });
      } else if (rpeTrend >= 0.2 || weightedRpe >= 8.0) {
        rules.push('RPE_CREEP_DETECTED');
      } else {
        rules.push('PLATEAU_MAINTENANCE');
      }
    }

    // 5. Next Prescription Calculation (Section 12 & 13)
    let nextWeight = plannedWeight;
    let nextReps = plannedReps;
    let nextSets = plannedSets;
    const repCeiling = archetype === 'dumbbell' ? 12 : 8;
    const repFloor = archetype === 'dumbbell' ? 8 : 5;

    if (decision === 'PROGRESS') {
      if (archetype === 'dumbbell' && plannedReps < repCeiling) {
        nextReps = plannedReps + 1;
        rules.push('DOUBLE_PROGRESSION_REPS_ADDED');
      } else if (archetype === 'dumbbell' && plannedReps >= repCeiling) {
        nextWeight = plannedWeight + weightStep;
        nextReps = repFloor;
        rules.push('DOUBLE_PROGRESSION_REP_CEILING');
      } else {
        const pctJump = Math.abs(signalScore) >= 0.5 ? 0.05 : 0.025;
        nextWeight = Math.round((plannedWeight * (1 + pctJump)) / weightStep) * weightStep;
      }
    } else if (decision === 'BACK OFF') {
      const pctDrop = Math.abs(signalScore) >= 0.5 ? 0.1 : 0.05;
      nextWeight = Math.max(Math.round((plannedWeight * (1 - pctDrop)) / weightStep) * weightStep, 2.5);
      if (Math.abs(signalScore) >= 0.75 && plannedSets > 2) {
        nextSets = plannedSets - 1;
        rules.push('FATIGUE_SET_REDUCTION');
      }
    }

    const deltaPct =
      plannedWeight > 0 ? Number((((nextWeight - plannedWeight) / plannedWeight) * 100).toFixed(1)) : 0;

    // Rationale narrative
    let rationale = '';
    if (rules.includes('ONE_BAD_DAY_GUARD')) {
      rationale =
        'Acute performance dip detected on the latest session, but historical moving average remains strong. The ONE_BAD_DAY_GUARD holds load steady to avoid false regressions from isolated noise.';
    } else if (decision === 'BACK OFF') {
      rationale = `Persistent multi-session fatigue detected across ${recentPoorSessions} sessions (RPE creep to ${weightedRpe.toFixed(
        1
      )}). Backing off load by ${deltaPct}% to restore systemic recovery.`;
    } else if (decision === 'PROGRESS') {
      if (rules.includes('DOUBLE_PROGRESSION_REP_CEILING')) {
        rationale = `Rep ceiling (${repCeiling} reps) conquered. Progressing working load to ${nextWeight} kg while resetting volume to base ${nextReps} reps.`;
      } else if (rules.includes('DOUBLE_PROGRESSION_REPS_ADDED')) {
        rationale = `Positive adaptation confirmed. Micro-progressing reps (+1 rep) to ${nextReps} reps before increasing dumbbell mass.`;
      } else {
        rationale = `Strong positive adaptation confirmed (signal +${signalScore}, confidence ${confidence}%). Advancing working load to ${nextWeight} kg (+${deltaPct}%).`;
      }
    } else if (rules.includes('RPE_CREEP_DETECTED')) {
      rationale = `Target volume completed, but perceived exertion climbed (weighted RPE ${weightedRpe.toFixed(
        1
      )}). Holding steady to avoid premature overtraining.`;
    } else {
      rationale = `Performance baseline is stable within neutral bounds. Maintaining current prescription (${plannedWeight} kg × ${plannedReps} × ${plannedSets}) for consistency.`;
    }

    // Athlete State Estimation Model (Section 4)
    const perfStatus = perfTrend > 0.5 ? 'Improving' : perfTrend < -0.5 ? 'Declining' : 'Stable';
    const fatigue = weightedRpe >= 8.5 || recentPoorSessions >= 2 ? 'High' : weightedRpe >= 7.3 ? 'Moderate' : 'Low';
    const recovery = readinessPct >= 80 ? 'Prime' : readinessPct >= 65 ? 'Good' : readinessPct >= 45 ? 'Adequate' : 'Poor';
    const adaptation = decision === 'PROGRESS' ? 'Positive' : decision === 'BACK OFF' ? 'Fatigue Accumulation' : 'Stable';

    const athleteState: AthleteState = {
      readinessPct,
      performanceStatus: perfStatus,
      fatigueLevel: fatigue,
      recoveryStatus: recovery,
      adaptationStatus: adaptation,
      confidencePct: confidence,
    };

    // Personal Baseline (Section 10)
    const baseline: PersonalBaseline = {
      typicalRpe: Number(weightedRpe.toFixed(1)),
      typicalScore: Number(scoreLevel.toFixed(1)),
      typicalVolume: Math.round(plannedWeight * plannedReps * plannedSets),
      typicalReps: plannedReps,
      sessionsAnalyzed: 5,
    };

    // Counterfactuals (Section 19)
    const counterfactuals: CounterfactualOption[] = [];
    if (decision === 'BACK OFF') {
      counterfactuals.push({
        condition: 'If subjective recovery had been adequate (readiness ≥ 75%) and latest RPE ≤ 7.5',
        resultingAction: 'HOLD',
        explanation: 'Isolated fatigue would be held steady rather than triggering a systemic deload.',
      });
      counterfactuals.push({
        condition: 'If performance trend slope was positive (+1.5 score pts/session)',
        resultingAction: 'PROGRESS',
        explanation: 'Strong positive adaptation would outweigh perceived fatigue and permit a conservative 2.5% progression.',
      });
    } else if (decision === 'HOLD') {
      counterfactuals.push({
        condition: 'If RPE was below target (≤ 6.5) with performance trend > +1.0',
        resultingAction: 'PROGRESS',
        explanation: 'Sufficient reserve velocity would confirm readiness for higher training load.',
      });
      counterfactuals.push({
        condition: 'If two consecutive sessions missed target reps with RPE ≥ 9.0',
        resultingAction: 'BACK OFF',
        explanation: 'Persistent performance deficit would trigger an autoregulated deload step.',
      });
    } else {
      counterfactuals.push({
        condition: 'If RPE had spiked to 9.5 on the final set',
        resultingAction: 'HOLD',
        explanation: 'Exertion gate would intervene to avoid compounding near-failure fatigue.',
      });
      counterfactuals.push({
        condition: 'If subjective readiness dropped below 40% (severe soreness / poor sleep)',
        resultingAction: 'HOLD',
        explanation: 'Pre-workout readiness modifier would scale back the planned progression.',
      });
    }

    // Session Delta
    const sessionDelta: SessionDelta = {
      perfDeltaPct: Number(((lastScore - scoreLevel) / (scoreLevel || 1) * 100).toFixed(1)),
      rpeDelta: Number((loggedRpe - weightedRpe).toFixed(1)),
      volumeDeltaPct: Number((((actualReps * plannedWeight) - (plannedReps * plannedWeight)) / (plannedReps * plannedWeight || 1) * 100).toFixed(1)),
      loadDelta: Number((nextWeight - plannedWeight).toFixed(1)),
      repsDelta: nextReps - plannedReps,
      setsDelta: nextSets - plannedSets,
    };

    const glassBox: GlassBoxMetadata = {
      action: decision,
      recommendedLoad: nextWeight,
      recommendedReps: nextReps,
      signalScore,
      confidence: Number((confidence / 100).toFixed(2)),
      componentBreakdown: breakdown,
      triggeredRules: rules,
      coachingRationale: rationale,
      athleteState,
      baseline,
      counterfactuals,
      sessionDelta,
    };

    return {
      readinessModifier,
      readinessPct,
      adjustedBaselineLoad,
      signalScore,
      confidence,
      decision,
      rules,
      safetyChecks,
      nextWeight,
      nextReps,
      nextSets,
      deltaPct,
      breakdown,
      rationale,
      athleteState,
      baseline,
      counterfactuals,
      sessionDelta,
      glassBox,
    };
  }, [
    archetype,
    sleep,
    freshness,
    energy,
    stress,
    soreness,
    perfTrend,
    scoreLevel,
    rpeTrend,
    weightedRpe,
    volumeTrend,
    consistency,
    lastScore,
    recentPoorSessions,
    plannedWeight,
    plannedReps,
    plannedSets,
    actualReps,
    loggedRpe,
  ]);

  const decisionStyles = {
    PROGRESS: {
      border: 'border-[#8FB69A]/40 bg-[#171C19]',
      accent: '#8FB69A',
      badge: 'bg-[#8FB69A]/15 text-[#8FB69A] border border-[#8FB69A]/30',
    },
    HOLD: {
      border: 'border-[#C7A65A]/40 bg-[#171C19]',
      accent: '#C7A65A',
      badge: 'bg-[#C7A65A]/15 text-[#C7A65A] border border-[#C7A65A]/30',
    },
    'BACK OFF': {
      border: 'border-[#C86B68]/40 bg-[#171C19]',
      accent: '#C86B68',
      badge: 'bg-[#C86B68]/15 text-[#C86B68] border border-[#C86B68]/30',
    },
  }[evaluation.decision];

  return (
    <div className="flex flex-col gap-5 pb-12 max-w-6xl mx-auto" id="view-judge-playground">
      {/* Header Banner */}
      <div className="rounded-2xl bg-[#171C19] border border-[#303832] p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Cpu size={120} className="text-[#8FB69A]" />
        </div>
        <div className="relative z-10 flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#20352A] border border-[#8FB69A]/30 text-[#8FB69A] text-[11px] font-mono font-medium uppercase tracking-wider w-fit">
            <Sparkles size={13} />
            Hackathon Evaluator & Judge Sandbox
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#F1EDE3] tracking-tight">Adaptive Engine Live Playground</h1>
          <p className="text-xs sm:text-sm text-[#B8B8AD] leading-relaxed max-w-3xl">
            Stress-test the non-rigid adaptive engine in real time. Manipulate pre-workout readiness, multi-session rolling trends,
            and acute workout logs to observe the glass-box mathematical decision pipeline.
          </p>
        </div>
      </div>

      {/* Preset Quick-Load Buttons */}
      <div className="flex flex-col gap-2">
        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#B8B8AD] flex items-center gap-1.5">
          <FastForward size={13} className="text-[#8FB69A]" />
          Judge Evaluation Presets
        </div>
        <div className={isLaptop ? "grid grid-cols-2 lg:grid-cols-4 gap-2.5" : "flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar snap-x"}>
          {PRESETS.map((p) => {
            const active = activePresetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 active:scale-[0.99] cursor-pointer ${
                  isLaptop ? 'w-full' : 'w-72 shrink-0 snap-start'
                } ${
                  active
                    ? 'bg-[#1D2520] border-[#8FB69A] text-[#F1EDE3] ring-1 ring-[#8FB69A]/50 shadow-md'
                    : 'bg-[#171C19] border-[#303832] hover:border-[#8FB69A]/40 text-[#B8B8AD]'
                }`}
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="font-bold text-xs text-[#F1EDE3] truncate">{p.title}</span>
                  <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${p.badgeColor}`}>
                    {p.tag}
                  </span>
                </div>
                <p className="text-[11px] text-[#B8B8AD] leading-normal">{p.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Playground Navigation & Quick Actions Menu */}
      <div className="rounded-xl bg-[#171C19] border border-[#303832] p-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[10px] font-mono font-bold uppercase text-[#7A7E77] px-1.5 shrink-0">
            Playground Menu:
          </span>
          <button
            type="button"
            onClick={() => scrollToSection('section-inputs')}
            className="px-3 py-1.5 rounded-lg bg-[#111312] border border-[#303832] hover:border-[#8FB69A]/40 text-[#F1EDE3] text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95"
          >
            <Scale size={13} className="text-[#8FB69A]" />
            Workout Inputs
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('section-verdict')}
            className="px-3 py-1.5 rounded-lg bg-[#111312] border border-[#303832] hover:border-[#8FB69A]/40 text-[#F1EDE3] text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95"
          >
            <Activity size={13} className="text-[#8FB69A]" />
            Engine Verdict
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('section-explainability')}
            className="px-3 py-1.5 rounded-lg bg-[#111312] border border-[#303832] hover:border-[#8FB69A]/40 text-[#F1EDE3] text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95"
          >
            <Cpu size={13} className="text-[#8FB69A]" />
            Glass-Box Audit
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isCustomized ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-[#C7A65A] bg-[#C7A65A]/15 px-2.5 py-0.5 rounded border border-[#C7A65A]/30">
                Custom Modified
              </span>
              <button
                type="button"
                onClick={resetToActivePreset}
                className="px-2.5 py-1 rounded-lg bg-[#20352A] border border-[#8FB69A]/30 text-[#8FB69A] hover:bg-[#20352A]/80 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title="Reset sliders to preset benchmark values"
              >
                <RotateCcw size={12} />
                Reset Preset
              </button>
            </div>
          ) : (
            <span className="text-[10px] font-mono text-[#8FB69A] bg-[#20352A] px-2.5 py-1 rounded-full border border-[#8FB69A]/30 flex items-center gap-1.5">
              <CheckCircle2 size={12} />
              Benchmark: {activePreset.title.split(':')[1]?.trim() || activePreset.title}
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Controls (Left 6 cols) vs Live Output Panel (Right 6 cols) */}
      <div id="section-simulator" className={isLaptop ? "grid grid-cols-12 gap-5 items-start" : "flex flex-col gap-4"}>
        {/* Left Col: Interactive Controls (6 cols on laptop) */}
        <div id="section-inputs" className={isLaptop ? "col-span-6 flex flex-col gap-4" : "flex flex-col gap-4"}>
          {/* Movement Archetype Selector */}
          <div className="rounded-2xl bg-[#171C19] border border-[#303832] p-4 flex flex-col gap-3">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#B8B8AD] flex items-center justify-between">
              <span>Movement Archetype</span>
              <span className="text-[#7A7E77] font-normal">Controls double progression rules</span>
            </div>
            <div className="bg-[#111312] p-1 rounded-xl border border-[#303832] grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setArchetype('barbell')}
                className={`h-10 rounded-lg font-mono text-xs font-medium uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  archetype === 'barbell'
                    ? 'bg-[#8FB69A] text-[#111312] font-semibold shadow-sm'
                    : 'text-[#B8B8AD] hover:text-[#F1EDE3]'
                }`}
              >
                <Dumbbell size={15} />
                Barbell Compound
              </button>
              <button
                type="button"
                onClick={() => setArchetype('dumbbell')}
                className={`h-10 rounded-lg font-mono text-xs font-medium uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  archetype === 'dumbbell'
                    ? 'bg-[#8FB69A] text-[#111312] font-semibold shadow-sm'
                    : 'text-[#B8B8AD] hover:text-[#F1EDE3]'
                }`}
              >
                <Layers size={15} />
                Dumbbell Hypertrophy
              </button>
            </div>
          </div>

          {/* 1. Pre-Workout Readiness Sliders (All 5 Parameters) */}
          <div className="rounded-2xl bg-[#171C19] border border-[#303832] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8FB69A] flex items-center gap-1.5">
                <BatteryCharging size={14} className="stroke-[2.5]" />
                1. Pre-Workout Readiness (5 Subjective Signals)
              </span>
              <span className="font-mono text-xs text-[#8FB69A] font-bold">
                Readiness: {evaluation.readinessPct}% ({evaluation.readinessModifier > 0 ? `+${(evaluation.readinessModifier * 100).toFixed(1)}` : (evaluation.readinessModifier * 100).toFixed(1)}% load mod)
              </span>
            </div>

            <div className={`p-3 rounded-xl border border-[#303832] bg-[#111312] ${isLaptop ? "grid grid-cols-2 gap-3" : "grid grid-cols-1 gap-3"}`}>
              <div>
                <div className="flex justify-between items-center text-xs text-[#F1EDE3] mb-1.5">
                  <span>Sleep Quality</span>
                  <span className="font-mono text-xs text-[#8FB69A] bg-[#20352A] px-2 py-0.5 rounded">{sleep}/5</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={sleep}
                  onChange={(e) => setSleep(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs text-[#F1EDE3] mb-1.5">
                  <span>Muscle Freshness</span>
                  <span className="font-mono text-xs text-[#8FB69A] bg-[#20352A] px-2 py-0.5 rounded">{freshness}/5</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={freshness}
                  onChange={(e) => setFreshness(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs text-[#F1EDE3] mb-1.5">
                  <span>Energy Level</span>
                  <span className="font-mono text-xs text-[#8FB69A] bg-[#20352A] px-2 py-0.5 rounded">{energy}/5</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={energy}
                  onChange={(e) => setEnergy(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs text-[#F1EDE3] mb-1.5">
                  <span>Stress (1=Low, 5=High)</span>
                  <span className="font-mono text-xs text-[#C7A65A] bg-[#20352A] px-2 py-0.5 rounded">{stress}/5</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={stress}
                  onChange={(e) => setStress(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className={isLaptop ? "col-span-2" : ""}>
                <div className="flex justify-between items-center text-xs text-[#F1EDE3] mb-1.5">
                  <span>Soreness (1=None, 5=Severe)</span>
                  <span className="font-mono text-xs text-[#C86B68] bg-[#20352A] px-2 py-0.5 rounded">{soreness}/5</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={soreness}
                  onChange={(e) => setSoreness(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* 2. Rolling History Signals */}
          <div className="rounded-2xl bg-[#171C19] border border-[#303832] p-4 flex flex-col gap-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8FB69A] flex items-center gap-1.5">
              <Activity size={14} className="stroke-[2.5]" />
              2. Rolling Multi-Session History Window (5 Sessions)
            </span>

            <div className={`p-3 rounded-xl border border-[#303832] bg-[#111312] ${isLaptop ? "grid grid-cols-2 gap-3.5" : "grid grid-cols-1 gap-3"}`}>
              <div>
                <div className="flex justify-between items-center text-xs text-[#F1EDE3] mb-1.5">
                  <span>Performance Trend Slope</span>
                  <span className={`font-mono text-xs px-2 py-0.5 rounded ${perfTrend >= 0 ? 'text-[#8FB69A]' : 'text-[#C86B68]'} bg-[#20352A]`}>
                    {perfTrend > 0 ? `+${perfTrend}` : perfTrend} pts
                  </span>
                </div>
                <input
                  type="range"
                  min={-5}
                  max={5}
                  step={0.1}
                  value={perfTrend}
                  onChange={(e) => setPerfTrend(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs text-[#F1EDE3] mb-1.5">
                  <span>Weighted Average Score</span>
                  <span className="font-mono text-xs text-[#8FB69A] bg-[#20352A] px-2 py-0.5 rounded">{scoreLevel} pts</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={100}
                  step={1}
                  value={scoreLevel}
                  onChange={(e) => setScoreLevel(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs text-[#F1EDE3] mb-1.5">
                  <span>RPE Trend Slope</span>
                  <span className={`font-mono text-xs px-2 py-0.5 rounded ${rpeTrend <= 0 ? 'text-[#8FB69A]' : 'text-[#C86B68]'} bg-[#20352A]`}>
                    {rpeTrend > 0 ? `+${rpeTrend}` : rpeTrend}/sess
                  </span>
                </div>
                <input
                  type="range"
                  min={-1.0}
                  max={1.0}
                  step={0.05}
                  value={rpeTrend}
                  onChange={(e) => setRpeTrend(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs text-[#F1EDE3] mb-1.5">
                  <span>Weighted Average RPE</span>
                  <span className={`font-mono text-xs px-2 py-0.5 rounded ${weightedRpe <= 7.5 ? 'text-[#8FB69A]' : 'text-[#C86B68]'} bg-[#20352A]`}>
                    RPE {weightedRpe}
                  </span>
                </div>
                <input
                  type="range"
                  min={4.0}
                  max={10.0}
                  step={0.1}
                  value={weightedRpe}
                  onChange={(e) => setWeightedRpe(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs text-[#F1EDE3] mb-1.5">
                  <span>Volume Trajectory</span>
                  <span className="font-mono text-xs text-[#8FB69A] bg-[#20352A] px-2 py-0.5 rounded">
                    {volumeTrend > 0 ? `+${volumeTrend}%` : `${volumeTrend}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min={-30}
                  max={30}
                  step={1}
                  value={volumeTrend}
                  onChange={(e) => setVolumeTrend(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs text-[#F1EDE3] mb-1.5">
                  <span>Recent Poor Sessions Count</span>
                  <span className={`font-mono text-xs px-2 py-0.5 rounded ${recentPoorSessions >= 2 ? 'text-[#C86B68]' : 'text-[#8FB69A]'} bg-[#20352A]`}>
                    {recentPoorSessions} of 5
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={1}
                  value={recentPoorSessions}
                  onChange={(e) => setRecentPoorSessions(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* 3. Current Session Inputs */}
          <div className="rounded-2xl bg-[#171C19] border border-[#303832] p-4 flex flex-col gap-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8FB69A] flex items-center gap-1.5">
              <Scale size={14} className="stroke-[2.5]" />
              3. Current Session Execution & Acute Log
            </span>

            <div className={`p-3 rounded-xl border border-[#303832] bg-[#111312] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5`}>
              <div>
                <span className="text-[10px] text-[#B8B8AD] font-mono block">Plan Wt (kg)</span>
                <input
                  type="number"
                  value={plannedWeight}
                  onChange={(e) => setPlannedWeight(Number(e.target.value))}
                  className="w-full bg-[#1D2520] border border-[#303832] rounded-lg p-2 text-[#F1EDE3] font-mono text-sm font-bold mt-1 focus:border-[#8FB69A] outline-none"
                />
              </div>

              <div>
                <span className="text-[10px] text-[#B8B8AD] font-mono block">Plan Reps</span>
                <input
                  type="number"
                  value={plannedReps}
                  onChange={(e) => setPlannedReps(Number(e.target.value))}
                  className="w-full bg-[#1D2520] border border-[#303832] rounded-lg p-2 text-[#F1EDE3] font-mono text-sm font-bold mt-1 focus:border-[#8FB69A] outline-none"
                />
              </div>

              <div>
                <span className="text-[10px] text-[#B8B8AD] font-mono block">Plan Sets</span>
                <input
                  type="number"
                  value={plannedSets}
                  onChange={(e) => setPlannedSets(Number(e.target.value))}
                  className="w-full bg-[#1D2520] border border-[#303832] rounded-lg p-2 text-[#F1EDE3] font-mono text-sm font-bold mt-1 focus:border-[#8FB69A] outline-none"
                />
              </div>

              <div>
                <span className="text-[10px] text-[#B8B8AD] font-mono block">Actual Reps</span>
                <input
                  type="number"
                  value={actualReps}
                  onChange={(e) => setActualReps(Number(e.target.value))}
                  className="w-full bg-[#1D2520] border border-[#303832] rounded-lg p-2 text-[#F1EDE3] font-mono text-sm font-bold mt-1 focus:border-[#8FB69A] outline-none"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] text-[#B8B8AD] font-mono block">Logged RPE</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={loggedRpe}
                  onChange={(e) => setLoggedRpe(Number(e.target.value))}
                  className="w-full bg-[#1D2520] border border-[#303832] rounded-lg p-2 text-[#F1EDE3] font-mono text-sm font-bold mt-1 focus:border-[#8FB69A] outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Live Output Panel (6 cols on laptop, sticky top-4) */}
        <div id="section-verdict" className={isLaptop ? "col-span-6 flex flex-col gap-4 sticky top-4 self-start" : "flex flex-col gap-4"}>
          {/* Core Decision Hero Card */}
          <div className={`rounded-2xl border p-4 sm:p-5 shadow-xl flex flex-col gap-4 relative overflow-hidden ${decisionStyles.border}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#B8B8AD]">
                Engine Action Output
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide uppercase font-mono ${decisionStyles.badge}`}>
                {evaluation.decision}
              </span>
            </div>

            {/* Decision and Prescription in Dedicated Non-Overlapping Blocks */}
            <div className="flex flex-col gap-3 pt-0.5">
              <div>
                <div className="text-3xl font-black text-[#F1EDE3] tracking-tight">{evaluation.decision}</div>
                <div className="text-xs text-[#B8B8AD] font-mono pt-0.5">
                  Delta Load: {evaluation.deltaPct > 0 ? `+${evaluation.deltaPct}` : evaluation.deltaPct}%
                </div>
              </div>

              <div className="rounded-xl bg-[#111312] border border-[#303832] p-3 flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-[#B8B8AD] uppercase shrink-0">Prescription</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-[#8FB69A] truncate">
                  {evaluation.nextWeight} kg × {evaluation.nextReps} × {evaluation.nextSets}
                </span>
              </div>
            </div>

            {/* Signal & Confidence Meters */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#303832]">
              <div className="rounded-xl bg-[#111312] border border-[#303832] p-3 flex flex-col min-w-0">
                <span className="text-[10px] font-mono uppercase text-[#B8B8AD] truncate">Signal S</span>
                <span className="text-xl font-black font-mono text-[#F1EDE3] pt-0.5">
                  {evaluation.signalScore > 0 ? `+${evaluation.signalScore}` : evaluation.signalScore}
                </span>
                <span className="text-[9px] text-[#7A7E77] font-mono">Range [-1.0, +1.0]</span>
              </div>

              <div className="rounded-xl bg-[#111312] border border-[#303832] p-3 flex flex-col min-w-0">
                <span className="text-[10px] font-mono uppercase text-[#B8B8AD] truncate">Confidence</span>
                <span className="text-xl font-black font-mono text-[#8FB69A] pt-0.5">{evaluation.confidence}%</span>
                <span className="text-[9px] text-[#7A7E77] font-mono truncate">Noise-gated</span>
              </div>
            </div>
          </div>

          {/* Sports Science Coaching Rationale */}
          {evaluation.rationale && (
            <div className="bg-[#171C19] border-l-4 border-[#8FB69A] p-4 rounded-r-xl border-y border-r border-[#303832] flex flex-col gap-1.5 shadow-md">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#8FB69A]">
                <Activity size={13} className="stroke-[2.5]" />
                Sports Science Coaching Rationale
              </div>
              <p className="text-[#F1EDE3] text-sm leading-relaxed font-sans">{evaluation.rationale}</p>
            </div>
          )}

          {/* Active Triggered Rules Badges */}
          {evaluation.rules.length > 0 && (
            <div className="rounded-2xl bg-[#171C19] border border-[#303832] p-4 flex flex-col gap-2.5 shadow-md">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#B8B8AD]">
                Active Rule Triggers ({evaluation.rules.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {evaluation.rules.map((ruleKey) => {
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

          {/* Active Safety Gates Checklist */}
          <div className="rounded-2xl bg-[#171C19] border border-[#303832] p-4 flex flex-col gap-2 shadow-md">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#B8B8AD]">
              Active Safety Gates & Invariants
            </span>
            <div className="flex flex-col gap-1.5 text-xs">
              {evaluation.safetyChecks.map((sc, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 size={14} className={sc.passed ? 'text-[#8FB69A]' : 'text-[#C7A65A]'} />
                  <span className={sc.passed ? 'text-[#F1EDE3]' : 'text-[#C7A65A]'}>{sc.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section B: Full-Width Deep Explainability Audit Suite */}
      <div id="section-explainability" className="w-full flex flex-col gap-3 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#8FB69A] flex items-center gap-1.5">
            <Cpu size={15} />
            Deep Mathematical Audit Trail & Counterfactual Engine
          </span>
          <span className="text-[10px] font-mono text-[#8FB69A] bg-[#20352A] px-2.5 py-0.5 rounded-full border border-[#8FB69A]/30">
            Full-Width Inspection Suite
          </span>
        </div>

        <GlassBoxDrawer
          metadata={evaluation.glassBox}
          confidence={evaluation.confidence}
          action={evaluation.decision}
          signalScore={evaluation.signalScore}
          initialExpanded={true}
        />
      </div>
    </div>
  );
}
