# Render Web Service — checklist finale

GitHub connecté ✅ — complétez ces réglages dans le dashboard Render.

## Build & Start

| Champ | Valeur |
|-------|--------|
| **Branch** | `main` |
| **Root Directory** | *(vide)* |
| **Runtime** | Node |
| **Build Command** | `npm ci --include=dev && npx prisma generate && npm run build` |
| **Start Command** | `npm run start` |
| **Instance Type** | **Free** |

## Environment Variables (obligatoires)

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | *(Postgres Prisma — db.prisma.io)* |
| `AUTH_SECRET` | *(générer : `openssl rand -base64 32`)* |
| `AUTH_URL` | `https://clubminutes.api.mg` |
| `AUTH_TRUST_HOST` | `true` |
| `CRON_SECRET` | *(générer : `openssl rand -base64 32`)* |
| `NEXTAUTH_URL` | `https://clubminutes.api.mg` |
| `NEXT_PUBLIC_APP_URL` | `https://clubminutes.api.mg` |
| `NEXT_PUBLIC_APP_NAME` | `Rotary Minutes` |

Stripe / Resend : optionnels pour la démo Startup.

## Après le premier deploy réussi

1. Noter l'URL `https://VOTRE-SERVICE.onrender.com`
2. **Settings → Custom Domains** → `clubminutes.api.mg`
3. DNS Cloudflare (zone api.mg) :
   - CNAME `clubminutes` → `VOTRE-SERVICE.onrender.com`
   - Proxy **DNS only** (gris) jusqu'à vérification Render
4. Supprimer la route Worker `clubminutes.api.mg` (conflit Cloudflare Workers)
5. Render → **Verify** le domaine

## Test

```bash
curl -sI https://VOTRE-SERVICE.onrender.com/en
curl -sI https://clubminutes.api.mg/en
```

Attendu : `HTTP/2 200` (ou 307 vers `/fr` ou `/en`).