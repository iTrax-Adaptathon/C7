import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

interface StepperProps {
  id: string;
  label: string;
  hint?: string;
  value: number;
  step: number;
  min: number;
  unit: string;
  decimals?: number;
  /** Shown faintly when the value differs from the plan. */
  planned?: number | null;
  onChange: (value: number) => void;
}

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/**
 * Mobile-first tactile stepper control with large touch targets (56px),
 * quick plate micro-jump buttons, and typed input support.
 */
export function Stepper({ id, label, hint, value, step, min, unit, decimals = 0, planned, onChange }: StepperProps) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const parsed = Number(raw.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < min) {
      setText(String(value));
      return;
    }
    onChange(round(parsed, decimals));
  };

  const differs = planned != null && planned !== value;
  const isWeightStepper = unit.toLowerCase() === 'kg';

  const btn =
    'w-14 h-14 shrink-0 rounded-2xl bg-[#1D2520] hover:bg-[#20352A] active:scale-90 disabled:opacity-25 disabled:active:scale-100 text-[#8FB69A] flex items-center justify-center border border-[#303832] shadow-sm transition-all cursor-pointer';

  return (
    <div className="rounded-3xl bg-[#171C19] border border-[#303832] p-4 shadow-md flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label htmlFor={`${id}-input`} className="text-[11px] font-bold uppercase tracking-wider text-[#B8B8AD] font-mono">
          {label}
        </label>
        <span className="font-mono text-[11px] text-[#B8B8AD]">
          {differs ? <span className="text-[#C7A65A] font-semibold">Planned {planned} {unit}</span> : hint}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          id={`${id}-minus`}
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={value - step < min}
          onClick={() => onChange(round(Math.max(min, value - step), decimals))}
          className={btn}
        >
          <Minus size={22} className="stroke-[3]" />
        </button>

        <div className="flex-1 h-14 bg-[#111312] border border-[#303832] rounded-2xl flex items-center justify-center gap-1.5 focus-within:border-[#8FB69A] transition-colors">
          <input
            id={`${id}-input`}
            type="text"
            inputMode={decimals > 0 ? 'decimal' : 'numeric'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            onFocus={(e) => e.target.select()}
            className="w-28 bg-transparent text-center font-mono text-3xl font-black text-[#F1EDE3] tracking-tight outline-none"
          />
          <span className="font-mono text-xs font-semibold text-[#8FB69A] select-none uppercase -ml-3">{unit}</span>
        </div>

        <button
          id={`${id}-plus`}
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(round(value + step, decimals))}
          className={btn}
        >
          <Plus size={22} className="stroke-[3]" />
        </button>
      </div>

      {/* Quick Jump Micro-Buttons for Mobile Ergonomics */}
      {isWeightStepper && (
        <div className="flex items-center justify-center gap-2 pt-1">
          {[-5, -2.5, +2.5, +5].map((delta) => {
            const nextVal = round(Math.max(min, value + delta), decimals);
            return (
              <button
                key={delta}
                type="button"
                onClick={() => onChange(nextVal)}
                className="flex-1 h-8 rounded-xl bg-[#111312] border border-[#303832] hover:border-[#8FB69A]/40 font-mono text-[11px] font-bold text-[#8FB69A] transition-all active:scale-90 cursor-pointer"
              >
                {delta > 0 ? `+${delta}` : delta} kg
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
