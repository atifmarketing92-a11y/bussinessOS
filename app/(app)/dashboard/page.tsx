import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, FileText, Package, Receipt, ShoppingCart } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireBusiness } from "@/lib/server/auth";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { business } = await requireBusiness();

  const zero = formatMoney(0, business.currency);

  const kpis = [
    { label: "Revenue this month", value: zero },
    { label: "Expenses this month", value: zero },
    { label: "Profit this month", value: zero },
  ];

  const steps = [
    {
      icon: Package,
      title: "Add your first product",
      description: "Name, price and stock — that's all you need to start.",
      href: "/products",
      done: false,
    },
    {
      icon: ShoppingCart,
      title: "Record a sale",
      description: "A sale takes seconds and updates your stock and profit automatically.",
      href: "/sales",
      done: false,
    },
    {
      icon: Receipt,
      title: "Log an expense",
      description: "Rent, supplies, salaries — keep your costs in one place.",
      href: "/expenses",
      done: false,
    },
    {
      icon: FileText,
      title: "Create an invoice",
      description: "Bill a customer and track what they owe you.",
      href: "/invoices",
      done: false,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to {business.name} 👋</h1>
        <p className="mt-1 text-muted-foreground">Here&apos;s how your business is doing.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="gap-2 py-5">
            <CardHeader className="px-5">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              <p className="text-2xl font-semibold tabular-nums">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section aria-labelledby="getting-started">
        <h2 id="getting-started" className="mb-4 text-lg font-semibold">
          Get set up
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {steps.map((step) => (
            <Link
              key={step.title}
              href={step.href}
              className="group rounded-xl border bg-card p-5 shadow-sm transition-colors hover:bg-accent/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                  <step.icon className="size-4.5 text-muted-foreground" aria-hidden />
                </div>
                {step.done ? (
                  <Check className="size-5 text-emerald-600" aria-hidden />
                ) : (
                  <ArrowRight
                    className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                )}
              </div>
              <h3 className="mt-3 font-medium">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
