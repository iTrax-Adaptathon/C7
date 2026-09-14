// Visual treatment for backend enums. The decision text itself is always
// rendered verbatim; colour is only reinforcement.

import { ArrowDown, Minus, TrendingUp, type LucideIcon } from 'lucide-react';
import type { Decision, TrendDirection } from '../types/api';

export interface DecisionTheme {
  label: Decision;
  /** Tailwind classes for a pill: background, border and text. */
  badge: string;
  /** Solid text colour class. */
  text: string;
  /** Hex accent used for SVG / inline styles. */
  accent: string;
  /** Solid button background + on-colour text. */
  button: string;
  Icon: LucideIcon;
}

const THEMES: Record<Decision, DecisionTheme> = {
  PROGRESS: {
    label: 'PROGRESS',
    badge: 'bg-[#00a572]/20 border-[#4edea3]/40 text-[#4edea3]',
    text: 'text-[#4edea3]',
    accent: '#4edea3',
    button: 'bg-[#4edea3] text-[#003824]',
    Icon: TrendingUp,
  },
  HOLD: {
    label: 'HOLD',
    badge: 'bg-[#f59e0b]/15 border-[#f59e0b]/40 text-[#fbbf24]',
    text: 'text-[#fbbf24]',
    accent: '#fbbf24',
    button: 'bg-[#fbbf24] text-[#3b2a00]',
    Icon: Minus,
  },
  'BACK OFF': {
    label: 'BACK OFF',
    badge: 'bg-[#ef4444]/15 border-[#ef4444]/40 text-[#f87171]',
    text: 'text-[#f87171]',
    accent: '#f87171',
    button: 'bg-[#f87171] text-[#3f0a0a]',
    Icon: ArrowDown,
  },
};

export function decisionTheme(decision: Decision): DecisionTheme {
  return THEMES[decision];
}

export function trendLabel(trend: TrendDirection): string {
  switch (trend) {
    case 'IMPROVING':
      return 'Improving';
    case 'DECLINING':
      return 'Declining';
    default:
      return 'Stable';
  }
}

export function trendGlyph(trend: TrendDirection): string {
  switch (trend) {
    case 'IMPROVING':
      return '↑';
    case 'DECLINING':
      return '↓';
    default:
      return '→';
  }
}

export interface RpeTier {
  label: 'Easy' | 'Moderate' | 'Hard' | 'Max effort';
  /** Pill classes. */
  badge: string;
  text: string;
}

export function rpeTier(rpe: number): RpeTier {
  if (rpe <= 3) {
    return { label: 'Easy', badge: 'bg-[#00a572]/20 border-[#4edea3]/40 text-[#4edea3]', text: 'text-[#4edea3]' };
  }
  if (rpe <= 6) {
    return { label: 'Moderate', badge: 'bg-[#38bdf8]/15 border-[#38bdf8]/40 text-[#38bdf8]', text: 'text-[#38bdf8]' };
  }
  if (rpe <= 8) {
    return { label: 'Hard', badge: 'bg-[#f59e0b]/15 border-[#f59e0b]/40 text-[#fbbf24]', text: 'text-[#fbbf24]' };
  }
  return { label: 'Max effort', badge: 'bg-[#ef4444]/15 border-[#ef4444]/40 text-[#f87171]', text: 'text-[#f87171]' };
}

/** "+2.5 kg" / "−7.5 kg", or null when unchanged. */
export function weightDelta(from: number, to: number): string | null {
  const diff = Math.round((to - from) * 100) / 100;
  if (diff === 0) return null;
  const magnitude = Number.isInteger(diff) ? String(Math.abs(diff)) : Math.abs(diff).toFixed(1);
  return `${diff > 0 ? '+' : '−'}${magnitude} kg`;
}
