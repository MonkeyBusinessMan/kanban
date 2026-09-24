# Le Studio — Kanban

Outil de gestion des demandes design pour une équipe de 6 designers : Kanban, vue Sprints (charge par designer, réunions), calendrier de livraison (liste, mini-calendrier, Gantt), suivi par projet. Chaque tâche peut avoir plusieurs types, plusieurs designers assignés, une difficulté (XS à XXXL) et une liste de sous-tâches. Les données sont partagées en temps réel entre tous les membres de l'équipe via Supabase (Postgres + Realtime + Auth).

## Mise en place

### 1. Créer le projet Supabase

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, exécute le contenu de [`supabase/schema.sql`](supabase/schema.sql). Cela crée les tables (`designers`, `projects`, `tasks`, `task_designers`, `subtasks`, `meetings`, `conges`), active la Row Level Security (accès réservé aux utilisateurs authentifiés), active le Realtime, et insère les designers/projets de départ.
   - **Projet Supabase déjà existant** (créé avant l'ajout des réunions/sous-tâches/difficulté/multi-sélection) : exécute plutôt [`supabase/migrations/002_meetings_subtasks_multiselect.sql`](supabase/migrations/002_meetings_subtasks_multiselect.sql), qui met à jour le schéma sans perdre les données déjà saisies.
   - **Projet Supabase déjà existant, créé avant le formulaire public** : exécute aussi [`supabase/migrations/003_public_backlog_form.sql`](supabase/migrations/003_public_backlog_form.sql).
   - **Projet Supabase déjà existant, créé avant les congés** : exécute aussi [`supabase/migrations/004_conges.sql`](supabase/migrations/004_conges.sql).
   - **Projet Supabase déjà existant, créé avant la restriction des e-mails** : exécute aussi [`supabase/migrations/013_restrict_email_domain.sql`](supabase/migrations/013_restrict_email_domain.sql) pour limiter la création de compte aux adresses `@cgi.com`.
3. Dans **Authentication → Providers**, laisse **Email** activé. L'app utilise un code à 6 chiffres envoyé par e-mail plutôt qu'un lien cliquable (plus fiable derrière les passerelles de sécurité d'entreprise qui pré-visitent les liens). Pense à inclure `{{ .Token }}` dans les templates **Confirm signup**, **Magic Link** et **Reset Password** (**Authentication → Email Templates**) pour que le code apparaisse dans le mail — la toute première connexion d'une adresse déclenche **Confirm signup**, les suivantes **Magic Link**.
4. Récupère l'URL du projet et la clé `anon public` dans **Project Settings → API**.
5. Pour un usage en équipe, configure un fournisseur SMTP externe (**Authentication → Emails → SMTP Settings**) — le SMTP de test intégré à Supabase est limité en nombre d'envois par heure.
   - **Sans domaine vérifié** (cas par défaut de ce projet) : un fournisseur comme Resend refuse d'envoyer à qui que ce soit d'autre que l'adresse du compte tant qu'aucun domaine n'est vérifié (`550 "You can only send testing emails to your own email address"`). Solution sans domaine ni coût : utiliser un compte **Gmail** comme SMTP — Host `smtp.gmail.com`, port `587`, Username = ton adresse Gmail, Password = un [mot de passe d'application](https://myaccount.google.com/apppasswords) Google (nécessite la validation en 2 étapes activée sur le compte). Limite : ~500 e-mails/jour, largement suffisant pour une équipe.
   - **Avec un domaine** : Resend (ou équivalent) avec un domaine vérifié (SPF/DKIM) reste la solution la plus propre pour une adresse d'expéditeur professionnelle.

### 2. Configurer l'app

```bash
cp .env.example .env
# renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

### 3. Déployer

Déploie ce dossier sur Vercel, Netlify ou équivalent (build command `npm run build`, output `dist`), en définissant les mêmes variables d'environnement `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sur la plateforme d'hébergement.

## Fonctionnement

- **Authentification** : chaque membre de l'équipe se connecte avec son e-mail (lien magique envoyé par Supabase). Pas d'espace personnel : tout utilisateur authentifié voit et modifie le même espace de travail partagé.
- **Synchronisation en temps réel** : toute création, modification ou suppression (tâche, designer, projet) est répercutée instantanément chez tous les utilisateurs connectés via Supabase Realtime — plus besoin de rafraîchir la page.
- **Stockage** : les données vivent dans la base Postgres du projet Supabase, pas dans le navigateur.
- **Charge multi-designer** : quand une tâche est assignée à plusieurs designers, sa charge (en jours) est répartie à parts égales entre eux dans les calculs de capacité (vues Sprints et Équipe).
- **Réunions et congés** : chaque designer peut se voir affecter un nombre de jours de réunion et de congés par sprint (vue Sprints, l'un à côté de l'autre) ; ce temps réduit sa capacité disponible de référence (5j/semaine) plutôt que de s'ajouter à sa charge de tâches.
- **Sous-tâches** : une tâche peut avoir une liste de sous-tâches cochables ; la progression s'affiche sous forme de barre sur la carte Kanban et dans la fiche de la tâche.

## Formulaire public de demande

[`demande-form/`](demande-form) est une application **séparée** (autre déploiement, autre URL) : un formulaire sans connexion à partager aux chefs de projet, qui crée directement une tâche dans la colonne Backlog. Voir [`demande-form/README.md`](demande-form/README.md) pour la mise en place et le déploiement. L'accès anonyme est strictement limité par des règles Supabase dédiées (lecture des projets, création de tâches en Backlog uniquement — rien d'autre).

## Stack

React + TypeScript + Vite, Supabase (Postgres, Auth, Realtime), Recharts pour le graphique de charge, lucide-react pour les icônes.
