import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <AppShell
      userName={user.name}
      userEmail={user.email}
      userRole={user.role}
    >
      {children}
    </AppShell>
  );
}
