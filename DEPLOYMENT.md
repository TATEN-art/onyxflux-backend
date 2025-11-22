# OnyxFlux Backend - VPS Deployment Guide

This guide will walk you through deploying the OnyxFlux backend to a VPS (Virtual Private Server) using Docker, Nginx, and PM2.

## Prerequisites

- Ubuntu 22.04 LTS VPS (minimum 2GB RAM, 2 CPU cores)
- Domain name pointing to your VPS IP (e.g., api.onyxflux.io)
- Root or sudo access to the server

## Step 1: Initial Server Setup

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Required Packages
```bash
sudo apt install -y curl git build-essential
```

### 1.3 Create Application User
```bash
sudo adduser onyxflux
sudo usermod -aG sudo onyxflux
su - onyxflux
```

## Step 2: Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v18.x.x
npm --version
```

## Step 3: Install Docker

### 3.1 Install Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### 3.2 Install Docker Compose
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

Log out and back in for group changes to take effect.

## Step 4: Install PM2

```bash
sudo npm install -g pm2
pm2 --version
```

## Step 5: Clone and Setup Application

### 5.1 Clone Repository
```bash
cd /home/onyxflux
git clone <your-repository-url> onyxflux-backend
cd onyxflux-backend
```

### 5.2 Install Dependencies
```bash
npm install
```

### 5.3 Configure Environment Variables
```bash
cp .env.example .env
nano .env
```

Update the following critical variables:
```env
NODE_ENV=production
DATABASE_URL=postgresql://onyxflux:STRONG_PASSWORD@localhost:5432/onyxflux
REDIS_PASSWORD=STRONG_REDIS_PASSWORD
JWT_SECRET=GENERATE_STRONG_SECRET_HERE

# Email Configuration
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key

# RPC Endpoints (use your Alchemy/Infura keys)
RPC_ETHEREUM=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
RPC_POLYGON=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
# ... configure all chains

# Payment Configuration
PAYMENT_WALLET_ADDRESS=0xYourPaymentWalletAddress

# Domain
DOMAIN=api.onyxflux.io
```

## Step 6: Deploy with Docker Compose

### 6.1 Start Services
```bash
docker-compose up -d
```

### 6.2 Check Service Status
```bash
docker-compose ps
```

### 6.3 Run Database Migrations
```bash
docker-compose exec backend npx prisma migrate deploy
```

### 6.4 View Logs
```bash
docker-compose logs -f backend
```

## Step 7: Install and Configure Nginx

### 7.1 Install Nginx
```bash
sudo apt install -y nginx
```

### 7.2 Configure Nginx
```bash
sudo cp deployment/nginx.conf /etc/nginx/sites-available/onyxflux
sudo ln -s /etc/nginx/sites-available/onyxflux /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default config
```

### 7.3 Test Nginx Configuration
```bash
sudo nginx -t
```

### 7.4 Restart Nginx
```bash
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Step 8: Setup SSL with Let's Encrypt

### 8.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 8.2 Obtain SSL Certificate
```bash
sudo certbot --nginx -d api.onyxflux.io
```

Follow the prompts:
- Enter your email address
- Agree to terms of service
- Choose whether to redirect HTTP to HTTPS (recommended: yes)

### 8.3 Test SSL Renewal
```bash
sudo certbot renew --dry-run
```

Certbot will automatically renew certificates before they expire.

## Step 9: Alternative - PM2 Deployment (Without Docker)

If you prefer PM2 over Docker:

### 9.1 Install PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql
```

In PostgreSQL shell:
```sql
CREATE DATABASE onyxflux;
CREATE USER onyxflux WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE onyxflux TO onyxflux;
\q
```

### 9.2 Install Redis
```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

Configure Redis password:
```bash
sudo nano /etc/redis/redis.conf
```
Uncomment and set: `requirepass your_redis_password`

Restart Redis:
```bash
sudo systemctl restart redis-server
```

### 9.3 Build Application
```bash
cd /home/onyxflux/onyxflux-backend
npm run build
npm run prisma:generate
npm run prisma:deploy
```

### 9.4 Start with PM2
```bash
pm2 start deployment/ecosystem.config.js
pm2 save
pm2 startup
```

Follow the command output to enable PM2 on system startup.

### 9.5 PM2 Management Commands
```bash
pm2 status              # Check status
pm2 logs                # View logs
pm2 restart all         # Restart all apps
pm2 stop all            # Stop all apps
pm2 delete all          # Delete all apps
pm2 monit               # Monitor resources
```

## Step 10: Firewall Configuration

### 10.1 Setup UFW Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

## Step 11: Monitoring and Maintenance

### 11.1 View Application Logs

**Docker:**
```bash
docker-compose logs -f backend
```

**PM2:**
```bash
pm2 logs onyxflux-backend
```

### 11.2 Monitor System Resources
```bash
htop
docker stats  # For Docker deployment
pm2 monit     # For PM2 deployment
```

### 11.3 Database Backup
```bash
# Create backup directory
mkdir -p /home/onyxflux/backups

# Backup script
docker-compose exec -T postgres pg_dump -U onyxflux onyxflux > /home/onyxflux/backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

Add to crontab for daily backups:
```bash
crontab -e
```
Add line:
```
0 2 * * * cd /home/onyxflux/onyxflux-backend && docker-compose exec -T postgres pg_dump -U onyxflux onyxflux > /home/onyxflux/backups/backup_$(date +\%Y\%m\%d_\%H\%M\%S).sql
```

### 11.4 Update Application

**Docker:**
```bash
cd /home/onyxflux/onyxflux-backend
git pull
docker-compose build
docker-compose up -d
docker-compose exec backend npx prisma migrate deploy
```

**PM2:**
```bash
cd /home/onyxflux/onyxflux-backend
git pull
npm install
npm run build
npm run prisma:deploy
pm2 restart all
```

## Step 12: Health Checks

### 12.1 Test API Endpoints
```bash
# Check status
curl https://api.onyxflux.io/status

# Check system metrics
curl https://api.onyxflux.io/metrics/system
```

### 12.2 Test WebSocket
```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket
wscat -c wss://api.onyxflux.io/alerts/stream
```

## Troubleshooting

### Issue: Cannot connect to database
**Solution:**
```bash
# Check PostgreSQL status
docker-compose ps postgres  # For Docker
sudo systemctl status postgresql  # For native install

# Check connection
docker-compose exec postgres psql -U onyxflux -d onyxflux
```

### Issue: Redis connection failed
**Solution:**
```bash
# Check Redis status
docker-compose ps redis  # For Docker
sudo systemctl status redis-server  # For native install

# Test Redis
docker-compose exec redis redis-cli ping
```

### Issue: Nginx 502 Bad Gateway
**Solution:**
```bash
# Check if backend is running
docker-compose ps backend
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/onyxflux_error.log

# Restart services
docker-compose restart backend
sudo systemctl restart nginx
```

### Issue: SSL certificate issues
**Solution:**
```bash
# Renew certificate
sudo certbot renew --force-renewal

# Check certificate status
sudo certbot certificates
```

## Security Best Practices

1. **Use strong passwords** for database, Redis, and JWT secrets
2. **Keep system updated**: `sudo apt update && sudo apt upgrade`
3. **Enable firewall**: Only allow necessary ports (22, 80, 443)
4. **Regular backups**: Automate database backups
5. **Monitor logs**: Check for suspicious activity
6. **Use SSH keys**: Disable password authentication
7. **Limit sudo access**: Only give necessary permissions
8. **Keep secrets secure**: Never commit `.env` to git

## Performance Optimization

### 1. Enable Nginx Caching
Add to nginx.conf:
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;
```

### 2. Optimize PostgreSQL
Edit `/etc/postgresql/15/main/postgresql.conf`:
```
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
```

### 3. Optimize Redis
Edit `/etc/redis/redis.conf`:
```
maxmemory 512mb
maxmemory-policy allkeys-lru
```

## Support

For deployment issues or questions:
- Email: support@onyxflux.io
- Documentation: https://docs.onyxflux.io

## Next Steps

1. Configure email service (SendGrid/Resend)
2. Set up RPC endpoints for all chains
3. Configure payment wallet address
4. Test all API endpoints
5. Set up monitoring (optional: Grafana, Prometheus)
6. Configure backup automation
7. Set up staging environment (recommended)
