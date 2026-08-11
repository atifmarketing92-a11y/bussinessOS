import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Calculator,
  LayoutDashboard,
  Package,
  Receipt,
  ShoppingCart,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const features = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    description: "Revenue, expenses and profit at a glance — no spreadsheets required.",
  },
  {
    icon: ShoppingCart,
    title: "Sales",
    description: "Record a sale in seconds. Stock updates automatically.",
  },
  {
    icon: Package,
    title: "Products & inventory",
    description: "Track products, prices, costs and stock levels with low-stock alerts.",
  },
  {
    icon: Users,
    title: "Customers",
    description: "Keep customer details, purchase history and balances in one place.",
  },
  {
    icon: Receipt,
    title: "Expenses",
    description: "Log expenses by category and keep receipts attached.",
  },
  {
    icon: Calculator,
    title: "Invoices",
    description: "Create invoices, track what's owed, and record payments as they arrive.",
  },
  {
    icon: BarChart3,
    title: "Profit & loss",
    description: "An automatic, easy-to-read profit and loss report for any period.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="text-lg font-semibold tracking-tight">Business OS</span>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28">
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Run your small business from one simple place
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground text-pretty">
            Business OS brings your sales, inventory, customers, expenses and invoices together —
            and tells you your profit automatically. Built for shop owners, not accountants.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/signup">
                Start for free <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign in to your account</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Free to start · No credit card required
          </p>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="text-center text-3xl font-semibold tracking-tight">
              Everything your business needs
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
              Simple tools that work together, so you always know where your business stands.
            </p>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-xl border bg-card p-6 shadow-sm">
                  <feature.icon className="size-6 text-primary" aria-hidden />
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="rounded-2xl border bg-card px-6 py-12 text-center shadow-sm">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Know your profit, every day
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Set up your business in under two minutes and record your first sale today.
            </p>
            <Button size="lg" className="mt-6" asChild>
              <Link href="/signup">
                Create your free account <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} Business OS</span>
          <span>Made for small businesses</span>
        </div>
      </footer>
    </div>
  );
}
