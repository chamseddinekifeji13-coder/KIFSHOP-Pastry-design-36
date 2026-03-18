# KIFSHOP Pastry - Architecture Documentation

## Overview

KIFSHOP est une plateforme SaaS complète de gestion pour patisseries, boulangeries et laboratoires en Tunisie. L'application est construite avec Next.js 16, React 19, TypeScript et Tailwind CSS v4.

**Stack Technologique:**
- **Framework:** Next.js 16 (App Router)
- **React:** 19.2 (latest)
- **TypeScript:** 5.x (strict mode enabled)
- **Styling:** Tailwind CSS v4 + PostCSS
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Storage:** Vercel Blob
- **Analytics:** Vercel Analytics
- **Deployment:** Vercel

## Project Structure

```
.
├── app/                          # Next.js App Router
│   ├── (dashboard)/             # Protected dashboard routes
│   │   ├── layout.tsx           # Dashboard layout with AppShell
│   │   ├── approvisionnement/   # Procurement management
│   │   ├── boutique/            # Shop/E-commerce
│   │   ├── campagnes/           # Marketing campaigns
│   │   ├── canaux/              # Sales channels
│   │   ├── cash-register/       # Cash drawer management
│   │   ├── cashier/             # Cashier operations
│   │   ├── clients/             # Customer management
│   │   ├── commandes/           # Orders
│   │   ├── dashboard/           # Main dashboard
│   │   ├── inventaire/          # Inventory management
│   │   ├── parametres/          # Settings
│   │   ├── performance/         # Performance metrics
│   │   ├── pos80/               # POS80 integration
│   │   ├── production/          # Production planning
│   │   ├── prospects/           # CRM prospects
│   │   ├── stocks/              # Stock management
│   │   ├── support/             # Support tickets
│   │   ├── treasury/            # Financial tracking
│   │   └── tresorerie/          # Treasury management
│   ├── (super-admin)/           # Super admin routes
│   │   ├── super-admin/
│   │   │   ├── articles/        # Product management
│   │   │   ├── crm/             # CRM management
│   │   │   ├── prospects/       # Prospect management
│   │   │   ├── settings/        # Platform settings
│   │   │   ├── subscriptions/   # Subscription management
│   │   │   ├── tenants/         # Tenant management
│   │   │   ├── tickets/         # Support tickets
│   │   │   └── users/           # User management
│   ├── auth/                    # Authentication pages
│   │   ├── callback/            # OAuth callback
│   │   ├── forgot-password/
│   │   ├── forgot-pin/
│   │   ├── login/
│   │   ├── reset-password/
│   │   └── sign-up/
│   ├── api/                     # API routes
│   │   ├── auth/                # Authentication endpoints
│   │   ├── treasury/            # Treasury operations
│   │   ├── pos80/               # POS80 integration
│   │   ├── cron/                # Scheduled tasks
│   │   ├── qz-tray/             # Printer integration
│   │   ├── demo-request/
│   │   ├── upload/              # File uploads
│   │   └── ...                  # Other API routes
│   ├── demo/                    # Demo page
│   ├── store/                   # Public store pages
│   ├── download/                # Download page
│   ├── globals.css              # Global styles (Tailwind v4)
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
├── components/                  # React components
│   ├── layout/                  # Layout components
│   │   ├── app-shell.tsx        # Main app shell
│   │   ├── app-sidebar.tsx      # Navigation sidebar
│   │   └── notification-bell.tsx
│   ├── auth/                    # Authentication components
│   ├── pwa/                     # PWA features
│   │   ├── service-worker-register.tsx
│   │   ├── install-prompt.tsx
│   │   └── offline-indicator.tsx
│   ├── route-guard.tsx          # Route protection
│   ├── lock-screen.tsx          # PIN lock screen
│   ├── change-pin-dialog.tsx    # PIN management
│   ├── approvisionnement/       # Procurement UI
│   ├── orders/                  # Order management UI
│   ├── stocks/                  # Stock management UI
│   ├── production/              # Production UI
│   ├── inventory/               # Inventory UI
│   ├── super-admin/             # Admin components
│   ├── landing/                 # Landing page sections
│   └── ...                      # Other feature components
├── lib/                         # Server-side utilities
│   ├── supabase/                # Supabase configuration
│   │   ├── server.ts            # Server client
│   │   ├── client.ts            # Client
│   │   └── middleware.ts        # Auth middleware
│   ├── active-profile.ts        # User session management
│   ├── tenant-context.tsx       # Tenant context provider
│   ├── cache-config.ts          # Cache configuration (NEW)
│   ├── performance-utils.ts     # Performance utilities (NEW)
│   ├── api-helpers.ts           # API response helpers
│   ├── super-admin/             # Super admin actions
│   │   ├── crm-actions.ts       # CRM operations
│   │   ├── actions.ts           # Admin actions
│   │   └── crm-types.ts         # CRM type definitions
│   ├── treasury/                # Financial operations
│   │   ├── cash-actions.ts
│   │   └── actions.ts
│   ├── inventory/               # Inventory operations
│   ├── stocks/                  # Stock operations
│   ├── orders/                  # Order operations
│   ├── production/              # Production operations
│   ├── clients/                 # Customer operations
│   ├── prospects/               # Prospect/CRM operations
│   ├── approvisionnement/       # Procurement operations
│   ├── channels/                # Sales channel operations
│   ├── pos80/                   # POS80 integration
│   ├── notifications/           # Notification system
│   ├── qz-tray-service.ts      # Printer service
│   └── ...                      # Other utilities
├── types/                       # TypeScript types
├── public/                      # Static assets
│   ├── icons/                   # App icons
│   ├── manifest.json            # PWA manifest
│   ├── sw.js                    # Service worker
│   └── ...                      # Other assets
├── scripts/                     # Utility scripts
├── next.config.mjs              # Next.js configuration
├── tailwind.config.js           # Tailwind configuration
├── postcss.config.mjs           # PostCSS configuration
├── tsconfig.json                # TypeScript configuration
└── package.json                 # Dependencies

```

## Key Features

### 1. Multi-Tenant Architecture
- Complete tenant isolation using Supabase RLS
- Role-based access control (RBAC)
- Separate super-admin interface

### 2. Product Management
- Raw materials management
- Packaging management
- Recipe costing
- Consumables tracking

### 3. Sales & Orders
- Multi-channel sales (direct, online, delivery)
- Order management with status tracking
- Quick orders interface
- POS integration (POS80)

### 4. Inventory Management
- Stock tracking
- Inventory audits
- Stock history and analytics
- Automatic stock calculations

### 5. Production Planning
- Production scheduling
- Recipe management
- Ingredient allocation
- Production cost tracking

### 6. Financial Management
- Treasury tracking
- Cash register management
- Sales analytics
- Revenue tracking
- Receipt printing (ESC-POS)

### 7. Procurement
- Supplier management
- Purchase orders
- Delivery notes
- Invoice management

### 8. CRM
- Prospect management
- Interaction tracking
- Reminders and follow-ups
- Quote generation
- Activity logging

### 9. PWA Features
- Offline functionality
- Install prompt
- Service worker support
- Web app manifest

### 10. POS80 Integration
- Real-time sync
- Transaction monitoring
- Configuration management
- Health checks

## Architecture Patterns

### Authentication & Sessions
```
┌─────────────┐
│  Supabase   │
│    Auth     │
└──────┬──────┘
       │
┌──────▼──────────┐
│ Active Profile  │  (lib/active-profile.ts)
│  (Session Mgmt) │
└──────┬──────────┘
       │
┌──────▼──────────────┐
│ Tenant Context      │  (lib/tenant-context.tsx)
│ (Multi-tenant Data) │
└─────────────────────┘
```

### Data Flow
```
┌─────────────────────────────────────────┐
│         React Components (Client)        │
└────────────┬────────────────────────────┘
             │ (useCallback, SWR)
┌────────────▼────────────────────────────┐
│      Server Components & Actions         │
│   (lib/**/*-actions.ts)                  │
└────────────┬────────────────────────────┘
             │ (RLS + Type Safety)
┌────────────▼────────────────────────────┐
│        Supabase Client                   │
│     (PostgreSQL + RLS Policies)         │
└─────────────────────────────────────────┘
```

### Caching Strategy
- **Real-time data:** No caching (revalidate: 0)
- **Frequent access:** 60 seconds
- **Moderate changes:** 300 seconds (5 min)
- **Stable data:** 3600 seconds (1 hour)
- **Static content:** 86400 seconds (1 day)

See `lib/cache-config.ts` for detailed cache configuration.

## Performance Optimizations

### Code Changes
1. **TypeScript Strictness:** Enabled `strict: true` in tsconfig.json
2. **Type Safety:** Added path aliases for better imports
3. **Error Handling:** Disabled `ignoreBuildErrors: true` for better error detection
4. **Build Optimization:** Enabled SWC minification and compression

### New Utilities
1. **Cache Configuration** (`lib/cache-config.ts`)
   - Predefined cache durations
   - Cache tags for data invalidation
   - Revalidation profiles
   - Cache key builder

2. **Performance Utils** (`lib/performance-utils.ts`)
   - Lazy component loading
   - Async boundary component
   - Memoized list rendering
   - Performance measurement helpers
   - Image optimization utilities

### Next.js 16 Features Used
- Route handlers with cache directives
- Server Components by default
- Dynamic rendering with caching
- Image optimization
- Automatic code splitting

## Database Schema Overview

### Core Tables
- `auth.users` - Supabase auth users
- `tenants` - Multi-tenant organizations
- `profiles` - User profiles with roles
- `articles` - Products/SKUs

### Sales & Orders
- `orders` - Customer orders
- `order_items` - Order line items
- `channels` - Sales channels
- `categories` - Product categories

### Inventory
- `stocks` - Stock levels
- `inventory_history` - Stock movements
- `raw_materials` - Raw materials
- `packaging` - Packaging items

### Production
- `recipes` - Production recipes
- `recipe_items` - Recipe ingredients
- `production_plans` - Production schedules

### CRM
- `crm_prospects` - Potential customers
- `crm_interactions` - Customer interactions
- `crm_reminders` - Follow-up reminders
- `crm_quotes` - Price quotes
- `crm_activity_log` - Activity history

### Financial
- `treasury_entries` - Financial transactions
- `cash_register_sessions` - Cash drawer sessions
- `sales_transactions` - POS sales

### Procurement
- `suppliers` - Supplier information
- `purchase_orders` - Purchase orders
- `delivery_notes` - Delivery tracking
- `purchase_invoices` - Invoice records

## API Endpoints

### Authentication
- `GET /api/auth/callback` - OAuth callback
- `POST /api/auth/request-pin-reset` - PIN reset request
- `POST /api/auth/verify-pin-reset-otp` - Verify PIN reset OTP

### Orders & Sales
- `POST /api/quick-order` - Create quick order
- `POST /api/treasury/pos-sale` - Record POS sale
- `GET /api/treasury/cashier-stats` - Get cashier statistics

### Printing
- `POST /api/treasury/esc-pos` - ESC-POS printer commands
- `POST /api/qz-tray/sign` - QZ Tray signing
- `GET /api/qz-tray/certificate` - QZ Tray certificate

### Integration
- `GET /api/pos80/status` - POS80 status
- `POST /api/pos80/sync` - Sync POS80 data
- `GET /api/pos80/sync/status` - Sync status

### System
- `GET /api/health` - Health check
- `GET /api/session` - Session info
- `GET /api/active-profile` - Active profile info

## Best Practices

### Code Organization
- Keep components focused and reusable
- Use server components by default
- Move data fetching to server actions
- Use TypeScript for type safety

### Performance
- Implement proper caching strategies
- Use lazy loading for heavy components
- Optimize images with Next.js Image
- Monitor Core Web Vitals

### Security
- Use RLS policies for data isolation
- Validate all inputs server-side
- Use environment variables for secrets
- Implement proper authentication checks

### Development
- Use TypeScript strict mode
- Follow ESLint rules
- Write meaningful commit messages
- Document complex logic

## Configuration Files

### next.config.mjs
- SWC minification enabled
- Source maps disabled in production
- Remote image patterns configured
- CSP headers for security

### tsconfig.json
- Target: ES2020
- Strict mode enabled
- Path aliases configured
- Unused variable detection enabled

### tailwind.config.js
- Tailwind v4 with PostCSS
- Custom color theme (luxury palette)
- Dark mode support
- Sidebar theming

### postcss.config.mjs
- Tailwind v4 support
- Automatic CSS optimization

## Development Workflow

1. **Setup**
   ```bash
   npm install
   npm run dev
   ```

2. **Type Checking**
   ```bash
   npm run type-check
   ```

3. **Build**
   ```bash
   npm run build
   ```

4. **Deployment**
   - Push to main branch
   - Vercel automatically deploys

## Monitoring & Analytics

- Vercel Analytics for performance tracking
- Error tracking and logging
- Health check endpoints
- Performance measurement utilities

## Future Improvements

- [ ] Implement GraphQL API layer
- [ ] Add automated testing suite
- [ ] Enhance error tracking
- [ ] Add performance monitoring dashboard
- [ ] Implement feature flags
- [ ] Add A/B testing capabilities

---

**Last Updated:** 2024
**Version:** 1.0
