import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-[var(--background)]">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/brand/logo-square.png"
            alt="MEKOROCHI"
            width={80}
            height={80}
            className="mb-4"
            priority
          />
          <h1
            className="text-2xl tracking-wide text-[var(--primary)]"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            MEKOROCHI
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Healthy Bean to Bar
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
