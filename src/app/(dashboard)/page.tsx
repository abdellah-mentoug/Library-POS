import { getAuthUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, ShoppingCart, Printer, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDateTime, formatSaleNumber } from "@/lib/utils/format";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n/t-server";

export default async function DashboardPage() {
  await getAuthUser();
  const supabase = await createClient();
  const t = await getTranslations("dashboard");

  const today = new Date().toISOString().split("T")[0];

  // Parallel queries for KPI data
  const [dailySalesRes, pendingPrintRes, lowStockRes, recentSalesRes] =
    await Promise.all([
      supabase
        .from("v_daily_sales")
        .select("*")
        .eq("sale_date", today)
        .maybeSingle(),
      supabase
        .from("print_orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["registered", "in_progress"]),
      supabase
        .from("v_low_stock")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("sales")
        .select("id, sale_number, total, payment_method, status, created_at")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const todaySales = dailySalesRes.data;
  const pendingPrintCount = pendingPrintRes.count || 0;
  const lowStockCount = lowStockRes.count || 0;
  const recentSales = recentSalesRes.data || [];

  const kpis = [
    {
      title: t.todaysSales,
      value: formatCurrency(todaySales?.total_revenue || 0),
      icon: DollarSign,
      description: t.totalRevenueToday,
    },
    {
      title: t.transactionsToday,
      value: String(todaySales?.transaction_count || 0),
      icon: ShoppingCart,
      description: t.completedSales,
    },
    {
      title: t.pendingPrintOrders,
      value: String(pendingPrintCount),
      icon: Printer,
      description: t.awaitingCompletion,
    },
    {
      title: t.lowStockItems,
      value: String(lowStockCount),
      icon: AlertTriangle,
      description: t.belowThreshold,
      alert: lowStockCount > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t.title}</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {kpi.title}
                </CardTitle>
                <Icon
                  className={`h-4 w-4 ${
                    "alert" in kpi && kpi.alert
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground">
                  {kpi.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.recentSales}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSales.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {t.noSalesYet}{" "}
              <Link href="/pos" className="underline">
                {t.posLink}
              </Link>
              .
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.saleNumber}</TableHead>
                  <TableHead>{t.date}</TableHead>
                  <TableHead>{t.payment}</TableHead>
                  <TableHead>{t.status}</TableHead>
                  <TableHead className="text-right">{t.total}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">
                      {formatSaleNumber(sale.sale_number)}
                    </TableCell>
                    <TableCell>{formatDateTime(sale.created_at)}</TableCell>
                    <TableCell className="capitalize">
                      {sale.payment_method}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sale.status === "completed" ? "default" : "destructive"
                        }
                        className="capitalize"
                      >
                        {sale.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(sale.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
