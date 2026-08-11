import {
  BarChart3,
  FileText,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales", label: "Sales", icon: ShoppingCart },
  { href: "/products", label: "Products", icon: Package },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];
