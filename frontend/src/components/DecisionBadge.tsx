import type { Decision } from '../types/api';
import { decisionTheme } from '../utils/decision';

interface DecisionBadgeProps {
  decision: Decision;
  size?: 'sm' | 'lg';
}

/** The decision as text (always) plus colour and icon as reinforcement. */
export function DecisionBadge({ decision, size = 'sm' }: DecisionBadgeProps) {
  const theme = decisionTheme(decision);
  const Icon = theme.Icon;
  const sizing = size === 'lg' ? 'px-4 py-1.5 text-sm gap-2 font-bold' : 'px-2.5 py-1 text-xs gap-1.5 font-semibold';
  return (
    <span
      className={`inline-flex items-center rounded-full border uppercase tracking-wide font-mono ${sizing} ${theme.badge}`}
    >
      <Icon size={size === 'lg' ? 16 : 12} className="stroke-[2.5]" />
      {theme.label}
    </span>
  );
}

