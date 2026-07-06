# Vercel Hobby — alternative gratuite (si Render bloque la sécurité)

Render peut demander un upgrade **Pro ($25/mo)** pour certaines options « Account Security »
(forcer 2FA, audit logs, etc.). **Ce n'est pas nécessaire pour déployer.**

Si Render vous bloque quand même → **Vercel Hobby (gratuit)** est idéal pour Next.js.

## 1. Créer le compte Vercel

1. https://vercel.com/signup → **Continue with GitHub** (compte `JahziRam`)
2. Plan **Hobby** (gratuit)

## 2. Importer le projet

1. https://vercel.com/new → Import `JahziRam/rotary-minutes`
2. Framework : **Next.js** (auto-détecté)
3. Variables d'environnement :

| Variable | Valeur |
|----------|--------|
| `DATABASE_URL` | Postgres Prisma (`db.prisma.io`) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://clubminutes.api.mg` |
| `NEXT_PUBLIC_APP_URL` | `https://clubminutes.api.mg` |
| `NEXT_PUBLIC_APP_NAME` | `Rotary Minutes` |
| `CRON_SECRET` | secret aléatoire |

Stripe / Resend : optionnels pour la démo Startup.

4. **Deploy** → URL temporaire `https://rotary-minutes-xxx.vercel.app`

## 3. Domaine clubminutes.api.mg

1. Vercel → projet → **Settings** → **Domains** → Add `clubminutes.api.mg`
2. Vercel affiche la cible DNS (souvent `cname.vercel-dns.com`)

### Cloudflare (zone api.mg, compte jahazielaramanitra@gmail.com)

```bash
CLOUDFLARE_API_TOKEN=xxx VERCEL_CNAME=cname.vercel-dns.com bash scripts/cloudflare-dns-vercel.sh
```

Ou manuellement :
- **CNAME** `clubminutes` → `cname.vercel-dns.com`
- Proxy : **DNS only** (gris) jusqu'à vérification Vercel

3. Retirer la route Worker en conflit :
```bash
CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=e3b91a2e610a05f7043060f477933d4d \
  bash scripts/remove-worker-route-clubminutes.sh
```

## 4. Render — si vous voulez quand même essayer

La connexion GitHub pour déployer se fait souvent **à la création du service**, pas dans Security :

1. Dashboard → **New +** → **Web Service** (pas Blueprint)
2. **Connect GitHub** dans cet écran
3. Repo `rotary-minutes`, branche `main`
4. Runtime : Node, Build : `npm ci && npx prisma generate && npm run build`
5. Start : `npm run start`
6. Plan : **Free**

Pas besoin d'upgrade Pro pour ça sur le plan Hobby workspace.

## 5. URL de secours (déjà live)

Pour la candidature Cloudflare Startup **maintenant** :
**https://rotary-minutes-landing.pages.dev** (déjà en ligne)