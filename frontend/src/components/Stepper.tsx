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
 * Large ± control with a typed input in the middle. Tap targets are 56 px so
 * it works with chalky hands; typing is allowed for jumps the buttons make slow.
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
  const btn =
    'w-14 h-14 shrink-0 rounded-xl bg-[#11151c] hover:bg-[#1a202a] active:scale-90 disabled:opacity-30 disabled:active:scale-100 text-white flex items-center justify-center border border-slate-800 shadow-sm transition-all';

  return (
    <div className="rounded-2xl bg-[#181d26] border border-slate-800/80 p-4 shadow-md flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <label htmlFor={`${id}-input`} className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
          {label}
        </label>
        <span className="font-mono text-[11px] text-slate-500">
          {differs ? <span className="text-[#fbbf24]">planned {planned}</span> : hint}
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
          <Minus size={24} className="stroke-[3]" />
        </button>

        <div className="flex-1 h-14 bg-[#11151c] border border-slate-800/80 rounded-xl flex items-center justify-center gap-1.5 focus-within:border-[#38bdf8]/60">
          <input
            id={`${id}-input`}
            type="text"
            inputMode={decimals > 0 ? 'decimal' : 'numeric'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            onFocus={(e) => e.target.select()}
            className="w-24 bg-transparent text-center font-mono text-3xl font-black text-white tracking-tight outline-none"
          />
          <span className="text-sm font-bold text-[#38bdf8]">{unit}</span>
        </div>

        <button
          id={`${id}-plus`}
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(round(value + step, decimals))}
          className={btn}
        >
          <Plus size={24} className="stroke-[3]" />
        </button>
      </div>
    </div>
  );
}
