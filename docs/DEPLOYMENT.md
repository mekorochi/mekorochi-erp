# MEKOROCHI ERP — Deployment Guide

## Local Development

### Prerequisites
- Node.js 20+ (`node --version`)
- PostgreSQL 16 running locally, OR Docker

### Quick Start (without Docker)
```bash
# 1. Clone and install
cd mekorochi-erp
npm install --legacy-peer-deps

# 2. Create PostgreSQL database
createdb mekorochi_erp
# Or: psql -c "CREATE DATABASE mekorochi_erp;"

# 3. Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# 4. Run migrations and generate client
npx prisma migrate dev

# 5. (Optional) Seed demo data
npm run db:seed

# 6. Start development server
npm run dev
# Open http://localhost:3000
```

### Quick Start (with Docker Compose)
```bash
# 1. Start PostgreSQL
docker compose up db -d

# 2. Configure .env
cp .env.example .env
# Set DATABASE_URL=postgresql://mekorochi:mekorochi_secure@localhost:5432/mekorochi_erp
# Uncomment the db ports section in docker-compose.yml for local dev

# 3. Run migrations
npx prisma migrate dev

# 4. (Optional) Seed
npm run db:seed

# 5. Start dev server
npm run dev
```

## Production Deployment (Single VPS)

### Requirements
- Ubuntu 22.04+ or Debian 12+ VPS (2GB+ RAM, 20GB+ disk)
- Docker and Docker Compose installed
- Domain name with DNS pointed to VPS IP
- SSH access

### Steps

1. **SSH into server and clone:**
```bash
ssh user@your-server
git clone <repo-url> /opt/mekorochi-erp
cd /opt/mekorochi-erp
```

2. **Create production environment file:**
```bash
cp .env.example .env.production
```
Edit `.env.production`:
```env
DATABASE_URL=postgresql://mekorochi:YOUR_STRONG_PASSWORD@db:5432/mekorochi_erp
AUTH_SECRET=GENERATE_32_CHAR_RANDOM_STRING
APP_URL=https://erp.yourdomain.com
DB_PASSWORD=YOUR_STRONG_PASSWORD
```
Generate AUTH_SECRET: `openssl rand -base64 32`

3. **Configure Caddy for your domain:**
Edit `docker/Caddyfile`:
```
erp.yourdomain.com {
    reverse_proxy app:3000
    encode gzip
    header {
        X-Frame-Options DENY
        X-Content-Type-Options nosniff
        Referrer-Policy strict-origin-when-cross-origin
        -Server
    }
}
```

4. **Build and start:**
```bash
docker compose --env-file .env.production up -d --build
```

5. **Run migrations:**
```bash
docker compose exec app npx prisma migrate deploy
```

6. **Open in browser:**
Navigate to `https://erp.yourdomain.com`
Complete the first-run setup wizard.

### SSL/HTTPS
Caddy automatically obtains and renews Let's Encrypt certificates when you use a real domain name. No manual certificate management needed.

### Monitoring
```bash
# View logs
docker compose logs -f app
docker compose logs -f db
docker compose logs -f caddy

# Health check
curl https://erp.yourdomain.com/api/health

# Database status
docker compose exec db pg_isready
```

## Backup & Restore

### Automated Backups
The `backup` service in docker-compose.yml automatically creates daily PostgreSQL dumps and upload archives, retained for 7 days.

Backups are stored in the `backups` Docker volume.

### Manual Backup
```bash
# Database
docker compose exec db pg_dump -U mekorochi -Fc mekorochi_erp > backup_$(date +%Y%m%d).dump

# Files
docker compose exec app tar czf /tmp/uploads.tar.gz /app/uploads
docker compose cp app:/tmp/uploads.tar.gz ./uploads_$(date +%Y%m%d).tar.gz
```

### Restore
```bash
# CAUTION: This replaces all data
docker compose exec -T db pg_restore -U mekorochi -d mekorochi_erp --clean < backup_file.dump

# Restore uploads
docker compose cp uploads_file.tar.gz app:/tmp/
docker compose exec app tar xzf /tmp/uploads_file.tar.gz -C /
```

### Off-server Backup
Recommended: Use a cron job to copy backups to an off-server location:
```bash
# Example: rsync to backup server
0 3 * * * rsync -az /var/lib/docker/volumes/mekorochi-erp_backups/_data/ backup-server:/backups/mekorochi/
```

## Updates

```bash
cd /opt/mekorochi-erp
git pull origin main
docker compose down
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
```

## Troubleshooting

| Issue | Solution |
|-------|---------|
| App won't start | Check logs: `docker compose logs app` |
| Database connection refused | Ensure db service is healthy: `docker compose ps` |
| 502 Bad Gateway | App is still starting; wait for health check |
| Migrations fail | Check DATABASE_URL, ensure db is running |
| Out of disk space | Prune old images: `docker system prune` |
| SSL not working | Ensure DNS A record points to server IP, ports 80/443 open |
