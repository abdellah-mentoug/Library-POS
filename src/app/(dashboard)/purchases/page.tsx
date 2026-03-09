import { requireAdmin } from "@/lib/auth";
import { getPurchaseOrders } from "@/lib/actions/purchases";
import { POTable } from "./_components/po-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n/t-server";

export default async function PurchasesPage() {
  const t = await getTranslations("purchases");
  await requireAdmin();
  const purchaseOrders = await getPurchaseOrders();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t.purchaseOrders}</h1>
        <Button asChild>
          <Link href="/purchases/new">
            <Plus className="mr-2 h-4 w-4" />
            {t.newPurchaseOrder}
          </Link>
        </Button>
      </div>
      <POTable purchaseOrders={purchaseOrders} />
    </div>
  );
}
