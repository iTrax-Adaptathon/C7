import { useEffect, useState } from 'react';
import { Battery, Wifi } from 'lucide-react';

interface MobileStatusBarProps {
  isMobileFrame?: boolean;
}

export function MobileStatusBar({ isMobileFrame = true }: MobileStatusBarProps) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      id="mobile-status-bar"
      className={`w-full ${isMobileFrame ? 'px-7' : 'px-5'} pt-2.5 pb-1 flex items-center justify-between text-[#F1EDE3] select-none text-[11px] font-mono tracking-tight z-30`}
    >
      {/* Current Time */}
      <span className="font-bold text-xs tracking-tight text-[#F1EDE3]">{time || '9:41'}</span>

      {/* Dynamic Island Pill (Center) */}
      <div className="flex items-center gap-1.5 px-3 py-1 bg-[#111312] border border-[#303832] rounded-full shadow-inner">
        <span className="w-1.5 h-1.5 rounded-full bg-[#8FB69A] animate-pulse" />
        <span className="text-[9px] font-mono font-semibold uppercase tracking-wider text-[#A8D1B1]">
          C7 ADAPTIVE
        </span>
      </div>

      {/* Status Icons */}
      <div className="flex items-center gap-2 text-[#B8B8AD]">
        {/* Signal Bars */}
        <div className="flex items-end gap-0.5 h-2.5" title="Cellular 5G">
          <span className="w-0.5 h-1 bg-[#8FB69A] rounded-full" />
          <span className="w-0.5 h-1.5 bg-[#8FB69A] rounded-full" />
          <span className="w-0.5 h-2 bg-[#8FB69A] rounded-full" />
          <span className="w-0.5 h-2.5 bg-[#8FB69A] rounded-full" />
        </div>

        {/* WiFi */}
        <Wifi size={13} className="text-[#8FB69A]" />

        {/* Battery */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-[#F1EDE3]">98%</span>
          <div className="relative flex items-center">
            <Battery size={15} className="text-[#8FB69A]" />
          </div>
        </div>
      </div>
    </div>
  );
}
