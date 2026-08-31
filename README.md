# Clustro.app

**Private Group Ledgers, Activities and Expense Settlement - Production-Ready Full-Stack Application**

A complete monorepo with a NestJS + PostgreSQL backend, React + TypeScript frontend, and Capacitor hybrid mobile app. Clustro.app enables families, friends, trip groups, and societies to track shared expenses, perform hierarchical debt minimization, and communicate in real-time.

---

## Architecture Overview

```
ClustroApp/
├── apps/
│   ├── api/            # NestJS + Prisma backend (TypeScript)
│   └── web/            # React + Vite + TailwindCSS frontend (TypeScript)
├── packages/
│   └── shared/         # @clustro/shared - shared TS types, enums, Zod schemas, money math
├── docker-compose.yml
└── README.md
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 10, TypeScript, Prisma ORM |
| Database | PostgreSQL 16 (clustro_db) |
| Auth | JWT Access + Refresh Tokens (HttpOnly cookies), bcrypt |
| Real-Time | Socket.io (NestJS WebSocket Gateway) |
| File Storage | Multer + Sharp WebP compression, local disk |
| Frontend | React 18, TypeScript, Vite 6, TailwindCSS |
| Fonts | Fraunces (display serif) + Inter (sans-serif) |
| Mobile | Capacitor 6 (iOS + Android hybrid) |
| API Docs | Swagger/OpenAPI at /api/docs |

---

## Quick Start (Local Development)

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ running locally
- npm 9+

### 1. Clone and Install

```bash
git clone <repo-url> ClustroApp
cd ClustroApp
npm install
```

### 2. Configure Environment

The API environment file is at `apps/api/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/clustro_db"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"
```

### 3. Initialize the Database

```bash
# Apply schema migrations
npx prisma db push --schema=apps/api/prisma/schema.prisma

# Seed with demo data (5 users, 4 diverse clusters, expenses, members)
npx ts-node apps/api/prisma/seed.ts
```

### 4. Start Development Servers

```bash
# Terminal 1: Start the NestJS API (http://localhost:3001)
npm run start:dev --workspace=apps/api

# Terminal 2: Start the React frontend (http://localhost:5173)
npm run dev --workspace=apps/web
```

Open **http://localhost:5173** in your browser.

---

## Demo Accounts (Pre-Seeded)

All demo accounts use password: `password123`

| Name | Username | Role in Demo Data |
|------|----------|------------------|
| Meera Sharma | meera | Owner of Sharma Ghar (family cluster) |
| Ramesh Sharma | ramesh | Head of family sub-group + Goa Trip member |
| Priya Patel | priya | Secretary - Sunrise Society Wing B |
| Aravind Rao | aravind | Goa Trip + Society member |
| Sneha Kulkarni | sneha | Host of Diwali Party 2025 (ended, settled) |

Click any name on the Landing Page for 1-click instant login.

---

## Feature Set

### Group Clusters
- Types: Family, Friends, Trip, Picnic, Party, Society, Village, Office, Sports, Club
- Lifecycle: Pending > Live > Settlement > Ended
- Invite Codes: 8-char unique code for joining clusters
- Date Management: Configurable start/end dates per cluster

### Members and Roles
- **Owner** - full cluster control
- **Head** - family/group head; debts of their dependents roll up to them
- **Member** - standard individual participant
- **Inherited** - dependents (children, elders) whose debts roll into their Head
- **Offline/Placeholder** members - not yet registered users

### Expenses
- Multi-way expense splits: Equal, Custom Amount, Percentage, Weighted Shares
- Receipt uploads with automatic WebP compression via Sharp
- Per-expense tagging to day activities
- Full audit log on every create/delete

### Settlement Engine (Hierarchical Min-Cash-Flow)
1. All `inherited` members paid/owed amounts are rolled up to their `head` parent
2. Net balance computed per effective participant
3. Min-Cash-Flow graph algorithm minimizes the number of transactions needed to fully settle

### Personal Ledger
- Cross-cluster financial dashboard (paid vs. owed vs. net)
- Category spend distribution chart
- Cluster-by-cluster history with recent expenses

### Real-Time Chat
- Socket.io cluster rooms
- REST chat history for persistence

### Trip Activities
- Day-by-day itinerary tracking
- Expense totals per activity day

### Export and Notifications
- CSV export per cluster
- In-app notification center with unread counters

---

## API Reference

All API endpoints are at `http://localhost:3001/api/v1/`.
Interactive Swagger docs: **http://localhost:3001/api/docs**

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register new user |
| POST | /auth/login | Login, returns JWT + sets refresh cookie |
| POST | /auth/refresh | Rotate refresh token |
| POST | /auth/logout | Invalidate refresh token |
| GET | /auth/me | Get current user profile |

### Clusters
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /clusters | List my clusters |
| POST | /clusters | Create cluster |
| POST | /clusters/join | Join by invite code |
| GET | /clusters/:id | Cluster detail + members |
| PATCH | /clusters/:id | Update cluster (name, dates, status) |

### Members
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /clusters/:id/members | List members |
| POST | /clusters/:id/members | Add member (registered or placeholder) |
| PATCH | /clusters/:id/members/:memberId | Update role / parentMemberId |
| POST | /clusters/:id/members/:memberId/claim | Claim offline placeholder |

### Expenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /clusters/:id/expenses | List expenses |
| POST | /clusters/:id/expenses | Create expense (multipart/form-data) |
| GET | /clusters/:id/expenses/:expenseId | Expense detail |
| DELETE | /clusters/:id/expenses/:expenseId | Delete expense |

### Settlement
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /clusters/:id/settlements/summary | Balances + minimal transactions |
| GET | /clusters/:id/settlements/payments | Payment history |
| POST | /clusters/:id/settlements/payments | Record a payment |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /ledger/dashboard | Personal cross-cluster summary |
| GET | /clusters/:id/activity | Audit log |
| GET, POST | /clusters/:id/activities | Trip day activities |
| GET, POST | /clusters/:id/chat/messages | Chat history / send |
| GET, PATCH | /notifications | Notifications + mark read |
| GET | /clusters/:id/export/csv | CSV export |
| GET | /storage/file/:key | Serve uploaded file |

---

## Database Schema

14 Prisma models in PostgreSQL:

- User
- ClusterMember (linked to User, or offline placeholder)
- Cluster
- Expense
- ExpenseSplit
- ExpenseAttachment
- SettlementPayment
- Activity
- ActivityLog
- ChatMessage
- Notification

Key design decisions:
- User and ClusterMember are separate entities - cluster members can be offline placeholders not linked to any user
- parentMemberId on ClusterMember enables hierarchical family rollup
- NUMERIC(14,2) for all money columns - no floating point in the database
- All PKs use UUID v4

---

## Testing

### Unit Tests (Settlement Engine)
```bash
npm run test --workspace=apps/api
```
Runs 6 Jest unit tests covering:
- Equal split math with paise-perfect remainder distribution
- Hierarchical parent rollup (inherited > head)
- Min-Cash-Flow graph transaction minimization
- 100% settlement detection

### Full-Stack Integration Tests
```bash
# Requires both API (port 3001) running
node test_integration.js
```
Covers: Login > Clusters > Add Expense > Settlement Calc > Record Payment > Chat > Ledger Dashboard > CSV Export

### E2E Tests (Playwright)
```bash
cd apps/web
npx playwright test
```

---

## Docker Deployment

```bash
# Build and run all services (Postgres + API + Web)
docker-compose up --build
```

Services:
- PostgreSQL on port 5432
- NestJS API on port 3001
- React Web (served via Nginx) on port 5173

After starting, run database migrations:
```bash
docker exec -it clustro-api npx prisma db push --schema=apps/api/prisma/schema.prisma
docker exec -it clustro-api npx ts-node apps/api/prisma/seed.ts
```

---

## Mobile App (Capacitor)

```bash
# 1. Build the web app
npm run build --workspace=apps/web

# 2. Add platform and sync
cd apps/web
npx cap add android   # or ios
npx cap sync

# 3. Open in Android Studio / Xcode
npx cap open android
```

Configure `apps/web/capacitor.config.ts` with your production API URL for deployed builds.

---

## Security

- Passwords hashed with bcrypt (cost factor 12)
- JWT access tokens (15min TTL) + HttpOnly refresh cookie (7d)
- Refresh token rotation - each use issues a new token pair
- All API endpoints behind JwtAuthGuard
- Cluster-level membership guard validates access before any cluster operation
- Receipt uploads validate MIME types and compress to WebP

---

## Key File Locations

| File | Purpose |
|------|---------|
| apps/api/prisma/schema.prisma | PostgreSQL database schema |
| apps/api/prisma/seed.ts | Demo data seed |
| apps/api/src/modules/settlements/settlement.service.ts | Min-Cash-Flow algorithm |
| packages/shared/src/money.ts | Precise integer-paise split math |
| apps/web/src/pages/ClusterScreen.tsx | Main cluster dashboard UI |
| apps/web/src/pages/HomeScreen.tsx | Cluster listing with tabs |
| apps/web/src/pages/LandingPage.tsx | Auth landing page |
| apps/web/tailwind.config.js | Brand color system (emerald-based) |
| test_integration.js | Full-stack API integration test |
