import type { Prescription } from '../types/api';
import { formatWeight } from '../utils/format';

interface PrescriptionDisplayProps {
  prescription: Prescription;
  size?: 'md' | 'lg';
  accentClass?: string;
}

/** "62.5 kg × 8 × 3" with the weight emphasised. */
export function PrescriptionDisplay({ prescription, size = 'md', accentClass = 'text-[#F1EDE3]' }: PrescriptionDisplayProps) {
  const weightSize = size === 'lg' ? 'text-5xl' : 'text-3xl';
  const restSize = size === 'lg' ? 'text-xl' : 'text-lg';
  return (
    <div className="flex items-baseline gap-2 font-mono">
      <span className={`${weightSize} font-black tracking-tight ${accentClass}`}>{formatWeight(prescription.weight)}</span>
      <span className={`${restSize} font-semibold text-[#B8B8AD]`}>
        × {prescription.reps} × {prescription.sets}
      </span>
    </div>
  );
}
