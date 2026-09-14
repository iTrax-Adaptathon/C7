import { CalendarDays, Dumbbell } from 'lucide-react';

export type Tab = 'dashboard' | 'history';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string; Icon: typeof Dumbbell }[] = [
  { id: 'dashboard', label: 'Next up', Icon: Dumbbell },
  { id: 'history', label: 'History', Icon: CalendarDays },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <footer
      id="bottom-navigation"
      className="fixed md:absolute bottom-0 inset-x-0 z-40 bg-[#12161e]/95 backdrop-blur-xl border-t border-slate-800/60 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]"
    >
      <div className="h-16 px-4 flex items-center justify-around gap-2 max-w-md mx-auto">
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              id={`nav-tab-${id}`}
              type="button"
              onClick={() => onTabChange(id)}
              className={`flex-1 flex items-center justify-center gap-2 h-11 px-5 rounded-full transition-all duration-200 active:scale-95 ${
                active
                  ? 'bg-[#38bdf8] text-[#051c2c] font-bold shadow-lg shadow-[#38bdf8]/20'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <Icon size={18} className={active ? 'stroke-[2.5]' : 'stroke-[2]'} />
              <span className="text-xs uppercase tracking-wider font-bold">{label}</span>
            </button>
          );
        })}
      </div>
      <div className="h-2" />
    </footer>
  );
}
