import { UserRole } from "@prisma/client";

export type Permission =
  | "dashboard:view"
  | "leads:view" | "leads:create" | "leads:edit" | "leads:delete" | "leads:assign"
  | "customers:view" | "customers:create" | "customers:edit" | "customers:delete" | "customers:export"
  | "products:view" | "products:create" | "products:edit" | "products:delete"
  | "inventory:view" | "inventory:adjust" | "inventory:transfer" | "inventory:approve_adjustment"
  | "purchasing:view" | "purchasing:create" | "purchasing:approve" | "purchasing:receive"
  | "production:view" | "production:create" | "production:manage" | "production:qc"
  | "orders:view" | "orders:create" | "orders:edit" | "orders:cancel" | "orders:fulfill"
  | "quotations:view" | "quotations:create" | "quotations:edit" | "quotations:approve"
  | "invoices:view" | "invoices:create" | "invoices:void" | "invoices:export"
  | "payments:view" | "payments:create" | "payments:refund"
  | "expenses:view" | "expenses:create" | "expenses:edit" | "expenses:approve" | "expenses:export"
  | "reports:view" | "reports:export" | "reports:financial"
  | "team:view" | "team:manage" | "team:roles"
  | "settings:view" | "settings:manage"
  | "audit:view"
  | "integrations:view" | "integrations:manage"
  | "imports:manage";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OWNER: [
    "dashboard:view",
    "leads:view", "leads:create", "leads:edit", "leads:delete", "leads:assign",
    "customers:view", "customers:create", "customers:edit", "customers:delete", "customers:export",
    "products:view", "products:create", "products:edit", "products:delete",
    "inventory:view", "inventory:adjust", "inventory:transfer", "inventory:approve_adjustment",
    "purchasing:view", "purchasing:create", "purchasing:approve", "purchasing:receive",
    "production:view", "production:create", "production:manage", "production:qc",
    "orders:view", "orders:create", "orders:edit", "orders:cancel", "orders:fulfill",
    "quotations:view", "quotations:create", "quotations:edit", "quotations:approve",
    "invoices:view", "invoices:create", "invoices:void", "invoices:export",
    "payments:view", "payments:create", "payments:refund",
    "expenses:view", "expenses:create", "expenses:edit", "expenses:approve", "expenses:export",
    "reports:view", "reports:export", "reports:financial",
    "team:view", "team:manage", "team:roles",
    "settings:view", "settings:manage",
    "audit:view",
    "integrations:view", "integrations:manage",
    "imports:manage",
  ],
  ADMIN: [
    "dashboard:view",
    "leads:view", "leads:create", "leads:edit", "leads:delete", "leads:assign",
    "customers:view", "customers:create", "customers:edit", "customers:export",
    "products:view", "products:create", "products:edit", "products:delete",
    "inventory:view", "inventory:adjust", "inventory:transfer", "inventory:approve_adjustment",
    "purchasing:view", "purchasing:create", "purchasing:approve", "purchasing:receive",
    "production:view", "production:create", "production:manage", "production:qc",
    "orders:view", "orders:create", "orders:edit", "orders:cancel", "orders:fulfill",
    "quotations:view", "quotations:create", "quotations:edit", "quotations:approve",
    "invoices:view", "invoices:create", "invoices:void", "invoices:export",
    "payments:view", "payments:create", "payments:refund",
    "expenses:view", "expenses:create", "expenses:edit", "expenses:approve", "expenses:export",
    "reports:view", "reports:export", "reports:financial",
    "team:view", "team:manage",
    "settings:view", "settings:manage",
    "audit:view",
    "integrations:view", "integrations:manage",
    "imports:manage",
  ],
  SALES: [
    "dashboard:view",
    "leads:view", "leads:create", "leads:edit", "leads:assign",
    "customers:view", "customers:create", "customers:edit",
    "products:view",
    "inventory:view",
    "orders:view", "orders:create", "orders:edit",
    "quotations:view", "quotations:create", "quotations:edit",
    "invoices:view",
    "payments:view", "payments:create",
    "reports:view",
  ],
  INVENTORY: [
    "dashboard:view",
    "products:view", "products:create", "products:edit",
    "inventory:view", "inventory:adjust", "inventory:transfer",
    "purchasing:view", "purchasing:create", "purchasing:receive",
    "production:view",
    "orders:view",
    "reports:view",
  ],
  PRODUCTION: [
    "dashboard:view",
    "products:view",
    "inventory:view",
    "production:view", "production:create", "production:manage", "production:qc",
    "purchasing:view",
    "reports:view",
  ],
  FINANCE: [
    "dashboard:view",
    "customers:view",
    "orders:view",
    "invoices:view", "invoices:create", "invoices:void", "invoices:export",
    "payments:view", "payments:create", "payments:refund",
    "expenses:view", "expenses:create", "expenses:edit", "expenses:approve", "expenses:export",
    "reports:view", "reports:export", "reports:financial",
    "purchasing:view",
    "audit:view",
  ],
  VIEWER: [
    "dashboard:view",
    "leads:view",
    "customers:view",
    "products:view",
    "inventory:view",
    "orders:view",
    "quotations:view",
    "invoices:view",
    "payments:view",
    "reports:view",
  ],
};

export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(role: UserRole, permission: Permission, customPermissions?: Record<string, boolean>): boolean {
  if (customPermissions && permission in customPermissions) {
    return customPermissions[permission];
  }
  return getRolePermissions(role).includes(permission);
}

export function hasAnyPermission(role: UserRole, permissions: Permission[], customPermissions?: Record<string, boolean>): boolean {
  return permissions.some(p => hasPermission(role, p, customPermissions));
}
