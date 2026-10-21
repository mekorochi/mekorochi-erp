# MEKOROCHI ERP — User Guide

## Getting Started

### First-Time Setup
1. Open the ERP URL in your browser
2. You'll be guided through the setup wizard:
   - **Step 1**: Create your owner account (name, email, password)
   - **Step 2**: Enter company details (name, address, GSTIN, etc.)
   - **Step 3**: Configure financial year, currency, timezone
3. After setup, you'll be taken to the dashboard

### Logging In
- Go to the login page and enter your email and password
- If you forget your password, contact your admin for a reset

### Navigation
- **Desktop**: Use the left sidebar to navigate between modules
- **Tablet**: Tap the menu icon to expand/collapse the sidebar
- **Phone**: Use the bottom navigation bar; tap "More" for additional options

## Daily Workflows

### Managing Leads (Sales Team)
1. Go to **Leads** from the navigation
2. View leads in Kanban board (drag between stages) or table view
3. Click **+ Add Lead** to create a new lead
4. Click a lead to view details, add notes, log calls
5. Use **Convert to Customer** when a lead is qualified
6. Create a quotation directly from a lead

### Creating Orders
1. Go to **Orders** → **+ New Order**
2. Select a customer (or create one inline)
3. Add products with quantities and prices
4. Add shipping details and any gift notes
5. Save as draft, then **Confirm** to reserve inventory
6. Process through: Preparing → Packed → Shipped → Delivered

### Managing Inventory
1. Go to **Inventory** to see stock levels
2. Use **Adjust Stock** for manual corrections (with reason)
3. Use **Transfer** to move stock between warehouses
4. Check **Lots** tab for batch/expiry tracking
5. Low stock and expiring items show alerts on the dashboard

### Purchasing
1. Go to **Purchasing** → **+ New PO**
2. Select supplier and add items with quantities and prices
3. Submit for approval (if required by your role)
4. When goods arrive, record a **Goods Receipt**
5. Stock is automatically updated upon receipt

### Production (Manufacturing)
1. Create a **Recipe** (Bill of Materials) for each product
2. Go to **Production** → **+ New Production Order**
3. Select recipe, enter planned quantity
4. System checks ingredient availability
5. Start production → Record actual consumption → Complete
6. Finished goods lot is created automatically

### Invoicing
1. Go to **Invoices** → **+ New Invoice**
2. Link to an order (auto-fills items) or create standalone
3. Set place of supply for correct GST (intra/inter-state)
4. Review CGST/SGST or IGST calculations
5. **Post** the invoice to make it final
6. Download PDF to share with customer

### Recording Payments
1. Go to **Payments** → **+ Record Payment**
2. Select customer and amount
3. Choose payment method (UPI, Cash, Bank Transfer, etc.)
4. Allocate to specific invoices
5. Order payment status updates automatically

### Expenses
1. Go to **Expenses** → **+ Add Expense**
2. Select category, enter amount and details
3. Upload receipt photo (especially from mobile)
4. Submit for approval if above threshold

## Tips for Mobile Users
- Use the bottom navigation for quick access
- Swipe or scroll tables horizontally for more columns
- Use the search bar for quick item lookup
- Tap the **+** button for quick create actions
- Receipt photos can be taken directly from the camera

## Roles & Permissions
| Role | Access |
|------|--------|
| Owner | Full access to all modules |
| Admin | Full access except role management |
| Sales | Leads, customers, quotes, orders, basic payments |
| Inventory | Products, stock, purchasing, receiving |
| Production | Manufacturing, recipes, QC, stock view |
| Finance | Invoices, payments, expenses, reports |
| Viewer | Read-only access to all modules |
