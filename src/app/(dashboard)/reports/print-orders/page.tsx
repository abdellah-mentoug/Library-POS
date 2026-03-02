import { getAuthUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PrintOrderReportClient } from "./print-order-report-client";

export default async function PrintOrderReportPage({
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

  const { data } = await supabase
    .from("v_print_order_summary")
    .select("*")
    .gte("order_date", start)
    .lte("order_date", end)
    .order("order_date", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Print Order Report</h1>
      <PrintOrderReportClient data={data || []} />
    </div>
  );
}
