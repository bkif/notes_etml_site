import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BookPlus } from 'lucide-react';
import { Button } from './ui/Button';
import { Field } from './ui/Field';
import { GradeValueInput, WeightInput } from './GradeInputs';
import { useCreateGrade, useUpdateGrade } from '../lib/queries';
import { MAX_GRADE, MIN_GRADE, roundGrade, type ModuleStat } from '../lib/grades';
import { cn, isTempId, parseDecimal, todayISO } from '../lib/utils';
import type { Grade, GradeInput, Module } from '../lib/types';

const LAST_MODULE_KEY = 'notes:last-module';

interface GradeFormProps {
  /** Modules de type « numeric » uniquement. */
  modules: Module[];
  stats: Map<string, ModuleStat>;
  grade?: Grade;
  defaultModuleId?: string;
  /** « quick » = saisie rapide en 3 champs (module, note, poids). */
  variant?: 'quick' | 'full';
  onDone: () => void;
  onCreateModule?: () => void;
}

type Errors = Partial<Record<'module' | 'value' | 'weight' | 'title' | 'date' | 'remarks', string>>;

function initialModuleId(modules: Module[], grade?: Grade, defaultModuleId?: string): string {
  const candidates = [grade?.module_id, defaultModuleId, localStorage.getItem(LAST_MODULE_KEY)];
  for (const id of candidates) {
    if (id && modules.some((m) => m.id === id)) return id;
  }
  return modules.find((m) => !isTempId(m.id))?.id ?? '';
}

export function GradeForm({
  modules,
  stats,
  grade,
  defaultModuleId,
  variant = 'full',
  onDone,
  onCreateModule,
}: GradeFormProps) {
  const createGrade = useCreateGrade();
  const updateGrade = useUpdateGrade();
  const isEdit = Boolean(grade);
  const isQuick = variant === 'quick' && !isEdit;

  const [moduleId, setModuleId] = useState(() => initialModuleId(modules, grade, defaultModuleId));
  const [value, setValue] = useState(grade ? grade.value.toFixed(1) : '');
  const [weight, setWeight] = useState(grade ? String(grade.weight) : '1');
  const [title, setTitle] = useState(grade?.title ?? '');
  const [date, setDate] = useState(grade ? grade.date ?? '' : todayISO());
  const [remarks, setRemarks] = useState(grade?.remarks ?? '');
  const [errors, setErrors] = useState<Errors>({});

  const selectableModules = useMemo(() => modules.filter((m) => !isTempId(m.id)), [modules]);

  if (selectableModules.length === 0) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 ring-1 ring-zinc-800">
          <BookPlus className="h-5 w-5 text-zinc-400" />
        </div>
        <p className="mt-4 text-sm font-medium text-zinc-200">Aucun module noté</p>
        <p className="mt-1 max-w-xs text-sm text-zinc-500">
          Créez d’abord un module de type « notes chiffrées » pour pouvoir y ajouter des évaluations.
        </p>
        {onCreateModule ? (
          <Button variant="accent" className="mt-5" onClick={onCreateModule}>
            Créer un module
          </Button>
        ) : (
          <Link to="/" onClick={onDone} className="mt-5 text-sm text-indigo-400 hover:text-indigo-300">
            Retour au tableau de bord
          </Link>
        )}
      </div>
    );
  }

  const validate = (): GradeInput | null => {
    const next: Errors = {};
    const module = selectableModules.find((m) => m.id === moduleId);
    if (!module) next.module = 'Sélectionnez un module.';

    const parsedValue = parseDecimal(value);
    if (parsedValue === null) next.value = 'Saisissez une note (ex. 4.5).';
    else if (parsedValue < MIN_GRADE || parsedValue > MAX_GRADE)
      next.value = 'La note doit être comprise entre 1.0 et 6.0.';

    const parsedWeight = parseDecimal(weight);
    if (parsedWeight === null || parsedWeight <= 0) next.weight = 'Le poids doit être supérieur à 0.';
    else if (parsedWeight > 100) next.weight = 'Le poids ne peut pas dépasser 100.';

    const cleanTitle = title.trim();
    if (!isQuick) {
      if (!cleanTitle) next.title = 'Donnez un titre à l’évaluation.';
      else if (cleanTitle.length > 200) next.title = '200 caractères maximum.';
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = 'Date invalide.';
      if (remarks.length > 2000) next.remarks = '2000 caractères maximum.';
    }

    setErrors(next);
    if (Object.keys(next).length > 0 || !module || parsedValue === null || parsedWeight === null) {
      return null;
    }

    const count = stats.get(module.id)?.count ?? 0;
    return {
      module_id: module.id,
      title: isQuick ? `Évaluation ${count + 1}` : cleanTitle,
      value: roundGrade(parsedValue),
      weight: Math.round(parsedWeight * 100) / 100,
      date: isQuick ? todayISO() : date || null,
      remarks: isQuick ? null : remarks.trim() || null,
    };
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const input = validate();
    if (!input) return;
    localStorage.setItem(LAST_MODULE_KEY, input.module_id);
    if (grade) updateGrade.mutate({ id: grade.id, patch: input });
    else createGrade.mutate(input);
    // Mise à jour optimiste : l'interface est déjà à jour, on ferme immédiatement
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Field label="Module" htmlFor="grade-module" error={errors.module}>
        <select
          id="grade-module"
          value={moduleId}
          onChange={(e) => setModuleId(e.target.value)}
          className={cn('input', errors.module && 'input-error')}
        >
          {!moduleId && <option value="">Choisir un module…</option>}
          {selectableModules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.code} — {m.name}
            </option>
          ))}
        </select>
      </Field>

      {!isQuick && (
        <Field label="Titre de l’évaluation" htmlFor="grade-title" error={errors.title}>
          <input
            id="grade-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="TE 1 - Théorie"
            maxLength={200}
            autoFocus={!isEdit}
            className={cn('input', errors.title && 'input-error')}
          />
        </Field>
      )}

      <Field label="Note obtenue" htmlFor="grade-value" error={errors.value}>
        <GradeValueInput
          id="grade-value"
          value={value}
          onChange={setValue}
          invalid={Boolean(errors.value)}
          autoFocus={isQuick}
        />
      </Field>

      <Field
        label="Coefficient / poids"
        htmlFor="grade-weight"
        error={errors.weight}
        hint={isQuick ? 'Titre et date sont générés automatiquement, modifiables ensuite.' : undefined}
      >
        <WeightInput id="grade-weight" value={weight} onChange={setWeight} invalid={Boolean(errors.weight)} />
      </Field>

      {!isQuick && (
        <>
          <Field label="Date" htmlFor="grade-date" error={errors.date}>
            <input
              id="grade-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={cn('input', errors.date && 'input-error')}
            />
          </Field>
          <Field label="Remarques (optionnel)" htmlFor="grade-remarks" error={errors.remarks}>
            <textarea
              id="grade-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Points à revoir, commentaires de l’enseignant…"
              className={cn('input resize-none', errors.remarks && 'input-error')}
            />
          </Field>
        </>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" variant="accent">
          {isEdit ? 'Enregistrer' : 'Ajouter la note'}
        </Button>
      </div>
    </form>
  );
}
