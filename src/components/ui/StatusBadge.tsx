import { CheckCircle2, CircleDashed, Clock, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { StatusValidation } from '../../lib/types';

const styles: Record<StatusValidation, { className: string; Icon: typeof CheckCircle2 }> = {
  Acquis: { className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400', Icon: CheckCircle2 },
  'Non acquis': { className: 'border-red-500/20 bg-red-500/10 text-red-400', Icon: XCircle },
  'En cours': { className: 'border-amber-500/20 bg-amber-500/10 text-amber-400', Icon: Clock },
};

export function StatusBadge({
  status,
  size = 'md',
}: {
  status: StatusValidation | null;
  size?: 'sm' | 'md';
}) {
  const { className, Icon } = status
    ? styles[status]
    : { className: 'border-zinc-800 bg-zinc-800/40 text-zinc-500', Icon: CircleDashed };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        className,
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {status ?? 'Non défini'}
    </span>
  );
}
