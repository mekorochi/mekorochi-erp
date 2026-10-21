import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { getSession } from "@/lib/auth";
import { SetupWizard } from "./setup-wizard";

export default async function SetupPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const userCount = await prisma.user.count();
  if (userCount > 0) redirect("/login");

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 shadow-sm">
      <div className="mb-6">
        <h2
          className="text-xl mb-1 text-[var(--foreground)]"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          Welcome to MEKOROCHI
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Let&apos;s set up your account and company details
        </p>
      </div>
      <SetupWizard />
    </div>
  );
}
