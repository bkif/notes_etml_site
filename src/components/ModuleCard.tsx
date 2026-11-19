import { Link } from 'react-router-dom';
import { ChevronRight, Loader2 } from 'lucide-react';
import { StatusBadge } from './ui/StatusBadge';
import {
  averageTone,
  formatAverage,
  formatWeight,
  gradeToPercent,
  PASS_THRESHOLD,
  toneClasses,
  type ModuleStat,
} from '../lib/grades';
import { capitalizeFirst, cn, isTempId, pluralize } from '../lib/utils';
import type { Module, StatusValidation } from '../lib/types';

const statusBorderClasses: Record<StatusValidation, string> = {
  Acquis: 'border-emerald-500/20 hover:border-emerald-500/45',
  'En cours': 'border-amber-500/20 hover:border-amber-500/45',
  'Non acquis': 'border-red-500/20 hover:border-red-500/45',
};

const statusBarClasses: Record<StatusValidation, { width: string; color: string }> = {
  Acquis: { width: '100%', color: 'bg-emerald-500' },
  'En cours': { width: '50%', color: 'bg-amber-500' },
  'Non acquis': { width: '100%', color: 'bg-red-500' },
};

export function ModuleCard({ module, stat }: { module: Module; stat: ModuleStat }) {
  const pending = isTempId(module.id);
  const tone = averageTone(stat.average);
  const periods = module.periods && module.periods > 0 ? module.periods : 40;
  const displayName = capitalizeFirst(module.name);

  const borderHoverClass =
    module.type === 'status' && module.status_validation
      ? statusBorderClasses[module.status_validation]
      : 'hover:border-zinc-700';

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold tracking-tight text-zinc-100">{module.code}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-zinc-400 first-letter:uppercase">{displayName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span
            className="rounded-md border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[11px] text-zinc-400"
            title="Nombre de périodes"
          >
            {periods}p
          </span>
          <span
            className="rounded-md border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[11px] text-zinc-400"
            title="Coefficient du module"
          >
            ×{formatWeight(module.coefficient)}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-1">
        <div className="flex items-end justify-between gap-2">
          {module.type === 'status' ? (
            <StatusBadge status={module.status_validation} />
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className={cn('font-mono text-3xl font-semibold tracking-tight', toneClasses[tone].text)}>
                {formatAverage(stat.average)}
              </span>
              {stat.average !== null && <span className="text-xs text-zinc-400">/ 6</span>}
            </div>
          )}
          <span className="flex items-center gap-1 text-xs text-zinc-400">
            {pending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Enregistrement…
              </>
            ) : module.type === 'status' ? (
              'Validation'
            ) : (
              pluralize(stat.count, 'évaluation')
            )}
            {!pending && (
              <ChevronRight className="h-3.5 w-3.5 text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-zinc-300" />
            )}
          </span>
        </div>

        <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-zinc-800/80">
          {module.type === 'numeric' ? (
            <>
              {stat.average !== null && (
                <div
                  className={cn('h-full rounded-full transition-all duration-500', toneClasses[tone].bar)}
                  style={{ width: `${gradeToPercent(stat.average)}%` }}
                />
              )}
              <div
                className="absolute inset-y-0 w-px bg-zinc-500/60"
                style={{ left: `${gradeToPercent(PASS_THRESHOLD)}%` }}
                aria-hidden="true"
              />
            </>
          ) : (
            module.status_validation && (
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  statusBarClasses[module.status_validation].color,
                )}
                style={{ width: statusBarClasses[module.status_validation].width }}
              />
            )
          )}
        </div>
      </div>
    </>
  );

  const className = cn(
    'group card flex h-full min-h-[156px] flex-col justify-between p-4 transition hover:bg-zinc-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
    borderHoverClass,
  );

  if (pending) return <div className={cn(className, 'opacity-60')}>{content}</div>;

  return (
    <Link to={`/modules/${module.id}`} className={className}>
      {content}
    </Link>
  );
}
