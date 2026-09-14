import { useMemo, useState } from 'react';
import {
  Activity,
  BatteryCharging,
  Check,
  Flame,
  HeartPulse,
  Moon,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { Prescription } from '../types/api';

interface PreWorkoutCheckInCardProps {
  initialPlan: Prescription | null;
  onApplyAdjustment: (adjustedWeight: number, modifierPct: number, reason: string) => void;
}

interface MetricConfig {
  id: 'sleep' | 'freshness' | 'energy' | 'stress' | 'soreness';
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  levels: { [score: number]: { label: string; desc: string } };
}

const METRICS: MetricConfig[] = [
  {
    id: 'sleep',
    label: 'Sleep Quality',
    icon: Moon,
    levels: {
      1: { label: 'Insomnia / <4h', desc: 'Severe sleep deprivation' },
      2: { label: 'Restless / 5h', desc: 'Fragmented or poor sleep' },
      3: { label: 'Average / 7h', desc: 'Baseline recovery sleep' },
      4: { label: 'Solid / 8h', desc: 'Deep, restorative sleep' },
      5: { label: 'Optimal / 9h+', desc: 'Peak REM & growth hormone' },
    },
  },
  {
    id: 'freshness',
    label: 'Muscle Freshness',
    icon: Zap,
    levels: {
      1: { label: 'Exhausted', desc: 'Heavy accumulated fatigue' },
      2: { label: 'Tight / Sluggish', desc: 'Residual tension from prior volume' },
      3: { label: 'Normal', desc: 'Neutral contractile baseline' },
      4: { label: 'Springy', desc: 'High neuromuscular drive' },
      5: { label: 'Supercharged', desc: 'Peak muscle supercompensation' },
    },
  },
  {
    id: 'energy',
    label: 'Energy & Drive',
    icon: Flame,
    levels: {
      1: { label: 'Lethargic', desc: 'Low autonomic arousal' },
      2: { label: 'Low Motivation', desc: 'Mental drag / low glucose' },
      3: { label: 'Steady', desc: 'Standard training drive' },
      4: { label: 'High Focus', desc: 'Locked in and energized' },
      5: { label: 'Euphoric Drive', desc: 'Peak adrenaline & readiness' },
    },
  },
  {
    id: 'stress',
    label: 'Life / Mental Stress',
    icon: HeartPulse,
    levels: {
      1: { label: 'Zen / Zero', desc: 'Total parasympathetic calm' },
      2: { label: 'Low', desc: 'Minor routine obligations' },
      3: { label: 'Moderate', desc: 'Typical work/life stress' },
      4: { label: 'Elevated', desc: 'High cortisol / busy schedule' },
      5: { label: 'Overwhelmed', desc: 'Extreme chronic life stress' },
    },
  },
  {
    id: 'soreness',
    label: 'Muscle Soreness (DOMS)',
    icon: Activity,
    levels: {
      1: { label: 'None', desc: 'Muscles completely pain-free' },
      2: { label: 'Faint', desc: 'Mild stiffness on palpation' },
      3: { label: 'Noticeable', desc: 'Mild DOMS in target muscle groups' },
      4: { label: 'Painful DOMS', desc: 'Tender to touch; restricted ROM' },
      5: { label: 'Severe Soreness', desc: 'Acute soreness impairing movement' },
    },
  },
];

export function PreWorkoutCheckInCard({ initialPlan, onApplyAdjustment }: PreWorkoutCheckInCardProps) {
  const [sleep, setSleep] = useState<number>(3);
  const [freshness, setFreshness] = useState<number>(3);
  const [energy, setEnergy] = useState<number>(3);
  const [stress, setStress] = useState<number>(3);
  const [soreness, setSoreness] = useState<number>(3);
  const [applied, setApplied] = useState<boolean>(false);

  const targetWeight = initialPlan?.weight ?? 60.0;

  // Real-time calculation of multi-signal readiness modifier
  const { readinessScore, modifier, modifierPct, adjustedWeight, message, status, statusColor } = useMemo(() => {
    // 5-signal composite score: sleep (25%), freshness (25%), energy (25%), stress (12.5%), soreness (12.5%)
    // Note: stress and soreness are inverted (1 = best, 5 = worst)
    const rawScore =
      (sleep * 0.25 + freshness * 0.25 + energy * 0.25 + (6 - stress) * 0.125 + (6 - soreness) * 0.125) * 20;
    const clampedScore = Math.round(Math.max(15, Math.min(98, rawScore)));

    // Bounded load modifier [-0.10, +0.10]
    const clampedMod = Math.max(-0.1, Math.min(0.1, (clampedScore - 75) / 250));
    const pct = Number((clampedMod * 100).toFixed(1));

    // Scale target load by (1 + modifier) rounded to 2.5 kg plate increment
    const rawAdjusted = targetWeight * (1 + clampedMod);
    const stepped = Math.max(Math.round(rawAdjusted / 2.5) * 2.5, 2.5);

    let msg = '';
    let st: 'PRIME RECOVERY' | 'ADEQUATE BASELINE' | 'ELEVATED FATIGUE' = 'ADEQUATE BASELINE';
    let color = 'text-[#C7A65A] bg-[#C7A65A]/15 border-[#C7A65A]/30';

    if (clampedScore >= 80) {
      st = 'PRIME RECOVERY';
      color = 'text-[#8FB69A] bg-[#8FB69A]/15 border-[#8FB69A]/30';
      msg = `High recovery velocity detected (+${pct}%). Contractile tissues and CNS are primed. Target load scaled up by +${(stepped - targetWeight).toFixed(1)} kg to exploit supercompensation.`;
    } else if (clampedScore < 60) {
      st = 'ELEVATED FATIGUE';
      color = 'text-[#C86B68] bg-[#C86B68]/15 border-[#C86B68]/30';
      const flags: string[] = [];
      if (sleep <= 2) flags.push('poor sleep');
      if (soreness >= 4) flags.push('severe DOMS');
      if (stress >= 4) flags.push('high cortisol');
      if (freshness <= 2) flags.push('sluggish musculature');
      const reason = flags.length > 0 ? flags.join(', ') : 'systemic fatigue markers';
      msg = `${reason.charAt(0).toUpperCase() + reason.slice(1)} detected. Target load moderated by ${pct}% (${(stepped - targetWeight).toFixed(1)} kg) to safeguard technique and joint integrity.`;
    } else {
      st = 'ADEQUATE BASELINE';
      color = 'text-[#F1EDE3] bg-[#20352A] border-[#303832]';
      msg = 'Readiness matches personal baseline (100%). Ready to execute target working prescription with full intensity.';
    }

    return {
      readinessScore: clampedScore,
      modifier: clampedMod,
      modifierPct: pct,
      adjustedWeight: stepped,
      message: msg,
      status: st,
      statusColor: color,
    };
  }, [sleep, freshness, energy, stress, soreness, targetWeight]);

  const handleApply = () => {
    onApplyAdjustment(adjustedWeight, modifierPct, message);
    setApplied(true);
  };

  const getMetricValue = (id: MetricConfig['id']) => {
    switch (id) {
      case 'sleep':
        return sleep;
      case 'freshness':
        return freshness;
      case 'energy':
        return energy;
      case 'stress':
        return stress;
      case 'soreness':
        return soreness;
    }
  };

  const setMetricValue = (id: MetricConfig['id'], val: number) => {
    setApplied(false);
    switch (id) {
      case 'sleep':
        setSleep(val);
        break;
      case 'freshness':
        setFreshness(val);
        break;
      case 'energy':
        setEnergy(val);
        break;
      case 'stress':
        setStress(val);
        break;
      case 'soreness':
        setSoreness(val);
        break;
    }
  };

  return (
    <div
      id="pre-workout-readiness-card"
      className="rounded-3xl bg-[#171C19] border border-[#303832] p-4 sm:p-5 shadow-xl flex flex-col gap-4 relative overflow-hidden"
    >
      {/* Top Header with Gauge & Status Pill */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Circular Mini Gauge */}
          <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-[#20352A]"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`${
                  readinessScore >= 80 ? 'text-[#8FB69A]' : readinessScore >= 60 ? 'text-[#C7A65A]' : 'text-[#C86B68]'
                } transition-all duration-500`}
                strokeDasharray={`${readinessScore}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute font-mono text-xs font-black text-[#F1EDE3]">{readinessScore}%</span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <BatteryCharging size={14} className="text-[#8FB69A]" />
              <span className="text-xs font-bold text-[#F1EDE3] uppercase font-mono tracking-wide">
                Readiness Check-In
              </span>
            </div>
            <div className="text-[10px] text-[#B8B8AD]">Whoop-style 5-signal biometric survey</div>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-full border text-[9px] font-mono font-bold uppercase tracking-wider ${statusColor}`}>
          {status}
        </span>
      </div>

      {/* 5 Tactile Mobile Segmented Controllers */}
      <div className="flex flex-col gap-3 bg-[#111312] p-3 sm:p-3.5 rounded-2xl border border-[#303832]">
        {METRICS.map((m) => {
          const Icon = m.icon;
          const currentVal = getMetricValue(m.id);
          const currentInfo = m.levels[currentVal];

          return (
            <div key={m.id} className="flex flex-col gap-1.5 pb-2 border-b border-[#303832]/60 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-[#F1EDE3] font-medium">
                  <Icon size={13} className="text-[#8FB69A]" />
                  {m.label}
                </span>
                <span className="font-mono text-[10px] text-[#8FB69A] font-semibold">
                  {currentInfo.label}
                </span>
              </div>

              {/* 5-Point Segmented Touch Buttons */}
              <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={m.label}>
                {[1, 2, 3, 4, 5].map((lvl) => {
                  const isSelected = currentVal === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setMetricValue(m.id, lvl)}
                      className={`h-9 rounded-xl font-mono text-xs font-bold flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
                        isSelected
                          ? 'bg-[#8FB69A] text-[#111312] shadow-md scale-[1.04]'
                          : 'bg-[#1D2520] text-[#B8B8AD] hover:text-[#F1EDE3] border border-[#303832]'
                      }`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic Load Feedback Preview Banner */}
      <div className="flex flex-col gap-2 rounded-2xl bg-[#1D2520] border border-[#303832] p-3.5">
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-[#B8B8AD]">
            Scheduled: <strong className="text-[#F1EDE3]">{targetWeight} kg</strong>
          </span>
          <span className="text-[#B8B8AD] flex items-center gap-1">
            ➔ Target:{' '}
            <strong className="text-[#8FB69A] text-sm">
              {adjustedWeight} kg ({modifierPct > 0 ? `+${modifierPct}%` : `${modifierPct}%`})
            </strong>
          </span>
        </div>
        <p className="text-[11px] text-[#B8B8AD] leading-relaxed font-sans">{message}</p>
      </div>

      {/* 1-Tap Apply Button */}
      <button
        type="button"
        id="btn-apply-readiness"
        onClick={handleApply}
        disabled={applied && modifier === 0}
        className={`w-full h-12 rounded-2xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
          applied
            ? 'bg-[#20352A] text-[#8FB69A] border border-[#8FB69A]/40'
            : 'bg-[#8FB69A] hover:bg-[#A8D1B1] text-[#111312]'
        }`}
      >
        {applied ? (
          <>
            <Check size={16} className="stroke-[3]" /> Applied to Workout ({adjustedWeight} kg)
          </>
        ) : (
          <>
            <Sparkles size={16} className="stroke-[2.5]" /> Apply Readiness to Session ({adjustedWeight} kg)
          </>
        )}
      </button>
    </div>
  );
}
