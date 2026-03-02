import { getAuthUser } from "@/lib/auth";
import { getCustomers } from "@/lib/actions/customers";
import { CustomerTable } from "./_components/customer-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function CustomersPage() {
  const user = await getAuthUser();
  const customers = await getCustomers();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Customers</h1>
        <Button asChild>
          <Link href="/customers/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Link>
        </Button>
      </div>
      <CustomerTable customers={customers} role={user.role} />
    </div>
  );
}
