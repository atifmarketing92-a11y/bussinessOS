import type { Metadata } from "next";
import { Package } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return (
    <ComingSoon
      title="Products & inventory"
      description="Your product list with prices, costs and stock levels."
      phase="Phase 3 — Products & inventory"
      icon={Package}
    />
  );
}
