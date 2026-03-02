import { getAuthUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SalesReportClient } from "./sales-report-client";

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  await getAuthUser();
  const params = await searchParams;
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    .toISOString()
    .split("T")[0];

  const start = params.start || thirtyDaysAgo;
  const end = params.end || today;

  const { data: dailySales } = await supabase
    .from("v_daily_sales")
    .select("*")
    .gte("sale_date", start)
    .lte("sale_date", end)
    .order("sale_date", { ascending: false });

  const rows = dailySales || [];

  const totalRevenue = rows.reduce(
    (sum, r) => sum + (r.total_revenue || 0),
    0
  );
  const totalTransactions = rows.reduce(
    (sum, r) => sum + (r.transaction_count || 0),
    0
  );
  const totalDiscounts = rows.reduce(
    (sum, r) => sum + (r.total_discounts || 0),
    0
  );
  const avgBasket =
    totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Sales Report</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Basket</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(avgBasket)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Discounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalDiscounts)}
            </div>
          </CardContent>
        </Card>
      </div>

      <SalesReportClient data={rows} />
    </div>
  );
}
