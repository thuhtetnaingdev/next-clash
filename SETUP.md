# Quick Setup Guide

## 1. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your PostgreSQL connection details and desired credentials:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/clash_subscription
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_random_secret_key_here
NODE_ENV=development
```

**Important**: For production, generate a strong random JWT_SECRET:
```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes([guid]::NewGuid().ToString())) | ForEach-Object { $_ }
```

## 2. Ensure PostgreSQL is Running

Make sure your PostgreSQL database is running and accessible:

```bash
# Test connection
psql postgresql://user:password@localhost:5432/clash_subscription
```

## 3. Install Dependencies

```bash
pnpm install
```

## 4. Create Database Tables

Run the initialization script (optional - tables are auto-created on first login):

```bash
# If you have ts-node installed
node -r ts-node/register scripts/init-db.ts

# Or manually create tables using psql
psql postgresql://user:password@localhost:5432/clash_subscription < scripts/init-db.sql
```

## 5. Start Development Server

```bash
pnpm dev
```

Visit `http://localhost:3000` in your browser.

## 6. Login

Use the credentials you set in `.env.local`:
- **Username**: `admin` (or your custom ADMIN_USERNAME)
- **Password**: (your custom ADMIN_PASSWORD)

## 7. First Login

On your first login, the system will:
1. Verify credentials against environment variables
2. Create a user account in the database
3. Create empty config and subscription entries
4. Generate a JWT token and set secure cookie

## Common Issues

### Port Already in Use

If port 3000 is already in use:
```bash
pnpm dev -- -p 3001
```

### Database Connection Failed

Check your DATABASE_URL format:
```
postgresql://[user]:[password]@[host]:[port]/[database]
```

Example with local PostgreSQL:
```
postgresql://postgres:password@localhost:5432/clash_subscription
```

### Monaco Editor Issues

If the editor doesn't load:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Restart dev server (Ctrl+C, then `pnpm dev`)
3. Check browser console for errors

## Next Steps

1. **Edit Clash Config**: Go to "Clash Config Editor" tab and paste your Clash configuration
2. **Set Subscription Link**: Go to "Subscription" tab and enter your subscription link
3. **Export Config**: Use the download button to export your configuration as YAML

## API Usage

Once logged in, you can access the API directly:

```bash
# Get current user
curl -b "auth_token=YOUR_TOKEN" http://localhost:3000/api/auth/me

# Get config
curl -b "auth_token=YOUR_TOKEN" http://localhost:3000/api/config

# Get YAML (display in browser)
curl -b "auth_token=YOUR_TOKEN" http://localhost:3000/api/subscription/yaml

# Download YAML
curl -b "auth_token=YOUR_TOKEN" -O http://localhost:3000/api/subscription/download
```

## File Structure Quick Reference

```
.env.local              ← Your configuration (don't commit!)
README.md               ← Full documentation
SETUP.md                ← This file

app/page.tsx            ← Login page
app/dashboard/page.tsx  ← Main dashboard
app/api/*               ← All API endpoints

components/
  ├── login-form.tsx    ← Login UI
  ├── dashboard.tsx     ← Dashboard layout
  ├── yaml-editor.tsx   ← Monaco editor
  └── subscription-manager.tsx ← Subscription UI

lib/
  ├── auth.ts           ← Auth logic
  ├── session.ts        ← JWT handling
  └── db/               ← Database setup
```

## Need Help?

1. Check `.env.local` is configured correctly
2. Verify PostgreSQL is running and DATABASE_URL is correct
3. Check browser console for errors (F12 > Console tab)
4. Check server logs for error messages
5. See README.md for detailed documentation
