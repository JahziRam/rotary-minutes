# Rotary Minutes

Plateforme SaaS professionnelle pour la rédaction, l'archivage et l'authentification des procès-verbaux des clubs **Rotary** et **Rotaract**.

Production : [https://clubminutes.api.mg](https://clubminutes.api.mg)

## Version

**0.6.11** — voir [CHANGELOG.md](./CHANGELOG.md)

## Fonctionnalités

- **Multi-tenant** — Chaque club possède son espace isolé
- **Multilingue** — Français, anglais et espagnol (next-intl)
- **Procès-verbaux** — Rédaction collaborative, versionnement, auto-sauvegarde ; édition exceptionnelle président/admin sur PV verrouillés
- **PDF authentifié** — Logo club, mise en page modernisée, QR de vérification (hash en base, non affiché en pied)
- **Annexe de présence** — Multi-colonnes, option photos de profil (miniatures via `/api/media`, anti-OOM)
- **Assistant IA** — Reformulation des notes de PV (SpaceXAI / xAI, Qwen, OpenAI compatible dont Bazaarlink)
- **Réunions** — Types dynamiques, présences, assiduité (hors membres d’honneur), édition présidence/secrétaire
- **Membres** — Annuaire, cotisations, **conjoint/lady** (nom + anniversaire au calendrier)
- **Emails** — Templates, contacts, groupes personnalisés **et commissions** comme destinataires
- **Projets** — Gestion de projets club, tâches associées et **budget** (prévu / réalisé, devis & proformas) via `/projects`
- **Tâches** — Suivi des actions (dont issues de PV) via `/actions`
- **Assignation** — Tâches et projets assignables à **plusieurs membres** et/ou une **commission**
- **Commissions** — Multi-appartenance, rôles Président/Membre (`/members/commissions`)
- **Mon travail** — Vue personnelle des projets et tâches assignés (`/my-work`)
- **Plan budgétaire du mandat** — Consolidation sous-comptes + projets + événements (`/treasury/mandate-plan`)
- **Tableau de bord** — Statistiques, mandat Rotary (1er juillet – 30 juin)
- **Calendrier** — Réunions, événements, anniversaires membres **et conjoints**
- **Mode hors ligne** — IndexedDB + synchronisation automatique
- **Stripe** — Abonnements et essai gratuit 14 jours
- **Super Admin** — Gestion globale du SaaS, feature flags, annonces (in-app + email Resend)
- **Documents** — Bibliothèque (PDF / Office / TXT, max 5 × 5 Mo), aperçu, partage
- **Trésorerie** — Opérations, exports comptables, pièces justificatives
- **Cotisations** — Facturation, reçus, paiements (dont en ligne club)

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Next.js API Routes, Server Actions |
| Base de données | **Neon** PostgreSQL + Prisma 7 |
| Auth | NextAuth.js v5 |
| i18n | next-intl |
| PDF | @react-pdf/renderer + QRCode |
| Email | Resend |
| Médias (prod) | Vercel Blob (optionnel) ou data URL compressés |
| Paiement | Stripe |
| Déploiement | **Vercel** (Hobby/Pro) ; migration documentée depuis Render |

## Performance & mémoire (0.6.x)

Mesures principales pour rester sous les plafonds serverless (Vercel) :

| Mesure | Détail |
|--------|--------|
| Uploads photos | Resize sharp (~400 px, ≤ ~120 Ko) ; listes sans blobs |
| Uploads documents | Max 5 fichiers × 5 Mo ; PDF/Office/TXT uniquement |
| Object storage | `BLOB_READ_WRITE_TOKEN` → Vercel Blob pour les nouveaux fichiers |
| Prisma | Selects maigres ; pas de `fileUrl`/`logoUrl` data URL en listes/crons |
| Next.js | `bodySizeLimit` 8 Mo ; `sharp` externalisé ; dynamic import pages lourdes |
| Contexte club | Logos data URL remplacés par `/api/media/club/...` |

Voir aussi `scripts/deploy-vercel-neon.md` pour la migration Render → Vercel + Neon.

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
| `DATABASE_URL` / `DIRECT_URL` | PostgreSQL pooled / direct (Neon) |
| `AUTH_SECRET` | Secret NextAuth |
| `RESEND_API_KEY` / `EMAIL_FROM` | Emails transactionnels |
| `BLOB_READ_WRITE_TOKEN` | Stockage objet Vercel Blob (recommandé en prod) |
| `IMAGE_UPLOADS_ENABLED` | `false` pour suspendre photos/logos |
| `UPLOADS_ENABLED` / `DOCUMENT_UPLOADS_ENABLED` | `false` pour suspendre documents |
| `XAI_API_KEY` | Assistant IA SpaceXAI (xAI) |
| `CRON_SECRET` | Auth des routes cron Vercel |

Voir `.env.example` pour la liste complète.

### Déploiement production (Vercel)

```bash
npx vercel login
npx vercel link
# Définir DATABASE_URL (pooler), DIRECT_URL, secrets (voir .env.example)
npx vercel --prod --yes --archive=tgz
```

### Hyperdrive (dev Cloudflare / OpenNext)

En `next dev`, le binding Hyperdrive nécessite une URL locale. Le script `npm run db:setup-local` génère `.dev.vars` ; `wrangler.jsonc` définit aussi `localConnectionString` pour Postgres local.

## Structure du projet

```
src/
  app/           # App Router (pages, API, crons)
  actions/       # Server Actions
  components/    # UI
  lib/           # Domaine, Prisma helpers, email, PDF, storage
prisma/          # Schéma + migrations
scripts/         # Neon bootstrap, dump/restore, Android, branding
messages/        # i18n fr / en / es
```

## Licence

Propriétaire — Club Minutes / Rotary Minutes.
