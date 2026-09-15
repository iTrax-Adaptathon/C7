import { CalendarDays, Dumbbell, Sparkles } from 'lucide-react';

export type Tab = 'dashboard' | 'history' | 'playground';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string; Icon: typeof Dumbbell }[] = [
  { id: 'dashboard', label: 'Next up', Icon: Dumbbell },
  { id: 'history', label: 'History', Icon: CalendarDays },
  { id: 'playground', label: 'Playground', Icon: Sparkles },
];


export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      id="bottom-navigation"
      aria-label="Mobile Navigation"
      className="absolute bottom-0 inset-x-0 z-40 bg-[#171C19] border-t border-[#303832] px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-2xl [transform:translateZ(0)]"
    >
      <div className="flex items-center justify-around gap-1.5 max-w-md mx-auto">
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              id={`nav-tab-${id}`}
              type="button"
              onClick={() => onTabChange(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 h-12 rounded-xl transition-all duration-150 cursor-pointer select-none active:scale-90 ${
                active
                  ? 'bg-[#20352A] text-[#8FB69A] border border-[#8FB69A]/30 font-bold'
                  : 'text-[#B8B8AD] hover:text-[#F1EDE3] hover:bg-[#1D2520]'
              }`}
            >
              <Icon size={18} className={active ? 'stroke-[2.5] text-[#8FB69A]' : 'stroke-[1.8] text-[#B8B8AD]'} />
              <span className="text-[11px] tracking-tight">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

