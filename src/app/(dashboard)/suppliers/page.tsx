import { requireAdmin } from "@/lib/auth";
import { getSuppliers } from "@/lib/actions/suppliers";
import { SuppliersClient } from "./_components/suppliers-client";

export default async function SuppliersPage() {
  await requireAdmin();
  const suppliers = await getSuppliers();

  return (
    <div className="space-y-4">
      <SuppliersClient suppliers={suppliers} />
    </div>
  );
}
