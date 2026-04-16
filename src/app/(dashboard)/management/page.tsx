import { requireAdmin } from "@/lib/auth";
import { getSuppliers } from "@/lib/actions/suppliers";
import { getCustomers } from "@/lib/actions/customers";
import { ManagementClient } from "./_components/management-client";

export default async function ManagementPage() {
  await requireAdmin();
  const [suppliers, customers] = await Promise.all([
    getSuppliers(),
    getCustomers(),
  ]);

  return (
    <div className="space-y-4">
      <ManagementClient suppliers={suppliers} customers={customers} />
    </div>
  );
}