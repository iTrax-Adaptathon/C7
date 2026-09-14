import { useEffect, useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { getHealth } from '../api';

type Status = 'checking' | 'online' | 'offline';

/** App title plus a live backend status dot (GET /health on mount). */
export function TopHeader() {
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
    status === 'online' ? 'bg-[#4edea3]' : status === 'offline' ? 'bg-[#f87171]' : 'bg-slate-500';
  const label = status === 'online' ? 'Connected' : status === 'offline' ? 'Offline' : 'Connecting';

  return (
    <div id="app-top-header" className="w-full px-5 py-3 flex items-center justify-between z-20">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-xl bg-[#38bdf8]/15 border border-[#38bdf8]/30 flex items-center justify-center text-[#38bdf8]">
          <Dumbbell size={16} className="stroke-[2.5]" />
        </span>
        <span className="text-sm font-bold tracking-tight text-white">Adaptive Coach</span>
      </div>
      <div className="flex items-center gap-2" title={`Backend ${label.toLowerCase()}`}>
        <span className={`inline-flex rounded-full h-2.5 w-2.5 ${dot}`} />
        <span className="text-[10px] font-bold tracking-widest uppercase font-mono text-slate-400">{label}</span>
      </div>
    </div>
  );
}
