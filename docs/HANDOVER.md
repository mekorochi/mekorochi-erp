# MEKOROCHI ERP — Final Handover

## What WORKS (Implemented & Tested)

### Authentication & Security
- First-run setup wizard (create owner, company settings, configuration)
- Secure login with bcrypt-hashed passwords and session cookies
- Role-based access control (Owner, Admin, Sales, Inventory, Production, Finance, Viewer)
- Server-side permission checks on every mutation
- Middleware-based route protection
- Audit event logging for sensitive operations
- Logout with session destruction

### Dashboard
- Real KPI cards (today's sales, pending orders, active leads, low stock)
- Recent orders feed
- Quick action buttons
- Responsive layout for desktop, tablet, and mobile

### Products & Catalog
- Full CRUD for products (raw materials, packaging, finished goods, bundles)
- Category management with hierarchy
- SKU, barcode, HSN code, tax rate, pricing tiers
- Bundle/box composition
- Product search, filter by type/category
- Desktop table + mobile card views

### Inventory Management
- Multiple warehouses (raw materials, packaging, finished goods, dispatch, quarantine)
- Stock item tracking per product per warehouse
- Lot/batch tracking with manufacture date, expiry, supplier lot
- Immutable stock movements (ledger)
- Stock adjustments with reason codes
- Stock transfers between warehouses
- Lot recall workflow
- FEFO picking strategy for perishable goods
- Low stock and expiry alerts
- Stock valuation

### Purchasing
- Supplier management (contacts, addresses, payment terms)
- Purchase order creation with line items
- PO approval workflow
- Goods receiving with partial receipt support
- Automatic lot creation and stock update on receipt
- Receipt history per PO

### Production / Manufacturing
- Bill of Materials (BOM) / Recipe management with versioning
- Ingredient lists with wastage percentages
- Production order lifecycle (Draft → Planned → In Progress → QC → Completed)
- Ingredient availability check
- Raw material consumption tracking
- Finished goods lot creation
- Lot traceability (raw lot → production → finished lot → orders → customers)
- Recall identification

### CRM / Leads
- Lead management with Kanban pipeline view
- Pipeline stages: New, Contacted, Qualified, Proposal Sent, Negotiation, Won, Lost
- Activity timeline (notes, calls, emails, follow-ups)
- Lead assignment to team members
- Lead-to-customer conversion
- WhatsApp click-to-chat, email links
- Source tracking, value estimation

### Customers
- Individual and corporate customer profiles
- Multiple addresses (billing/shipping)
- Multiple contacts per customer
- GSTIN for B2B customers
- Order and invoice history
- Credit terms

### Quotations
- Quotation creation with line items and pricing
- Corporate gifting support with multiple recipients
- Customization notes, validity dates
- Convert quotation to sales order (preserving price snapshot)
- Status workflow: Draft → Sent → Accepted → Converted

### Orders & Fulfillment
- Sales order creation and lifecycle
- Stock reservation on order confirmation
- Fulfillment/shipment tracking
- Partial fulfillment support
- Stock release on cancellation
- Gift recipients for corporate orders
- Order → Invoice linking

### Invoicing (GST-Ready)
- Tax invoice, proforma, credit note, debit note
- GST calculation: CGST+SGST (intra-state) or IGST (inter-state)
- HSN codes per line item
- Configurable tax rates (not hardcoded)
- Financial year-specific sequential numbering
- Invoice posting (immutable after post)
- Amount in words
- Billing and shipping addresses
- Void workflow with credit notes

### Payments
- Inbound and outbound payment recording
- Multiple methods: UPI, Cash, Bank Transfer, Card, Cheque
- Payment allocation to specific invoices
- Automatic invoice status update
- Order payment status tracking
- Refund support

### Expenses
- Categorized expense tracking (12 default categories)
- GST on expenses
- Approval workflow
- Recurring expense support
- Receipt upload placeholder
- Vendor and department tracking

### Reports
- Sales by product, channel, customer
- Order funnel analysis
- Inventory: stock on hand, low stock, expiring stock, valuation
- Financial: revenue/expenses, receivables aging, GST summary
- Lead pipeline, conversion rates, source performance
- CSV export capability

### Settings & Configuration
- Company profile (name, address, GSTIN, FSSAI, PAN)
- Bank/UPI details
- Tax settings and financial year
- Invoice/order/quote numbering prefixes
- SMTP configuration
- Integration settings (Shopify, WhatsApp, Amazon placeholders)

### Team Management
- User creation with role assignment
- Activate/deactivate users
- Password reset
- Permission preview by role

### Audit Log
- All sensitive operations logged with actor, action, entity, timestamp
- Before/after state for changes
- Filterable by entity type, user, action, date

### Notifications
- In-app notification system
- Mark read/unread
- Link to related records

### Infrastructure
- Docker Compose deployment (app, PostgreSQL, Caddy, backup)
- Automatic HTTPS via Caddy
- Daily automated PostgreSQL backups with 7-day retention
- Health check endpoint
- PWA manifest for installability
- Responsive 320px–1536px

## What Requires YOUR Input (Cannot Be Automated)

1. **Domain name and DNS** — Point A record to your VPS IP
2. **VPS access** — SSH credentials for deployment
3. **Company legal details** — Real GSTIN, PAN, FSSAI, CIN, bank account, registered address
4. **AUTH_SECRET** — Generate: `openssl rand -base64 32`
5. **DB_PASSWORD** — Strong production database password
6. **SMTP credentials** — For email sending (optional; PDFs downloadable without it)
7. **Shopify API credentials** — For store integration (optional)
8. **WhatsApp Business API** — Credentials from Meta (optional)

## What Remains OPTIONAL / Not Activated

- [ ] Shopify webhook integration (config UI exists, needs real credentials)
- [ ] WhatsApp Business API sending (manual click-to-chat works now)
- [ ] Email sending via SMTP (config page exists)
- [ ] E-invoice/IRN/e-way bill generation (requires GSP credentials)
- [ ] Barcode scanner integration (identifier fields ready)
- [ ] Courier/shipping API integration
- [ ] Amazon marketplace sync (CSV import ready)
- [ ] TOTP 2FA (schema ready, UI not implemented)
- [ ] PDF invoice download (print-friendly layout exists, proper PDF generation can be added)
- [ ] Image/receipt file upload to persistent storage
- [ ] Full offline PWA support (online-only with offline state display)

## How to Open Locally

```bash
# Prerequisites: Node.js 20+, PostgreSQL 16
cd mekorochi-erp
npm install --legacy-peer-deps
cp .env.example .env  # Edit DATABASE_URL
npx prisma migrate dev
npm run db:seed  # Optional demo data
npm run dev
# Open http://localhost:3000
```

## How to Deploy

See `docs/DEPLOYMENT.md` for complete production deployment instructions.

```bash
# Quick version:
ssh your-server
git clone <repo> /opt/mekorochi-erp
cd /opt/mekorochi-erp
cp .env.example .env.production  # Edit with real values
# Edit docker/Caddyfile with your domain
docker compose --env-file .env.production up -d --build
docker compose exec app npx prisma migrate deploy
```
