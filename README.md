# Rotary Minutes

Plateforme SaaS professionnelle pour la rédaction, l'archivage et l'authentification des procès-verbaux des clubs **Rotary** et **Rotaract**.

Production : [https://clubminutes.api.mg](https://clubminutes.api.mg)

## Fonctionnalités

- **Multi-tenant** — Chaque club possède son espace isolé
- **Multilingue** — Français, anglais et espagnol (next-intl)
- **Procès-verbaux** — Rédaction collaborative, versionnement, auto-sauvegarde
- **Assistant IA** — Reformulation des notes de PV (SpaceXAI / xAI, Qwen, OpenAI compatible dont Bazaarlink)
- **Réunions** — Types dynamiques, présences, assiduité automatique
- **PDF authentifié** — Logo, QR code, hash SHA-256 inviolable
- **Emails** — Templates, campagnes, contacts, planification
- **Projets** — Gestion de projets club, tâches associées et **budget** (prévu / réalisé, devis & proformas) via `/projects`
- **Tâches** — Suivi des actions (dont issues de PV) via `/actions`
- **Assignation** — Tâches et projets assignables à **plusieurs membres** et/ou une **commission** (modifiable après création, avec notifications)
- **Commissions** — Multi-appartenance, rôles Président/Membre (`/members/commissions`)
- **Mon travail** — Vue personnelle des projets et tâches assignés (`/my-work`)
- **Plan budgétaire du mandat** — Consolidation sous-comptes + projets + événements (`/treasury/mandate-plan`)
- **Tableau de bord** — Statistiques, mandat Rotary (1er juillet – 30 juin)
- **Mode hors ligne** — IndexedDB + synchronisation automatique
- **Stripe** — Abonnements et essai gratuit 14 jours
- **Super Admin** — Gestion globale du SaaS, feature flags par club
- **Documents** — Bibliothèque, aperçu inline (PDF, images, Office), gestion (renommer, classer, déplacer, archiver)
- **Trésorerie** — Opérations, exports comptables, pièces justificatives (factures, reçus, preuves de paiement)
- **Cotisations** — Facturation, reçus, paiements (dont en ligne club)

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Next.js API Routes, Server Actions |
| Base de données | PostgreSQL + Prisma 7 |
| Auth | NextAuth.js v5 |
| i18n | next-intl |
| PDF | @react-pdf/renderer + QRCode |
| Email | Resend |
| Paiement | Stripe |
| Déploiement | Render (web) ; option Cloudflare Workers (OpenNext) |

## Démarrage rapide

```bash
# 1. Variables d'environnement
cp .env.example .env

# 2. Base de données PostgreSQL locale (Windows / PostgreSQL 17)
#    Voir scripts/setup-local-postgres.ps1 ou :
#    $env:POSTGRES_PASSWORD = "mot_de_passe_postgres"
#    npm run db:setup-local
#
#    DATABASE_URL attendu :
#    postgresql://rotary:rotary@localhost:5432/rotary_minutes?schema=public

# 3. Schéma + seed (si pas déjà fait par db:setup-local)
npx prisma db push
npm run db:seed

# 4. Lancer le serveur de développement
npm run dev
```

Ouvrir [http://localhost:3000/fr](http://localhost:3000/fr)

Compte super admin (seed) :

| Champ | Valeur |
|-------|--------|
| Email | `superadmin@rotaryminutes.app` |
| Mot de passe | `RotaryAdmin2026!` |

### Variables utiles (local / production)

| Variable | Rôle |
|----------|------|
| `DATABASE_URL` / `DIRECT_URL` | PostgreSQL (app + CLI Prisma) |
| `AUTH_SECRET` | Secret NextAuth |
| `XAI_API_KEY` | Assistant IA SpaceXAI (xAI) |
| `DASHSCOPE_API_KEY` / `QWEN_API_KEY` | Assistant IA Qwen |
| `OPENAI_API_KEY` | Assistant IA OpenAI / compatible |
| `OPENAI_API_BASE_URL` | Endpoint custom (ex. `https://bazaarlink.ai/api/v1`) — aussi configurable en Admin |

Voir `.env.example` pour la liste complète.

### Hyperdrive (dev Cloudflare / OpenNext)

En `next dev`, le binding Hyperdrive nécessite une URL locale. Le script `npm run db:setup-local` génère `.dev.vars` ; `wrangler.jsonc` définit aussi `localConnectionString` pour Postgres local.

## Structure du projet

```
src/
├── app/[locale]/          # Pages i18n (fr, en, es)
│   ├── (auth)/            # Login, inscription
│   ├── (app)/             # Application authentifiée
│   │   ├── projects/      # Module projets (+ budget)
│   │   ├── actions/       # Gestion des tâches
│   │   ├── members/       # Annuaire, cotisations, commissions
│   │   └── ...
│   └── verify/[hash]/     # Vérification PV
├── components/
│   ├── ui/                # Composants de base (ex. AssigneePicker)
│   ├── layout/            # Navigation, sidebar
│   ├── projects/          # Projets, tâches projet, budget
│   ├── members/           # Annuaire, commissions
│   ├── minutes/           # Éditeur PV + assistant IA
│   └── ...
├── lib/
│   ├── auth.ts            # NextAuth
│   ├── permissions.ts     # RBAC
│   ├── currency.ts        # Devises ISO (évite crash Intl)
│   ├── minute-ai*.ts      # Fournisseurs IA PV
│   └── ...
├── actions/               # Server Actions
prisma/                    # Schéma + migrations
scripts/                   # Setup local, Render, utilitaires
messages/                  # Traductions fr / en / es
```

## Modules club (feature flags)

Les modules se basculent par club (super admin → Clubs → fonctionnalités) ou via les presets d’offre :

| Module | Routes | Flags / notes |
|--------|--------|----------------|
| Projets | `/projects`, `/projects/[id]` | `projectsEnabled` — budget, multi-assignees, commission |
| Tâches | `/actions` | `actionsEnabled` — multi-assignees, commission |
| Commissions | `/members/commissions` | Gestion des membres par commission |
| Trésorerie | `/treasury` | `treasuryEnabled` — budget mandat (sous-comptes) |
| Cotisations | `/members/dues` | `duesEnabled` |
| Assistant IA PV | éditeur de PV | `minuteAiAssistEnabled` (+ clé API plateforme) |

Permissions projets : `projects.view`, `projects.manage`.  
Permissions tâches : `actions.view`, `actions.manage`.  
Gestion commissions : `members.manage`.

### Budgétisation (rappel)

| Niveau | Où |
|--------|-----|
| Mandat club | Trésorerie → tableau budgétaire (sous-comptes `budgetPlanned`) |
| Projet | Fiche projet → budget prévu / réalisé + pièces (devis, proforma…) |
| Documents budgétaires | API `/api/budget/documents` |

## Rôles et permissions

| Rôle | Permissions clés |
|------|-----------------|
| Président | Tout sauf super admin |
| Secrétaire | Créer/éditer/finaliser PV |
| Protocole | Créer/éditer réunions et PV |
| Trésorier | Consultation / trésorerie selon droits |
| Administrateur | Gestion complète du club |
| Lecteur | Consultation seule |

## Scripts npm utiles

| Script | Description |
|--------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build production |
| `npm run db:push` | Synchroniser le schéma Prisma |
| `npm run db:seed` | Données de démo + super admin |
| `npm run db:setup-local` | Créer user/base locale + push + seed |
| `npm test` | Tests unitaires (Vitest) |

## Documentation

- Historique des versions : [CHANGELOG.md](./CHANGELOG.md)
- Checklist Render : `scripts/render-web-service-checklist.md`

## Nom de l'application

Le nom **Rotary Minutes** est modifiable dans les paramètres SaaS et via `NEXT_PUBLIC_APP_NAME`.
