"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NAV_ITEMS } from "./nav-items";
import { NavLink } from "./nav-link";

export function MobileNav({ businessName }: { businessName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Open navigation menu"
          className="md:hidden"
        >
          <Menu />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="bottom" className="w-64 p-2 md:hidden">
        <p className="mb-2 truncate px-3 text-xs font-medium text-muted-foreground">
          {businessName}
        </p>
        <nav className="space-y-1" aria-label="Mobile navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} onNavigate={() => setOpen(false)} />
          ))}
        </nav>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
