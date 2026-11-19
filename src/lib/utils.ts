export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** Accepte "4.5", "4,5", " 5 " ; renvoie null si invalide. */
export function parseDecimal(input: string): number | null {
  const s = input.trim().replace(',', '.');
  if (s === '' || !/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Date du jour au format YYYY-MM-DD (fuseau local). */
export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const dateFormatter = new Intl.DateTimeFormat('fr-CH', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return dateFormatter.format(new Date(y, m - 1, d));
}

/** Identifiant temporaire pour les mises à jour optimistes (fonctionne aussi hors HTTPS). */
export function tempId(): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `temp-${rand}`;
}

export function isTempId(id: string): boolean {
  return id.startsWith('temp-');
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count > 1 ? plural : singular}`;
}

export function capitalizeFirst(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

interface ErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

/** Traduit les erreurs Supabase / réseau en messages lisibles. */
export function getErrorMessage(err: unknown): string {
  if (!err) return 'Une erreur inconnue est survenue.';
  const e = err as ErrorLike;
  switch (e.code) {
    case '23505':
      return 'Un module avec ce code existe déjà.';
    case '23514':
      return 'Valeur refusée par la base de données (contrainte non respectée).';
    case '23503':
      return "L'élément référencé n'existe plus.";
    case '42501':
      return 'Accès refusé : vous ne pouvez modifier que vos propres données.';
    case '42P01':
    case 'PGRST205':
      return 'Tables introuvables : exécutez le script supabase/schema.sql dans Supabase.';
    case 'PGRST301':
      return 'Session expirée, veuillez vous reconnecter.';
  }
  const message = e.message ?? String(err);
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'Connexion au serveur impossible. Vérifiez votre connexion internet.';
  }
  if (/jwt expired/i.test(message)) return 'Session expirée, veuillez vous reconnecter.';
  return message;
}

export function getAuthErrorMessage(err: unknown): string {
  const message = (err as ErrorLike)?.message ?? '';
  if (/invalid login credentials/i.test(message)) return 'Email ou mot de passe incorrect.';
  if (/email not confirmed/i.test(message))
    return 'Adresse email non confirmée. Vérifiez votre boîte de réception.';
  if (/user already registered|already been registered/i.test(message))
    return 'Un compte existe déjà avec cette adresse email.';
  if (/signups not allowed|user not found/i.test(message))
    return 'Aucun compte trouvé avec cette adresse. Créez un compte d’abord.';
  if (/password should be at least/i.test(message))
    return 'Le mot de passe est trop court (8 caractères minimum).';
  if (/rate limit|too many requests|security purposes/i.test(message))
    return 'Trop de tentatives. Patientez quelques instants avant de réessayer.';
  if (/invalid email|unable to validate email/i.test(message)) return 'Adresse email invalide.';
  return getErrorMessage(err);
}
