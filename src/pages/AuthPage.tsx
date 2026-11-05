import { useState, type FormEvent } from 'react';
import { ArrowLeft, Eye, EyeOff, KeyRound, Mail, MailCheck, Wand2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Logo } from '../components/ui/Logo';
import { supabase } from '../lib/supabase';
import { cn, getAuthErrorMessage } from '../lib/utils';

type Tab = 'signin' | 'signup';
type Method = 'password' | 'magic';
type Errors = Partial<Record<'email' | 'password' | 'confirm' | 'form', string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function AuthPage() {
  const [tab, setTab] = useState<Tab>('signin');
  const [method, setMethod] = useState<Method>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<{ email: string; kind: 'magic' | 'confirm' } | null>(null);

  const switchTab = (next: Tab) => {
    setTab(next);
    setErrors({});
    setConfirm('');
  };

  const validate = (): boolean => {
    const next: Errors = {};
    if (!email.trim()) next.email = 'L’adresse email est requise.';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Adresse email invalide.';
    if (method === 'password') {
      if (!password) next.password = 'Le mot de passe est requis.';
      else if (tab === 'signup' && password.length < 8) next.password = '8 caractères minimum.';
      if (tab === 'signup' && confirm !== password) next.confirm = 'Les mots de passe ne correspondent pas.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const redirectTo = window.location.origin;

    try {
      if (method === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: { emailRedirectTo: redirectTo, shouldCreateUser: tab === 'signup' },
        });
        if (error) throw error;
        setSentTo({ email: cleanEmail, kind: 'magic' });
      } else if (tab === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
        // La redirection est gérée par onAuthStateChange
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;
        // Supabase renvoie un utilisateur sans identité si l'email existe déjà
        if (data.user && data.user.identities?.length === 0) {
          throw new Error('User already registered');
        }
        if (!data.session) setSentTo({ email: cleanEmail, kind: 'confirm' });
      }
    } catch (err) {
      setErrors({ form: getAuthErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-4 py-10">
      {/* Halo décoratif */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="h-10 w-10 rounded-xl" />
          <h1 className="mt-5 text-xl font-semibold tracking-tight">
            {tab === 'signin' ? 'Bon retour parmi nous' : 'Créer un compte'}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">Suivez vos notes et modules de formation.</p>
        </div>

        <div className="card bg-zinc-950/80 p-5 shadow-2xl shadow-black/40 backdrop-blur sm:p-6">
          {sentTo ? (
            <div className="flex flex-col items-center py-2 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10">
                <MailCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <h2 className="mt-4 text-sm font-semibold">Vérifiez votre boîte mail</h2>
              <p className="mt-1.5 text-sm text-zinc-500">
                {sentTo.kind === 'magic'
                  ? 'Un lien de connexion a été envoyé à'
                  : 'Un lien de confirmation a été envoyé à'}{' '}
                <span className="text-zinc-300">{sentTo.email}</span>.
              </p>
              <Button variant="ghost" size="sm" className="mt-5" onClick={() => setSentTo(null)}>
                <ArrowLeft className="h-3.5 w-3.5" />
                Retour
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-5 grid grid-cols-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
                {(['signin', 'signup'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => switchTab(t)}
                    className={cn(
                      'h-8 rounded-md text-sm font-medium transition',
                      tab === t ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300',
                    )}
                  >
                    {t === 'signin' ? 'Connexion' : 'Inscription'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <Field label="Email" htmlFor="auth-email" error={errors.email}>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                    <input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="prenom.nom@exemple.ch"
                      className={cn('input pl-9', errors.email && 'input-error')}
                    />
                  </div>
                </Field>

                {method === 'password' && (
                  <>
                    <Field
                      label="Mot de passe"
                      htmlFor="auth-password"
                      error={errors.password}
                      hint={tab === 'signup' ? '8 caractères minimum.' : undefined}
                    >
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                        <input
                          id="auth-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className={cn('input px-9', errors.password && 'input-error')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 hover:text-zinc-300"
                          aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>

                    {tab === 'signup' && (
                      <Field label="Confirmer le mot de passe" htmlFor="auth-confirm" error={errors.confirm}>
                        <input
                          id="auth-confirm"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
                          placeholder="••••••••"
                          className={cn('input', errors.confirm && 'input-error')}
                        />
                      </Field>
                    )}
                  </>
                )}

                {errors.form && (
                  <div
                    className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-300"
                    role="alert"
                  >
                    {errors.form}
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" loading={loading}>
                  {method === 'magic'
                    ? 'Recevoir un lien magique'
                    : tab === 'signin'
                      ? 'Se connecter'
                      : 'Créer mon compte'}
                </Button>
              </form>

              <div className="my-5 flex items-center gap-3 text-xs text-zinc-600">
                <div className="h-px flex-1 bg-zinc-800" />
                ou
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setMethod((m) => (m === 'password' ? 'magic' : 'password'));
                  setErrors({});
                }}
              >
                {method === 'password' ? (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Continuer avec un lien magique
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    Utiliser un mot de passe
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Vos données sont privées et isolées par compte.
        </p>
      </div>
    </div>
  );
}
