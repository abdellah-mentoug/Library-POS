import { getAuthUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StockReportClient } from "./stock-report-client";

export default async function StockReportPage() {
  await getAuthUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("v_low_stock")
    .select("*")
    .order("stock_quantity", { ascending: true });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Low Stock Report</h1>
      <p className="text-muted-foreground">
        Products at or below their low stock threshold.
      </p>
      <StockReportClient products={data || []} />
    </div>
  );
}
