import Link from "next/link";
import { requireStockPageAccess } from "@/lib/actions/guard";
import { StockEntryForm } from "../_components/stock-entry-form";
import { getLocale } from "@/lib/i18n/get-locale";
import { messages } from "@/lib/i18n/translations";
import { Button } from "@/components/ui/button";

export default async function StockEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string }>;
}) {
  await requireStockPageAccess();
  const sp = await searchParams;
  const locale = await getLocale();
  const t = messages[locale].stock;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t.stockEntryPage}</h1>
        <Button variant="outline" asChild>
          <Link href="/stock">{t.backToStock}</Link>
        </Button>
      </div>
      <StockEntryForm defaultProductId={sp.productId} />
    </div>
  );
}
