import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ModuleDetail } from './pages/ModuleDetail';
import { SettingsPage } from './pages/SettingsPage';
import { AuthPage } from './pages/AuthPage';
import { useAuth } from './contexts/AuthContext';
import { FullScreenLoader } from './components/ui/Logo';
import { isSupabaseConfigured } from './lib/supabase';
import { Database } from 'lucide-react';

function SupabaseNotConfigured() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="max-w-md w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
          <Database className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-100">Supabase non configuré</h2>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Pour utiliser l'application avec la persistance en ligne, créez un fichier{' '}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">.env.local</code> avec vos identifiants Supabase.
        </p>
        <div className="rounded-lg bg-zinc-950 p-3 text-left font-mono text-xs text-zinc-400 overflow-x-auto">
          VITE_SUPABASE_URL=https://...<br />
          VITE_SUPABASE_ANON_KEY=eyJ...
        </div>
        <p className="text-xs text-zinc-400">
          Pensez également à exécuter le script <code className="text-zinc-300">supabase/schema.sql</code> dans l’éditeur SQL de Supabase.
        </p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

export function App() {
  if (!isSupabaseConfigured) {
    return <SupabaseNotConfigured />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="modules/:id" element={<ModuleDetail />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
