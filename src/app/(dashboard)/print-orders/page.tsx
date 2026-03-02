import { getAuthUser } from "@/lib/auth";
import { getPrintOrders } from "@/lib/actions/print-orders";
import { PrintOrderTable } from "./_components/print-order-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function PrintOrdersPage() {
  await getAuthUser();
  const orders = await getPrintOrders();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Print Orders</h1>
          <p className="text-muted-foreground">
            Manage printing, copying, binding and other service orders
          </p>
        </div>
        <Button asChild>
          <Link href="/print-orders/new">
            <Plus className="mr-2 h-4 w-4" />
            New Print Order
          </Link>
        </Button>
      </div>

      <PrintOrderTable orders={orders} />
    </div>
  );
}
