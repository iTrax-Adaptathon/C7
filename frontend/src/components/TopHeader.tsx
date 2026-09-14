import { useEffect, useState } from 'react';
import { Dumbbell, Laptop, Smartphone } from 'lucide-react';
import { getHealth } from '../api';

type Status = 'checking' | 'online' | 'offline';

interface TopHeaderProps {
  deviceMode?: 'phone' | 'laptop';
  onToggleDevice?: (mode: 'phone' | 'laptop') => void;
}

/** App title plus a live backend status dot and desktop viewport switcher. */
export function TopHeader({ deviceMode = 'phone', onToggleDevice }: TopHeaderProps) {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    let cancelled = false;
    getHealth().then(
      (h) => !cancelled && setStatus(h.status === 'ok' ? 'online' : 'offline'),
      () => !cancelled && setStatus('offline'),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const dot =
    status === 'online' ? 'bg-[#8FB69A]' : status === 'offline' ? 'bg-[#C86B68]' : 'bg-[#C7A65A]';
  const label = status === 'online' ? 'Engine' : status === 'offline' ? 'Offline' : 'Syncing';

  return (
    <header id="app-top-header" className="w-full px-4 sm:px-5 py-3 flex items-center justify-between z-20 bg-[#171C19] border-b border-[#303832]">
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-xl bg-[#20352A] border border-[#8FB69A]/30 flex items-center justify-center text-[#8FB69A] shadow-sm">
          <Dumbbell size={15} className="stroke-[2.5]" />
        </span>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xs sm:text-sm font-black tracking-tight text-[#F1EDE3]">C7 ATHLETIC</span>
            <span className="text-[9px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-[#20352A] border border-[#303832] text-[#8FB69A]">
              PRO
            </span>
          </div>
          <span className="text-[10px] text-[#B8B8AD] font-mono">Adaptive Science</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Toggle between Phone View and Laptop View on Desktop */}
        {onToggleDevice && (
          <button
            type="button"
            onClick={() => onToggleDevice(deviceMode === 'phone' ? 'laptop' : 'phone')}
            title={`Switch to ${deviceMode === 'phone' ? 'Laptop' : 'Phone'} view`}
            className="hidden md:flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-[#1D2520] hover:bg-[#20352A] text-[#B8B8AD] hover:text-[#F1EDE3] border border-[#303832] text-[11px] font-mono transition-all cursor-pointer"
          >
            {deviceMode === 'phone' ? (
              <>
                <Laptop size={13} className="text-[#8FB69A]" />
                <span>Laptop</span>
              </>
            ) : (
              <>
                <Smartphone size={13} className="text-[#8FB69A]" />
                <span>Phone</span>
              </>
            )}
          </button>
        )}

        {/* Live Engine Status Dot */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#111312] border border-[#303832]" title={`Backend ${label.toLowerCase()}`}>
          <span className={`inline-flex rounded-full h-2 w-2 ${dot} animate-pulse`} />
          <span className="text-[10px] font-semibold tracking-wider uppercase font-mono text-[#B8B8AD]">{label}</span>
        </div>
      </div>
    </header>
  );
}
