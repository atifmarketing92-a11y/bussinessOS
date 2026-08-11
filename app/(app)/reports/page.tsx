import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <ComingSoon
      title="Reports"
      description="Profit & loss and expense breakdowns for any period."
      phase="Phase 8 — Reports"
      icon={BarChart3}
    />
  );
}
