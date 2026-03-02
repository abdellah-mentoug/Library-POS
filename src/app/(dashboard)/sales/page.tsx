import { getAuthUser } from "@/lib/auth";
import { getSales } from "@/lib/actions/sales";
import { SalesTable } from "./_components/sales-table";

export default async function SalesPage() {
  await getAuthUser();
  const sales = await getSales();

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Sales History</h1>
      <SalesTable sales={sales} />
    </div>
  );
}
