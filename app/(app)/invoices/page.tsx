import type { Metadata } from "next";
import { FileText } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Invoices" };

export default function InvoicesPage() {
  return (
    <ComingSoon
      title="Invoices"
      description="Bill customers, track what's owed and record payments."
      phase="Phase 7 — Invoices"
      icon={FileText}
    />
  );
}
