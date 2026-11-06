import { useState } from 'react';
import { Calculator, CheckCircle2, Target, TrendingUp, XCircle } from 'lucide-react';
import { WeightInput } from './GradeInputs';
import {
  averageTone,
  formatAverage,
  formatWeight,
  MAX_GRADE,
  MIN_GRADE,
  requiredGrade,
  toneClasses,
  weightedAverage,
  type RequiredGradeResult,
} from '../lib/grades';
import { cn, parseDecimal } from '../lib/utils';
import type { Grade } from '../lib/types';

function ResultTile({ result, weight }: { result: RequiredGradeResult; weight: number }) {
  const { target, required, state } = result;
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        state === 'impossible'
          ? 'border-red-500/20 bg-red-500/5'
          : state === 'secured'
            ? 'border-emerald-500/20 bg-emerald-500/5'
            : 'border-zinc-800 bg-zinc-900/60',
      )}
    >
      <p className="flex items-center gap-1.5 text-xs text-zinc-500">
        <Target className="h-3.5 w-3.5" />
        Objectif {target.toFixed(1)}
      </p>
      {state === 'reachable' && (
        <>
          <p className={cn('mt-1.5 font-mono text-2xl font-semibold', required > 5.5 ? 'text-amber-400' : 'text-zinc-100')}>
            {required.toFixed(1)}
          </p>
          <p className="text-xs text-zinc-500">minimum requis (×{formatWeight(weight)})</p>
        </>
      )}
      {state === 'secured' && (
        <>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Déjà assuré
          </p>
          <p className="text-xs text-zinc-500">même avec un 1.0</p>
        </>
      )}
      {state === 'impossible' && (
        <>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-red-400">
            <XCircle className="h-4 w-4" /> Hors d’atteinte
          </p>
          <p className="text-xs text-zinc-500">il faudrait {required.toFixed(1)}</p>
        </>
      )}
    </div>
  );
}

export function GradeSimulator({ grades }: { grades: Grade[] }) {
  const [weightInput, setWeightInput] = useState('1');
  const [customTarget, setCustomTarget] = useState('4.5');
  const [hypothesis, setHypothesis] = useState('');

  const weight = parseDecimal(weightInput);
  const validWeight = weight !== null && weight > 0 && weight <= 100;
  const target = parseDecimal(customTarget);
  const validTarget = target !== null && target >= MIN_GRADE && target <= MAX_GRADE;
  const hypo = parseDecimal(hypothesis);
  const validHypo = hypo !== null && hypo >= MIN_GRADE && hypo <= MAX_GRADE;

  const results = validWeight
    ? [4, 5].map((t) => requiredGrade(grades, weight, t)).filter((r): r is RequiredGradeResult => r !== null)
    : [];
  const customResult = validWeight && validTarget ? requiredGrade(grades, weight, target) : null;
  const projected =
    validWeight && validHypo ? weightedAverage([...grades, { value: hypo, weight }]) : null;

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/10">
          <Calculator className="h-4 w-4 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Simulateur</h2>
          <p className="text-xs text-zinc-500">Quelle note viser au prochain test ?</p>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="sim-weight" className="label">
          Coefficient du prochain test
        </label>
        <div className="mt-1">
          <WeightInput id="sim-weight" value={weightInput} onChange={setWeightInput} invalid={!validWeight} />
        </div>
        {!validWeight && <p className="mt-1.5 text-xs text-red-400">Coefficient invalide (0 &lt; x ≤ 100).</p>}
      </div>

      {validWeight && weight !== null && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {results.map((r) => (
              <ResultTile key={r.target} result={r} weight={weight} />
            ))}
          </div>

          <div className="mt-4 space-y-3 border-t border-zinc-800/80 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="sim-target" className="text-xs text-zinc-400">
                Objectif personnalisé
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="sim-target"
                  value={customTarget}
                  onChange={(e) => setCustomTarget(e.target.value)}
                  inputMode="decimal"
                  className={cn('input h-8 w-16 px-2 text-center font-mono', !validTarget && 'input-error')}
                />
                <span className="w-24 text-right font-mono text-sm">
                  {customResult ? (
                    customResult.state === 'impossible' ? (
                      <span className="text-red-400">impossible</span>
                    ) : customResult.state === 'secured' ? (
                      <span className="text-emerald-400">assuré</span>
                    ) : (
                      <span className="text-zinc-100">≥ {customResult.required.toFixed(1)}</span>
                    )
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="sim-hypo" className="flex items-center gap-1.5 text-xs text-zinc-400">
                <TrendingUp className="h-3.5 w-3.5" />
                Moyenne si j’obtiens
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="sim-hypo"
                  placeholder="ex. 5"
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  inputMode="decimal"
                  className={cn('input h-8 w-16 px-2 text-center font-mono', hypothesis && !validHypo && 'input-error')}
                />
                <span className="w-24 text-right font-mono text-sm">
                  {projected !== null ? (
                    <span className={cn('font-semibold', toneClasses[averageTone(projected)].text)}>
                      → {formatAverage(projected)}
                    </span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
