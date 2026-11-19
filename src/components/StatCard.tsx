import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  valueClassName?: string;
  iconClassName?: string;
}

export function StatCard({ label, value, hint, icon: Icon, valueClassName, iconClassName }: StatCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-zinc-400">{label}</p>
        <Icon className={cn('h-4 w-4 text-zinc-500', iconClassName)} />
      </div>
      <p className={cn('mt-2 font-mono text-2xl font-semibold tracking-tight text-zinc-100', valueClassName)}>
        {value}
      </p>
      {hint && <p className="mt-1 truncate text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}
