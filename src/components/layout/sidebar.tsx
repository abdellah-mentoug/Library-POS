// src/components/layout/sidebar.tsx
// REPLACE the existing file entirely.
// Adds: stock_operator role, new nav groups (Stock, Devis, Credits)

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, ShoppingCart, Package, Tag, Receipt, Users, Truck,
  ShoppingBag, Printer, BarChart3, Settings, Package2, History,
  FileText, BookOpen, CreditCard, ClipboardList, PlusCircle, MinusCircle,
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
      { href: '/',  label: 'Tableau de bord', icon: LayoutDashboard, roles: ['admin','employee','stock_operator'] },
      { href: '/pos',        label: 'Caisse / POS',    icon: ShoppingCart,    roles: ['admin','employee','stock_operator'] },
    ],
  },
  {
    group: 'Catalogue',
    items: [
      { href: '/products',   label: 'Produits',         icon: Package,  roles: ['admin','employee'] },
      { href: '/categories', label: 'Catégories',       icon: Tag,      roles: ['admin','employee'] },
    ],
  },
  {
    group: 'Stock',
    items: [
      { href: '/stock',          label: 'Vue stock',      icon: Package2,      roles: ['admin','stock_operator'] },
      { href: '/stock/entry',    label: 'Entrée stock',   icon: PlusCircle,    roles: ['admin','stock_operator'] },
      { href: '/stock/exit',     label: 'Sortie stock',   icon: MinusCircle,   roles: ['admin','stock_operator'] },
      { href: '/stock/stocktake',label: 'Inventaire',     icon: ClipboardList, roles: ['admin','stock_operator'] },
      { href: '/stock/history',  label: 'Historique',     icon: History,       roles: ['admin','stock_operator'] },
    ],
  },
  {
    group: 'Ventes',
    items: [
      { href: '/sales',        label: 'Historique ventes', icon: Receipt,       roles: ['admin','employee'] },
      { href: '/print-orders', label: 'Impression',        icon: Printer,       roles: ['admin','employee'] },
    ],
  },
  {
    group: 'Documents',
    items: [
      { href: '/quotes',         label: 'Devis',            icon: FileText,  roles: ['admin'] },
      { href: '/invoices',       label: 'Factures',         icon: BookOpen,  roles: ['admin'] },
    ],
  },
  {
    group: 'Clients & Crédit',
    items: [
      { href: '/customers', label: 'Clients',         icon: Users,       roles: ['admin','employee'] },
      { href: '/credit-accounts', label: 'Comptes crédit',  icon: CreditCard,  roles: ['admin'] },
    ],
  },
  {
    group: 'Fournisseurs',
    items: [
      { href: '/suppliers', label: 'Fournisseurs',   icon: Truck,       roles: ['admin'] },
      { href: '/purchases', label: 'Achats / PO',    icon: ShoppingBag, roles: ['admin'] },
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
    <aside className="flex flex-col w-60 min-h-screen bg-card border-e border-border">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <p className="font-bold text-base truncate">{storeName}</p>
        <p className="text-xs text-muted-foreground mt-0.5 capitalize">{userRole}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV.map((group) => {
          const visibleItems = group.items.filter((item) =>
            item.roles.includes(userRole as AllowedRole)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.group}>
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                {group.group}
              </p>
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors',
                          active
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
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
