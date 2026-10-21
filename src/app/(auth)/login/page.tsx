import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const userCount = await prisma.user.count();
  if (userCount === 0) redirect("/setup");

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 shadow-sm">
      <div className="mb-6">
        <h2
          className="text-xl mb-1 text-[var(--foreground)]"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          Welcome Back
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Sign in to your account to continue
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
