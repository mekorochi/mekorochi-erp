"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

interface AppShellProps {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  userRole: UserRole;
}

export function AppShell({ children, userName, userEmail, userRole }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full shrink-0">
        <Sidebar
          userRole={userRole}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 animate-in slide-in-from-left duration-300">
            <Sidebar userRole={userRole} onToggle={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main className={cn("flex-1 overflow-y-auto pb-20 md:pb-0 scrollbar-thin")}>
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav userRole={userRole} />
    </div>
  );
}
