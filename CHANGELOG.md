# Changelog

Toutes les modifications notables de **Rotary Minutes** (Club Minutes) sont documentées dans ce fichier.

Le format s’inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et le versionnement suit [Semantic Versioning](https://semver.org/lang/fr/).

## [Unreleased]

### À venir
- Améliorations continues produit et stabilité

---

## [0.3.0] — 2026-07-10

### Added
- **Documents — gestion complète**
  - Renommer, reclassifier, déplacer (dossier), archiver via dialogue de gestion
  - Upload multipart (`/api/documents/upload`) pour fichiers volumineux
  - Aperçu inline : PDF, images, Word (mammoth), Excel, texte
- **Trésorerie — pièces comptables (`TreasuryVoucher`)**
  - Pièces jointes sur opérations (recettes / dépenses), paiements de cotisations, inscriptions événements
  - Types : facture, reçu, preuve de paiement, relevé bancaire, contrat
  - API `/api/treasury/vouchers` (upload + consultation)
- **Admin** — Page finances plateforme (`/admin/billing`)
- **CI** — Workflow GitHub Actions (lint, tests, build)

### Fixed
- **Build Render** — `serverActions.bodySizeLimit` déplacé sous `experimental.serverActions` (Next.js 16)
- **Build** — champ `mimeType` manquant dans la requête documents du portail membre
- **Build** — réponses binaires API documents / pièces comptables (`Uint8Array` pour `NextResponse`)
- **Build** — typage strict du panneau pièces comptables trésorerie

---

## [0.2.0] — 2026-07-10

Release regroupant les évolutions majeures de la gestion des réunions, des PV, de l’UI listes et de la messagerie.

### Added
- **Réunions — modes Maintenant / À programmer**
  - Création immédiate → ouverture de la réunion en direct (si feature live active)
  - Programmation → bandeau d’envoi de **convocation** (sans ouvrir les présences)
  - Ordre du jour éditable à la création (modèle selon type de réunion)
- **Réunions — cycle de vie live**
  - Bouton **Démarrer la réunion** (depuis une réunion programmée)
  - Bouton **Fin de la réunion** (page live + liste)
  - Actions carte : Présences / En direct / PV
- **PV — diffusion post-réunion**
  - **Envoyer pour validation** (président : notification + email)
  - **Finaliser et envoyer aux membres** (PDF authentifié)
  - Renvoi aux membres si déjà finalisé
- **Emails**
  - Historique des envois système : PV, convocations, validation, rapport d’assiduité
  - Enregistrement via `EmailCampaign` / `EmailLog` (visible dans Emails → Historique)
- **UI listes**
  - Barre de recherche et/ou pagination / onglets sur :
    - Historique emails
    - Procès-verbaux
    - Réunions
    - Membres (Tous / Actifs / Inactifs)
    - Documents
    - Notifications et annonces
    - Trésorerie
    - Tâches
    - Événements
- **Présences**
  - **Retour de voyage** compté comme présent
  - Bouton **Commencer le PV** après enregistrement des présences
- **Emails module**
  - Onglet **Campagnes** masqué de l’interface (compose / modèles / contacts / historique conservés)

### Fixed
- Build Render / Turbopack : Prisma / `pg` ne doivent plus entrer dans les bundles client (branding partagé)
- Build : `parseLocalDate` non exporté depuis un module `"use server"`
- Dates de réunion parsées en fuseau local (évite le décalage UTC)
- Erreurs visibles à la création de réunion (auth / permission)

### Changed
- Fallback mode « Maintenant » si réunions live désactivées → page Présences + CTA PV
- Sauvegarde PV : passage automatique `DRAFT` → `IN_PROGRESS`

---

## [0.1.0] — 2026-07

Version initiale du produit SaaS multi-tenant pour clubs Rotary / Rotaract.

### Added
- **Cœur produit**
  - Multi-tenant, auth NextAuth, i18n FR / EN (puis ES)
  - Réunions, présences, procès-verbaux (workflow, PDF, QR, hash)
  - Membres, cotisations, trésorerie
  - Emails club (SMTP / Resend), modèles, contacts
  - Modules : actions, calendrier, portail membre, événements, documents, gouvernance, notifications, intégrations, PWA
- **Admin plateforme**
  - Super-admin, feature flags, clubs, abonnements, analytics GA4
  - Formulaire contact landing (anti-spam, destinataire / BCC)
- **Infra**
  - Déploiement Render (Postgres, build script, health)
  - Keep-alive free tier, scripts d’alignement DB / DNS
  - Pitch deck interactif, landing marketing, démo enrichie
- **Légal & marque**
  - Mentions Visa Guard USA, LLC, conditions, disclaimers

### Fixed
- Nombreux correctifs admin, Render Postgres (région, SSL, URL interne/externe)
- Stabilité pages super-admin et analytics
- Emails (logo inline Resend, signatures club)

---

## Liens

- Dépôt : https://github.com/JahziRam/rotary-minutes
- Application : configurée via `NEXT_PUBLIC_APP_URL` / domaine club (ex. clubminutes)

[Unreleased]: https://github.com/JahziRam/rotary-minutes/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/JahziRam/rotary-minutes/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/JahziRam/rotary-minutes/releases/tag/v0.1.0
