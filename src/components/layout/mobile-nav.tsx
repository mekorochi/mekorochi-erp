"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import type { UserRole } from "@prisma/client";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Target,
  MoreHorizontal,
  X,
  Users,
  FileText,
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
  type LucideIcon,
} from "lucide-react";

interface MobileNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
}

const PRIMARY_ITEMS: MobileNavItem[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
  { label: "Orders", href: "/orders", icon: ShoppingCart, permission: "orders:view" },
  { label: "Products", href: "/products", icon: Package, permission: "products:view" },
  { label: "Leads", href: "/leads", icon: Target, permission: "leads:view" },
];

const MORE_ITEMS: MobileNavItem[] = [
  { label: "Customers", href: "/customers", icon: Users, permission: "customers:view" },
  { label: "Quotations", href: "/quotations", icon: FileText, permission: "quotations:view" },
  { label: "Inventory", href: "/inventory", icon: Warehouse, permission: "inventory:view" },
  { label: "Purchasing", href: "/purchasing", icon: Truck, permission: "purchasing:view" },
  { label: "Production", href: "/production", icon: Factory, permission: "production:view" },
  { label: "Invoices", href: "/invoices", icon: Receipt, permission: "invoices:view" },
  { label: "Payments", href: "/payments", icon: CreditCard, permission: "payments:view" },
  { label: "Expenses", href: "/expenses", icon: Wallet, permission: "expenses:view" },
  { label: "Reports", href: "/reports", icon: BarChart3, permission: "reports:view" },
  { label: "Team", href: "/team", icon: UserCog, permission: "team:view" },
  { label: "Settings", href: "/settings", icon: Settings, permission: "settings:view" },
  { label: "Audit Log", href: "/audit", icon: Shield, permission: "audit:view" },
];

interface MobileNavProps {
  userRole: UserRole;
}

export function MobileNav({ userRole }: MobileNavProps) {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  const visiblePrimary = PRIMARY_ITEMS.filter(
    (item) => !item.permission || hasPermission(userRole, item.permission)
  );

  const visibleMore = MORE_ITEMS.filter(
    (item) => !item.permission || hasPermission(userRole, item.permission)
  );

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border md:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-1">
          {visiblePrimary.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full gap-0.5 text-[10px] font-medium transition-colors min-w-[52px]",
                  isActive ? "text-[#3E2723]" : "text-muted-foreground"
                )}
              >
                <div className="relative">
                  <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                  {isActive && (
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-[#D4AF37]" />
                  )}
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
          {/* More button */}
          <button
            onClick={() => setShowMore(true)}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full gap-0.5 text-[10px] font-medium transition-colors min-w-[52px]",
              showMore ? "text-[#3E2723]" : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* More sheet overlay */}
      {showMore && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMore(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl max-h-[75vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-base">Menu</h3>
              <button
                onClick={() => setShowMore(false)}
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1 p-3 pb-8">
              {visibleMore.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-4 px-2 rounded-xl text-xs font-medium transition-colors",
                      isActive ? "bg-[#3E2723]/5 text-[#3E2723]" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-center leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
