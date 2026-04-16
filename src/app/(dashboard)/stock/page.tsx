import { requireAuth } from "@/lib/auth";
import { getAllStockMovements } from "@/lib/actions/stock";
import { StockClient } from "./_components/stock-client";

export default async function StockPage() {
  await requireAuth();
  const stockMovements = await getAllStockMovements();

  return (
    <div className="space-y-4">
      <StockClient stockMovements={stockMovements} />
    </div>
  );
}