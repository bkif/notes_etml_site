import { useState, type FormEvent } from 'react';
import { Hash, ListChecks } from 'lucide-react';
import { Button } from './ui/Button';
import { Field } from './ui/Field';
import { useCreateModule, useUpdateModule } from '../lib/queries';
import { cn, parseDecimal } from '../lib/utils';
import { STATUS_OPTIONS, type Module, type ModuleInput, type ModuleType, type StatusValidation } from '../lib/types';

interface ModuleFormProps {
  module?: Module;
  existingModules: Module[];
  onDone: (created?: ModuleInput) => void;
}

type Errors = Partial<Record<'code' | 'name' | 'coefficient' | 'periods', string>>;

const TYPES: { value: ModuleType; label: string; description: string; Icon: typeof Hash }[] = [
  { value: 'numeric', label: 'Notes chiffrées', description: 'Moyenne sur 6', Icon: Hash },
  { value: 'status', label: 'Validation', description: 'Acquis / Non acquis', Icon: ListChecks },
];

export function ModuleForm({ module, existingModules, onDone }: ModuleFormProps) {
  const createModule = useCreateModule();
  const updateModule = useUpdateModule();

  const [code, setCode] = useState(module?.code ?? '');
  const [name, setName] = useState(module?.name ?? '');
  const [coefficient, setCoefficient] = useState(module ? String(module.coefficient) : '1');
  const [periods, setPeriods] = useState(module?.periods ? String(module.periods) : '40');
  const [type, setType] = useState<ModuleType>(module?.type ?? 'numeric');
  const [status, setStatus] = useState<StatusValidation>(module?.status_validation ?? 'En cours');
  const [errors, setErrors] = useState<Errors>({});

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    const cleanCode = code.trim();
    const cleanName = name.trim();
    const coef = parseDecimal(coefficient);
    const parsedPeriods = periods.trim() ? parseInt(periods.trim(), 10) : 40;

    if (!cleanCode) next.code = 'Le code est requis (ex. I320).';
    else if (cleanCode.length > 32) next.code = '32 caractères maximum.';
    else if (
      existingModules.some(
        (m) => m.id !== module?.id && m.code.toLowerCase() === cleanCode.toLowerCase(),
      )
    )
      next.code = 'Un module avec ce code existe déjà.';

    if (!cleanName) next.name = 'Le nom est requis.';
    else if (cleanName.length > 200) next.name = '200 caractères maximum.';

    if (coef === null || coef <= 0) next.coefficient = 'Le coefficient doit être supérieur à 0.';
    else if (coef > 100) next.coefficient = 'Le coefficient ne peut pas dépasser 100.';

    if (isNaN(parsedPeriods) || parsedPeriods <= 0 || parsedPeriods > 1000) {
      next.periods = 'Le nombre de périodes doit être positif (ex. 40, 80).';
    }

    setErrors(next);
    if (Object.keys(next).length > 0 || coef === null) return;

    const input: ModuleInput = {
      code: cleanCode,
      name: cleanName,
      coefficient: Math.round(coef * 100) / 100,
      periods: parsedPeriods,
      type,
      status_validation: type === 'status' ? status : null,
    };

    if (module) updateModule.mutate({ id: module.id, patch: input });
    else createModule.mutate(input);
    onDone(module ? undefined : input);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
        <Field label="Code" htmlFor="module-code" error={errors.code}>
          <input
            id="module-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="I320"
            maxLength={32}
            autoFocus
            autoCapitalize="characters"
            autoComplete="off"
            className={cn('input font-mono', errors.code && 'input-error')}
          />
        </Field>
        <Field label="Coefficient" htmlFor="module-coef" error={errors.coefficient}>
          <input
            id="module-coef"
            value={coefficient}
            onChange={(e) => setCoefficient(e.target.value)}
            inputMode="decimal"
            autoComplete="off"
            className={cn('input text-center font-mono', errors.coefficient && 'input-error')}
          />
        </Field>
      </div>

      <Field label="Nom du module" htmlFor="module-name" error={errors.name}>
        <input
          id="module-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Programmation orientée objet"
          maxLength={200}
          className={cn('input', errors.name && 'input-error')}
        />
      </Field>

      <div>
        <span className="label">Type d’évaluation</span>
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {TYPES.map(({ value, label, description, Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={type === value}
              onClick={() => setType(value)}
              className={cn(
                'flex items-start gap-2.5 rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70',
                type === value
                  ? 'border-indigo-500/50 bg-indigo-500/10'
                  : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700',
              )}
            >
              <Icon className={cn('mt-0.5 h-4 w-4', type === value ? 'text-indigo-400' : 'text-zinc-400')} />
              <span>
                <span className="block text-sm font-medium text-zinc-200">{label}</span>
                <span className="block text-xs text-zinc-400">{description}</span>
              </span>
            </button>
          ))}
        </div>
        {module && module.type !== type && (
          <p className="mt-2 text-xs text-amber-400/90">
            Les évaluations existantes sont conservées mais ne sont affichées que pour les modules chiffrés.
          </p>
        )}
      </div>

      <div className={cn('grid grid-cols-1 gap-3', type === 'status' && 'sm:grid-cols-2')}>
        <Field label="Nombre de périodes" htmlFor="module-periods" error={errors.periods}>
          <input
            id="module-periods"
            value={periods}
            onChange={(e) => setPeriods(e.target.value)}
            inputMode="numeric"
            placeholder="40"
            autoComplete="off"
            className={cn('input text-center font-mono', errors.periods && 'input-error')}
          />
        </Field>
        {type === 'status' && (
          <Field label="Statut de validation">
            <div className="grid grid-cols-3 gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn('chip h-9 font-sans text-xs', status === s && 'chip-active')}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={() => onDone()}>
          Annuler
        </Button>
        <Button type="submit" variant="accent">
          {module ? 'Enregistrer' : 'Créer le module'}
        </Button>
      </div>
    </form>
  );
}
