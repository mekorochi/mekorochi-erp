# MEKOROCHI ERP — Implementation Plan

## Phase A: Foundation (Architecture & Planning)
- [x] Inspect workspace and brand assets
- [x] Create CLAUDE.md, planning docs
- [ ] Initialize Next.js + TypeScript + Tailwind
- [ ] Set up Prisma schema (complete data model)
- [ ] Design token system and brand configuration
- [ ] RBAC matrix definition

## Phase B: Auth, Shell & Design System
- [ ] NextAuth.js credentials auth with bcrypt
- [ ] First-run admin onboarding wizard
- [ ] Role-based permission system (server-side)
- [ ] App shell: sidebar, topbar, mobile nav
- [ ] Design system: tokens, typography, components
- [ ] Dashboard layout with real data queries

## Phase C: Catalog, Inventory & Purchasing
- [ ] Product/SKU master with variants, bundles
- [ ] Category management, HSN codes
- [ ] Warehouse/stock location management
- [ ] Stock ledger with immutable movements
- [ ] Lot/batch tracking with expiry dates
- [ ] Purchase orders and supplier management
- [ ] Goods receipt and stock receiving
- [ ] Stock reports and alerts

## Phase D: Production & Manufacturing
- [ ] Recipe/BOM with versioning
- [ ] Production work orders and lifecycle
- [ ] Ingredient reservation and consumption
- [ ] Finished goods lot creation
- [ ] QC checks and lot release
- [ ] Box/hamper assembly from components
- [ ] Traceability: lot-to-customer chain
- [ ] Production reports and batch labels

## Phase E: CRM & Quotations
- [ ] Lead management with Kanban pipeline
- [ ] Customer and contact management
- [ ] Follow-ups, tasks, reminders
- [ ] Quotation builder with PDF generation
- [ ] Corporate gifting multi-recipient flow
- [ ] Lead-to-customer conversion
- [ ] Import/deduplication

## Phase F: Orders & Fulfillment
- [ ] Sales order creation and lifecycle
- [ ] Stock allocation and reservation
- [ ] Packing, dispatch, shipment tracking
- [ ] Partial shipments and returns
- [ ] Order-linked inventory transactions
- [ ] Pick/pack lists and labels

## Phase G: Invoicing, Payments & Finance
- [ ] Invoice profile and numbering
- [ ] GST-ready tax invoices (CGST/SGST/IGST)
- [ ] Credit notes and debit notes
- [ ] PDF invoice generation (A4, branded)
- [ ] Payment recording and allocation
- [ ] Receivables and payables tracking
- [ ] Expense management with approvals
- [ ] Financial reports and GST summaries

## Phase H: Reports, Settings & Integrations
- [ ] Comprehensive reporting module
- [ ] Company settings and configuration
- [ ] Notification system
- [ ] Audit log viewer
- [ ] Import/export wizards
- [ ] Shopify integration adapter (config only)
- [ ] CSV import for leads, products, stock

## Phase I: Polish & Testing
- [ ] Responsive UI audit (320px–1536px)
- [ ] Accessibility audit (WCAG AA)
- [ ] Unit tests for business logic
- [ ] Integration tests for transactions
- [ ] E2E tests for critical flows
- [ ] Performance optimization
- [ ] PWA manifest

## Phase J: Deployment & Handover
- [ ] Dockerfile and docker-compose.yml
- [ ] Caddy reverse proxy configuration
- [ ] Backup/restore scripts
- [ ] Production documentation
- [ ] Security hardening
- [ ] Final acceptance testing
- [ ] Handover document

## Acceptance Scenario
Full flow: create supplier → purchase ingredients → define recipe → produce batch → assemble gift box → receive lead → convert to customer/quote → confirm order → allocate stock → pack/dispatch → issue GST invoice → record payment → record expense → verify reports → test recall traceability → verify role restrictions.
