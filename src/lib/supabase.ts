import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const anonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  ''
).trim();

export const isSupabaseConfigured =
  url.startsWith('http') && anonKey.length > 20 && !url.includes('votre-projet');

// Des valeurs factices évitent un crash au chargement lorsque l'application
// n'est pas encore configurée : un écran d'aide est alors affiché.
export const supabase = createClient(
  isSupabaseConfigured ? url : 'http://localhost:54321',
  isSupabaseConfigured ? anonKey : 'public-anon-key-placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
