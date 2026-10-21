# MEKOROCHI ERP - Project Guide

## Overview
MEKOROCHI ERP is a self-hosted, mobile-first ERP web application for a premium bean-to-bar chocolate maker based in Ahmedabad, India. Legal entity: Jay Veer Alliance Private Limited.

## Tech Stack
- **Framework**: Next.js 15 (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui + Playfair Display + Montserrat
- **Database**: PostgreSQL 16 + Prisma ORM
- **Auth**: NextAuth.js v5 with credentials provider
- **Validation**: Zod + React Hook Form
- **PDF**: @react-pdf/renderer
- **Deployment**: Docker Compose + Caddy reverse proxy
- **Testing**: Vitest + Playwright

## Project Structure
```
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── (auth)/           # Login, setup, password reset
│   │   ├── (dashboard)/      # Authenticated app shell
│   │   │   ├── dashboard/
│   │   │   ├── leads/
│   │   │   ├── customers/
│   │   │   ├── products/
│   │   │   ├── inventory/
│   │   │   ├── purchasing/
│   │   │   ├── production/
│   │   │   ├── orders/
│   │   │   ├── quotations/
│   │   │   ├── invoices/
│   │   │   ├── payments/
│   │   │   ├── expenses/
│   │   │   ├── reports/
│   │   │   ├── team/
│   │   │   ├── settings/
│   │   │   └── audit/
│   │   └── api/              # API routes
│   ├── components/           # Shared UI components
│   │   ├── ui/               # shadcn/ui primitives
│   │   ├── layout/           # Shell, sidebar, nav
│   │   └── shared/           # Business components
│   ├── lib/                  # Server utilities
│   │   ├── auth/             # Auth config, session
│   │   ├── db/               # Prisma client, helpers
│   │   ├── services/         # Business logic layer
│   │   ├── validators/       # Zod schemas
│   │   └── utils/            # Formatting, calculations
│   ├── hooks/                # React hooks
│   └── types/                # TypeScript types
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/brand/             # Logo assets
├── docker/                   # Docker configs
├── docs/                     # Documentation
└── tests/                    # Test suites
```

## Brand Design Tokens
- Primary: Deep Cacao `#3E2723`
- Background: Warm Cream `#F5F5DC`
- Secondary: Kerala Sage `#8F9779`
- Accent: Champagne Gold `#D4AF37`
- Labels: Sage Deep `#4F5A3C`, Gold Deep `#7D6119`
- Headings font: Playfair Display (selective)
- Body font: Montserrat

## Key Rules
1. All money uses Decimal type in DB, never floating point
2. Every stock change creates an immutable StockMovement record
3. Server-side permission checks on every mutation and query
4. Invoices are immutable once posted; use credit notes for corrections
5. Audit events for all sensitive operations
6. No hardcoded tax rates, legal numbers, or prices
7. Indian locale: INR, Asia/Kolkata, dd/MM/yyyy dates
8. FEFO for lot picking (First Expiry, First Out)
9. Order status and payment status tracked separately
10. No secrets in source control; use .env files

## Commands
- `npm run dev` — Start development server
- `npm run build` — Production build
- `npx prisma migrate dev` — Run migrations
- `npx prisma db seed` — Seed demo data
- `npm test` — Run unit tests
- `npm run test:e2e` — Run Playwright E2E tests
- `docker compose up` — Start all services
