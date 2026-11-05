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
