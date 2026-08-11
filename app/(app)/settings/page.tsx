import type { Metadata } from "next";
import { Settings } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <ComingSoon
      title="Settings"
      description="Business profile, currency, tax rate and account options."
      phase="Phase 9 — Settings & hardening"
      icon={Settings}
    />
  );
}
