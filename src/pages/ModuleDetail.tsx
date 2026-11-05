import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, FileQuestion, Loader2, MessageSquare, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorState } from '../components/ui/ErrorState';
import { Modal } from '../components/ui/Modal';
import { GradeRowSkeleton, Skeleton } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';
import { GradeForm } from '../components/GradeForm';
import { GradeSimulator } from '../components/GradeSimulator';
import { ModuleForm } from '../components/ModuleForm';
import { useDeleteGrade, useDeleteModule, useModuleData, useUpdateModule } from '../lib/queries';
import {
  averageTone,
  EMPTY_STAT,
  formatAverage,
  formatGrade,
  formatWeight,
  gradeToPercent,
  PASS_THRESHOLD,
  toneClasses,
} from '../lib/grades';
import { cn, formatDate, isTempId, pluralize } from '../lib/utils';
import { STATUS_OPTIONS, type Grade } from '../lib/types';

export function ModuleDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { modules, grades, stats, isLoading, error, refetch } = useModuleData();
  const deleteModule = useDeleteModule();
  const deleteGrade = useDeleteGrade();
  const updateModule = useUpdateModule();

  const [editModuleOpen, setEditModuleOpen] = useState(false);
  const [confirmModuleDelete, setConfirmModuleDelete] = useState(false);
  const [gradeFormOpen, setGradeFormOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [gradeToDelete, setGradeToDelete] = useState<Grade | null>(null);

  const module = modules.find((m) => m.id === id);
  const moduleGrades = useMemo(() => grades.filter((g) => g.module_id === id), [grades, id]);
  const numericModules = useMemo(() => modules.filter((m) => m.type === 'numeric'), [modules]);
  const stat = stats.get(id) ?? EMPTY_STAT;
  const tone = averageTone(stat.average);

  if (error) return <ErrorState error={error} onRetry={refetch} />;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="card">
            {Array.from({ length: 4 }, (_, i) => (
              <GradeRowSkeleton key={i} />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="card mx-auto flex max-w-md flex-col items-center px-6 py-14 text-center">
        <FileQuestion className="h-8 w-8 text-zinc-600" />
        <h1 className="mt-4 text-sm font-semibold">Module introuvable</h1>
        <p className="mt-1 text-sm text-zinc-500">Ce module n’existe pas ou a été supprimé.</p>
        <Link to="/" className="mt-5 text-sm text-indigo-400 hover:text-indigo-300">
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  const openCreateGrade = () => {
    setEditingGrade(null);
    setGradeFormOpen(true);
  };

  const openEditGrade = (grade: Grade) => {
    setEditingGrade(grade);
    setGradeFormOpen(true);
  };

  const handleDeleteModule = () => {
    deleteModule.mutate(module.id);
    setConfirmModuleDelete(false);
    navigate('/', { replace: true });
  };

  const handleDeleteGrade = () => {
    if (gradeToDelete) deleteGrade.mutate(gradeToDelete.id);
    setGradeToDelete(null);
  };

  return (
    <div className="space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Tableau de bord
      </Link>

      {/* En-tête */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">{module.code}</h1>
            <span className="rounded-md border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-xs text-zinc-500">
              coef. ×{formatWeight(module.coefficient)}
            </span>
            <span className="rounded-md border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-xs text-zinc-500">
              {module.type === 'numeric' ? 'Notes chiffrées' : 'Validation'}
            </span>
          </div>
          <p className="mt-1 text-zinc-400">{module.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditModuleOpen(true)} disabled={isTempId(module.id)}>
            <Pencil className="h-3.5 w-3.5" />
            Modifier
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirmModuleDelete(true)} disabled={isTempId(module.id)}>
            <Trash2 className="h-3.5 w-3.5" />
            Supprimer
          </Button>
        </div>
      </header>

      {module.type === 'status' ? (
        <section className="card max-w-xl p-5">
          <p className="text-xs font-medium text-zinc-500">Statut actuel</p>
          <div className="mt-3">
            <StatusBadge status={module.status_validation} />
          </div>
          <p className="mt-5 text-xs font-medium text-zinc-500">Mettre à jour le statut</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => updateModule.mutate({ id: module.id, patch: { status_validation: s } })}
                disabled={isTempId(module.id)}
                className={cn('chip h-10 font-sans text-sm', module.status_validation === s && 'chip-active')}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-zinc-600">
            Ce module est évalué par validation binaire et n’entre pas dans le calcul de la moyenne générale.
          </p>
        </section>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            {/* Moyenne */}
            <section className="card p-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-zinc-500">Moyenne pondérée</p>
                  <p className={cn('mt-1 font-mono text-4xl font-semibold tracking-tight', toneClasses[tone].text)}>
                    {formatAverage(stat.average)}
                  </p>
                </div>
                <div className="flex gap-6 text-right">
                  <div>
                    <p className="text-xs text-zinc-500">Évaluations</p>
                    <p className="mt-0.5 font-mono text-sm text-zinc-200">{stat.count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Poids total</p>
                    <p className="mt-0.5 font-mono text-sm text-zinc-200">{formatWeight(stat.totalWeight)}</p>
                  </div>
                </div>
              </div>
              <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-800/80">
                {stat.average !== null && (
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', toneClasses[tone].bar)}
                    style={{ width: `${gradeToPercent(stat.average)}%` }}
                  />
                )}
                <div
                  className="absolute inset-y-0 w-px bg-zinc-400/70"
                  style={{ left: `${gradeToPercent(PASS_THRESHOLD)}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between font-mono text-[10px] text-zinc-600">
                <span>1.0</span>
                <span>6.0</span>
              </div>
              <p className="mt-2 text-xs text-zinc-600">Σ(note × poids) / Σ(poids)</p>
            </section>

            {/* Évaluations */}
            <section className="card overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 px-4 py-3">
                <h2 className="text-sm font-semibold">
                  Évaluations <span className="font-normal text-zinc-500">({moduleGrades.length})</span>
                </h2>
                <Button size="sm" variant="primary" onClick={openCreateGrade} disabled={isTempId(module.id)}>
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter
                </Button>
              </div>

              {moduleGrades.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-12 text-center">
                  <p className="text-sm text-zinc-400">Aucune évaluation enregistrée.</p>
                  <p className="mt-1 text-xs text-zinc-600">Ajoutez votre première note pour calculer la moyenne.</p>
                </div>
              ) : (
                <>
                  {/* Tableau (desktop) */}
                  <table className="hidden w-full text-sm md:table">
                    <thead>
                      <tr className="border-b border-zinc-800/80 text-left text-xs text-zinc-500">
                        <th className="px-4 py-2.5 font-medium">Date</th>
                        <th className="px-4 py-2.5 font-medium">Titre</th>
                        <th className="px-4 py-2.5 text-right font-medium">Note</th>
                        <th className="px-4 py-2.5 text-right font-medium">Coef.</th>
                        <th className="w-24 px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {moduleGrades.map((g) => {
                        const pending = isTempId(g.id);
                        return (
                          <tr
                            key={g.id}
                            className={cn(
                              'group border-b border-zinc-800/50 transition last:border-0 hover:bg-zinc-900/60',
                              pending && 'opacity-60',
                            )}
                          >
                            <td className="whitespace-nowrap px-4 py-3 text-zinc-400">{formatDate(g.date)}</td>
                            <td className="px-4 py-3">
                              <p className="text-zinc-200">{g.title}</p>
                              {g.remarks && (
                                <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500" title={g.remarks}>
                                  {g.remarks}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className={cn(
                                  'inline-block min-w-[3rem] rounded-md border px-2 py-0.5 text-center font-mono font-semibold',
                                  toneClasses[averageTone(g.value)].soft,
                                )}
                              >
                                {formatGrade(g.value)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-zinc-400">×{formatWeight(g.weight)}</td>
                            <td className="px-4 py-3">
                              {pending ? (
                                <Loader2 className="ml-auto h-4 w-4 animate-spin text-zinc-500" />
                              ) : (
                                <div className="flex justify-end gap-1 opacity-60 transition group-hover:opacity-100">
                                  <Button variant="ghost" size="icon" onClick={() => openEditGrade(g)} aria-label="Modifier" title="Modifier">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setGradeToDelete(g)}
                                    aria-label="Supprimer"
                                    title="Supprimer"
                                    className="hover:text-red-400"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Liste (mobile) */}
                  <ul className="md:hidden">
                    {moduleGrades.map((g) => {
                      const pending = isTempId(g.id);
                      return (
                        <li
                          key={g.id}
                          className={cn('flex items-center gap-3 border-b border-zinc-800/50 px-4 py-3 last:border-0', pending && 'opacity-60')}
                        >
                          <span
                            className={cn(
                              'flex h-11 w-12 shrink-0 items-center justify-center rounded-lg border font-mono text-base font-semibold',
                              toneClasses[averageTone(g.value)].soft,
                            )}
                          >
                            {formatGrade(g.value)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-zinc-200">{g.title}</p>
                            <p className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {formatDate(g.date)}
                              </span>
                              <span className="font-mono">×{formatWeight(g.weight)}</span>
                              {g.remarks && <MessageSquare className="h-3 w-3" aria-label="Remarque" />}
                            </p>
                          </div>
                          {pending ? (
                            <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                          ) : (
                            <div className="flex">
                              <Button variant="ghost" size="icon" onClick={() => openEditGrade(g)} aria-label="Modifier">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setGradeToDelete(g)}
                                aria-label="Supprimer"
                                className="hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </section>
          </div>

          <div className="lg:sticky lg:top-20">
            <GradeSimulator grades={moduleGrades} />
          </div>
        </div>
      )}

      {/* Modales */}
      <Modal open={editModuleOpen} onClose={() => setEditModuleOpen(false)} title={`Modifier ${module.code}`}>
        <ModuleForm module={module} existingModules={modules} onDone={() => setEditModuleOpen(false)} />
      </Modal>

      <Modal
        open={gradeFormOpen}
        onClose={() => setGradeFormOpen(false)}
        title={editingGrade ? 'Modifier l’évaluation' : 'Nouvelle évaluation'}
        description={`${module.code} — ${module.name}`}
      >
        <GradeForm
          key={editingGrade?.id ?? 'new'}
          modules={numericModules}
          stats={stats}
          grade={editingGrade ?? undefined}
          defaultModuleId={module.id}
          onDone={() => setGradeFormOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={confirmModuleDelete}
        title={`Supprimer ${module.code} ?`}
        message={`Le module et ${pluralize(moduleGrades.length, 'évaluation associée', 'évaluations associées')} seront définitivement supprimés.`}
        confirmLabel="Supprimer le module"
        onConfirm={handleDeleteModule}
        onClose={() => setConfirmModuleDelete(false)}
      />

      <ConfirmDialog
        open={gradeToDelete !== null}
        title="Supprimer l’évaluation ?"
        message={
          gradeToDelete
            ? `« ${gradeToDelete.title} » (${formatGrade(gradeToDelete.value)}) sera définitivement supprimée.`
            : ''
        }
        onConfirm={handleDeleteGrade}
        onClose={() => setGradeToDelete(null)}
      />
    </div>
  );
}
