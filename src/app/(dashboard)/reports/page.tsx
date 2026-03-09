import { getAuthUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Package, AlertTriangle, Printer } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n/t-server";

export default async function ReportsPage() {
  await getAuthUser();
  const t = await getTranslations("reports");

  const reports = [
    {
      title: t.salesReport,
      description: t.salesReportDesc,
      href: "/reports/sales",
      icon: BarChart3,
    },
    {
      title: t.productPerformance,
      description: t.productPerformanceDesc,
      href: "/reports/products",
      icon: Package,
    },
    {
      title: t.stockReport,
      description: t.stockReportDesc,
      href: "/reports/stock",
      icon: AlertTriangle,
    },
    {
      title: t.printOrderReport,
      description: t.printOrderReportDesc,
      href: "/reports/print-orders",
      icon: Printer,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t.title}</h1>
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
