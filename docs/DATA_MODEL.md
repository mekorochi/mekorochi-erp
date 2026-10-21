# MEKOROCHI ERP — Data Model

## Entity Relationship Overview

### Core Entities
- **User** — Authentication, role, permissions, audit trail
- **CompanySettings** — Singleton company configuration
- **CustomRole** — Custom permission sets beyond built-in roles

### Catalog
- **Category** — Hierarchical product categories (self-referencing)
- **Product** — All items: raw materials, packaging, finished goods, bundles
- **ProductVariant** — Size/flavor variants of a product
- **BundleItem** — Products that make up a bundle (e.g., gift box contents)

### Inventory
- **Warehouse** — Physical or logical stock locations (Raw, Packaging, FG, Dispatch, Quarantine)
- **StockItem** — Aggregate quantity per product per warehouse
- **StockLot** — Individual batch/lot with expiry, supplier, manufacture date
- **StockMovement** — Immutable ledger of every quantity change

### Purchasing
- **Supplier** — Vendor/supplier master
- **PurchaseOrder** — Purchase orders with approval workflow
- **PurchaseOrderItem** — Line items on a PO
- **GoodsReceipt** — Receiving records against a PO
- **GoodsReceiptItem** — Items received with lot information

### Production
- **BOM** — Bill of Materials / Recipe with versioning
- **BOMItem** — Ingredients and their quantities
- **ProductionOrder** — Manufacturing work orders
- **ProductionConsumption** — Planned vs actual ingredient usage

### CRM
- **Lead** — Sales leads with pipeline stages
- **LeadActivity** — Interaction history (calls, notes, emails, status changes)

### Customers
- **Customer** — Customer master (individual, corporate, wholesale, retail)
- **CustomerAddress** — Multiple billing/shipping addresses
- **CustomerContact** — Multiple contacts per customer

### Sales
- **Quotation** — Price quotes with validity
- **QuoteItem** — Quoted line items
- **QuoteRecipient** — Corporate gifting recipients
- **SalesOrder** — Confirmed orders
- **OrderItem** — Order line items with fulfillment tracking
- **OrderRecipient** — Gift recipients per order
- **Fulfillment** — Shipment/dispatch records
- **FulfillmentItem** — Items included in a shipment

### Finance
- **Invoice** — Tax invoices, proforma, credit notes, debit notes
- **InvoiceItem** — Line items with GST breakdowns (CGST/SGST/IGST)
- **Payment** — Inbound and outbound payments
- **PaymentAllocation** — Links payments to specific invoices
- **Expense** — Business expenses with approval workflow
- **ExpenseCategory** — Expense classification

### System
- **Session** — Active user sessions
- **AuditEvent** — Immutable audit trail
- **Notification** — User notifications
- **Task** — User tasks and reminders
- **SequenceCounter** — Auto-incrementing number generators
- **IntegrationConfig** — External integration settings
- **FileUpload** — Uploaded file metadata

## Key Relationships
```
Lead → Customer (1:1 optional)
Customer → Orders, Invoices, Payments (1:many)
Product → BOM → BOMItem → Product (recipe ingredients)
Product → BundleItem → Product (bundle composition)
PurchaseOrder → GoodsReceipt → StockMovement (purchasing flow)
ProductionOrder → BOM, ProductionConsumption → StockMovement (manufacturing flow)
Quotation → SalesOrder → Invoice → PaymentAllocation ← Payment (sales flow)
SalesOrder → Fulfillment → StockMovement (dispatch flow)
All mutations → AuditEvent (audit trail)
```

## Money Handling
- All monetary fields use `Decimal(12,2)` in PostgreSQL
- Application uses decimal.js for arithmetic
- Tax rates use `Decimal(5,2)`
- Unit costs use `Decimal(12,4)` for precision
- Quantities use `Decimal(12,3)` for fractional units (grams, kg)
