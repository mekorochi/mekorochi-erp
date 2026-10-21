# MEKOROCHI ERP — Technical Decisions

## D001: Next.js 15 App Router
**Decision**: Use Next.js 15 with App Router, Server Components, and Server Actions.
**Rationale**: Modern React patterns, excellent TypeScript support, built-in API routes, good self-hosting support. App Router provides layouts, loading states, and streaming.

## D002: PostgreSQL + Prisma
**Decision**: PostgreSQL 16 as primary database with Prisma ORM.
**Rationale**: ACID transactions essential for financial/inventory operations. Prisma provides type-safe queries, migrations, and excellent DX. Decimal type support for money fields.

## D003: shadcn/ui + Tailwind CSS
**Decision**: Use shadcn/ui component library with Tailwind CSS.
**Rationale**: Not a dependency — components are copied into the project. Full control over styling, accessible by default (Radix primitives), consistent with MEKOROCHI brand tokens.

## D004: NextAuth.js v5 (Auth.js)
**Decision**: Use NextAuth.js v5 with credentials provider.
**Rationale**: Mature auth solution with session management, CSRF protection, and middleware support. Credentials provider for self-hosted username/password auth without external OAuth dependency.

## D005: Monolith Architecture
**Decision**: Single Next.js application with modular service layer.
**Rationale**: Appropriate for team size and complexity. Easier to deploy, test, and maintain. Clear module boundaries allow future extraction if needed.

## D006: Decimal for Money
**Decision**: Use Prisma Decimal type (maps to PostgreSQL NUMERIC) for all monetary values. Use string-based arithmetic in application code via decimal.js.
**Rationale**: Binary floating-point causes rounding errors in financial calculations. Decimal type preserves exact values.

## D007: Immutable Financial Records
**Decision**: Posted invoices, stock movements, and payment records are never deleted or modified. Corrections use credit notes, reversal movements, and refund records.
**Rationale**: Audit trail integrity and compliance requirements.

## D008: Docker + Caddy Deployment
**Decision**: Docker Compose with Caddy reverse proxy for production.
**Rationale**: Caddy provides automatic HTTPS. Docker ensures reproducible deployments. Single-VPS friendly.

## D009: Server Actions for Mutations
**Decision**: Use Next.js Server Actions for form submissions and mutations. API routes for webhooks and external integrations.
**Rationale**: Type-safe end-to-end, automatic CSRF protection, progressive enhancement.

## D010: File Storage
**Decision**: Local filesystem with configurable path (docker volume). S3-compatible adapter available but not required.
**Rationale**: Self-hosted priority. Local storage is simplest. Volume mount ensures persistence and backup inclusion.
