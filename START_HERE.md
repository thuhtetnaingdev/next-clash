# 🚀 START HERE - Clash Subscription Manager

Welcome! This document will get you up and running in 5 minutes.

## Quick Start (5 Minutes)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment

Create `.env.local` in project root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/clash_subscription
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

**Important:** Update `DATABASE_URL` with your PostgreSQL connection details.

### 3. Ensure PostgreSQL is Running

Make sure PostgreSQL is running and accessible:

```bash
# Test connection
psql postgresql://user:password@localhost:5432/clash_subscription

# If successful, you'll see the PostgreSQL prompt
# Type \q to exit
```

### 4. Start Development Server

```bash
pnpm dev
```

Visit **http://localhost:3000** in your browser.

### 5. Login

Use the credentials from your `.env.local`:
- **Username:** `admin`
- **Password:** `password`

That's it! 🎉

## What You Get

### Dashboard Features
1. **Clash Config Editor** - Professional YAML editor with syntax highlighting
2. **Subscription Manager** - Store, copy, and manage subscription links
3. **Download Support** - Export configs as YAML files
4. **Secure Authentication** - Login with username/password

### How to Use

#### Edit Your Clash Config
1. Click "Clash Config Editor" tab
2. Paste your Clash configuration into the editor
3. Click "Save Config"
4. Config is saved to database

#### Manage Subscriptions
1. Click "Subscription" tab
2. Enter your subscription URL
3. Click "Save Link"
4. Use buttons to:
   - **Copy Link** - Copy to clipboard
   - **Open in Browser** - Test the subscription
   - **Download YAML** - Export config file

## File Organization

```
├── README.md              ← Full documentation
├── SETUP.md               ← Detailed setup guide
├── FEATURES.md            ← Feature breakdown
├── IMPLEMENTATION.md      ← Technical details
├── DEPLOYMENT.md          ← How to deploy
├── .env.example           ← Environment template
└── START_HERE.md         ← This file

app/
├── page.tsx              ← Login page
├── dashboard/page.tsx    ← Main dashboard
└── api/*                 ← All API endpoints

components/
├── login-form.tsx        ← Login UI
├── dashboard.tsx         ← Dashboard layout
├── yaml-editor.tsx       ← Monaco editor
└── subscription-manager.tsx ← Subscription UI
```

## Troubleshooting

### "Connection refused" error
**Problem:** Can't connect to PostgreSQL
**Solution:** 
- Make sure PostgreSQL is running
- Check DATABASE_URL in `.env.local`
- Test connection: `psql postgresql://user:password@localhost:5432/clash_subscription`

### "Login failed" error
**Problem:** Username/password incorrect
**Solution:**
- Verify ADMIN_USERNAME and ADMIN_PASSWORD in `.env.local`
- Default is: username=`admin`, password=`password`

### Monaco Editor not showing
**Problem:** Editor doesn't appear or shows blank
**Solution:**
- Clear browser cache (Ctrl+Shift+Delete)
- Restart dev server: Ctrl+C then `pnpm dev`

### Port 3000 already in use
**Problem:** Can't start dev server
**Solution:**
```bash
pnpm dev -- -p 3001
# Or find and kill the process using port 3000
```

## Next Steps

### 1. Customize
- Change ADMIN_USERNAME and ADMIN_PASSWORD
- Update JWT_SECRET for security
- Modify UI colors in Tailwind config

### 2. Test All Features
- Login and logout
- Save a test config
- Save a subscription link
- Download the config
- Copy the subscription link

### 3. Deploy (Later)
- See **DEPLOYMENT.md** for production setup
- Options: Vercel, self-hosted, Docker, Railway, etc.

## API Reference

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

### Get Your Config (inline YAML)
```bash
curl http://localhost:3000/api/subscription/yaml \
  -b "auth_token=YOUR_TOKEN"
```

### Save Config
```bash
curl -X POST http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -b "auth_token=YOUR_TOKEN" \
  -d '{"content":"# Your YAML config"}'
```

See **README.md** for full API documentation.

## Technology Stack

| Layer | Technology |\n|-------|------------|\n| Frontend | React 19, Next.js 16, Tailwind CSS |\n| Editor | Monaco Editor |\n| Backend | Next.js API Routes, Node.js |\n| Database | PostgreSQL + Drizzle ORM |\n| Auth | JWT + bcrypt |\n| Styling | shadcn/ui + Tailwind |\n| Icons | Lucide React |\n\n## Sample Clash Config

Get started with a sample config:\n\n```yaml\nport: 7890\nsocks-port: 7891\nallow-lan: true\nmode: rule\nlog-level: info\n\nproxies:\n  - name: \"Example Proxy\"\n    type: ss\n    server: 1.2.3.4\n    port: 8388\n    cipher: aes-256-gcm\n    password: password123\n\nproxy-groups:\n  - name: \"Proxy\"\n    type: select\n    proxies:\n      - \"Example Proxy\"\n\nrules:\n  - DOMAIN-SUFFIX,google.com,Proxy\n  - GEOIP,CN,DIRECT\n  - MATCH,Proxy\n```\n\nSee `public/sample-clash-config.yaml` for a complete example.\n\n## Key Features\n\n✅ **Secure Login** - Username/password with JWT tokens\n✅ **YAML Editor** - Monaco Editor with syntax highlighting\n✅ **Config Storage** - Persistent database storage\n✅ **Subscription Management** - Store and manage subscription links\n✅ **Download Support** - Export as YAML files\n✅ **API Ready** - RESTful API for programmatic access\n✅ **Responsive Design** - Works on desktop, tablet, mobile\n✅ **User Isolated** - Each user only sees their own data\n\n## Getting Help\n\n1. **Quick Issues** - See SETUP.md troubleshooting section\n2. **Technical Details** - Read IMPLEMENTATION.md\n3. **Features** - Check FEATURES.md\n4. **Deployment** - See DEPLOYMENT.md\n5. **Full Docs** - Read README.md\n\n## Common Commands\n\n```bash\n# Start development server\npnpm dev\n\n# Build for production\npnpm build\n\n# Start production server\npnpm start\n\n# Run linter\npnpm lint\n\n# Initialize database (if needed)\nnode -r ts-node/register scripts/init-db.ts\n```\n\n## What's Next?\n\n1. ✅ Get running locally (you're here!)\n2. 📝 Edit and save your Clash config\n3. 🔗 Add your subscription link\n4. ⬇️ Download your YAML config\n5. 🚀 Deploy to production (see DEPLOYMENT.md)\n\n## Database Setup (Auto or Manual)\n\n**Automatic:** Tables are created on first login\n\n**Manual (optional):**\n```bash\nnode -r ts-node/register scripts/init-db.ts\n```\n\nOr using psql:\n```bash\npsql $DATABASE_URL < scripts/init-db.sql\n```\n\n## Security Notes\n\n- Default credentials are just for development\n- Always change JWT_SECRET in production\n- Use strong ADMIN_PASSWORD\n- Enable HTTPS in production\n- Never commit `.env.local` to git\n\n## Ready to Deploy?\n\nWhen you're ready for production:\n\n1. See **DEPLOYMENT.md** for setup\n2. Options include:\n   - Vercel (easiest)\n   - Self-hosted (most control)\n   - Docker (portable)\n   - Railway/Heroku (managed)\n\n## Questions?\n\nEach documentation file covers a specific aspect:\n- **START_HERE.md** (this file) - Quick overview\n- **README.md** - Complete documentation\n- **SETUP.md** - Detailed setup instructions\n- **FEATURES.md** - Feature breakdown\n- **IMPLEMENTATION.md** - Technical details\n- **DEPLOYMENT.md** - Deployment guide\n\n---\n\n**You're all set! Happy managing your Clash configs! 🚀**\n
