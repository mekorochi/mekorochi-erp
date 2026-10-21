"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import type { UserRole } from "@prisma/client";
import {
  LayoutDashboard,
  Target,
  Users,
  FileText,
  ShoppingCart,
  Package,
  Warehouse,
  Truck,
  Factory,
  Receipt,
  CreditCard,
  Wallet,
  BarChart3,
  UserCog,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "MAIN",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
    ],
  },
  {
    label: "SALES",
    items: [
      { label: "Leads", href: "/leads", icon: Target, permission: "leads:view" },
      { label: "Customers", href: "/customers", icon: Users, permission: "customers:view" },
      { label: "Quotations", href: "/quotations", icon: FileText, permission: "quotations:view" },
      { label: "Orders", href: "/orders", icon: ShoppingCart, permission: "orders:view" },
    ],
  },
  {
    label: "CATALOG",
    items: [
      { label: "Products", href: "/products", icon: Package, permission: "products:view" },
      { label: "Inventory", href: "/inventory", icon: Warehouse, permission: "inventory:view" },
      { label: "Purchasing", href: "/purchasing", icon: Truck, permission: "purchasing:view" },
    ],
  },
  {
    label: "MANUFACTURING",
    items: [
      { label: "Production", href: "/production", icon: Factory, permission: "production:view" },
    ],
  },
  {
    label: "FINANCE",
    items: [
      { label: "Invoices", href: "/invoices", icon: Receipt, permission: "invoices:view" },
      { label: "Payments", href: "/payments", icon: CreditCard, permission: "payments:view" },
      { label: "Expenses", href: "/expenses", icon: Wallet, permission: "expenses:view" },
    ],
  },
  {
    label: "ANALYTICS",
    items: [
      { label: "Reports", href: "/reports", icon: BarChart3, permission: "reports:view" },
    ],
  },
  {
    label: "ADMIN",
    items: [
      { label: "Team", href: "/team", icon: UserCog, permission: "team:view" },
      { label: "Settings", href: "/settings", icon: Settings, permission: "settings:view" },
      { label: "Audit Log", href: "/audit", icon: Shield, permission: "audit:view" },
    ],
  },
];

interface SidebarProps {
  userRole: UserRole;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ userRole, collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const filteredGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.permission || hasPermission(userRole, item.permission)
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-[#3E2723] text-[#F5F5DC] transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center justify-center shrink-0", collapsed ? "h-16 px-2" : "h-16 px-4")} style={{ backgroundColor: "#F5F5DC" }}>
        {collapsed ? (
          <Image src="/brand/icon.png" alt="MEKOROCHI" width={36} height={36} className="rounded" />
        ) : (
          <Image src="/brand/logo-rectangle.png" alt="MEKOROCHI" width={150} height={45} className="object-contain" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        {filteredGroups.map((group) => (
          <div key={group.label} className="mb-2">
            {!collapsed && (
              <p className="px-4 py-1.5 text-[10px] font-semibold tracking-widest text-[#F5F5DC]/40 uppercase">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 mx-2 rounded-lg text-sm font-medium transition-colors",
                    collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                    isActive
                      ? "bg-[#5D4037] text-white"
                      : "text-[#F5F5DC]/70 hover:bg-[#5D4037]/50 hover:text-[#F5F5DC]"
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center h-11 border-t border-white/10 text-[#F5F5DC]/50 hover:text-[#F5F5DC] hover:bg-[#5D4037]/50 transition-colors shrink-0"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
