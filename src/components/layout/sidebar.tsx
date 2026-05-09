'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tag,
  Receipt,
  Users,
  Truck,
  ShoppingBag,
  Printer,
  BarChart3,
  Settings,
  Package2,
  History,
  FileText,
  BookOpen,
  CreditCard,
  ClipboardList,
  PlusCircle,
  MinusCircle,
} from 'lucide-react';

type AllowedRole = 'admin' | 'employee' | 'stock_operator';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: AllowedRole[];
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    group: 'Principal',
    items: [
      { href: '/', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['admin','employee','stock_operator'] },
      { href: '/pos', label: 'Caisse / POS', icon: ShoppingCart, roles: ['admin','employee','stock_operator'] },
    ],
  },
  {
    group: 'Catalogue',
    items: [
      { href: '/products', label: 'Produits', icon: Package, roles: ['admin','employee'] },
      { href: '/categories', label: 'Catégories', icon: Tag, roles: ['admin','employee'] },
    ],
  },
  {
    group: 'Stock',
    items: [
      { href: '/stock', label: 'Vue stock', icon: Package2, roles: ['admin','stock_operator'] },
      { href: '/stock/entry', label: 'Entrée stock', icon: PlusCircle, roles: ['admin','stock_operator'] },
      { href: '/stock/exit', label: 'Sortie stock', icon: MinusCircle, roles: ['admin','stock_operator'] },
      { href: '/stock/stocktake', label: 'Inventaire', icon: ClipboardList, roles: ['admin','stock_operator'] },
      { href: '/stock/history', label: 'Historique', icon: History, roles: ['admin','stock_operator'] },
    ],
  },
  {
    group: 'Ventes',
    items: [
      { href: '/sales', label: 'Historique ventes', icon: Receipt, roles: ['admin','employee'] },
      { href: '/print-orders', label: 'Impression', icon: Printer, roles: ['admin','employee'] },
    ],
  },
  {
    group: 'Documents',
    items: [
      { href: '/quotes', label: 'Devis', icon: FileText, roles: ['admin'] },
      { href: '/invoices', label: 'Factures', icon: BookOpen, roles: ['admin'] },
    ],
  },
  {
    group: 'Clients & Crédit',
    items: [
      { href: '/customers', label: 'Clients', icon: Users, roles: ['admin','employee'] },
      { href: '/credit-accounts', label: 'Comptes crédit', icon: CreditCard, roles: ['admin'] },
    ],
  },
  {
    group: 'Fournisseurs',
    items: [
      { href: '/suppliers', label: 'Fournisseurs', icon: Truck, roles: ['admin'] },
      { href: '/purchases', label: 'Achats / PO', icon: ShoppingBag, roles: ['admin'] },
    ],
  },
  {
    group: 'Rapports',
    items: [
      { href: '/reports', label: 'Rapports', icon: BarChart3, roles: ['admin'] },
    ],
  },
  {
    group: 'Système',
    items: [
      { href: '/settings', label: 'Paramètres', icon: Settings, roles: ['admin'] },
    ],
  },
];

interface SidebarProps {
  userRole: string;
  storeName?: string;
}

export function Sidebar({ userRole, storeName = 'Library POS' }: SidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen border-r border-sidebar-border bg-sidebar/95 backdrop-blur-sm text-sidebar-foreground shadow-xl">
      <div className="px-6 py-6 border-b border-sidebar-border/50">
        <p className="text-lg font-semibold uppercase tracking-wider text-sidebar-foreground">
          Library POS
        </p>
        <p className="mt-2 text-sm leading-relaxed text-sidebar-foreground/70">
          Modern inventory & sales management
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-6">
        {NAV.map((group) => {
          const visibleItems = group.items.filter((item) =>
            item.roles.includes(userRole as AllowedRole)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.group} className="animate-fade-in">
              <p className="px-3 mb-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                {group.group}
              </p>
              <ul className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-200 ease-out',
                          active
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25 font-medium'
                            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground hover:shadow-md'
                        )}
                      >
                        <Icon className={cn(
                          'h-5 w-5 shrink-0 transition-transform duration-200',
                          active ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground/60 group-hover:scale-110'
                        )} />
                        <span className="truncate">{item.label}</span>
                        {active && (
                          <div className="ml-auto h-2 w-2 rounded-full bg-sidebar-primary-foreground animate-pulse" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
