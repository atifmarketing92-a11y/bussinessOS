import Link from "next/link";

import { NAV_ITEMS } from "./nav-items";
import { NavLink } from "./nav-link";

export function Sidebar({ businessName }: { businessName: string }) {
  return (
    <aside className="sticky top-0 hidden h-screen flex-col border-r bg-sidebar md:flex">
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/dashboard" className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold tracking-tight">Business OS</span>
          <span className="max-w-[200px] truncate text-xs text-muted-foreground">
            {businessName}
          </span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>
    </aside>
  );
}
