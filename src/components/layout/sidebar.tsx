"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { STORE_CONFIG } from "@/lib/utils/constants";
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  FolderTree,
  Printer,
  Users,
  Truck,
  ClipboardList,
  BarChart3,
  Settings,
  BookOpen,
} from "lucide-react";

interface SidebarProps {
  role: UserRole;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "POS", href: "/pos", icon: ShoppingCart },
      { label: "Sales", href: "/sales", icon: Receipt },
    ],
  },
  {
    title: "Inventory",
    items: [
      { label: "Products", href: "/products", icon: Package },
      { label: "Categories", href: "/categories", icon: FolderTree },
    ],
  },
  {
    title: "Services",
    items: [
      { label: "Print Orders", href: "/print-orders", icon: Printer },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Customers", href: "/customers", icon: Users },
      { label: "Suppliers", href: "/suppliers", icon: Truck, adminOnly: true },
    ],
  },
  {
    title: "Purchasing",
    items: [
      {
        label: "Purchases",
        href: "/purchases",
        icon: ClipboardList,
        adminOnly: true,
      },
    ],
  },
  {
    title: "Analytics",
    items: [{ label: "Reports", href: "/reports", icon: BarChart3 }],
  },
  {
    title: "System",
    items: [
      { label: "Settings", href: "/settings", icon: Settings, adminOnly: true },
    ],
  },
];

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <BookOpen className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">{STORE_CONFIG.name}</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.adminOnly || role === "admin"
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="mb-6">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
