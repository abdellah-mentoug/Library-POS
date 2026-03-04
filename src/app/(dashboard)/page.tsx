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

export default async function DashboardPage() {
  await getAuthUser();
  const supabase = await createClient();

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
      title: "Today's Sales",
      value: formatCurrency(todaySales?.total_revenue || 0),
      icon: DollarSign,
      description: "Total revenue today",
    },
    {
      title: "Transactions Today",
      value: String(todaySales?.transaction_count || 0),
      icon: ShoppingCart,
      description: "Completed sales",
    },
    {
      title: "Pending Print Orders",
      value: String(pendingPrintCount),
      icon: Printer,
      description: "Awaiting completion",
    },
    {
      title: "Low Stock Items",
      value: String(lowStockCount),
      icon: AlertTriangle,
      description: "Below threshold",
      alert: lowStockCount > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

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
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSales.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No sales yet. Make your first sale from the{" "}
              <Link href="/pos" className="underline">
                POS
              </Link>
              .
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
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
