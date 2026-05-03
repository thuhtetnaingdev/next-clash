# Clash Subscription Manager - Deployment Guide

## Overview

This guide covers deploying the Clash Subscription Manager to production environments.

## Prerequisites

- PostgreSQL database (local, managed service, or cloud)
- Node.js 18+ runtime
- Package manager (pnpm, npm, yarn)
- Domain name (optional)
- SSL certificate (for HTTPS)

## Deployment Options

### 1. Vercel (Recommended)

Vercel is the creators of Next.js and provides seamless deployment.

#### Steps:

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import on Vercel**
   - Go to https://vercel.com/new
   - Select GitHub repository
   - Configure project settings
   - Add environment variables

3. **Environment Variables** (in Vercel dashboard)
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/db
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=secure_password
   JWT_SECRET=your_secure_random_secret
   NODE_ENV=production
   ```

4. **Database Setup**
   - Use Vercel Postgres, Neon, or external PostgreSQL
   - Run migrations/init script
   - Verify connection

5. **Deploy**
   - Vercel auto-deploys on git push
   - Monitor deployment in dashboard

#### Pros:
- Free tier available
- Automatic SSL
- Global CDN
- Easy environment management
- Automatic deployments on git push

#### Cons:
- Cold starts for serverless functions
- Database must be external
- Potential costs at scale

### 2. Self-Hosted (VPS/Cloud Server)

#### Using PM2

1. **Setup Server**
   ```bash
   # On your VPS
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   npm install -g pnpm pm2
   ```

2. **Clone & Install**
   ```bash
   git clone <your-repo>
   cd clash-subscription-manager
   pnpm install --prod
   ```

3. **Build**
   ```bash
   pnpm build
   ```

4. **Environment Setup**
   ```bash
   nano .env.local
   # Add production variables
   ```

5. **Start with PM2**
   ```bash
   pm2 start pnpm --name "clash-sub" -- start
   pm2 save
   pm2 startup
   ```

6. **Nginx Reverse Proxy**
   ```nginx
   server {
     listen 80;
     server_name yourdomain.com;

     location / {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

7. **SSL Certificate**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot certonly --nginx -d yourdomain.com
   ```

### 3. Docker Deployment

#### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod

# Copy source
COPY . .

# Build
RUN pnpm build

# Expose port
EXPOSE 3000

# Start
CMD ["pnpm", "start"]
```

#### Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://user:pass@postgres:5432/clash
      ADMIN_USERNAME: admin
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
    depends_on:
      - postgres

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: clash
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### Deploy
```bash
docker-compose up -d
```

### 4. Railway.app

1. Sign up at https://railway.app
2. Connect GitHub repository
3. Add PostgreSQL plugin
4. Configure environment variables
5. Deploy

### 5. Heroku (Legacy)

Heroku's free tier has been discontinued, but paid options remain available.

## Production Checklist

### Security
- [ ] Change JWT_SECRET to random 32+ character string
- [ ] Use strong ADMIN_PASSWORD
- [ ] Enable HTTPS/SSL
- [ ] Set secure cookie flags
- [ ] Configure CORS if needed
- [ ] Use environment variables for all secrets
- [ ] Enable database encryption
- [ ] Set up firewall rules
- [ ] Enable database backups

### Database
- [ ] Create production database
- [ ] Run initialization script
- [ ] Test connection
- [ ] Enable automatic backups
- [ ] Monitor database size
- [ ] Set up replication for HA

### Application
- [ ] Run `pnpm build` successfully
- [ ] Test all API endpoints
- [ ] Verify authentication works
- [ ] Test config save/load
- [ ] Test subscription features
- [ ] Check error handling
- [ ] Monitor application logs

### Performance
- [ ] Enable caching headers
- [ ] Configure CDN if needed
- [ ] Monitor response times
- [ ] Set up load balancing if needed
- [ ] Enable database connection pooling

### Monitoring
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure logging
- [ ] Set up uptime monitoring
- [ ] Enable performance monitoring
- [ ] Create alerts for issues

## Environment Variables Reference

### Required
```
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_random_secret_key
NODE_ENV=production
```

### Optional
```
LOG_LEVEL=info
PORT=3000
```

## Database Backups

### PostgreSQL Backup

```bash
# Backup
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql

# Automated backup (cron)
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/clash-$(date +\%Y\%m\%d).sql.gz
```

## Monitoring & Maintenance

### Health Check
```bash
curl https://yourdomain.com/api/auth/me
# Should return 401 (not authenticated) if working
```

### Log Monitoring
```bash
# Vercel
vercel logs

# PM2
pm2 logs clash-sub

# Docker
docker logs container_id
```

### Database Maintenance
```bash
# Analyze tables
ANALYZE;

# Vacuum
VACUUM;

# Check size
SELECT * FROM pg_stat_user_tables;
```

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (nginx, HAProxy)
- Run multiple application instances
- Share single PostgreSQL database
- Use connection pooling

### Database Scaling
- Read replicas for scaling reads
- Connection pooling (PgBouncer)
- Partitioning large tables
- Archive old data

### Performance Optimization
- Enable query caching
- Use indexes on frequently queried columns
- Monitor slow queries
- Optimize database queries

## Rollback Procedure

### Application
```bash
# Revert to previous commit
git revert <commit-hash>
git push

# Vercel auto-deploys
# Or manually redeploy
```

### Database
```bash
# Restore from backup
psql $DATABASE_URL < backup_before_deployment.sql

# Or point application to backup database
```

## Troubleshooting

### Application Won't Start
- Check logs: `pnpm dev` locally
- Verify environment variables
- Check database connection
- Ensure Node.js version compatibility

### Database Connection Fails
- Verify DATABASE_URL format
- Check firewall rules
- Test connection manually: `psql $DATABASE_URL`
- Ensure database exists

### High Memory Usage
- Check for memory leaks
- Monitor query performance
- Restart application if needed
- Check database connection pool

### Slow Performance
- Monitor response times
- Check database query performance
- Enable caching
- Consider read replicas

## Security Hardening

1. **Enable HTTPS**
   ```bash
   # Let's Encrypt
   certbot certonly --standalone -d yourdomain.com
   ```

2. **Rate Limiting**
   - Implement on API routes
   - Use middleware like `express-rate-limit`

3. **CORS Configuration**
   ```typescript
   // In API routes
   res.setHeader('Access-Control-Allow-Origin', 'https://yourdomain.com');
   res.setHeader('Access-Control-Allow-Methods', 'GET,POST');
   ```

4. **Security Headers**
   ```typescript
   res.setHeader('X-Content-Type-Options', 'nosniff');
   res.setHeader('X-Frame-Options', 'DENY');
   res.setHeader('X-XSS-Protection', '1; mode=block');
   ```

5. **Database Security**
   - Use strong passwords
   - Restrict network access
   - Enable SSL connections
   - Regular backups

## Update Procedure

1. **Test Locally**
   ```bash
   git pull
   pnpm install
   pnpm build
   pnpm dev
   ```

2. **Backup Database**
   ```bash
   pg_dump $DATABASE_URL > backup_before_update.sql
   ```

3. **Deploy**
   ```bash
   git push
   # Vercel/Railway auto-deploys
   ```

4. **Verify**
   - Check application loads
   - Test login
   - Verify configs/subscriptions
   - Monitor logs

5. **Rollback if Needed**
   ```bash
   git revert <commit-hash>
   git push
   ```

## Support

For issues with:
- **Next.js**: https://nextjs.org/docs
- **PostgreSQL**: https://www.postgresql.org/docs
- **Drizzle ORM**: https://orm.drizzle.team
- **Deployment**: Check platform-specific docs

## Conclusion

The Clash Subscription Manager is production-ready. Choose a deployment platform based on your needs, follow the security checklist, and monitor your deployment regularly.
