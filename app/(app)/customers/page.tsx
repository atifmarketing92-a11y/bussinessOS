import type { Metadata } from "next";
import { Users } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return (
    <ComingSoon
      title="Customers"
      description="Customer details, purchase history and balances owed."
      phase="Phase 4 — Customers"
      icon={Users}
    />
  );
}
