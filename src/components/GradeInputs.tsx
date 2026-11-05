import { Minus, Plus } from 'lucide-react';
import { clamp, cn, parseDecimal } from '../lib/utils';
import { averageTone, MAX_GRADE, MIN_GRADE, toneClasses } from '../lib/grades';

const QUICK_GRADES = [3.5, 4, 4.5, 5, 5.5, 6];
const QUICK_WEIGHTS = [0.5, 1, 2, 3];

interface GradeValueInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  autoFocus?: boolean;
}

/** Saisie rapide d'une note : champ + pas de ±0.5 + valeurs fréquentes. */
export function GradeValueInput({ id, value, onChange, invalid, autoFocus }: GradeValueInputProps) {
  const parsed = parseDecimal(value);
  const valid = parsed !== null && parsed >= MIN_GRADE && parsed <= MAX_GRADE;
  const tone = valid ? averageTone(parsed) : 'empty';

  const step = (delta: number) => {
    const current = parsed ?? 4;
    const next = clamp(Math.round((current + delta) * 2) / 2, MIN_GRADE, MAX_GRADE);
    onChange(next.toFixed(1));
  };

  return (
    <div>
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => step(-0.5)}
          className="flex w-12 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100 active:scale-95"
          aria-label="Diminuer de 0.5"
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="4.5"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'input h-12 flex-1 text-center font-mono text-2xl font-semibold sm:text-2xl',
            valid && toneClasses[tone].text,
            invalid && 'input-error',
          )}
          aria-invalid={invalid}
        />
        <button
          type="button"
          onClick={() => step(0.5)}
          className="flex w-12 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100 active:scale-95"
          aria-label="Augmenter de 0.5"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-6 gap-1.5">
        {QUICK_GRADES.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onChange(g.toFixed(1))}
            className={cn('chip', parsed === g && 'chip-active')}
          >
            {g.toFixed(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

interface WeightInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}

export function WeightInput({ id, value, onChange, invalid }: WeightInputProps) {
  const parsed = parseDecimal(value);
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn('input w-20 text-center font-mono', invalid && 'input-error')}
        aria-invalid={invalid}
      />
      <div className="flex flex-1 gap-1.5">
        {QUICK_WEIGHTS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => onChange(String(w))}
            className={cn('chip flex-1', parsed === w && 'chip-active')}
          >
            ×{w}
          </button>
        ))}
      </div>
    </div>
  );
}
