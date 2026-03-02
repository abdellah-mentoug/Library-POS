import { getAuthUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Package, AlertTriangle, Printer } from "lucide-react";
import Link from "next/link";

const reports = [
  {
    title: "Sales Report",
    description: "Daily sales revenue, transactions, and trends",
    href: "/reports/sales",
    icon: BarChart3,
  },
  {
    title: "Product Performance",
    description: "Top selling products, revenue, and profit analysis",
    href: "/reports/products",
    icon: Package,
  },
  {
    title: "Stock Report",
    description: "Low stock alerts and reorder suggestions",
    href: "/reports/stock",
    icon: AlertTriangle,
  },
  {
    title: "Print Order Report",
    description: "Print order volume, revenue, and status breakdown",
    href: "/reports/print-orders",
    icon: Printer,
  },
];

export default async function ReportsPage() {
  await getAuthUser();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reports</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Link key={report.href} href={report.href}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center gap-3">
                  <Icon className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {report.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
