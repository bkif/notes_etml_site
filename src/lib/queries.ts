import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { computeGlobalStats, computeModuleStats, sortGrades, sortModules } from './grades';
import { getErrorMessage, tempId } from './utils';
import type { Grade, GradeInput, Module, ModuleInput } from './types';

// ---------------------------------------------------------------------------
// Clés de cache (scopées par utilisateur)
// ---------------------------------------------------------------------------
export const queryKeys = {
  modules: (uid: string) => ['modules', uid] as const,
  grades: (uid: string) => ['grades', uid] as const,
};

function useUserId(): string {
  return useAuth().user?.id ?? '';
}

function toModule(row: Module): Module {
  return {
    ...row,
    coefficient: Number(row.coefficient),
    status_validation: row.type === 'status' ? row.status_validation : null,
  };
}

function toGrade(row: Grade): Grade {
  return { ...row, value: Number(row.value), weight: Number(row.weight) };
}

/** Applique une mise à jour optimiste et renvoie l'état précédent pour un éventuel rollback. */
async function optimistic<T>(
  qc: QueryClient,
  key: readonly unknown[],
  update: (old: T[]) => T[],
): Promise<T[] | undefined> {
  await qc.cancelQueries({ queryKey: key });
  const previous = qc.getQueryData<T[]>(key);
  qc.setQueryData<T[]>(key, (old) => update(old ?? []));
  return previous;
}

// ---------------------------------------------------------------------------
// Lectures
// ---------------------------------------------------------------------------
export function useModules() {
  const uid = useUserId();
  return useQuery({
    queryKey: queryKeys.modules(uid),
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from('modules').select('*');
      if (error) throw error;
      return sortModules((data ?? []).map(toModule));
    },
  });
}

export function useGrades() {
  const uid = useUserId();
  return useQuery({
    queryKey: queryKeys.grades(uid),
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from('grades').select('*');
      if (error) throw error;
      return sortGrades((data ?? []).map(toGrade));
    },
  });
}

/** Modules + notes + statistiques dérivées, calculées côté client en temps réel. */
export function useModuleData() {
  const modulesQuery = useModules();
  const gradesQuery = useGrades();
  const modules = useMemo(() => modulesQuery.data ?? [], [modulesQuery.data]);
  const grades = useMemo(() => gradesQuery.data ?? [], [gradesQuery.data]);
  const stats = useMemo(() => computeModuleStats(grades), [grades]);
  const global = useMemo(
    () => computeGlobalStats(modules, stats, grades.length),
    [modules, stats, grades.length],
  );

  return {
    modules,
    grades,
    stats,
    global,
    isLoading: modulesQuery.isPending || gradesQuery.isPending,
    error: modulesQuery.error ?? gradesQuery.error,
    refetch: () => Promise.all([modulesQuery.refetch(), gradesQuery.refetch()]),
  };
}

// ---------------------------------------------------------------------------
// Mutations : modules
// ---------------------------------------------------------------------------
export function useCreateModule() {
  const qc = useQueryClient();
  const toast = useToast();
  const uid = useUserId();
  const key = queryKeys.modules(uid);

  return useMutation({
    mutationFn: async (input: ModuleInput) => {
      const { data, error } = await supabase
        .from('modules')
        .insert({ ...input, user_id: uid })
        .select()
        .single();
      if (error) throw error;
      return toModule(data);
    },
    onMutate: async (input) => {
      const id = tempId();
      const draft: Module = { ...input, id, user_id: uid, created_at: new Date().toISOString() };
      const previous = await optimistic<Module>(qc, key, (old) => sortModules([...old, draft]));
      return { previous, id };
    },
    onSuccess: (created, _vars, ctx) => {
      qc.setQueryData<Module[]>(key, (old = []) =>
        sortModules(old.map((m) => (m.id === ctx?.id ? created : m))),
      );
      toast.success(`Module ${created.code} créé`);
    },
    onError: (err, _vars, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
      toast.error(getErrorMessage(err));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateModule() {
  const qc = useQueryClient();
  const toast = useToast();
  const uid = useUserId();
  const key = queryKeys.modules(uid);

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ModuleInput> }) => {
      const { data, error } = await supabase
        .from('modules')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return toModule(data);
    },
    onMutate: async ({ id, patch }) => {
      const previous = await optimistic<Module>(qc, key, (old) =>
        sortModules(old.map((m) => (m.id === id ? { ...m, ...patch } : m))),
      );
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
      toast.error(getErrorMessage(err));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteModule() {
  const qc = useQueryClient();
  const toast = useToast();
  const uid = useUserId();
  const mKey = queryKeys.modules(uid);
  const gKey = queryKeys.grades(uid);

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('modules').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      const previousModules = await optimistic<Module>(qc, mKey, (old) =>
        old.filter((m) => m.id !== id),
      );
      // ON DELETE CASCADE côté base : on retire aussi les notes du cache
      const previousGrades = await optimistic<Grade>(qc, gKey, (old) =>
        old.filter((g) => g.module_id !== id),
      );
      return { previousModules, previousGrades };
    },
    onSuccess: () => toast.success('Module supprimé'),
    onError: (err, _vars, ctx) => {
      if (ctx) {
        qc.setQueryData(mKey, ctx.previousModules);
        qc.setQueryData(gKey, ctx.previousGrades);
      }
      toast.error(getErrorMessage(err));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: mKey });
      qc.invalidateQueries({ queryKey: gKey });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations : notes
// ---------------------------------------------------------------------------
export function useCreateGrade() {
  const qc = useQueryClient();
  const toast = useToast();
  const uid = useUserId();
  const key = queryKeys.grades(uid);

  return useMutation({
    mutationFn: async (input: GradeInput) => {
      const { data, error } = await supabase
        .from('grades')
        .insert({ ...input, user_id: uid })
        .select()
        .single();
      if (error) throw error;
      return toGrade(data);
    },
    onMutate: async (input) => {
      const id = tempId();
      const draft: Grade = { ...input, id, user_id: uid, created_at: new Date().toISOString() };
      const previous = await optimistic<Grade>(qc, key, (old) => sortGrades([draft, ...old]));
      return { previous, id };
    },
    onSuccess: (created, _vars, ctx) => {
      qc.setQueryData<Grade[]>(key, (old = []) =>
        sortGrades(old.map((g) => (g.id === ctx?.id ? created : g))),
      );
      toast.success(`Note ${created.value.toFixed(1)} enregistrée`);
    },
    onError: (err, _vars, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
      toast.error(getErrorMessage(err));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateGrade() {
  const qc = useQueryClient();
  const toast = useToast();
  const uid = useUserId();
  const key = queryKeys.grades(uid);

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<GradeInput> }) => {
      const { data, error } = await supabase
        .from('grades')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return toGrade(data);
    },
    onMutate: async ({ id, patch }) => {
      const previous = await optimistic<Grade>(qc, key, (old) =>
        sortGrades(old.map((g) => (g.id === id ? { ...g, ...patch } : g))),
      );
      return { previous };
    },
    onSuccess: () => toast.success('Évaluation mise à jour'),
    onError: (err, _vars, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
      toast.error(getErrorMessage(err));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteGrade() {
  const qc = useQueryClient();
  const toast = useToast();
  const uid = useUserId();
  const key = queryKeys.grades(uid);

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('grades').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      const previous = await optimistic<Grade>(qc, key, (old) => old.filter((g) => g.id !== id));
      return { previous };
    },
    onSuccess: () => toast.success('Évaluation supprimée'),
    onError: (err, _vars, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
      toast.error(getErrorMessage(err));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
