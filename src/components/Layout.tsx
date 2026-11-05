import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useMatch } from 'react-router-dom';
import { LayoutGrid, LogOut, Plus, Settings as SettingsIcon } from 'lucide-react';
import { Logo } from './ui/Logo';
import { Modal } from './ui/Modal';
import { GradeForm } from './GradeForm';
import { ModuleForm } from './ModuleForm';
import { useAuth } from '../contexts/AuthContext';
import { useModuleData } from '../lib/queries';
import { cn, isTypingTarget } from '../lib/utils';

const navItems = [
  { to: '/', label: 'Tableau de bord', icon: LayoutGrid, end: true },
  { to: '/settings', label: 'Paramètres', icon: SettingsIcon, end: false },
];

export function Layout() {
  const { user, signOut } = useAuth();
  const { modules, stats } = useModuleData();
  const [fastAddOpen, setFastAddOpen] = useState(false);
  const [moduleFormOpen, setModuleFormOpen] = useState(false);
  const moduleMatch = useMatch('/modules/:id');

  const numericModules = modules.filter((m) => m.type === 'numeric');

  // Raccourci clavier « n » : nouvelle note
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(e.target)) {
        if (document.querySelector('[role="dialog"]')) return;
        e.preventDefault();
        setFastAddOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="text-sm font-semibold tracking-tight">Notes</span>
          </Link>

          <div className="flex items-center gap-1">
            <nav className="flex items-center gap-1">
              {navItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  title={label}
                  className={({ isActive }) =>
                    cn(
                      'flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm transition',
                      isActive ? 'bg-zinc-800/70 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-100',
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="mx-2 hidden h-5 w-px bg-zinc-800 md:block" />
            <span className="hidden max-w-[200px] truncate text-xs text-zinc-500 md:block" title={user?.email}>
              {user?.email}
            </span>
            <button
              onClick={signOut}
              title="Se déconnecter"
              aria-label="Se déconnecter"
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800/40 hover:text-zinc-100"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:pt-8">
        <Outlet />
      </main>

      {/* Bouton d'action flottant : saisie rapide */}
      <button
        onClick={() => setFastAddOpen(true)}
        className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-indigo-400/50 transition hover:scale-105 hover:bg-indigo-400 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/40"
        aria-label="Ajouter une note (raccourci : N)"
        title="Ajouter une note (N)"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <Modal
        open={fastAddOpen}
        onClose={() => setFastAddOpen(false)}
        title="Saisie rapide"
        description="Ajoutez une note en quelques secondes."
      >
        <GradeForm
          variant="quick"
          modules={numericModules}
          stats={stats}
          defaultModuleId={moduleMatch?.params.id}
          onDone={() => setFastAddOpen(false)}
          onCreateModule={() => {
            setFastAddOpen(false);
            setModuleFormOpen(true);
          }}
        />
      </Modal>

      <Modal open={moduleFormOpen} onClose={() => setModuleFormOpen(false)} title="Nouveau module">
        <ModuleForm existingModules={modules} onDone={() => setModuleFormOpen(false)} />
      </Modal>
    </div>
  );
}
