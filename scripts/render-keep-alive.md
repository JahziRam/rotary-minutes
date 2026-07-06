# Render Free — éviter le spin-down (~50 s de cold start)

Sur le plan **Free**, Render arrête l’instance après **~15 minutes** sans trafic HTTP. La première requête suivante redémarre le service (souvent 30–90 s).

## Solution en place (recommandée)

### 1. Endpoint léger

`GET /api/health` → `{ "ok": true, "ts": "..." }` (pas de DB, réponse rapide une fois le process démarré).

### 2. GitHub Actions — keep-alive

Workflow : `.github/workflows/render-keep-alive.yml`

- Ping **toutes les 5 minutes** (minimum GitHub)
- URL par défaut : `https://clubminutes.api.mg`
- Variable optionnelle : **Settings → Secrets and variables → Actions → Variables** → `RENDER_APP_URL`

Après push sur `main`, activer les workflows dans **Actions** (repo public = gratuit).

### 3. Health check Render

`render.yaml` utilise `healthCheckPath: /api/health` (plus léger que `/en`).

Dans le dashboard Render → **Settings → Health & Alerts**, vérifier le même chemin.

## Vérification manuelle

```bash
curl -sS -w "\nHTTP %{http_code} in %{time_total}s\n" https://clubminutes.api.mg/api/health
```

Premier appel après inactivité : lent (cold start). Appels suivants : < 1 s.

## Alternatives

| Service | Usage |
|---------|--------|
| [cron-job.org](https://cron-job.org) | Gratuit, ping `/api/health` toutes les 10 min |
| [UptimeRobot](https://uptimerobot.com) | Monitoring + ping 5 min (plan gratuit limité) |
| Plan Render **Starter** ($7/mois) | Instance toujours active, pas de spin-down |

## Crons métier (emails, rappels)

Render Free **n’exécute pas** `vercel.json` crons. Options :

1. **cron-job.org** : appeler `/api/cron/...` avec header `Authorization: Bearer CRON_SECRET`
2. GitHub Actions dédié (secret `CRON_SECRET` = même valeur que sur Render)
3. VPS : `scripts/setup-cron.sh`

Le keep-alive **n’exécute pas** les crons — il évite seulement le sommeil de l’instance.