import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 shadow-sm">
      <h2
        className="text-xl mb-1 text-[var(--foreground)]"
        style={{ fontFamily: "var(--font-playfair), serif" }}
      >
        Reset Password
      </h2>
      <p className="text-sm text-[var(--muted-foreground)] mb-6">
        Password reset requires administrator assistance.
      </p>

      <div className="rounded-lg bg-[var(--muted)] p-4 text-sm text-[var(--foreground)] space-y-2 mb-6">
        <p className="font-medium">To reset your password:</p>
        <ol className="list-decimal list-inside space-y-1 text-[var(--muted-foreground)]">
          <li>Contact your system administrator</li>
          <li>They can reset your password from the Team settings</li>
          <li>You will receive a new temporary password</li>
        </ol>
      </div>

      <p className="text-xs text-[var(--muted-foreground)] mb-6">
        Email-based password reset will be available once SMTP is configured in Settings.
      </p>

      <Link
        href="/login"
        className="block w-full h-11 rounded-lg border border-[var(--border)] text-[var(--foreground)] font-medium text-sm text-center leading-[2.75rem] hover:bg-[var(--muted)] transition-colors"
      >
        Back to Sign In
      </Link>
    </div>
  );
}
