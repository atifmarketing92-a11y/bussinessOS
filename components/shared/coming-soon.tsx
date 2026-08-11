import type { LucideIcon } from "lucide-react";

import { PageHeader } from "./page-header";

/**
 * Placeholder for modules that ship in later MVP phases. Keeps navigation
 * honest — users can see what's coming without hitting dead ends.
 */
export function ComingSoon({
  title,
  description,
  phase,
  icon: Icon,
}: {
  title: string;
  description: string;
  phase: string;
  icon: LucideIcon;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 py-20 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Icon className="size-6 text-muted-foreground" aria-hidden />
        </div>
        <h2 className="mt-4 text-lg font-medium">Coming in {phase}</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          This part of Business OS is on the roadmap and will appear here automatically as we build
          it.
        </p>
      </div>
    </>
  );
}
