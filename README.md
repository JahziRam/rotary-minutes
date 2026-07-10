# Rotary Minutes

Plateforme SaaS professionnelle pour la rédaction, l'archivage et l'authentification des procès-verbaux des clubs **Rotary** et **Rotaract**.

## Fonctionnalités

- **Multi-tenant** — Chaque club possède son espace isolé
- **Bilingue** — Français et Anglais (next-intl)
- **Procès-verbaux** — Rédaction collaborative, versionnement, auto-sauvegarde
- **Réunions** — Types dynamiques, présences, assiduité automatique
- **PDF authentifié** — Logo, QR code, hash SHA-256 inviolable
- **Emails** — Templates, campagnes, contacts, planification
- **Tableau de bord** — Statistiques, mandat Rotary (1er juillet – 30 juin)
- **Mode hors ligne** — IndexedDB + synchronisation automatique
- **Stripe** — Abonnements et essai gratuit 14 jours
- **Super Admin** — Gestion globale du SaaS
- **Documents** — Bibliothèque, aperçu inline (PDF, images, Office), gestion (renommer, classer, déplacer, archiver)
- **Trésorerie** — Opérations, exports comptables, **pièces justificatives** (factures, reçus, preuves de paiement)

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

## Démarrage rapide

```bash
# 1. Variables d'environnement
cp .env.example .env

# 2. Base de données PostgreSQL
# Configurer DATABASE_URL dans .env

# 3. Migrations Prisma
npx prisma migrate dev

# 4. Lancer le serveur de développement
npm run dev
```

Ouvrir [http://localhost:3000/fr](http://localhost:3000/fr)

## Structure du projet

```
src/
├── app/[locale]/          # Pages i18n (fr, en)
│   ├── (auth)/            # Login, inscription
│   ├── (app)/             # Application authentifiée
│   └── verify/[hash]/     # Vérification PV
├── components/
│   ├── ui/                # Composants de base
│   ├── layout/            # Navigation, sidebar
│   ├── dashboard/         # Widgets tableau de bord
│   ├── meetings/          # Formulaires réunion
│   └── minutes/           # Éditeur PV
├── lib/
│   ├── auth.ts            # NextAuth
│   ├── permissions.ts     # RBAC
│   ├── hash.ts            # Authentification documents
│   ├── pdf/               # Génération PDF
│   ├── stripe.ts          # Paiements
│   └── offline.ts         # Mode hors ligne
└── actions/               # Server Actions
```

## Rôles et permissions

| Rôle | Permissions clés |
|------|-----------------|
| Président | Tout sauf super admin |
| Secrétaire | Créer/éditer/finaliser PV |
| Protocole | Créer/éditer réunions et PV |
| Trésorier | Consultation |
| Administrateur | Gestion complète du club |
| Lecteur | Consultation seule |

## Nom de l'application

Le nom **Rotary Minutes** est provisoire et modifiable dans les paramètres et via `NEXT_PUBLIC_APP_NAME`.