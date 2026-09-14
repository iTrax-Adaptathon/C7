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
    badge: 'bg-[#8FB69A]/15 border-[#8FB69A]/30 text-[#8FB69A]',
    text: 'text-[#8FB69A]',
    accent: '#8FB69A',
    button: 'bg-[#8FB69A] hover:bg-[#A8D1B1] text-[#111312] font-semibold',
    Icon: TrendingUp,
  },
  HOLD: {
    label: 'HOLD',
    badge: 'bg-[#C7A65A]/15 border-[#C7A65A]/30 text-[#C7A65A]',
    text: 'text-[#C7A65A]',
    accent: '#C7A65A',
    button: 'bg-[#C7A65A] hover:bg-[#d8b86d] text-[#111312] font-semibold',
    Icon: Minus,
  },
  'BACK OFF': {
    label: 'BACK OFF',
    badge: 'bg-[#C86B68]/15 border-[#C86B68]/30 text-[#C86B68]',
    text: 'text-[#C86B68]',
    accent: '#C86B68',
    button: 'bg-[#C86B68] hover:bg-[#d47c79] text-[#111312] font-semibold',
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
    return {
      label: 'Easy',
      badge: 'bg-[#8FB69A]/15 border-[#8FB69A]/30 text-[#8FB69A]',
      text: 'text-[#8FB69A]',
    };
  }
  if (rpe <= 6) {
    return {
      label: 'Moderate',
      badge: 'bg-[#A8D1B1]/15 border-[#A8D1B1]/30 text-[#A8D1B1]',
      text: 'text-[#A8D1B1]',
    };
  }
  if (rpe <= 8) {
    return {
      label: 'Hard',
      badge: 'bg-[#C7A65A]/15 border-[#C7A65A]/30 text-[#C7A65A]',
      text: 'text-[#C7A65A]',
    };
  }
  return {
    label: 'Max effort',
    badge: 'bg-[#C86B68]/15 border-[#C86B68]/30 text-[#C86B68]',
    text: 'text-[#C86B68]',
  };
}


/** "+2.5 kg" / "−7.5 kg", or null when unchanged. */
export function weightDelta(from: number, to: number): string | null {
  const diff = Math.round((to - from) * 100) / 100;
  if (diff === 0) return null;
  const magnitude = Number.isInteger(diff) ? String(Math.abs(diff)) : Math.abs(diff).toFixed(1);
  return `${diff > 0 ? '+' : '−'}${magnitude} kg`;
}
