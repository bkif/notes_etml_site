import { useState, useRef, type ChangeEvent } from 'react';
import { Download, Upload, ShieldCheck, Database, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useModuleData } from '../lib/queries';
import { buildCsvExport, buildJsonExport, parseBackup, importBackup, downloadFile } from '../lib/export';
import { useQueryClient } from '@tanstack/react-query';

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const { modules, grades, isLoading } = useModuleData();
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importing, setImporting] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const handleExportJson = () => {
    try {
      const json = buildJsonExport(modules, grades);
      const filename = `notes-backup-${new Date().toISOString().slice(0, 10)}.json`;
      downloadFile(json, filename, 'application/json');
      toast.success('Sauvegarde JSON téléchargée avec succès');
    } catch {
      toast.error('Erreur lors de l’export JSON');
    }
  };

  const handleExportCsv = (format: 'excel' | 'standard' = 'excel') => {
    try {
      const csv = buildCsvExport(modules, grades, format);
      const filename = `notes-export-${new Date().toISOString().slice(0, 10)}.csv`;
      downloadFile(csv, filename, 'text/csv;charset=utf-8;');
      toast.success('Export CSV téléchargé avec succès');
    } catch {
      toast.error('Erreur lors de l’export CSV');
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setImporting(true);
    try {
      const text = await file.text();
      const backup = parseBackup(text);
      const result = await importBackup(backup, modules, grades, user.id);

      await queryClient.invalidateQueries();
      toast.success(
        `Import réussi : ${result.modulesCreated} module(s) créé(s), ${result.modulesMerged} fusionné(s), ${result.gradesCreated} note(s) ajoutée(s).`
      );
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de l’import du fichier.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Paramètres</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Gérez vos données scolaires, vos exports et vos préférences de compte.
        </p>
      </div>

      {/* Section Compte */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-zinc-800 p-2 text-zinc-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Compte</h2>
            <p className="text-xs text-zinc-400">Informations sur la session active</p>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Adresse e-mail</p>
              <p className="text-sm font-medium text-zinc-200 mt-0.5">{user?.email ?? 'Non connecté'}</p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmSignOut(true)}
            >
              Se déconnecter
            </Button>
          </div>
        </div>
      </section>

      {/* Section Données et Sauvegardes */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-zinc-800 p-2 text-zinc-300">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Données & Sauvegardes</h2>
            <p className="text-xs text-zinc-400">Exportez ou restaurez vos modules et notes scolaires</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Exportation */}
          <div className="flex flex-col justify-between rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-4 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-200">Exporter les données</h3>
              <p className="text-xs text-zinc-400">
                Téléchargez l'intégralité de vos modules et évaluations en format JSON complet ou CSV tabulaire (Excel).
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportJson}
                disabled={isLoading || modules.length === 0}
                className="gap-2"
              >
                <Download className="h-3.5 w-3.5" />
                Sauvegarde JSON
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExportCsv('excel')}
                disabled={isLoading || modules.length === 0}
                className="gap-2"
              >
                <Download className="h-3.5 w-3.5" />
                Tableur CSV
              </Button>
            </div>
          </div>

          {/* Importation */}
          <div className="flex flex-col justify-between rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-4 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-200">Restaurer une sauvegarde</h3>
              <p className="text-xs text-zinc-400">
                Importez un fichier JSON préalablement exporté. Les modules existants seront fusionnés sans doublon.
              </p>
            </div>
            <div className="pt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="gap-2"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Importation en cours...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    Importer un fichier JSON
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={confirmSignOut}
        title="Déconnexion"
        message="Êtes-vous certain de vouloir vous déconnecter de votre compte ?"
        confirmLabel="Se déconnecter"
        onConfirm={() => {
          setConfirmSignOut(false);
          signOut();
        }}
        onClose={() => setConfirmSignOut(false)}
      />
    </div>
  );
}
