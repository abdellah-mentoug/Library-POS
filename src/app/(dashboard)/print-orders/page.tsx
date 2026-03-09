import { getAuthUser } from "@/lib/auth";
import { getPrintOrders } from "@/lib/actions/print-orders";
import { getTranslations } from "@/lib/i18n/t-server";
import { PrintOrderTable } from "./_components/print-order-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function PrintOrdersPage() {
  await getAuthUser();
  const [orders, t] = await Promise.all([
    getPrintOrders(),
    getTranslations("printOrders"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground">
            {t.manageDescription}
          </p>
        </div>
        <Button asChild>
          <Link href="/print-orders/new">
            <Plus className="mr-2 h-4 w-4" />
            {t.newOrder}
          </Link>
        </Button>
      </div>

      <PrintOrderTable orders={orders} />
    </div>
  );
}
