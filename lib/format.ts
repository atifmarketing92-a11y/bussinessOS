/**
 * Formatting helpers shared across the app.
 * Money values arrive from Postgres as strings (numeric) — accept both.
 */

const formatterCache = new Map<string, Intl.NumberFormat>();

export function formatMoney(amount: number | string | null | undefined, currency: string): string {
  const value = typeof amount === "string" ? Number(amount) : (amount ?? 0);

  let formatter = formatterCache.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      // Drop trailing ".00" noise for whole amounts in zero-decimal contexts,
      // but keep 2 decimals for clarity in a business tool.
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    formatterCache.set(currency, formatter);
  }

  if (!Number.isFinite(value)) {
    return formatter.format(0);
  }
  return formatter.format(value);
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
