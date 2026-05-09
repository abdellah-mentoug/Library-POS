import Link from "next/link";
import { requireStockPageAccess } from "@/lib/actions/guard";
import { getStockHistory } from "@/lib/actions/stock";
import { StockHistoryFilters } from "../_components/stock-history-filters";
import { StockHistoryTable } from "../_components/stock-history-table";
import { getLocale } from "@/lib/i18n/get-locale";
import { messages } from "@/lib/i18n/translations";
import { Button } from "@/components/ui/button";
import { interpolate } from "@/lib/i18n/locales";

export default async function StockHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    reason?: string;
    start?: string;
    end?: string;
    page?: string;
  }>;
}) {
  await requireStockPageAccess();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const { data, count } = await getStockHistory({
    reason: sp.reason,
    startDate: sp.start,
    endDate: sp.end,
    page,
    pageSize: 50,
  });

  const locale = await getLocale();
  const t = messages[locale].stockHistory;
  const ts = messages[locale].stock;
  const m = messages[locale];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <Button variant="outline" asChild>
          <Link href="/stock">{ts.backToStock}</Link>
        </Button>
      </div>

      <StockHistoryFilters />

      <p className="text-sm text-muted-foreground">
        {interpolate(m.common.rowsTotal, { count })}
      </p>

      <StockHistoryTable rows={data} />
    </div>
  );
}
