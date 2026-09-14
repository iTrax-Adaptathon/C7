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
    <div className="rounded-2xl bg-[#171C19] border border-[#303832] p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#B8B8AD] font-mono">
          Effort Rating (RPE 1–10)
        </span>
        <span
          className={`px-2.5 py-0.5 rounded-full border text-xs font-mono font-bold uppercase transition-all ${
            tier ? tier.badge : 'border-[#303832] text-[#7A7E77]'
          }`}
        >
          {tier && value != null ? `RPE ${value} • ${tier.label}` : 'Select Effort'}
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
              className={`h-14 rounded-xl font-mono text-lg font-bold active:scale-90 transition-all flex items-center justify-center border cursor-pointer ${
                active
                  ? 'bg-[#8FB69A] text-[#111312] border-[#8FB69A] shadow-md scale-[1.03]'
                  : `bg-[#111312] border-[#303832] hover:bg-[#1D2520] hover:text-[#F1EDE3] ${t.text}`
              }`}
            >
              {v}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-4 text-center font-mono text-[10px] gap-1 pt-0.5">
        <span className="text-[#8FB69A]">1–3 Easy</span>
        <span className="text-[#A8D1B1]">4–6 Moderate</span>
        <span className="text-[#C7A65A]">7–8 Hard</span>
        <span className="text-[#C86B68]">9–10 Max</span>
      </div>
    </div>
  );
}
