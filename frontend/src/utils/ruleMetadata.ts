import {
  Activity,
  AlertTriangle,
  Award,
  Layers,
  Scale,
  ShieldCheck,
  TrendingDown,
  Zap,
} from 'lucide-react';

export interface RuleMeta {
  label: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}

export const RULE_METADATA: Record<string, RuleMeta> = {
  ONE_BAD_DAY_GUARD: {
    label: 'One-Bad-Day Guard',
    desc: 'Isolated acute fatigue detected; plan held steady to prevent false deloads.',
    icon: ShieldCheck,
    color: 'border-[#8FB69A]/30 bg-[#8FB69A]/15 text-[#8FB69A]',
  },
  RPE_CREEP_DETECTED: {
    label: 'RPE Creep Detected',
    desc: 'Effort escalated across recent sessions; holding load to manage systemic fatigue.',
    icon: AlertTriangle,
    color: 'border-[#C7A65A]/30 bg-[#C7A65A]/15 text-[#C7A65A]',
  },
  SUPERCOMPENSATION_PROGRESSION: {
    label: 'Supercompensation',
    desc: 'Adaptation confirmed with strong execution and controlled effort.',
    icon: Zap,
    color: 'border-[#8FB69A]/30 bg-[#8FB69A]/15 text-[#8FB69A]',
  },
  DOUBLE_PROGRESSION_REP_CEILING: {
    label: 'Rep Ceiling Conquered',
    desc: 'Max reps hit consistently; load stepped up while resetting reps to base.',
    icon: Award,
    color: 'border-[#8FB69A]/30 bg-[#8FB69A]/15 text-[#A8D1B1]',
  },
  DOUBLE_PROGRESSION_REPS_ADDED: {
    label: 'Micro-Progression (+1 Rep)',
    desc: 'Adding volume through reps to avoid coarse weight jumps on lighter loads.',
    icon: Layers,
    color: 'border-[#8FB69A]/30 bg-[#8FB69A]/15 text-[#8FB69A]',
  },
  PERSISTENT_FATIGUE_BACKOFF: {
    label: 'Persistent Fatigue Deload',
    desc: 'Multi-session performance decline detected; backing off load to recover.',
    icon: TrendingDown,
    color: 'border-[#C86B68]/30 bg-[#C86B68]/15 text-[#C86B68]',
  },
  FATIGUE_SET_REDUCTION: {
    label: 'Set Deload Activated',
    desc: 'High fatigue signal prompted set reduction down to safe minimum floor.',
    icon: Scale,
    color: 'border-[#C86B68]/30 bg-[#C86B68]/15 text-[#C86B68]',
  },
  PLATEAU_MAINTENANCE: {
    label: 'Steady Plateau',
    desc: 'Performance stable within target band; maintaining prescription.',
    icon: Activity,
    color: 'border-[#303832] bg-[#1D2520] text-[#B8B8AD]',
  },
  LOW_CONFIDENCE_GATE: {
    label: 'Low Confidence Gate',
    desc: 'Noisy data points detected; action deferred until signal stabilizes.',
    icon: ShieldCheck,
    color: 'border-[#C7A65A]/30 bg-[#C7A65A]/15 text-[#C7A65A]',
  },
  INSUFFICIENT_HISTORY: {
    label: 'Calibration Phase',
    desc: 'Logging initial sessions to establish baseline athlete velocity.',
    icon: Activity,
    color: 'border-[#303832] bg-[#1D2520] text-[#B8B8AD]',
  },
};
