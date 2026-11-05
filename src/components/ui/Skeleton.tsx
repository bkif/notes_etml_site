import { cn } from '../../lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-zinc-800/60', className)} aria-hidden="true" />;
}

export function ModuleCardSkeleton() {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-10 rounded-full" />
      </div>
      <Skeleton className="mt-2.5 h-4 w-3/4" />
      <div className="mt-6 flex items-end justify-between">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="mt-3 h-1 w-full" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card p-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-16" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  );
}

export function GradeRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-zinc-800/60 px-4 py-3.5 last:border-0">
      <Skeleton className="h-9 w-12" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-7 w-16" />
    </div>
  );
}
