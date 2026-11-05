import { GraduationCap } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-sm shadow-indigo-500/30',
        className,
      )}
    >
      <GraduationCap className="h-4 w-4 text-white" strokeWidth={2.25} />
    </div>
  );
}

export function FullScreenLoader() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Logo className="h-10 w-10 animate-pulse rounded-xl" />
        <p className="text-sm text-zinc-500">Chargement…</p>
      </div>
    </div>
  );
}
