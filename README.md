# Clash Subscription Manager

A modern web application for managing Clash proxy configurations with a built-in YAML editor and subscription management. This app features authentication, a Monaco Editor for YAML editing, and easy subscription link management.

## Features

- **User Authentication**: Simple login system with username/password (credentials from .env)
- **YAML Config Editor**: Monaco Editor with full YAML syntax highlighting and validation
- **Subscription Management**: Store and manage subscription links with:
  - Copy link to clipboard
  - Open in browser
  - Download YAML configuration
  - Serve YAML content via API (not as download)
- **Database**: PostgreSQL with Drizzle ORM for data persistence
- **Responsive UI**: Clean, modern interface built with React and Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL + Drizzle ORM
- **Editor**: Monaco Editor (@monaco-editor/react)
- **Authentication**: JWT-based session management
- **UI Components**: shadcn/ui

## Setup

### 1. Prerequisites

- Node.js 18+
- PostgreSQL database
- pnpm (or npm/yarn)

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Configuration

Copy `.env.example` to `.env.local` and update with your settings:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/clash_subscription

# Authentication Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password

# JWT Secret (Change this for production!)
JWT_SECRET=your-secret-key-change-this-in-production

# Environment
NODE_ENV=development
```

### 4. Initialize Database

The application will automatically create tables on first login. However, you can manually initialize the database by running:

```bash
node -r ts-node/register scripts/init-db.ts
```

Or create tables manually with this SQL:

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS configs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  link TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5. Run Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

### 6. Login

Use the credentials from your `.env.local`:
- **Username**: `admin` (default)
- **Password**: `password` (default)

## Usage

### Dashboard Overview

After login, you'll see two main tabs:

#### 1. **Clash Config Editor**
- Full-featured Monaco Editor with YAML syntax highlighting
- Edit your Clash configuration in real-time
- Auto-save with success feedback
- Proper YAML formatting support

#### 2. **Subscription Management**
- **Store Subscription Link**: Enter your subscription link URL
- **Copy Link**: Copy the subscription link to clipboard
- **Open in Browser**: Directly open the subscription link in a new tab
- **Download YAML**: Download your Clash config as a YAML file
- **API Endpoint**: Access the YAML config at `/api/subscription/yaml` (served as inline content, not download)

## API Endpoints

### Authentication

- `POST /api/auth/login` - Login with username/password
  ```json
  {
    "username": "admin",
    "password": "password"
  }
  ```

- `POST /api/auth/logout` - Logout (clears auth_token cookie)
- `GET /api/auth/me` - Get current user info

### Configuration

- `GET /api/config` - Get current user's config
- `POST /api/config` - Save/update config
  ```json
  {
    "content": "yaml content here"
  }
  ```

### Subscription

- `GET /api/subscription` - Get subscription link
- `POST /api/subscription` - Save/update subscription link
  ```json
  {
    "link": "https://example.com/subscribe"
  }
  ```
- `GET /api/subscription/yaml` - Get config as YAML (inline, not download)
- `GET /api/subscription/download` - Download config as YAML file

## Project Structure

```
├── app/
│   ├── page.tsx                 # Login page
│   ├── dashboard/page.tsx       # Dashboard page
│   ├── layout.tsx               # Root layout
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   └── me/route.ts
│   │   ├── config/route.ts
│   │   └── subscription/
│   │       ├── route.ts
│   │       ├── yaml/route.ts
│   │       └── download/route.ts
├── components/
│   ├── login-form.tsx           # Login form component
│   ├── dashboard.tsx            # Main dashboard component
│   ├── yaml-editor.tsx          # Monaco editor wrapper
│   └── subscription-manager.tsx # Subscription management UI
├── lib/
│   ├── auth.ts                  # Authentication utilities
│   ├── session.ts               # JWT session management
│   └── db/
│       ├── client.ts            # Drizzle database client
│       └── schema.ts            # Database schema
├── middleware.ts                # Route protection middleware
├── drizzle.config.ts            # Drizzle ORM configuration
├── .env.example                 # Environment variables template
└── README.md                    # This file
```

## Security Considerations

1. **Change JWT_SECRET**: The default JWT secret should be changed in production
2. **Use HTTPS**: Always use HTTPS in production
3. **Strong Passwords**: Use strong credentials for ADMIN_USERNAME and ADMIN_PASSWORD
4. **Environment Variables**: Never commit `.env.local` to version control
5. **CORS**: Configure CORS properly for production deployments
6. **Database Connection**: Use secure database connections in production

## Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running
- Check DATABASE_URL is correct
- Verify database exists and user has permissions

### Login Issues
- Verify ADMIN_USERNAME and ADMIN_PASSWORD in `.env.local`
- Check that the user was created in the database
- Look at server console for error messages

### Monaco Editor Not Loading
- Clear browser cache
- Check that @monaco-editor/react is installed: `pnpm list @monaco-editor/react`
- Verify no console errors in browser DevTools

## Production Deployment

1. Build the application: `pnpm build`
2. Set production environment variables
3. Ensure database is initialized
4. Run production server: `pnpm start`
5. Configure reverse proxy (nginx/caddy) if needed
6. Set up SSL/TLS certificates
7. Configure proper CORS headers

## License

MIT
