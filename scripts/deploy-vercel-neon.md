# Migration Render → Vercel (app) + Neon (PostgreSQL)

## Vercel est-il gratuit ?

**Oui, le plan Hobby est gratuit** pour un usage perso / petit SaaS.

| | Hobby (free) | Pro (~$20/user/mo) |
|--|--------------|---------------------|
| Déploiements Next.js | Oui | Oui |
| Domaine custom | Oui | Oui |
| SSL | Oui | Oui |
| Serverless / Edge | Oui (quotas) | Quotas plus hauts |
| **Crons** (`vercel.json`) | **Oui** (1×/jour max sur certaines configs historiques ; aujourd’hui Hobby supporte les crons listés avec limites) | Plus de flexibilité |
| Builds concurrent | Limité | Plus |
| Support | Communauté | Prioritaire |

**Limites utiles à connaître (Hobby)** :
- ~100 Go de bande passante / mois (ordre de grandeur, vérifier le dashboard)
- Builds et exécutions serverless plafonnés
- Pas idéal pour un très gros trafic, **largement mieux que Render free** pour Next.js (plus de RAM effective par invocation serverless, pas le même plafond 512 Mo permanent)

**Neon free (Generous Free)** : ~0,5 Go storage, branches, scale-to-zero. Suffisant pour démarrer ; passer Scale si la base grossit.

---

## Architecture cible

```
Navigateur → clubminutes.api.mg (DNS Cloudflare)
                ↓
            Vercel (Next.js)
                ↓
     DATABASE_URL  → Neon pooled (-pooler)
     DIRECT_URL    → Neon direct (migrations)
```

L’app **ne tourne plus** sur le web service Render.  
La DB Render free peut être **éteinte** après bascule validée.

---

## Étape A — Créer la base Neon

1. https://console.neon.tech → **New project**
2. Nom : `rotary-minutes` (ou libre)
3. Région : **Europe** (Frankfurt / London) si vos users sont EU/Afrique
4. Dans **Dashboard → Connection details** :
   - Activer **Pooled connection** → copier l’URL → ce sera `DATABASE_URL`
   - **Direct connection** → copier l’URL → ce sera `DIRECT_URL`
5. Ajouter si absent : `?sslmode=require` (Neon le met souvent déjà)

Exemple (fictif) :

```env
DATABASE_URL="postgresql://neondb_owner:xxx@ep-xxxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://neondb_owner:xxx@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"
```

---

## Étape B — Copier les données depuis Render

### B.1 Récupérer l’URL Postgres Render

Render Dashboard → **PostgreSQL** `rotary-minutes-db` → **External Database URL**  
(pas l’URL interne `dpg-…-a` : elle ne marche que depuis le réseau Render).

### B.2 Dump

Sur une machine avec [PostgreSQL client tools](https://www.postgresql.org/download/) :

```bash
# Windows PowerShell : définir les URLs (ne pas committer)
$env:RENDER_DATABASE_URL = "postgresql://...@....render.com/rotary_minutes"
$env:NEON_DIRECT_URL     = "postgresql://...@ep-....neon.tech/neondb?sslmode=require"

pg_dump $env:RENDER_DATABASE_URL `
  --format=custom `
  --no-owner `
  --no-acl `
  -f rotary_minutes.dump
```

### B.3 Restore sur Neon

```bash
pg_restore --clean --if-exists --no-owner --no-acl `
  -d $env:NEON_DIRECT_URL `
  rotary_minutes.dump
```

Si `pg_restore` se plaint de rôles manquants, c’est souvent OK (`--no-owner`).  
Vérifier dans Neon **SQL Editor** : `SELECT COUNT(*) FROM "User";` (ou table `Club`).

### B.4 Prisma (alignement migrations)

En local, avec `DIRECT_URL` = Neon direct dans `.env` :

```bash
npx prisma migrate status
```

- Si le schéma est déjà à jour via le dump : rien à faire, ou  
  `npx prisma migrate resolve --applied "<nom_migration>"` pour les migrations déjà présentes.
- **Ne pas** lancer `npm run db:seed` en production (écrase / pollue les données).

---

## Étape C — Projet Vercel

1. https://vercel.com/signup → **GitHub** (`JahziRam`)
2. Plan **Hobby**
3. **Add New… → Project** → Import `rotary-minutes`
4. Framework : **Next.js** (auto)
5. **Root Directory** : `.` (défaut)
6. **Build Command** : `npm run build` (déjà `next build --webpack` dans package.json)
7. **Install** : `npm ci` (défaut)
8. **Output** : laisser Next (pas de static export)

### Variables d’environnement (Production + Preview)

| Variable | Valeur |
|----------|--------|
| `DATABASE_URL` | Neon **pooled** |
| `DIRECT_URL` | Neon **direct** |
| `AUTH_SECRET` | même que Render (ou nouveau ; invalide les sessions) |
| `AUTH_URL` | `https://clubminutes.api.mg` |
| `NEXTAUTH_URL` | `https://clubminutes.api.mg` |
| `AUTH_TRUST_HOST` | `true` |
| `NEXT_PUBLIC_APP_URL` | `https://clubminutes.api.mg` |
| `NEXT_PUBLIC_APP_NAME` | `Rotary Minutes` |
| `CRON_SECRET` | secret fort (crons Vercel l’envoient en header) |
| `NODE_ENV` | `production` (souvent auto) |

**Copier aussi depuis Render** (si utilisés) :

- `STRIPE_*`, `NEXT_PUBLIC_STRIPE_*`
- `RESEND_API_KEY`, `EMAIL_FROM`
- `XAI_API_KEY` / OpenAI / Qwen
- VAPID push si configuré
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`

**Ne pas** mettre `RUN_DB_SEED=1` sur Vercel.

### Deploy

**Deploy** → URL du type `https://rotary-minutes-xxx.vercel.app`  
Tester login + édition d’un PV **avant** de basculer le DNS.

---

## Étape D — Domaine clubminutes.api.mg

1. Vercel → projet → **Settings → Domains** → Add `clubminutes.api.mg`
2. Cible DNS indiquée (souvent `cname.vercel-dns.com`)

### Cloudflare (zone `api.mg`)

```bash
# Voir aussi scripts/cloudflare-dns-vercel.sh
CLOUDFLARE_API_TOKEN=xxx VERCEL_CNAME=cname.vercel-dns.com bash scripts/cloudflare-dns-vercel.sh
```

Manuel :
- Type **CNAME**, name `clubminutes`, target `cname.vercel-dns.com`
- Proxy : **DNS only** (nuage gris) le temps de la validation Vercel, puis vous pouvez repasser orange si besoin (souvent gris plus simple pour l’auth)

3. Mettre à jour **Stripe webhooks** vers  
   `https://clubminutes.api.mg/api/webhooks/stripe` (ou le chemin réel du projet)

4. Android / Capacitor : `CAPACITOR_SERVER_URL` doit pointer vers la même URL.

---

## Étape E — Crons

Le fichier `vercel.json` du repo définit déjà les crons (`/api/cron/...`).

Vérifier que chaque route cron :
- accepte `Authorization: Bearer $CRON_SECRET` ou le header Vercel Cron
- n’est pas bloquée par middleware auth utilisateur

Sur Hobby, surveiller les logs **Cron** après le premier jour.

---

## Étape F — Couper Render

Quand tout est OK en prod sur Vercel + Neon :

1. Render **Web Service** → Suspend / Delete  
2. Render **Postgres** → Delete (après un **dernier dump** de secours)  
3. Blueprint `render.yaml` : optionnel de le garder pour doc, ou le marquer deprecated

---

## Dépannage

| Problème | Piste |
|----------|--------|
| `P1001` / can't reach DB | Firewall Neon : autoriser Vercel / `0.0.0.0/0` le temps du test ; SSL `sslmode=require` |
| Migrations échouent | Utiliser **DIRECT_URL** (sans `-pooler`) pour `prisma migrate` |
| Auth redirige mal | `AUTH_URL` / `NEXTAUTH_URL` = URL publique exacte (https, sans slash final incohérent) |
| OOM au **build** Vercel | Rare sur Hobby ; si ça arrive : build sans seed, cache, ou Pro |
| OOM à l’**édition PV** | Moins probable qu’Render free ; garder les correctifs sans `photoUrl` bulk |
| Timeout serverless 10s/60s | Actions lourdes (PDF massif) : surveiller ; Pro augmente les limites |

---

## Ordre de bascule (zéro improvisation)

1. Neon créé + dump/restore depuis Render  
2. Preview Vercel avec env Neon → tests manuels  
3. Domaine Vercel + DNS  
4. Webhooks / mobiles  
5. Suspendre Render  

Durée typique : **1–2 h** si le dump est raisonnable.
