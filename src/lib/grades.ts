import type { Grade, Module } from './types';

export const MIN_GRADE = 1;
export const MAX_GRADE = 6;
export const PASS_THRESHOLD = 4;
export const GOOD_THRESHOLD = 5;

type Weighted = Pick<Grade, 'value' | 'weight'>;

/** Moyenne pondérée : Σ(note × poids) / Σ(poids). */
export function weightedAverage(items: Weighted[]): number | null {
  let sum = 0;
  let totalWeight = 0;
  for (const g of items) {
    if (g.weight > 0) {
      sum += g.value * g.weight;
      totalWeight += g.weight;
    }
  }
  return totalWeight > 0 ? sum / totalWeight : null;
}

/** Arrondi d'une note au dixième (ou au pas indiqué, ex. 0.5). */
export function roundGrade(value: number, step = 0.1): number {
  return Math.round(Math.round(value / step) * step * 10) / 10;
}

export interface ModuleStat {
  average: number | null;
  count: number;
  totalWeight: number;
}

export const EMPTY_STAT: ModuleStat = { average: null, count: 0, totalWeight: 0 };

export function computeModuleStats(grades: Grade[]): Map<string, ModuleStat> {
  const groups = new Map<string, Grade[]>();
  for (const g of grades) {
    const list = groups.get(g.module_id);
    if (list) list.push(g);
    else groups.set(g.module_id, [g]);
  }
  const stats = new Map<string, ModuleStat>();
  for (const [moduleId, list] of groups) {
    stats.set(moduleId, {
      average: weightedAverage(list),
      count: list.length,
      totalWeight: list.reduce((acc, g) => acc + g.weight, 0),
    });
  }
  return stats;
}

export function isModuleValidated(module: Module, stat: ModuleStat): boolean {
  if (module.type === 'status') return module.status_validation === 'Acquis';
  return stat.average !== null && stat.average >= PASS_THRESHOLD;
}

export interface GlobalStats {
  /** Moyenne des modules chiffrés, pondérée par le coefficient de chaque module. */
  globalAverage: number | null;
  gradedModuleCount: number;
  validatedCount: number;
  belowCount: number;
  moduleCount: number;
  gradeCount: number;
  /** Statistiques sur les périodes */
  totalPeriods: number;
  acquiredPeriods: number;
  inProgressPeriods: number;
  failedPeriods: number;
}

export function computeGlobalStats(
  modules: Module[],
  stats: Map<string, ModuleStat>,
  gradeCount: number,
): GlobalStats {
  let sum = 0;
  let coefSum = 0;
  let graded = 0;
  let validated = 0;
  let below = 0;

  let totalPeriods = 0;
  let acquiredPeriods = 0;
  let inProgressPeriods = 0;
  let failedPeriods = 0;

  for (const m of modules) {
    const stat = stats.get(m.id) ?? EMPTY_STAT;
    const isValid = isModuleValidated(m, stat);

    if (m.type === 'status') {
      const p = m.periods && m.periods > 0 ? m.periods : 40;
      totalPeriods += p;
      if (m.status_validation === 'Acquis') {
        acquiredPeriods += p;
      } else if (m.status_validation === 'Non acquis') {
        failedPeriods += p;
      } else {
        inProgressPeriods += p;
      }
    }

    if (isValid) validated++;
    if (m.type === 'numeric' && stat.average !== null) {
      graded++;
      sum += stat.average * m.coefficient;
      coefSum += m.coefficient;
      if (stat.average < PASS_THRESHOLD) below++;
    }
  }

  return {
    globalAverage: coefSum > 0 ? sum / coefSum : null,
    gradedModuleCount: graded,
    validatedCount: validated,
    belowCount: below,
    moduleCount: modules.length,
    gradeCount,
    totalPeriods,
    acquiredPeriods,
    inProgressPeriods,
    failedPeriods,
  };
}

export type Tone = 'success' | 'neutral' | 'danger' | 'empty';

export function averageTone(avg: number | null): Tone {
  if (avg === null) return 'empty';
  if (avg >= GOOD_THRESHOLD) return 'success';
  if (avg >= PASS_THRESHOLD) return 'neutral';
  return 'danger';
}

export const toneClasses: Record<Tone, { text: string; soft: string; bar: string }> = {
  success: {
    text: 'text-emerald-400',
    soft: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    bar: 'bg-emerald-500',
  },
  neutral: {
    text: 'text-sky-400',
    soft: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
    bar: 'bg-sky-500',
  },
  danger: {
    text: 'text-red-400',
    soft: 'bg-red-500/10 border-red-500/20 text-red-400',
    bar: 'bg-red-500',
  },
  empty: {
    text: 'text-zinc-500',
    soft: 'bg-zinc-800/40 border-zinc-800 text-zinc-500',
    bar: 'bg-zinc-700',
  },
};

export function formatAverage(avg: number | null, digits = 2): string {
  return avg === null ? '—' : avg.toFixed(digits);
}

export function formatGrade(value: number): string {
  return value.toFixed(1);
}

/** 1 → "1", 1.5 → "1.5", 0.25 → "0.25" */
export function formatWeight(value: number): string {
  return String(Number(value.toFixed(2)));
}

/** Position (0–100 %) d'une note sur l'échelle 1–6. */
export function gradeToPercent(value: number): number {
  return Math.min(100, Math.max(0, ((value - MIN_GRADE) / (MAX_GRADE - MIN_GRADE)) * 100));
}

export interface RequiredGradeResult {
  target: number;
  /** Note minimale nécessaire, arrondie au dixième supérieur. */
  required: number;
  state: 'reachable' | 'impossible' | 'secured';
}

/**
 * Note à obtenir au prochain test (poids `nextWeight`) pour atteindre `target` :
 * (target × (W + w) − S) / w, avec S = Σ(note × poids) et W = Σ(poids).
 */
export function requiredGrade(
  grades: Weighted[],
  nextWeight: number,
  target: number,
): RequiredGradeResult | null {
  if (!(nextWeight > 0)) return null;
  let sum = 0;
  let totalWeight = 0;
  for (const g of grades) {
    sum += g.value * g.weight;
    totalWeight += g.weight;
  }
  const raw = (target * (totalWeight + nextWeight) - sum) / nextWeight;
  const required = Math.ceil(raw * 10 - 1e-6) / 10;

  if (required > MAX_GRADE) return { target, required, state: 'impossible' };
  if (required <= MIN_GRADE) return { target, required: MIN_GRADE, state: 'secured' };
  return { target, required, state: 'reachable' };
}

export function sortModules(modules: Module[]): Module[] {
  return [...modules].sort((a, b) =>
    a.code.localeCompare(b.code, 'fr', { numeric: true, sensitivity: 'base' }),
  );
}

export function sortGrades(grades: Grade[]): Grade[] {
  return [...grades].sort((a, b) => {
    if (a.date !== b.date) {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date < b.date ? 1 : -1;
    }
    return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0;
  });
}
