# MEKOROCHI ERP — Assumptions

## Business Assumptions
1. **Single company**: The ERP serves one company (Jay Veer Alliance Pvt Ltd / MEKOROCHI). Multi-tenancy is not required.
2. **Small team**: Initial deployment for 2–15 users. Schema supports growth but doesn't over-engineer for enterprise scale.
3. **Indian market primary**: Default currency INR, timezone Asia/Kolkata, GST tax system. International orders are possible but not the primary flow.
4. **No real company data in code**: All tax IDs, GSTIN, FSSAI, bank details, addresses, and prices are placeholder or user-configured. Demo seed data is clearly marked.
5. **Manual operations first**: All workflows must function without any third-party API. Integrations are optional enhancements.

## Technical Assumptions
1. **Node.js 20+** available on development and deployment machines.
2. **PostgreSQL 16** as the database (via Docker or direct install).
3. **No paid SaaS dependencies**: Everything runs on user-owned infrastructure.
4. **SMTP optional**: Email sending requires user-configured SMTP. Fallback is PDF download and manual sharing.
5. **Browser support**: Modern evergreen browsers (Chrome, Firefox, Safari, Edge). No IE11 support.
6. **Single server deployment**: Docker Compose on a single VPS. Horizontal scaling is not in initial scope.

## Financial Assumptions
1. **GST rates are configurable**, not hardcoded. The system doesn't determine applicable rates — that's the accountant's responsibility.
2. **Place of supply** determines CGST+SGST vs IGST. User selects/configures this per transaction.
3. **Financial year** is configurable (default April–March for India).
4. **This is not certified accounting software**. It provides operational records suitable for review by a qualified accountant.
5. **E-invoice/IRN/e-way bill** integrations are stubbed but not active without credentials and verification.

## Inventory Assumptions
1. **Weighted average cost** is the default stock valuation method. Configurable per implementation.
2. **FEFO** (First Expiry, First Out) is the default picking strategy for perishable goods.
3. **Negative stock is prevented** at the transaction level for sellable inventory.
4. **Units of measure**: grams, kilograms, pieces, boxes, liters. Conversion factors are configurable.
