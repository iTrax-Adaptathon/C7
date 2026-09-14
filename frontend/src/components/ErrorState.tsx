import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { ApiError } from '../api';

interface ErrorStateProps {
  error: ApiError;
  onRetry?: () => void;
  compact?: boolean;
}

function headline(error: ApiError): string {
  if (error.status === 0) return "Couldn't reach the server";
  if (error.status === 404) return 'Not found';
  if (error.status === 422) return 'The server rejected these values';
  return 'Something went wrong';
}

export function ErrorState({ error, onRetry, compact = false }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`rounded-2xl border border-[#ef4444]/40 bg-[#ef4444]/10 text-left ${compact ? 'p-3' : 'p-5'} flex flex-col gap-2`}
    >
      <div className="flex items-center gap-2 text-[#f87171] font-bold text-sm">
        <AlertTriangle size={16} className="stroke-[2.5]" />
        {headline(error)}
      </div>
      <p className="text-sm text-slate-300 leading-relaxed">{error.detail}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="self-start mt-1 inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[#1e2735] hover:bg-[#28324a] active:scale-95 text-white text-xs font-bold uppercase tracking-wider transition-all border border-slate-700"
        >
          <RotateCcw size={14} />
          Retry
        </button>
      )}
    </div>
  );
}
