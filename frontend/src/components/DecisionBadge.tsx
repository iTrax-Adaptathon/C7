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
  const sizing = size === 'lg' ? 'px-4 py-2 text-base gap-2' : 'px-2.5 py-1 text-[11px] gap-1.5';
  return (
    <span
      className={`inline-flex items-center rounded-full border font-mono font-bold uppercase tracking-wider ${sizing} ${theme.badge}`}
    >
      <Icon size={size === 'lg' ? 18 : 13} className="stroke-[2.5]" />
      {theme.label}
    </span>
  );
}
