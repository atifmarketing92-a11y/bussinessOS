import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <Link
        href="/"
        className="mb-8 text-xl font-semibold tracking-tight"
        aria-label="Business OS home"
      >
        Business OS
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
