import Link from "next/link";
import { ChevronRight } from "lucide-react";

const segmentLabels: Record<string, string> = {
  pos: "Point of Sale",
  products: "Products",
  categories: "Categories",
  "print-orders": "Print Orders",
  customers: "Customers",
  suppliers: "Suppliers",
  purchases: "Purchases",
  reports: "Reports",
  settings: "Settings",
  users: "Users",
  store: "Store",
  new: "New",
  edit: "Edit",
  receive: "Receive Stock",
  sales: "Sales",
  stock: "Stock",
};

interface BreadcrumbsProps {
  pathname: string;
}

export function Breadcrumbs({ pathname }: BreadcrumbsProps) {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        segment
      );
    const label = isUuid ? "Detail" : segmentLabels[segment] || segment;
    const isLast = index === segments.length - 1;

    return { href, label, isLast };
  });

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link href="/" className="hover:text-foreground">
        Dashboard
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          {crumb.isLast ? (
            <span className="text-foreground">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-foreground">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
