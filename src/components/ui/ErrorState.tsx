import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { getErrorMessage } from '../../lib/utils';

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
        <AlertCircle className="h-5 w-5 text-red-400" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-zinc-200">Impossible de charger les données</h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">{getErrorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" />
          Réessayer
        </Button>
      )}
    </div>
  );
}
