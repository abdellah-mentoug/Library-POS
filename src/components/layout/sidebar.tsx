"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/auth";
import { useTranslations } from "@/lib/i18n/use-translations";
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
import type { Messages } from "@/lib/i18n/translations/en";

type NavKey = keyof Messages["nav"];

interface SidebarProps {
  role: UserRole;
}

interface NavItem {
  labelKey: NavKey;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

interface NavSection {
  titleKey: NavKey;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    titleKey: "main",
    items: [
      { labelKey: "dashboard", href: "/", icon: LayoutDashboard },
      { labelKey: "pos", href: "/pos", icon: ShoppingCart },
      { labelKey: "sales", href: "/sales", icon: Receipt },
    ],
  },
  {
    titleKey: "inventory",
    items: [
      { labelKey: "products", href: "/products", icon: Package },
      { labelKey: "categories", href: "/categories", icon: FolderTree },
    ],
  },
  {
    titleKey: "services",
    items: [
      { labelKey: "printOrders", href: "/print-orders", icon: Printer },
    ],
  },
  {
    titleKey: "people",
    items: [
      { labelKey: "customers", href: "/customers", icon: Users },
      { labelKey: "suppliers", href: "/suppliers", icon: Truck, adminOnly: true },
    ],
  },
  {
    titleKey: "purchasing",
    items: [
      {
        labelKey: "purchases",
        href: "/purchases",
        icon: ClipboardList,
        adminOnly: true,
      },
    ],
  },
  {
    titleKey: "analytics",
    items: [{ labelKey: "reports", href: "/reports", icon: BarChart3 }],
  },
  {
    titleKey: "system",
    items: [
      { labelKey: "settings", href: "/settings", icon: Settings, adminOnly: true },
    ],
  },
];

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");

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
            <div key={section.titleKey} className="mb-6">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t[section.titleKey]}
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
                    {t[item.labelKey]}
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
