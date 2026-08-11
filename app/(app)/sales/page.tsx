import type { Metadata } from "next";
import { ShoppingCart } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Sales" };

export default function SalesPage() {
  return (
    <ComingSoon
      title="Sales"
      description="Record sales, track payments and keep stock up to date."
      phase="Phase 5 — Sales management"
      icon={ShoppingCart}
    />
  );
}
