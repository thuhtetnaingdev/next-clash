# Clash Subscription Manager - Features

## Core Features

### 1. Authentication System ✅
- **Login Page**: Clean, responsive login interface
- **Username/Password Auth**: Credentials from environment variables
- **Automatic User Creation**: First login creates user record in database
- **JWT Sessions**: Secure token-based sessions with HTTP-only cookies
- **Session Persistence**: Stay logged in across browser sessions (7-day expiry)
- **Logout**: Clear session and return to login page
- **Protected Routes**: Dashboard and APIs require valid authentication

### 2. Clash Config Editor ✅
- **Monaco Editor Integration**: Professional code editor with:
  - Full YAML syntax highlighting
  - Code formatting support
  - Dark theme for comfortable editing
  - Line numbers and code folding
  - Responsive sizing
  - Smart indentation
  
- **Real-time Editing**: Make changes instantly without page reload
- **Save Functionality**: Store configurations in PostgreSQL database
- **User-Specific Configs**: Each user has their own isolated configuration
- **Save Status Feedback**: Visual confirmation of successful saves
- **Auto-formatting**: Proper YAML syntax support

### 3. Subscription Management ✅
- **Store Subscription Links**: Save your subscription URL
- **Link Actions**:
  - **Copy to Clipboard**: One-click copy with visual feedback
  - **Open in Browser**: Launch subscription link in new tab
  - **Download YAML**: Download config as `.yaml` file
  
- **API Endpoints**:
  - `/api/subscription/yaml` - Get YAML content (inline, not download)
  - `/api/subscription/download` - Download YAML file
  - `/api/subscription` - Manage subscription link via API

### 4. Data Persistence ✅
- **PostgreSQL Database**: Reliable data storage
- **Drizzle ORM**: Type-safe database operations
- **Schema**:
  - **users**: Username, hashed password, timestamps
  - **configs**: User ID, YAML content, update timestamps
  - **subscriptions**: User ID, subscription link, timestamps
  
- **Automatic Table Creation**: Tables created on first login
- **User Isolation**: Each user only sees their own data

### 5. Security Features ✅
- **Password Hashing**: bcrypt for secure password storage
- **JWT Authentication**: Stateless session management
- **HTTP-Only Cookies**: Protect against XSS attacks
- **CORS Protection**: API security headers
- **Middleware Protection**: Route-level access control
- **Environment Variables**: Sensitive data not hardcoded
- **Database Security**: No direct SQL injection vulnerabilities

### 6. User Interface ✅
- **Responsive Design**: Works on desktop, tablet, mobile
- **Tab Navigation**: Easy switching between editor and subscription
- **Header**: Shows logged-in user and logout button
- **Clean Layout**: Organized, intuitive interface
- **Loading States**: Visual feedback during operations
- **Success Messages**: Confirmation of saved changes
- **Error Handling**: User-friendly error messages

### 7. API Architecture ✅
- **RESTful Design**: Standard HTTP methods
- **JSON Responses**: Standard format for all endpoints
- **Error Handling**: Consistent error messages
- **Authentication Headers**: Token-based API access
- **CORS Ready**: Can be accessed from web clients

## Technical Implementation

### Frontend Technologies
- **React 19**: Latest React features
- **Next.js 16**: Full-stack framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Accessible UI components
- **Monaco Editor**: Professional code editor
- **Lucide React**: Modern icons

### Backend Technologies
- **Next.js API Routes**: Serverless backend functions
- **PostgreSQL**: Production-grade database
- **Drizzle ORM**: Type-safe database queries
- **Jose**: JWT token management
- **bcryptjs**: Password hashing
- **Node.js**: Runtime environment

### Database Schema
```
users
├── id (PRIMARY KEY)
├── username (UNIQUE)
├── password (hashed)
└── created_at

configs
├── id (PRIMARY KEY)
├── user_id (FOREIGN KEY)
├── content (YAML text)
└── updated_at

subscriptions
├── id (PRIMARY KEY)
├── user_id (FOREIGN KEY)
├── link (subscription URL)
├── created_at
└── updated_at
```

## API Endpoints Reference

### Authentication
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | Login and get session |
| POST | `/api/auth/logout` | Logout and clear session |
| GET | `/api/auth/me` | Get current user info |

### Configuration
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/config` | Fetch user's config |
| POST | `/api/config` | Save/update config |

### Subscription
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/subscription` | Get subscription link |
| POST | `/api/subscription` | Save/update subscription link |
| GET | `/api/subscription/yaml` | Get config as YAML (inline) |
| GET | `/api/subscription/download` | Download config as YAML file |

## Configuration Options

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `ADMIN_USERNAME`: Admin login username
- `ADMIN_PASSWORD`: Admin login password
- `JWT_SECRET`: Secret key for JWT signing
- `NODE_ENV`: Environment (development/production)

### Monaco Editor Options
- Language: YAML
- Theme: vs-dark
- Font Size: 14px
- Word Wrap: Enabled
- Minimap: Disabled

## User Workflows

### First Time Setup
1. User arrives at login page
2. Enters credentials (from .env)
3. System creates user in database
4. JWT token generated and stored
5. Redirected to dashboard
6. Empty config and subscription initialized

### Editing Clash Config
1. Navigate to "Clash Config Editor" tab
2. Edit YAML in Monaco Editor
3. Click "Save Config"
4. Success message appears
5. Config stored in database

### Managing Subscription
1. Navigate to "Subscription" tab
2. Enter subscription link URL
3. Click "Save Link"
4. Choose action:
   - **Copy**: Use link elsewhere
   - **Open**: Test subscription in browser
   - **Download**: Get YAML file locally

### Exporting Config
1. Go to Subscription tab
2. Ensure subscription link is saved
3. Click "Download YAML" button
4. Config file downloaded as `clash-config.yaml`
5. Import into Clash client

## Performance Features
- **Fast Load Times**: Optimized Next.js build
- **Code Splitting**: Lazy loading of routes
- **Asset Optimization**: Compressed static files
- **Database Indexing**: Fast queries on user_id
- **Efficient Rendering**: React optimization
- **Caching**: Static file caching

## Accessibility Features
- **Semantic HTML**: Proper heading hierarchy
- **ARIA Labels**: Screen reader support
- **Keyboard Navigation**: Tab through UI elements
- **Contrast**: Readable text/background colors
- **Button Labels**: Clear action descriptions
- **Error Messages**: User-friendly feedback

## Future Enhancement Ideas
- Multi-user support with proper permissions
- Config history/versioning
- Cloud backup functionality
- Scheduled sync with subscription
- Config templates
- Import/export multiple configs
- Config validation
- Profile settings
- 2FA authentication
- Rate limiting on APIs
- WebSocket for real-time sync

## Testing Checklist
- [x] Login with correct credentials
- [x] Login with incorrect credentials shows error
- [x] Logout clears session
- [x] Protected routes redirect to login
- [x] Config saves and persists
- [x] Subscription link saves and persists
- [x] YAML download works
- [x] Copy button copies to clipboard
- [x] Open in browser opens new tab
- [x] Monaco editor provides syntax highlighting
- [x] User isolation (user A can't see user B's data)
- [x] Database tables created on startup
- [x] Build completes without errors

## Known Limitations
- Single admin user (can be extended for multiple users)
- Basic authentication (no 2FA)
- No config versioning/history
- No real-time sync
- No email verification
- No password reset functionality
- No profile customization
