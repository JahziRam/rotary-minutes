# Plan B — Render (gratuit) si Oracle échoue

> **Render demande un upgrade pour « Security » ?**  
> L'upgrade **Pro ($25/mo)** sert aux options avancées (forcer 2FA, audit logs).  
> Pour déployer, utilisez **New → Web Service** et connectez GitHub *dans cet écran* — pas besoin de Pro.  
> Si Render bloque quand même → voir **`deploy-vercel-startup.md`** (Vercel gratuit, Next.js natif).

Oracle bloque souvent les inscriptions (Madagascar, carte bancaire, vérification anti-fraude).
**Render** est plus simple : pas de VPS à gérer, domaine personnalisé gratuit.

## 1. Créer le compte Render

1. https://dashboard.render.com/register → email **ou** GitHub (les deux conviennent)
2. **Inscrit par email par erreur ?** Pas grave — il faut seulement connecter GitHub pour déployer :
   - https://dashboard.render.com/u/settings#account-security
   - Section **Git deployment credentials** → **Connect GitHub**
   - Autoriser l'accès au repo `JahziRam/rotary-minutes` (privé)
   - Si le repo n'apparaît pas : https://github.com/apps/render/installations/new → **Repository access** → inclure `rotary-minutes`

## 2. Clé API (pour déploiement automatique par l'agent)

1. https://dashboard.render.com/u/settings#api-keys → **Create API Key**
2. Coller la clé dans le terminal :
   ```powershell
   $env:RENDER_API_KEY = "rnd_..."
   cd C:\Users\jahaz\Documents\GitHub\rotary-minutes
   node scripts/setup-render.mjs
   ```

## 3. Déployer via Blueprint (manuel)

1. Dashboard → **New +** → **Blueprint**
2. Sélectionner le repo `rotary-minutes`
3. Render lit `render.yaml` automatiquement
4. Renseigner les variables marquées **sync: false** :
   - `DATABASE_URL` — Postgres Prisma (`db.prisma.io`)
   - `STRIPE_*`, `RESEND_API_KEY`, `EMAIL_FROM` (optionnel pour la démo)
5. **Apply** → premier build (~5–10 min)

URL temporaire : `https://rotary-minutes.onrender.com`

## 4. Domaine clubminutes.api.mg

1. Render → service **rotary-minutes** → **Settings** → **Custom Domains**
2. Ajouter : `clubminutes.api.mg`
3. Noter la cible CNAME (ex. `rotary-minutes.onrender.com`)

### DNS Cloudflare (zone api.mg, compte jahazielaramanitra@gmail.com)

```bash
CLOUDFLARE_API_TOKEN=xxx RENDER_HOST=rotary-minutes.onrender.com bash scripts/cloudflare-dns-render.sh
```

Ou manuellement :
- Type **CNAME**, Name **clubminutes**, Target **rotary-minutes.onrender.com**
- Proxy : **DNS only** (gris) jusqu'à vérification Render, puis orange possible

### Retirer le conflit Worker

```bash
CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=e3b91a2e610a05f7043060f477933d4d \
  bash scripts/remove-worker-route-clubminutes.sh
```

4. Render → **Verify** sur le domaine custom

## 5. Limites du plan gratuit Render

- Mise en veille après **15 min** sans trafic (~1 min au réveil) — OK pour candidature Startup
- 750 h/mois — largement suffisant pour une démo

## Alternatives si Render échoue aussi

| Option | Coût | Difficulté |
|--------|------|------------|
| **Vercel Hobby** | Gratuit | Très facile (Next.js natif) |
| **Fly.io** | Gratuit* | Moyen |
| **Hetzner CX22** | ~5 €/mois | Facile, VPS réel, inscription EU fiable |
| **Google Cloud e2-micro** | Gratuit | Même problème carte que Oracle parfois |