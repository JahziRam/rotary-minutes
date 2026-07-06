# Oracle Cloud Always Free — VM pour clubminutes.api.mg

## 1. Créer le compte (gratuit, carte requise)

1. https://www.oracle.com/cloud/free/
2. Région : choisir la plus proche (ex. `eu-frankfurt-1` ou `af-johannesburg-1`)
3. Vérifier l’email

## 2. Créer la VM ARM (Always Free)

1. **Compute → Instances → Create instance**
2. Name : `rotary-startup`
3. Image : **Ubuntu 22.04** (aarch64)
4. Shape : **Ampere** → `VM.Standard.A1.Flex` — 2 OCPU, 12 GB RAM (suffisant)
5. Réseau : assigner IP publique
6. SSH keys : **Generate a key pair** → télécharger la clé privée `.key`
7. Create

## 3. Ouvrir les ports

1. **Networking → Virtual cloud networks → Security Lists → Ingress Rules**
2. Ajouter : TCP 80, 443 depuis `0.0.0.0/0` (HTTP/HTTPS)

## 4. Bootstrap sur le VPS

```bash
# Depuis votre PC (remplacer IP et clé)
ssh -i rotary-startup.key ubuntu@VPS_PUBLIC_IP

# Sur le VPS
sudo apt-get update && sudo apt-get install -y git
sudo git clone https://github.com/JahziRam/rotary-minutes.git /var/www/rotary-minutes
# Repo privé : utiliser GITHUB_TOKEN dans vps-bootstrap-clubminutes.sh

cd /var/www/rotary-minutes
sudo APP_DOMAIN=clubminutes.api.mg GITHUB_TOKEN=ghp_xxx bash scripts/vps-bootstrap-clubminutes.sh
```

## 5. Configurer .env production

```bash
sudo nano /var/www/rotary-minutes/.env
```

Minimum :
- `DATABASE_URL` — Postgres Prisma cloud
- `AUTH_SECRET` — `openssl rand -base64 32`
- `NEXTAUTH_URL=https://clubminutes.api.mg`
- `NEXT_PUBLIC_APP_URL=https://clubminutes.api.mg`

Puis :

```bash
cd /var/www/rotary-minutes && bash scripts/vps-deploy.sh
```

## 6. DNS Cloudflare (zone api.mg, compte jahazielaramanitra@gmail.com)

```bash
CLOUDFLARE_API_TOKEN=xxx VPS_IP=VPS_PUBLIC_IP bash scripts/cloudflare-dns-clubminutes.sh
```

Ou manuellement dans Cloudflare :
- Type **A**, Name **clubminutes**, Content **IP du VPS**, Proxy **on** (orange)

**Important** : supprimer la route Worker `clubminutes.api.mg` sur Cloudflare Workers (compte Atlas ou personnel) pour éviter le conflit.

## 7. GitHub Actions (déploiements automatiques)

Secrets du repo `rotary-minutes` :
| Secret | Valeur |
|--------|--------|
| `SSH_HOST` | IP publique Oracle |
| `SSH_USER` | `ubuntu` |
| `SSH_PRIVATE_KEY` | contenu du fichier `.key` |
| `DEPLOY_PATH` | `/var/www/rotary-minutes` |

Chaque push sur `main` déclenche **Deploy to VPS (Startup)**.