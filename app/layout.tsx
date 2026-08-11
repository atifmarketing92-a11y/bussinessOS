import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Geist is self-hosted (via the `geist` package) so builds don't depend on
// reaching Google Fonts at compile time and users don't pay a font-fetch tax.
const geistSans = localFont({
  src: [
    {
      path: "../node_modules/geist/dist/fonts/geist-sans/Geist-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/geist/dist/fonts/geist-sans/Geist-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../node_modules/geist/dist/fonts/geist-sans/Geist-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: [
    {
      path: "../node_modules/geist/dist/fonts/geist-mono/GeistMono-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/geist/dist/fonts/geist-mono/GeistMono-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../node_modules/geist/dist/fonts/geist-mono/GeistMono-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Business OS",
    template: "%s · Business OS",
  },
  description:
    "Simple business management for small businesses — sales, inventory, customers, expenses, invoices and profit/loss in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
