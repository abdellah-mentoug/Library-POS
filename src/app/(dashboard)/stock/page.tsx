import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStockPageAccess } from "@/lib/actions/guard";
import { getStockSummary } from "@/lib/actions/stock";
import { StockFilters } from "./_components/stock-filters";
import { StockTable } from "./_components/stock-table";
import { getLocale } from "@/lib/i18n/get-locale";
import { messages } from "@/lib/i18n/translations";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; low?: string; categoryId?: string }>;
}) {
  await requireStockPageAccess();
  const sp = await searchParams;
  const rows = await getStockSummary({
    search: sp.q,
    lowStockOnly: sp.low === "1",
    categoryId: sp.categoryId,
  });

  const totalSkus = rows.length;
  const totalUnits = rows.reduce((s, r) => s + r.stock_quantity, 0);
  const lowCount = rows.filter(
    (r) => r.stock_quantity > 0 && r.stock_quantity <= r.low_stock_threshold
  ).length;
  const outCount = rows.filter((r) => r.stock_quantity <= 0).length;

  const locale = await getLocale();
  const t = messages[locale].stock;
  const th = messages[locale].stockHistory;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/stock/entry">{t.stockEntryPage}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/stock/exit">{t.stockExitPage}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/stock/stocktake">{t.stocktakePage}</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/stock/history">{th.title}</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.totalSkus}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{totalSkus}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.totalUnits}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{totalUnits}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.lowStockKpi}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-orange-600">{lowCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.outOfStock}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-red-600">{outCount}</CardContent>
        </Card>
      </div>

      <StockFilters />

      <StockTable rows={rows} />
    </div>
  );
}
