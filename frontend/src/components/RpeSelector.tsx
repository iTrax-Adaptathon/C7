import { rpeTier } from '../utils/decision';

interface RpeSelectorProps {
  value: number | null;
  onChange: (rpe: number) => void;
}

const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Integer RPE 1–10 as a 5×2 grid of large buttons with the effort band spelled out. */
export function RpeSelector({ value, onChange }: RpeSelectorProps) {
  const tier = value == null ? null : rpeTier(value);

  return (
    <div className="rounded-2xl bg-[#181d26] border border-slate-800/80 p-4 shadow-md flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
          How hard was it? (RPE)
        </span>
        <span
          className={`px-2.5 py-0.5 rounded-full border text-xs font-mono font-bold uppercase ${
            tier ? tier.badge : 'border-slate-700 text-slate-500'
          }`}
        >
          {tier && value != null ? `RPE ${value} • ${tier.label}` : 'Pick 1–10'}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Rate of perceived exertion">
        {VALUES.map((v) => {
          const active = value === v;
          const t = rpeTier(v);
          return (
            <button
              key={v}
              id={`rpe-${v}`}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(v)}
              className={`h-14 rounded-xl font-mono text-lg font-bold active:scale-95 transition-all flex items-center justify-center border ${
                active
                  ? 'bg-[#38bdf8] text-[#051c2c] border-[#38bdf8] shadow-md shadow-[#38bdf8]/30 scale-[1.03]'
                  : `bg-[#11151c] border-slate-800 hover:bg-[#1c222c] ${t.text}`
              }`}
            >
              {v}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-4 text-center font-mono text-[10px] gap-1">
        <span className="text-[#4edea3]">1–3 Easy</span>
        <span className="text-[#38bdf8]">4–6 Moderate</span>
        <span className="text-[#fbbf24]">7–8 Hard</span>
        <span className="text-[#f87171]">9–10 Max effort</span>
      </div>
    </div>
  );
}
