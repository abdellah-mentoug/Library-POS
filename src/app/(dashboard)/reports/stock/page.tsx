import { getAuthUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StockReportClient } from "./stock-report-client";
import { getTranslations } from "@/lib/i18n/t-server";

export default async function StockReportPage() {
  await getAuthUser();
  const supabase = await createClient();
  const t = await getTranslations("reports");

  const { data } = await supabase
    .from("v_low_stock")
    .select("*")
    .order("stock_quantity", { ascending: true });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t.lowStockReport}</h1>
      <p className="text-muted-foreground">
        {t.lowStockDescription}
      </p>
      <StockReportClient products={data || []} />
    </div>
  );
}
