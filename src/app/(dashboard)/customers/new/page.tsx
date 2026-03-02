import { getAuthUser } from "@/lib/auth";
import { CustomerForm } from "../_components/customer-form";

export default async function NewCustomerPage() {
  await getAuthUser();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-3xl font-bold">Add Customer</h1>
      <CustomerForm mode="create" />
    </div>
  );
}
