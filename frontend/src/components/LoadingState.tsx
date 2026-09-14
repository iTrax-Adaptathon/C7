import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading…' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-[#B8B8AD]" role="status">
      <Loader2 size={28} className="animate-spin text-[#8FB69A]" />
      <span className="text-sm font-medium font-mono">{message}</span>
    </div>
  );
}
