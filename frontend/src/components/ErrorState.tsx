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
      className={`rounded-2xl border border-[#C86B68]/30 bg-[#C86B68]/15 text-left ${compact ? 'p-3' : 'p-5'} flex flex-col gap-2`}
    >
      <div className="flex items-center gap-2 text-[#C86B68] font-bold text-sm font-mono">
        <AlertTriangle size={16} className="stroke-[2.5]" />
        {headline(error)}
      </div>
      <p className="text-sm text-[#F1EDE3] leading-relaxed">{error.detail}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="self-start mt-1 inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-[#1D2520] hover:bg-[#20352A] active:scale-95 text-[#F1EDE3] text-xs font-semibold transition-all border border-[#303832] cursor-pointer"
        >
          <RotateCcw size={14} />
          Retry
        </button>
      )}
    </div>
  );
}
