import { supabase } from './supabase';
import { computeModuleStats, MAX_GRADE, MIN_GRADE } from './grades';
import type { Grade, Module, ModuleType, StatusValidation } from './types';

// ---------------------------------------------------------------------------
// Export JSON
// ---------------------------------------------------------------------------
export interface BackupModule {
  id: string;
  code: string;
  name: string;
  coefficient: number;
  type: ModuleType;
  periods?: number | null;
  status_validation: StatusValidation | null;
  created_at?: string;
}

export interface BackupGrade {
  id?: string;
  module_id: string;
  title: string;
  value: number;
  weight: number;
  date: string | null;
  remarks: string | null;
  created_at?: string;
}

export interface BackupPayload {
  app: 'notes';
  version: 1;
  exported_at: string;
  modules: BackupModule[];
  grades: BackupGrade[];
}

export function buildJsonExport(modules: Module[], grades: Grade[]): string {
  const payload: BackupPayload = {
    app: 'notes',
    version: 1,
    exported_at: new Date().toISOString(),
    modules: modules.map(({ id, code, name, coefficient, type, periods, status_validation, created_at }) => ({
      id,
      code,
      name,
      coefficient,
      type,
      periods,
      status_validation,
      created_at,
    })),
    grades: grades.map(({ id, module_id, title, value, weight, date, remarks, created_at }) => ({
      id,
      module_id,
      title,
      value,
      weight,
      date,
      remarks,
      created_at,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

// ---------------------------------------------------------------------------
// Export CSV
// ---------------------------------------------------------------------------
export type CsvFormat = 'standard' | 'excel';

export function buildCsvExport(modules: Module[], grades: Grade[], format: CsvFormat): string {
  const sep = format === 'excel' ? ';' : ',';
  const num = (n: number | null | undefined, digits?: number) => {
    if (n === null || n === undefined) return '';
    const s = digits === undefined ? String(n) : n.toFixed(digits);
    return format === 'excel' ? s.replace('.', ',') : s;
  };
  const text = (value: string | null | undefined) => {
    let s = value ?? '';
    // Protection contre l'injection de formules dans les tableurs
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /["\n\r,;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const stats = computeModuleStats(grades);
  const header = [
    'module_code',
    'module_nom',
    'module_coefficient',
    'module_type',
    'module_statut',
    'module_moyenne',
    'evaluation',
    'note',
    'poids',
    'date',
    'remarques',
  ];
  const rows: string[] = [header.join(sep)];

  for (const m of modules) {
    const moduleCols = [
      text(m.code),
      text(m.name),
      num(m.coefficient),
      m.type,
      text(m.status_validation),
      num(stats.get(m.id)?.average ?? null, 2),
    ];
    const list = grades.filter((g) => g.module_id === m.id);
    if (list.length === 0) {
      rows.push([...moduleCols, '', '', '', '', ''].join(sep));
      continue;
    }
    for (const g of list) {
      rows.push(
        [
          ...moduleCols,
          text(g.title),
          num(g.value, 1),
          num(g.weight),
          g.date ?? '',
          text(g.remarks),
        ].join(sep),
      );
    }
  }
  // BOM UTF-8 pour un affichage correct des accents dans Excel
  return '\uFEFF' + rows.join('\r\n');
}

export function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------
// Import JSON (restauration d'une sauvegarde)
// ---------------------------------------------------------------------------
const STATUSES: StatusValidation[] = ['Acquis', 'Non acquis', 'En cours'];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function parseBackup(text: string): { modules: BackupModule[]; grades: BackupGrade[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Fichier illisible : ce n’est pas un JSON valide.');
  }
  if (!isObject(raw) || !Array.isArray(raw.modules) || !Array.isArray(raw.grades)) {
    throw new Error('Format inattendu : les clés "modules" et "grades" sont requises.');
  }

  const modules: BackupModule[] = raw.modules.map((m, i) => {
    if (!isObject(m) || typeof m.id !== 'string' || typeof m.code !== 'string' || typeof m.name !== 'string') {
      throw new Error(`Module n°${i + 1} invalide (id, code et name requis).`);
    }
    const type: ModuleType = m.type === 'status' ? 'status' : 'numeric';
    const coefficient = Number(m.coefficient ?? 1);
    const status = STATUSES.includes(m.status_validation as StatusValidation)
      ? (m.status_validation as StatusValidation)
      : null;
    return {
      id: m.id,
      code: m.code.trim().slice(0, 32),
      name: m.name.trim().slice(0, 200),
      coefficient: Number.isFinite(coefficient) && coefficient > 0 ? coefficient : 1,
      type,
      status_validation: type === 'status' ? status : null,
    };
  });

  const grades: BackupGrade[] = raw.grades.map((g, i) => {
    if (!isObject(g) || typeof g.module_id !== 'string') {
      throw new Error(`Évaluation n°${i + 1} invalide (module_id requis).`);
    }
    const value = Number(g.value);
    if (!Number.isFinite(value) || value < MIN_GRADE || value > MAX_GRADE) {
      throw new Error(`Évaluation n°${i + 1} : la note doit être comprise entre 1.0 et 6.0.`);
    }
    const weight = Number(g.weight ?? 1);
    return {
      module_id: g.module_id,
      title: (typeof g.title === 'string' && g.title.trim() ? g.title.trim() : 'Évaluation').slice(0, 200),
      value: Math.round(value * 10) / 10,
      weight: Number.isFinite(weight) && weight > 0 ? weight : 1,
      date: typeof g.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(g.date) ? g.date : null,
      remarks: typeof g.remarks === 'string' && g.remarks.trim() ? g.remarks.slice(0, 2000) : null,
    };
  });

  return { modules, grades };
}

export interface ImportResult {
  modulesCreated: number;
  modulesMerged: number;
  gradesCreated: number;
  gradesSkipped: number;
}

/**
 * Importe une sauvegarde : les modules dont le code existe déjà sont fusionnés,
 * les évaluations strictement identiques ne sont pas dupliquées.
 */
export async function importBackup(
  backup: { modules: BackupModule[]; grades: BackupGrade[] },
  existingModules: Module[],
  existingGrades: Grade[],
  userId: string,
): Promise<ImportResult> {
  const byCode = new Map(existingModules.map((m) => [m.code.toLowerCase(), m.id]));
  const idMap = new Map<string, string>();
  const toInsert: BackupModule[] = [];
  const pendingCodes = new Map<string, BackupModule[]>();
  let modulesMerged = 0;

  for (const m of backup.modules) {
    const codeKey = m.code.toLowerCase();
    const existingId = byCode.get(codeKey);
    if (existingId) {
      idMap.set(m.id, existingId);
      modulesMerged++;
      continue;
    }
    const pending = pendingCodes.get(codeKey);
    if (pending) {
      pending.push(m); // doublon dans le fichier : rattaché au même module
    } else {
      pendingCodes.set(codeKey, [m]);
      toInsert.push(m);
    }
  }

  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from('modules')
      .insert(
        toInsert.map((m) => ({
          user_id: userId,
          code: m.code,
          name: m.name,
          coefficient: m.coefficient,
          type: m.type,
          status_validation: m.status_validation,
        })),
      )
      .select('id, code');
    if (error) throw error;
    for (const row of data ?? []) {
      for (const original of pendingCodes.get(String(row.code).toLowerCase()) ?? []) {
        idMap.set(original.id, row.id as string);
      }
    }
  }

  const fingerprint = (g: Pick<Grade, 'module_id' | 'title' | 'value' | 'weight' | 'date'>) =>
    `${g.module_id}|${g.title}|${Number(g.value).toFixed(1)}|${Number(g.weight)}|${g.date ?? ''}`;
  const known = new Set(existingGrades.map(fingerprint));

  const gradeRows = [];
  let gradesSkipped = 0;
  for (const g of backup.grades) {
    const moduleId = idMap.get(g.module_id);
    if (!moduleId) {
      gradesSkipped++;
      continue;
    }
    const row = { ...g, module_id: moduleId, user_id: userId };
    const fp = fingerprint(row);
    if (known.has(fp)) {
      gradesSkipped++;
      continue;
    }
    known.add(fp);
    gradeRows.push(row);
  }

  for (let i = 0; i < gradeRows.length; i += 500) {
    const { error } = await supabase.from('grades').insert(gradeRows.slice(i, i + 500));
    if (error) throw error;
  }

  return {
    modulesCreated: toInsert.length,
    modulesMerged,
    gradesCreated: gradeRows.length,
    gradesSkipped,
  };
}
