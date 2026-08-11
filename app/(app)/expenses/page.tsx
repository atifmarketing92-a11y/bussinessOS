import type { Metadata } from "next";
import { Receipt } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Expenses" };

export default function ExpensesPage() {
  return (
    <ComingSoon
      title="Expenses"
      description="Track what your business spends, by category."
      phase="Phase 6 — Expenses"
      icon={Receipt}
    />
  );
}
