# Changelog

Toutes les modifications notables de **Rotary Minutes** (Club Minutes) sont documentées dans ce fichier.

Le format s’inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et le versionnement suit [Semantic Versioning](https://semver.org/lang/fr/).

## [Unreleased]

### Added
- **Annonces club — email + in-app**
  - Envoi parallèle `sendClubEmail` pour tous les ciblages (notamment `NO_APP_ACCOUNT`)
  - Résolution destinataires via `resolveClubAnnouncementDelivery` (userIds + emails)
  - Historique email (`EmailCampaign`) et audit `CLUB_ANNOUNCEMENT_SENT`
- **Président de commission — périmètre commission**
  - Filtrage réunions et PV par `member.commissionId` (`commission-scope.ts`)
  - Création réunion commission forcée pour `COMMISSION_CHAIR`
  - Contrôles create/edit/archive PV et actions réunion
- **Auth — sécurité complémentaire**
  - Rate limiting login / reset MDP / captcha (`auth-rate-limit.ts`)
  - Captcha sur mot de passe oublié
  - Audit `LOGIN_FAILED`, `PASSWORD_RESET`, `AUTH_CAPTCHA_FAILED`
- **i18n**
  - Paramètres utilisateurs, demande d'adhésion, annonces, réunions commission
  - Libellés permissions ES (`getPermissionLabel`)
- **Rôles — sync auto**
  - `ensureRoleConfigs` déclenché si rôles manquants ou `labelEs` absent
  - Migration `labelEs` sur `RoleConfig`
- **Membres — anti-doublons**
  - Import CSV : création des nouveaux uniquement ; doublons ignorés (email, n° d'inscription, nom sans email)
  - Inscriptions en ligne : blocage si le membre existe déjà dans le club (actif, inactif ou en attente)
  - Ajout manuel : refus avec message d'erreur si doublon détecté
  - Module partagé `member-dedup.ts` et tests unitaires
- **PV — assistant IA (MVP)**
  - Reformulation des notes brutes en phrases de PV via xAI (clé API admin ou `XAI_API_KEY`, modèle par défaut `grok-3-mini`)
  - Clé API xAI configurable dans **Admin → Paramètres** (repli sur variable d'environnement)
  - Bouton « Reformuler avec l'IA » par point d'ODJ dans l'éditeur de PV (description, décisions, actions, responsable, échéance)
  - Module complémentaire `MINUTE_AI` (12 €/mois) activable dans **Paramètres → Abonnement → Modules complémentaires**
  - Toggle super admin par club (**Admin → Clubs → Fonctionnalités** → « Assistant IA rédaction PV »)
  - Panneau plateforme **Admin → Paramètres** : activation globale, quota mensuel par club (défaut 50), choix du modèle
  - Contrôle d'accès : clé API + activation plateforme + fonctionnalité club + quota mensuel (illimité pour super admin)
  - Audit `MINUTE_AI_POLISH` ; tests unitaires `minute-ai.test.ts`
- **PV — pièces jointes**
  - Ajout de fichiers annexes (ordre du jour, présentations, rapports…) depuis l'éditeur et l'aperçu du PV
  - Upload multiple (max 10 × 5 Mo) ; consultation via `minutes.view` sans module Documents
  - Pièces jointes incluses automatiquement dans les emails de diffusion du PV
  - API `POST /api/minutes/[id]/attachments` ; audit `MINUTE_ATTACHMENT_*`
- **Auth — première connexion**
  - Flag `User.mustChangePassword` après envoi d’un mot de passe temporaire (invitation, identifiants membre)
  - Page `/change-password-required` et garde dans le layout applicatif
  - Action `completeRequiredPasswordChange` ; redirection login si MDP temporaire
- **Auth — captcha maison**
  - Vérification HMAC + délai + honeypot sur login et inscription (`auth-form-guard.ts`)
  - Composant `AuthCaptchaField` branché sur login et register
- **Notifications push — onboarding explicite**
  - Bannière « Garder / Désactiver » (`PushOnboardingBanner`) à la place de l’abonnement silencieux
  - Préférence enregistrée via `NotificationPreference` ; `completePushOnboarding`
- **Journal d’activité club**
  - Panneau dans **Paramètres** (président, vice-président, admin club)
  - Actions : création membre, envoi identifiants, adhésions, rôles, utilisateurs club
- **Annonces club enrichies**
  - Ciblage : tous les membres, rôles, commission, cotisations en retard/en attente, sans compte app
  - Enum `ClubAnnouncementTarget` + `resolveClubAnnouncementRecipients`
- **Rôles — espagnol et nouveaux postes**
  - Libellés ES via `getRoleLabel()` / `role-definitions.ts`
  - **Vice-président** (`VICE_PRESIDENT`) et **Président de commission** (`COMMISSION_CHAIR`)
  - Permissions, mandats, annonces et notifications alignés
- **Auth — mots de passe**
  - Réinitialisation par email (`/forgot-password`, `/reset-password`) via token `VerificationToken`
  - Changement de mot de passe dans **Mon compte**
- **Onboarding membres**
  - Case « envoyer identifiants » à l'ajout membre et à l'approbation d'adhésion
  - `inviteClubUser` crée le compte et envoie l'email de connexion
- **Offres — espagnol**
  - Champs `nameEs`, `descriptionEs`, `featuresEs` dans l'éditeur super admin
- **Annonces plateforme**
  - Ciblage par rôle (`ROLE`) dans **Admin → Annonces**
- **Offres — tableau comparatif**
  - Masqué par défaut sur la page d'accueil ; activation dans **Admin → Abonnements**
  - Éditeur de contenu cellule par cellule (surcharges admin, repli sur `plan-features`)
- **Notifications push — VAPID**
  - Panneau **Admin → Paramètres** : génération/enregistrement des clés, guide intégré
  - Repli sur variables d'environnement `VAPID_*`

### Fixed
- **Build / lint**
  - Ignore `.open-next`, `dist` et `landing-worker` dans ESLint
  - Corrections TypeScript (`auth`, annonces club, `server-messages`, webhooks Stripe)
  - `dues.ts` : `paymentAmount` en `const`
- **Offres / abonnements — synchronisation super admin**
  - `ensurePlanConfigs()` ne réécrit plus les noms et descriptions à chaque lecture (les réglages super admin sont conservés)
  - Libellés d’offres lus depuis `PlanConfig` partout (sidebar, paramètres, admin clubs/facturation, tableau comparatif)
  - Nombre d’offres actives, ordre (`sortOrder`), noms, descriptions et listes de fonctionnalités reflètent la configuration admin (landing, abonnement club)
  - Limite membres du tableau comparatif alignée sur `memberLimit` configuré par offre
  - Revalidation élargie (fr/en/es + API marketing) et cache marketing réduit à 60 s après modification des tarifs

### Changed
- **Notifications push** : opt-out par défaut côté préférence ; choix explicite requis avant abonnement navigateur
- **Libellés rôles** : espagnol pris en charge sur annuaire, tableau de bord, paramètres et annonces

### Database
- Migration `20260715140000_user_password_club_features` — `mustChangePassword`, `ClubAnnouncementTarget`
- Migration `20260715130000_notification_push_default` — préférences push
- Migration `20260715150000_club_role_vice_president_commission_chair` — `VICE_PRESIDENT`, `COMMISSION_CHAIR`
- Migration `20260715160000_meeting_commission_id` — `Meeting.commissionId`
- Migration `20260715161000_role_config_label_es` — libellés rôles en espagnol
- Migration `20260715170000_minute_ai_assist` — enum `AddonKey.MINUTE_AI`, `ClubFeatures.minuteAiAssistEnabled`

### Fixed
- **Membres — changement de rôle** : correction de l’erreur React #482 lors de la modification du rôle dans l’annuaire (`MemberDuesBadge` converti en composant client ; sélecteurs de rôle contrôlés)
- **Build** : séparation `member-roles-constants.ts` / `member-roles.ts` (`server-only`) pour éviter l’import Prisma/pg dans les composants client

### Added
- **Membres — rôles applicatifs**
  - Assignation du rôle (`ClubMembership`) depuis la fiche membre, l’annuaire (`/members`) et le formulaire d’ajout
  - Modification du rôle par le **super admin**, le **président** ou l’**administrateur club** (`users.manage`)
  - Choix du rôle lors de l’**approbation d’une demande d’adhésion** (tableau de bord)
  - Badge de rôle dans l’annuaire ; sélecteur inline pour les utilisateurs autorisés
  - Support des rôles personnalisés pour le super admin
  - Helper partagé `canManageMemberRoles()` pour centraliser les permissions
  - Rôle par défaut **« Membre / Lecteur »** (`READER`) ; les autres rôles ne sont assignables que par président, admin ou super admin
  - Bandeau d’aide sur la page Membres (`MembersRoleHint`)
- **Membres — envoi des identifiants de connexion**
  - Bouton **« Envoyer les identifiants »** sur la fiche membre et icône enveloppe dans l’annuaire
  - Création automatique du compte applicatif si nécessaire (rôle Membre / Lecteur, adhésion approuvée)
  - Réinitialisation du mot de passe temporaire pour les comptes existants
  - Email brandé club avec URL de connexion, email et mot de passe temporaire (`memberLoginEmail`)
  - Journal d’audit `MEMBER_LOGIN_SENT`
- **Cotisations — paiements partiels**
  - Enregistrement d’un montant libre (différent du montant par défaut de la période)
  - Paiements échelonnés sur une même échéance jusqu’au solde complet
  - Affichage de la progression « payé / total » sur la page Cotisations
  - Accessible aux rôles `dues.manage` (admin, trésorier, secrétaire, président) et super admin

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
