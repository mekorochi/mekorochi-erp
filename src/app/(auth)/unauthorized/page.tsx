import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 shadow-sm text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2
        className="text-xl mb-2 text-[var(--foreground)]"
        style={{ fontFamily: "var(--font-playfair), serif" }}
      >
        Access Denied
      </h2>
      <p className="text-sm text-[var(--muted-foreground)] mb-6">
        You don&apos;t have permission to access this page. Contact your administrator if you believe this is an error.
      </p>
      <Link
        href="/dashboard"
        className="inline-block h-11 px-6 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-medium text-sm leading-[2.75rem] hover:opacity-90 transition-opacity"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
