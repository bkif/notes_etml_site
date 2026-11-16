import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BookOpen, CheckCircle2, FolderPlus, Plus, Search, SearchX, Sigma, Target, X, Layers, Hash, CheckSquare } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ErrorState } from '../components/ui/ErrorState';
import { Modal } from '../components/ui/Modal';
import { ModuleCardSkeleton, StatCardSkeleton } from '../components/ui/Skeleton';
import { ModuleCard } from '../components/ModuleCard';
import { ModuleForm } from '../components/ModuleForm';
import { StatCard } from '../components/StatCard';
import { useModuleData } from '../lib/queries';
import {
  averageTone,
  EMPTY_STAT,
  formatAverage,
  isModuleValidated,
  PASS_THRESHOLD,
  PERIOD_PASS_RATE,
  toneClasses,
} from '../lib/grades';
import { cn, isTypingTarget, pluralize } from '../lib/utils';

type Filter = 'all' | 'below' | 'validated' | 'status';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'validated', label: 'Validés' },
  { value: 'below', label: 'Sous 4.0' },
  { value: 'status', label: 'Validation' },
];

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function Dashboard() {
  const { modules, stats, global, isLoading, error, refetch } = useModuleData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Raccourci « / » pour la recherche
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !isTypingTarget(e.target) && !document.querySelector('[role="dialog"]')) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return modules.filter((m) => {
      if (q && !normalize(m.code).includes(q) && !normalize(m.name).includes(q)) return false;
      const stat = stats.get(m.id) ?? EMPTY_STAT;
      switch (filter) {
        case 'validated':
          return isModuleValidated(m, stat);
        case 'below':
          return m.type === 'numeric' && stat.average !== null && stat.average < PASS_THRESHOLD;
        case 'status':
          return m.type === 'status';
        default:
          return true;
      }
    });
  }, [modules, stats, query, filter]);

  const numericModules = useMemo(() => filtered.filter((m) => m.type === 'numeric'), [filtered]);
  const statusModules = useMemo(() => filtered.filter((m) => m.type === 'status'), [filtered]);

  const globalTone = averageTone(global.globalAverage);
  const is80Reached = global.totalPeriods > 0 && global.missingPeriodsFor80 === 0;
  const is80AtRisk =
    global.totalPeriods > 0 &&
    !is80Reached &&
    global.acquiredPeriods + global.inProgressPeriods < global.targetPeriods80;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Tableau de bord</h1>
          <p className="mt-1 text-sm text-zinc-500">Vue d’ensemble de vos modules et résultats.</p>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)} className="hidden sm:inline-flex">
          <Plus className="h-4 w-4" />
          Nouveau module
        </Button>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          {/* Métriques clés */}
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {isLoading ? (
              Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
            ) : (
              <>
                <StatCard
                  label="Moyenne générale"
                  icon={Sigma}
                  value={formatAverage(global.globalAverage)}
                  valueClassName={global.globalAverage !== null ? toneClasses[globalTone].text : 'text-zinc-500'}
                  hint={
                    global.gradedModuleCount > 0
                      ? `Pondérée · ${pluralize(global.gradedModuleCount, 'module noté', 'modules notés')}`
                      : 'Aucune note pour l’instant'
                  }
                />
                <StatCard
                  label="Modules validés"
                  icon={CheckCircle2}
                  iconClassName="text-emerald-500/70"
                  value={
                    <>
                      {global.validatedCount}
                      <span className="text-base text-zinc-600"> / {global.moduleCount}</span>
                    </>
                  }
                  hint="Moyenne ≥ 4.0 ou « Acquis »"
                />
                <StatCard
                  label="Modules sous 4.0"
                  icon={AlertTriangle}
                  iconClassName={global.belowCount > 0 ? 'text-red-500/80' : undefined}
                  value={global.belowCount}
                  valueClassName={global.belowCount > 0 ? 'text-red-400' : undefined}
                  hint={global.belowCount > 0 ? 'À surveiller de près' : 'Tout est en ordre'}
                />
                <StatCard
                  label="Évaluations"
                  icon={BookOpen}
                  value={global.gradeCount}
                  hint={pluralize(global.moduleCount, 'module')}
                />
              </>
            )}
          </section>

          {/* Progression des périodes d'apprentissage */}
          {!isLoading && global.totalPeriods > 0 && (
            <section className="card p-4 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-100">Progression des périodes d'enseignement</h2>
                    <p className="text-xs text-zinc-400">
                      Volume horaire acquis et validé pour votre cursus ETML
                    </p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-xl font-bold text-zinc-100">{global.acquiredPeriods}</span>
                  <span className="text-xs text-zinc-500">/ {global.totalPeriods} périodes</span>
                  <span
                    className={cn(
                      'ml-2 rounded-md px-2 py-0.5 text-xs font-semibold',
                      is80Reached
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-zinc-800 text-indigo-400',
                    )}
                  >
                    {Math.round((global.acquiredPeriods / global.totalPeriods) * 100)}%
                  </span>
                </div>
              </div>

              {/* Barre de répartition segmentée */}
              <div className="mt-4">
                <div className="relative flex h-3 w-full overflow-hidden rounded-full bg-zinc-800/80">
                  {global.acquiredPeriods > 0 && (
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${(global.acquiredPeriods / global.totalPeriods) * 100}%` }}
                      title={`Acquis : ${global.acquiredPeriods} périodes`}
                    />
                  )}
                  {global.inProgressPeriods > 0 && (
                    <div
                      className="h-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${(global.inProgressPeriods / global.totalPeriods) * 100}%` }}
                      title={`En cours : ${global.inProgressPeriods} périodes`}
                    />
                  )}
                  {global.failedPeriods > 0 && (
                    <div
                      className="h-full bg-red-500 transition-all duration-500"
                      style={{ width: `${(global.failedPeriods / global.totalPeriods) * 100}%` }}
                      title={`Non acquis : ${global.failedPeriods} périodes`}
                    />
                  )}
                  <div
                    className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-white/80"
                    style={{ left: `${PERIOD_PASS_RATE * 100}%` }}
                    title={`Seuil de réussite : 80% (${global.targetPeriods80} périodes)`}
                    aria-hidden="true"
                  />
                </div>

                {/* Repère 80% */}
                <div className="relative mt-1 flex items-center justify-between font-mono text-[10px] text-zinc-500">
                  <span>0%</span>
                  <span
                    className={cn(
                      'absolute -translate-x-1/2 font-semibold',
                      is80Reached ? 'text-emerald-400' : 'text-zinc-300',
                    )}
                    style={{ left: `${PERIOD_PASS_RATE * 100}%` }}
                  >
                    80% ({global.targetPeriods80}p)
                  </span>
                  <span>100%</span>
                </div>

                {/* Objectif 80% de réussite */}
                {is80Reached ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                    <div className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span>Objectif des 80% de réussite atteint !</span>
                    </div>
                    <span className="font-mono text-emerald-400">
                      {global.acquiredPeriods} / {global.targetPeriods80}p requises
                    </span>
                  </div>
                ) : (
                  <div
                    className={cn(
                      'mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs',
                      is80AtRisk
                        ? 'border-red-500/25 bg-red-500/10 text-red-300'
                        : 'border-indigo-500/20 bg-indigo-500/10 text-indigo-200',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Target className={cn('h-4 w-4 shrink-0', is80AtRisk ? 'text-red-400' : 'text-indigo-400')} />
                      <span>
                        Il manque{' '}
                        <strong className="font-mono font-semibold text-white">
                          {pluralize(global.missingPeriodsFor80, 'période')}
                        </strong>{' '}
                        pour atteindre 80% de réussite
                      </span>
                    </div>
                    <span className={cn('font-mono', is80AtRisk ? 'text-red-300' : 'text-indigo-300')}>
                      Objectif : {global.targetPeriods80}p
                      {is80AtRisk &&
                        ` · ${pluralize(global.missingPeriodsFor80 - global.inProgressPeriods, 'période')} à rattraper`}
                    </span>
                  </div>
                )}

                {/* Légende détaillée */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-400">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span>Acquis ({global.acquiredPeriods}p · {Math.round((global.acquiredPeriods / global.totalPeriods) * 100)}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <span>En cours ({global.inProgressPeriods}p · {Math.round((global.inProgressPeriods / global.totalPeriods) * 100)}%)</span>
                    </div>
                    {global.failedPeriods > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                        <span className="text-red-400">Non acquis ({global.failedPeriods}p · {Math.round((global.failedPeriods / global.totalPeriods) * 100)}%)</span>
                      </div>
                    )}
                  </div>
                  <div className="font-mono text-zinc-500">
                    Total : {global.totalPeriods} périodes
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Recherche + filtres */}
          <section className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un module (code ou nom)…"
                className="input pl-9 pr-16 [&::-webkit-search-cancel-button]:hidden"
                aria-label="Rechercher un module"
              />
              {query ? (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 hover:text-zinc-200"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-zinc-800 bg-zinc-900 px-1.5 font-mono text-[10px] text-zinc-500 sm:block">
                  /
                </kbd>
              )}
            </div>
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={cn('chip h-9 shrink-0 px-3 font-sans', filter === f.value && 'chip-active')}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </section>

          {/* Grille des modules */}
          {isLoading ? (
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <ModuleCardSkeleton key={i} />
              ))}
            </section>
          ) : modules.length === 0 ? (
            <div className="card flex flex-col items-center border-dashed px-6 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 ring-1 ring-zinc-800">
                <FolderPlus className="h-5 w-5 text-zinc-400" />
              </div>
              <h2 className="mt-4 text-sm font-semibold">Aucun module pour l’instant</h2>
              <p className="mt-1 max-w-sm text-sm text-zinc-500">
                Créez votre premier module (ex. « I320 — Programmation orientée objet ») pour commencer à suivre vos
                notes.
              </p>
              <Button variant="accent" className="mt-5" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Créer un module
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="card flex flex-col items-center px-6 py-12 text-center">
              <SearchX className="h-6 w-6 text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-400">Aucun module ne correspond à votre recherche.</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setQuery('');
                  setFilter('all');
                }}
              >
                Réinitialiser les filtres
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Section 1 : Modules avec notes chiffrées */}
              {numericModules.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800 text-zinc-400">
                        <Hash className="h-3.5 w-3.5" />
                      </div>
                      <h2 className="text-sm font-semibold text-zinc-200">
                        Modules avec notes chiffrées
                      </h2>
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 font-mono">
                        {numericModules.length}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {numericModules.map((m) => (
                      <ModuleCard key={m.id} module={m} stat={stats.get(m.id) ?? EMPTY_STAT} />
                    ))}
                  </div>
                </section>
              )}

              {/* Section 2 : Modules de validation (Acquis / Non acquis) */}
              {statusModules.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400">
                        <CheckSquare className="h-3.5 w-3.5" />
                      </div>
                      <h2 className="text-sm font-semibold text-zinc-200">
                        Modules de validation (Acquis / Non acquis)
                      </h2>
                      <span className="rounded-full bg-indigo-500/10 text-indigo-400 px-2 py-0.5 text-xs font-mono">
                        {statusModules.length}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {statusModules.map((m) => (
                      <ModuleCard key={m.id} module={m} stat={stats.get(m.id) ?? EMPTY_STAT} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {!isLoading && modules.length > 0 && (
            <Button variant="secondary" className="w-full sm:hidden" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Nouveau module
            </Button>
          )}
        </>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau module">
        <ModuleForm existingModules={modules} onDone={() => setCreateOpen(false)} />
      </Modal>
    </div>
  );
}
