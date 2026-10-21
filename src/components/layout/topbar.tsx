"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Menu,
  Plus,
  Bell,
  ChevronDown,
  LogOut,
  User as UserIcon,
  ShoppingCart,
  Target,
  Receipt,
  Package,
} from "lucide-react";

interface TopbarProps {
  userName: string;
  userEmail: string;
  userRole: string;
  onMenuToggle: () => void;
  notificationCount?: number;
}

export function Topbar({ userName, userEmail, userRole, onMenuToggle, notificationCount = 0 }: TopbarProps) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const quickCreateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (quickCreateRef.current && !quickCreateRef.current.contains(event.target as Node)) {
        setShowQuickCreate(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const quickActions = [
    { label: "New Order", href: "/orders/new", icon: ShoppingCart },
    { label: "New Lead", href: "/leads/new", icon: Target },
    { label: "New Invoice", href: "/invoices/new", icon: Receipt },
    { label: "New Product", href: "/products/new", icon: Package },
  ];

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-card border-b border-border shrink-0">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted transition-colors lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Quick create */}
        <div ref={quickCreateRef} className="relative">
          <Button
            variant="gold"
            size="sm"
            className="gap-1.5 hidden sm:inline-flex"
            onClick={() => setShowQuickCreate(!showQuickCreate)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">Create</span>
          </Button>
          <Button
            variant="gold"
            size="icon"
            className="sm:hidden h-9 w-9 min-h-0 min-w-0"
            onClick={() => setShowQuickCreate(!showQuickCreate)}
          >
            <Plus className="h-4 w-4" />
          </Button>
          {showQuickCreate && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-card rounded-xl border shadow-lg py-1 z-50">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                  onClick={() => setShowQuickCreate(false)}
                >
                  <action.icon className="h-4 w-4 text-muted-foreground" />
                  {action.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <Link
          href="/notifications"
          className="relative flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted transition-colors"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </Link>

        {/* User menu */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {initials}
            </div>
            <div className="hidden md:flex flex-col items-start">
              <span className="text-sm font-medium leading-tight">{userName}</span>
              <span className="text-[11px] text-muted-foreground leading-tight capitalize">
                {userRole.toLowerCase().replace("_", " ")}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-card rounded-xl border shadow-lg py-1 z-50">
              <div className="px-4 py-3 border-b">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
              <Link
                href="/settings/profile"
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                onClick={() => setShowUserMenu(false)}
              >
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                Profile
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors w-full text-left text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
