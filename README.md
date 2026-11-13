# Notes ETML — Suivi des modules et des notes

Application web moderne pour la gestion et le suivi des notes scolaires et des modules de formation (adaptée au système de notation suisse 1.0 – 6.0).

---

## Fonctionnalités

- **Authentification sécurisée** : Inscription et connexion par email/mot de passe ou Magic Link via Supabase Auth.
- **Gestion des modules** :
  - Modules numériques (avec calcul de moyenne pondérée selon les coefficients).
  - Modules avec statut de validation (*Acquis*, *Non acquis*, *En cours*).
- **Gestion des notes et évaluations** :
  - Pondération personnalisée par évaluation.
  - Date et remarques optionnelles.
  - Prise en charge des demi-points et dixièmes.
- **Simulateur de notes** : Calculez facilement la note nécessaire pour atteindre la moyenne souhaitée (ex. 4.0).
- **Statistiques en direct** : Visualisation globale et par module avec indicateurs visuels de réussite.
- **Import / Export** :
  - Sauvegarde et restauration complète en **JSON**.
  - Export tabulaire au format **CSV** (compatible Excel avec encodage UTF-8 BOM).
- **Raccourcis clavier** :
  - `n` : Ajouter rapidement une nouvelle note.
  - `/` : Focus direct sur la barre de recherche des modules.

---

## Installation et configuration

### 1. Installation des dépendances

```bash
npm install
```

### 2. Configuration Supabase

1. Créez un projet sur [Supabase](https://supabase.com).
2. Dans le **SQL Editor** de votre projet Supabase, exécutez l'intégralité du script contenu dans :
   [`supabase/schema.sql`](./supabase/schema.sql)
3. Créez un fichier `.env.local` à la racine du projet :
   ```env
   VITE_SUPABASE_URL=https://votre-projet.supabase.co
   VITE_SUPABASE_ANON_KEY=votre-cle-anon-publique
   ```

### 3. Démarrage en local

```bash
npm run dev
```

### 4. Build de production

```bash
npm run build
```

---

## Mise en ligne (déploiement)

Le site est une application statique (Vite). Le dossier à publier est `dist/`.

### Option A — Vercel (recommandé)

1. Allez sur [vercel.com](https://vercel.com) > **Add New > Project** et importez le dépôt GitHub `notes_etml_site`.
2. Framework : **Vite** (détecté automatiquement). Build : `npm run build`, sortie : `dist`.
3. Dans **Settings > Environment Variables**, ajoutez :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (ou `VITE_SUPABASE_PUBLISHABLE_KEY`)
4. Cliquez sur **Deploy**. Chaque `git push` redéploie automatiquement.

### Option B — Netlify

Même principe : **Add new site > Import from Git**, les réglages sont lus dans `netlify.toml`.
Ajoutez les mêmes variables dans **Site settings > Environment variables**.

### Configuration Supabase obligatoire après la mise en ligne

Dans Supabase > **Authentication > URL Configuration** :
- **Site URL** : l'adresse de votre site (ex. `https://notes-etml.vercel.app`)
- **Redirect URLs** : ajoutez la même adresse (et `http://localhost:5173` pour le développement)

Sans cela, les liens de confirmation / Magic Link ne fonctionneront pas en production.

### Migration de la base existante

Si votre base a été créée avant l'ajout des périodes, exécutez `supabase/schema.sql` à nouveau
(le script est idempotent) ou uniquement :

```sql
alter table public.modules add column if not exists periods integer default 40 check (periods is null or periods > 0);
```
